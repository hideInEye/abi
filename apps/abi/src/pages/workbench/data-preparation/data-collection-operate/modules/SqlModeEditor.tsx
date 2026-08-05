import Editor, { useMonaco } from '@monaco-editor/react';
import { Button, Input, Tooltip, message } from 'antd';
import { ApiOutlined, DatabaseOutlined, PlayCircleOutlined, TableOutlined } from '@ant-design/icons';
import { format } from 'sql-formatter';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type * as Monaco from 'monaco-editor';

import { getFieldByDataSource, streamSqlTemplate } from '@/service/api';

import TableFieldPickerDrawer, { type TableFieldSelection } from './TableFieldPickerDrawer';

interface Props {
  /** 数据源 ID */
  sourceId?: string;
  /** 数据源类型 */
  sourceType?: string;
  /** 数据源列表（configuration 为后端返回的连接配置 JSON 字符串，内含 dbName） */
  dataSourceList?: Array<{ sourceId: string; sourceName: string; sourceType: string; configuration?: string }>;
  /** 数据源切换回调 */
  onDatasourceChange?: (sourceId: string) => void;
  /** 当前已加载的表列表 */
  tableList?: Array<{ tableName: string }>;
  /** 当前 SQL 值 */
  value?: string;
  /** SQL 变化回调 */
  onChange?: (val: string) => void;
  /** 编辑器高度 */
  height?: string;
  /** 执行 SQL 回调（点击「执行」按钮） */
  onRun?: () => void;
  /** 执行按钮 loading 状态 */
  runLoading?: boolean;
  /** 保存回调（点击「保存」按钮） */
  onSave?: () => void;
  /** 退出编辑回调（点击「退出编辑」按钮） */
  onExit?: () => void;
  /** 选择表勾选结果（表 -> 字段），由页面持有，保存时组装进 viewHistory */
  tableSelection?: TableFieldSelection;
  /** 勾选结果变化回调 */
  onTableSelectionChange?: (selection: TableFieldSelection) => void;
}

/**
 * 从 SQL 文本中解析 FROM / JOIN 子句，提取"表名 -> 别名"映射
 * 例：FROM rgjslb AS t => { t: 'rgjslb', rgjslb: 'rgjslb' }
 */
function parseTableAliasMap(sql: string, tableList: Array<{ tableName: string }>): Record<string, string> {
  const map: Record<string, string> = {};
  // 匹配 FROM/JOIN 表名 [AS] 别名
  const reg = /(?:from|join)\s+`?(\w+)`?(?:\s+(?:as\s+)?`?(\w+)`?)?/gi;
  let m: RegExpExecArray | null;
  while ((m = reg.exec(sql)) !== null) {
    const rawName = m[1];
    const alias = m[2];
    // 找到与 tableList 匹配的真实表名（不区分大小写）
    const matched = tableList.find(
      (t) => t.tableName.toLowerCase() === rawName.toLowerCase()
    );
    const realName = matched ? matched.tableName : rawName;
    map[realName] = realName; // 表名本身也可以作为前缀
    if (alias) {
      map[alias] = realName; // 别名 -> 真实表名
    }
  }
  return map;
}

/**
 * 从 AI 流式回复中提取 SQL：优先 ```sql 围栏代码块，其次 "sql" JSON 字段，否则返回全文
 */
function extractSqlFromAiText(text: string): string {
  const fenced = text.match(/```sql\s*([\s\S]*?)```/i) || text.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]?.trim()) return fenced[1].trim();
  const jsonField = text.match(/"sql"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (jsonField?.[1]) {
    try {
      return JSON.parse(`"${jsonField[1]}"`);
    } catch {
      return jsonField[1];
    }
  }
  return text.trim();
}

/**
 * SQL 模式编辑器（Monaco Editor）
 * - SQL 语法高亮
 * - 字段名自动提示（支持别名识别：`select t.` 可提示 rgjslb 的字段）
 * - 表名自动提示
 * - 一键格式化 SQL
 */
const SqlModeEditor: React.FC<Props> = ({
  sourceId,
  sourceType,
  dataSourceList = [],
  onDatasourceChange,
  tableList = [],
  value,
  onChange,
  height = '100%',
  onRun,
  runLoading,
  onSave,
  onExit,
  tableSelection = {},
  onTableSelectionChange,
}) => {
  const monaco = useMonaco();
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [nlInput, setNlInput] = useState('');
  // AI 生成 SQL：发送 loading、流式内容缓冲与请求中止控制
  const [sendLoading, setSendLoading] = useState(false);
  const aiBufferRef = useRef('');
  const aiDoneRef = useRef(false);
  const sendAbortRef = useRef<AbortController | null>(null);
  // 选择表抽屉开关；勾选结果由父组件持有（随数据集保存/回显）
  const [tablePickerOpen, setTablePickerOpen] = useState(false);
  // 缓存每张表的字段列表：{ tableName -> [{ originName, comment }] }
  const fieldsCache = useRef<Record<string, Array<{ originName: string; comment: string }>>>({});
  // 保存 completionProvider dispose 函数，切换数据源时清理
  const providerRef = useRef<Monaco.IDisposable | null>(null);
  // 用 ref 保持最新的 tableList / sourceId / sourceType，避免闭包陷阱
  const tableListRef = useRef(tableList);
  const sourceIdRef = useRef(sourceId);
  const sourceTypeRef = useRef(sourceType);

  useEffect(() => { tableListRef.current = tableList; }, [tableList]);
  useEffect(() => { sourceIdRef.current = sourceId; }, [sourceId]);
  useEffect(() => { sourceTypeRef.current = sourceType; }, [sourceType]);

  /** 按需获取表字段（带缓存），返回 { originName, comment } 数组 */
  const fetchFields = useCallback(async (tableName: string): Promise<Array<{ originName: string; comment: string }>> => {
    if (fieldsCache.current[tableName]) return fieldsCache.current[tableName];
    try {
      const res = await getFieldByDataSource({
        sourceId: sourceIdRef.current,
        sourceType: sourceTypeRef.current,
        tableName,
      });
      const fields = (res.data || []).map((f: any) => ({
        originName: f.originName || f.fieldName || f.columnName || f.name || '',
        comment: f.name || '',
      })).filter((f: any) => f.originName);
      fieldsCache.current[tableName] = fields;
      return fields;
    } catch {
      fieldsCache.current[tableName] = [];
      return [];
    }
  }, []);

  /** 数据源切换时清空字段缓存（勾选记录由父组件在切换数据源时清空） */
  useEffect(() => {
    fieldsCache.current = {};
  }, [sourceId]);

  /** 注册 Monaco SQL 自动补全 Provider */
  useEffect(() => {
    if (!monaco) return;

    // 清理上一个 provider
    providerRef.current?.dispose();

    providerRef.current = monaco.languages.registerCompletionItemProvider('sql', {
      // 触发字符：空格、点、字母
      triggerCharacters: ['.', ' ', '`'],
      provideCompletionItems: async (
        model: Monaco.editor.ITextModel,
        position: Monaco.Position
      ): Promise<Monaco.languages.CompletionList> => {
        const fullSql = model.getValue();
        const wordInfo = model.getWordUntilPosition(position);
        const range: Monaco.IRange = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endColumn: wordInfo.endColumn,
        };

        // 取光标前的一段文本，判断是否是 "前缀." 场景
        const lineText = model.getLineContent(position.lineNumber);
        const textBeforeCursor = lineText.slice(0, position.column - 1);
        const dotMatch = textBeforeCursor.match(/(\w+)\.(\w*)$/);

        if (dotMatch) {
          // "前缀." 场景：提示字段名
          const prefix = dotMatch[1]; // 可能是表名或别名
          const aliasMap = parseTableAliasMap(fullSql, tableListRef.current);
          const realTableName = aliasMap[prefix]
            || tableListRef.current.find(
              (t) => t.tableName.toLowerCase() === prefix.toLowerCase()
            )?.tableName;

          if (realTableName) {
            const fields = await fetchFields(realTableName);
            const fieldRange: Monaco.IRange = {
              startLineNumber: position.lineNumber,
              endLineNumber: position.lineNumber,
              startColumn: position.column - dotMatch[2].length,
              endColumn: position.column,
            };
            return {
              suggestions: fields.map((f) => ({
                label: f.originName,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: f.originName,
                detail: f.comment ? `${f.comment} (${realTableName})` : `字段名 (${realTableName})`,
                range: fieldRange,
                sortText: '0' + f.originName,
              })),
            };
          }
          return { suggestions: [] };
        }

        // 普通场景：提示表名 + 已缓存的字段名
        const tableItems: Monaco.languages.CompletionItem[] = tableListRef.current.map((t) => ({
          label: t.tableName,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: t.tableName,
          detail: '表名',
          range,
          sortText: '1' + t.tableName,
        }));

        // 已缓存的字段也一起提示
        const fieldItems: Monaco.languages.CompletionItem[] = [];
        Object.entries(fieldsCache.current).forEach(([tName, fields]) => {
          fields.forEach((f) => {
            fieldItems.push({
              label: f.originName,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: f.originName,
              detail: f.comment ? `${f.comment} (${tName})` : `字段名 (${tName})`,
              range,
              sortText: '2' + f.originName,
            });
          });
        });

        return { suggestions: [...tableItems, ...fieldItems] };
      },
    });

    return () => {
      providerRef.current?.dispose();
    };
  }, [monaco, fetchFields]);

  /** SQL 格式化 */
  const handleFormat = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const currentValue = editor.getValue();
    if (!currentValue) return;
    try {
      const formatted = format(currentValue, {
        language: 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
        linesBetweenQueries: 1,
      });
      editor.setValue(formatted);
      onChange?.(formatted);
    } catch {
      // 格式化失败时不处理
    }
  }, [onChange]);

  /** 卸载时中止未完成的 AI 生成请求 */
  useEffect(() => {
    return () => {
      sendAbortRef.current?.abort();
    };
  }, []);

  /** 流结束后统一收尾：提取 SQL 写入编辑器（onmessage 可能零触发，收尾逻辑放 onclose 兼顾 [DONE]） */
  const finishAiGenerate = useCallback(() => {
    if (aiDoneRef.current) return;
    // 请求已中止（组件卸载）时不再收尾
    if (sendAbortRef.current?.signal.aborted) return;
    aiDoneRef.current = true;
    setSendLoading(false);
    const fullText = aiBufferRef.current;
    if (!fullText.trim()) {
      message.warning('AI 未返回内容，请重试');
      return;
    }
    const sql = extractSqlFromAiText(fullText);
    editorRef.current?.setValue(sql);
    onChange?.(sql);
  }, [onChange]);

  /** 点击发送：调用 sql-template 流式接口，用自然语言生成 SQL */
  const handleSend = useCallback(async () => {
    const question = nlInput.trim();
    if (!question) {
      message.warning('请输入描述内容');
      return;
    }
    if (!sourceId || !sourceType) {
      message.warning('请先选择数据源');
      return;
    }
    // db_name 取自数据源列表接口返回的 configuration JSON
    let dbName = '';
    try {
      const cur = dataSourceList.find((d) => String(d.sourceId) === String(sourceId));
      dbName = JSON.parse(cur?.configuration || '{}')?.dbName || '';
    } catch {
      // configuration 解析失败按缺失处理
    }
    if (!dbName) {
      message.warning('当前数据源缺少数据库名配置，无法使用 AI 生成');
      return;
    }

    sendAbortRef.current?.abort();
    const controller = new AbortController();
    sendAbortRef.current = controller;
    aiBufferRef.current = '';
    aiDoneRef.current = false;
    setSendLoading(true);

    try {
      await streamSqlTemplate({
        messages: question,
        sourceId,
        sourceType,
        dbName,
        signal: controller.signal,
        onmessage: (event) => {
          if (!event.data) return;
          if (event.data === '[DONE]') {
            finishAiGenerate();
            return;
          }
          // OpenAI 兼容格式：增量内容在 choices[0].delta.content；非 JSON 则直接当文本累加
          let chunk = event.data;
          try {
            const parsed = JSON.parse(event.data);
            const delta = parsed?.choices?.[0]?.delta?.content;
            chunk = typeof delta === 'string' ? delta : '';
          } catch {
            // 保留原始文本
          }
          aiBufferRef.current += chunk;
        },
        onclose: () => {
          finishAiGenerate();
        },
        onerror: () => {
          if (!aiDoneRef.current) {
            aiDoneRef.current = true;
            setSendLoading(false);
            message.error('AI 生成 SQL 失败，请重试');
          }
        },
      });
      // 部分环境下流正常结束不触发 onclose，这里再收尾一次（有 aiDoneRef 去重）
      finishAiGenerate();
    } catch {
      if (!aiDoneRef.current) {
        aiDoneRef.current = true;
        setSendLoading(false);
        message.error('AI 生成 SQL 失败，请重试');
      }
    }
  }, [nlInput, sourceId, sourceType, dataSourceList, finishAiGenerate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* 顶部自然语言输入栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: 42,
          padding: '2px 12px 2px 16px',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          flexShrink: 0,
          gap: 10,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'linear-gradient(180deg, #c8dcff 0%, #4d8ef0 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            color: '#fff',
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          AI
        </div>
        <Input
          bordered={false}
          placeholder="在这里输入纯文本语句"
          style={{ flex: 1, fontSize: 13 }}
          value={nlInput}
          disabled={sendLoading}
          onChange={(e) => setNlInput(e.target.value)}
          onPressEnter={handleSend}
        />
        <Tooltip title="发送">
          <Button
            type="primary"
            size="small"
            loading={sendLoading}
            onClick={handleSend}
            style={{ width: 32, height: 26, padding: 0, flexShrink: 0, background: '#3467FF', borderColor: '#3467FF' }}
          >
            {!sendLoading && (
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            )}
          </Button>
        </Tooltip>
        <Tooltip title="选择表">
          <div
            style={{
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 6,
              color: Object.keys(tableSelection).length ? '#3467FF' : '#666',
              flexShrink: 0,
              lineHeight: 1,
            }}
            onClick={() => setTablePickerOpen(true)}
          >
            <TableOutlined style={{ fontSize: 16 }} />
          </div>
        </Tooltip>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Editor
          height="100%"
          language="sql"
          value={value}
          onChange={(val) => onChange?.(val ?? '')}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            wordWrap: 'on',
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            tabSize: 2,
            lineNumbers: 'on',
            padding: { top: 8 },
          }}
        />
      </div>
      {/* 底部操作栏 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 12px',
          background: '#fff',
          flexShrink: 0,
        }}
      >
        <AButton
          className="btn-accent-gradient"
          icon={<PlayCircleOutlined />}
          loading={runLoading}
          onClick={onRun}
        >
          执行
        </AButton>
        <AButton className="btn-ghost-v5" onClick={onSave}>
          保存
        </AButton>
        <AButton className="btn-ghost-v5" onClick={handleFormat}>
          格式化
        </AButton>
        <AButton
          className="btn-accent-gradient"
          onClick={onExit}
        >
          退出编辑
        </AButton>
        {/* 右侧数据源信息展示 */}
        {sourceId && dataSourceList.length > 0 && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <ApiOutlined style={{ color: '#3467FF', fontSize: 13 }} />
            <span style={{ fontSize: 12, color: '#555', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dataSourceList.find(d => String(d.sourceId) === String(sourceId))?.sourceName || '--'}
            </span>
            <DatabaseOutlined style={{ color: '#666', fontSize: 13 }} />
            <span style={{ fontSize: 12, color: '#555', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dataSourceList.find(d => String(d.sourceId) === String(sourceId))?.sourceType || '--'}
            </span>
          </div>
        )}
      </div>
      {/* 选择表抽屉：表/字段勾选；key 绑定数据源，切换数据源时重置抽屉内部字段缓存 */}
      <TableFieldPickerDrawer
        key={sourceId || 'none'}
        open={tablePickerOpen}
        tableList={tableList}
        value={tableSelection}
        fetchFields={fetchFields}
        onCancel={() => setTablePickerOpen(false)}
        onConfirm={(selection) => {
          onTableSelectionChange?.(selection);
          setTablePickerOpen(false);
        }}
      />
    </div>
  );
};

export default SqlModeEditor;
