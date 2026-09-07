import { useDebounceFn } from 'ahooks';
import type { TableColumnsType } from 'antd';
import { Form, message } from 'antd';
import { BulbOutlined, DatabaseOutlined } from '@ant-design/icons';
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import Star from '../../../../../components/star/index.tsx';
import { semanticModify } from '@/service/api/data-table-meaning';
import { assembleData, streamlinedData } from '../modules/semantics-table';
import { useTableStore } from '../store/useTableStore.ts';
import type { DataTypea } from '../types/index';
import { getDefaultSemanticType, getSemanticTypeByFieldType, getSemanticTypeMap, withDateDefaultDesc } from '../utils/getDefaultField.ts';
import { formatField } from '../utils/helper.ts';

import { TableTooltip } from './table-tooltip.tsx';

// 单元格校验规则与原 Form.Item rules 完全一致（required 校验显示原值，maxLength 校验显示值长度）
const TEXT_CELL_MAX: Record<string, { max: number; message: string }> = {
  bizName: { max: 50, message: '中文名称最多50个字符' },
  alias: { max: 200, message: '别名最多200个字符' },
  fieldDesc: { max: 500, message: '字段描述最多500个字符' }
};

interface TextCellProps {
  globalIndex: number;
  name: 'bizName' | 'alias' | 'fieldDesc';
  value?: string;
  placeholder: string;
  required: boolean;
  saveError?: string;
  onCommit: (index: number, name: string, formatted: string) => void;
  onDisplayValue: (index: number, name: string, value: string) => void;
  onClearSaveError: (key: string) => void;
}

/**
 * 文本单元格：不再注册 rc-field-form 表单项（4N 个 Field 的注册+订阅是大表挂载卡顿主因），
 * 改为本地 state 即时回显 + 防抖写 store；外部写入（编辑回显/AI帮填/日期默认描述）经 value 变化同步。
 * 容器沿用 antd Form.Item 类名做纯布局，保证样式与改造前一致
 */
const SemanticTextCell = memo(function SemanticTextCell({
  globalIndex,
  name,
  value,
  placeholder,
  required,
  saveError,
  onCommit,
  onDisplayValue,
  onClearSaveError
}: TextCellProps) {
  const [local, setLocal] = useState(value ?? '');
  const [liveError, setLiveError] = useState<string | undefined>();
  // 记录本单元格最后写入 store 的格式化值，用于区分「防抖回写」与「外部写入」
  const lastWrittenRef = useRef(value ?? '');

  // 挂载时上报显示原值，供保存前全量校验使用（口径与原表单值一致）
  useEffect(() => {
    onDisplayValue(globalIndex, name, value ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 外部写入时同步显示；防抖回写与 lastWritten 相同，跳过以免打断用户输入
  useEffect(() => {
    const next = value ?? '';
    if (next === lastWrittenRef.current) return;
    lastWrittenRef.current = next;
    setLocal(next);
    onDisplayValue(globalIndex, name, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const validate = (v: string) => {
    if (required && v === '') return '输入不能为空';
    const rule = TEXT_CELL_MAX[name];
    return v.length > rule.max ? rule.message : undefined;
  };

  // 防抖写 store（原 debouncedUpdateField 下沉到单元格，保持 300ms 节奏不变）
  const { run: commit } = useDebounceFn((v: string) => onCommit(globalIndex, name, formatField(v)), { wait: 300 });

  const error = saveError ?? liveError;

  return (
    <div className="flex items-center" data-field-type={name}>
      {required && <Star />}
      <div className="ant-form-item mb0">
        <AInput
          placeholder={placeholder}
          value={local}
          status={error ? 'error' : undefined}
          data-field-type={name}
          onChange={e => {
            const v = e.target.value;
            setLocal(v);
            lastWrittenRef.current = formatField(v);
            onDisplayValue(globalIndex, name, v);
            setLiveError(validate(v));
            if (saveError) onClearSaveError(`tableConfig[${globalIndex}].${name}`);
            commit(v);
          }}
        />
        {error && (
          <div className="ant-form-item-explain ant-form-item-explain-connected">
            <div role="alert" className="ant-form-item-explain-error">{error}</div>
          </div>
        )}
      </div>
    </div>
  );
});

interface TypeCellProps {
  globalIndex: number;
  semanticType?: string;
  tableName?: string;
  saveError?: string;
  options: any[];
  onChangeType: (globalIndex: number, value: string, tableName?: string) => void;
}

/**
 * 语义类型单元格：直接受控于 store 值（option 匹配自动显示 label），同样不再注册表单项
 */
const SemanticTypeCell = memo(function SemanticTypeCell({
  globalIndex,
  semanticType,
  tableName,
  saveError,
  options,
  onChangeType
}: TypeCellProps) {
  return (
    <div className="w-40 flex items-center" data-field-type="semantic-type">
      <ASelect
        value={semanticType || undefined}
        options={options}
        status={saveError ? 'error' : undefined}
        style={{ width: 120 }}
        data-field-type="semantic-type"
        data-field-index={globalIndex}
        onChange={value => onChangeType(globalIndex, value, tableName)}
      />
      {!semanticType && (
        <ATooltip title="请选择语义类型">
          <span style={{ color: 'red', marginLeft: 8 }}>⚠️</span>
        </ATooltip>
      )}
    </div>
  );
});

export default function DataTableMeaningTable() {
  const [form] = Form.useForm();
  const { drawerTitle, editObj } = useTableStore();
  const { fields, setFields, tablePrikey, union } = useTableStore();
  const { setTableConfigValidator } = useTableStore();
  const { genderOptions } = useTableStore();
  const [aiLoading, setAiLoading] = useState(false);
  // 保存时全量校验的错误集（key: tableConfig[i].field），单元格编辑后清除
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});

  // 用于存储待更新的字段值，避免频繁更新 store
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;

  // 各单元格显示原值（与原表单值口径一致），供保存前全量校验使用
  const displayValuesRef = useRef<Record<string, string>>({});

  function initForm() {
    const semanticTypeMap = getSemanticTypeMap(JSON.parse(editObj.modelDetail));
    const newFields = fields.map((field: any) => {
      try {
        const { alias, bizName, fieldDesc, semanticType } = semanticTypeMap.get(field.tfieldId);
        // 合并原 updateBizNameOrAlias 兜底：别名/中文名称为空时用技术别名（原来单独 setFields 一次，现在合入同一次写入）
        const nextAlias = alias && String(alias).trim() ? alias : field.tfieldAlias;
        const nextBizName = bizName && String(bizName).trim() ? bizName : field.tfieldAlias;
        return withDateDefaultDesc({
          ...field,
          alias: nextAlias,
          bizName: nextBizName,
          fieldDesc,
          semanticType
        }, semanticType);
      } catch (error) {
        console.error(error);
        return {
          ...field,
          alias: field.tfieldAlias,
          bizName: field.tfieldAlias,
          fieldDesc: '',
          semanticType: ''
        };
      }
    });
    setFields(newFields);
  }

  // 单元格防抖后写入 store（原 debouncedUpdateField，防抖已下沉到各单元格）
  const commitField = useCallback(
    (index: number, name: string, formatted: string) => {
      const newFields = [...fieldsRef.current];
      newFields[index] = { ...newFields[index], [name]: formatted };
      setFields(newFields);
    },
    [setFields]
  );

  const handleDisplayValue = useCallback((index: number, name: string, value: string) => {
    displayValuesRef.current[`tableConfig[${index}].${name}`] = value;
  }, []);

  const clearSaveErrors = useCallback((keys: string[]) => {
    setSaveErrors(prev => {
      if (!keys.some(key => key in prev)) return prev;
      const next = { ...prev };
      keys.forEach(key => delete next[key]);
      return next;
    });
  }, []);

  const clearSaveError = useCallback((key: string) => clearSaveErrors([key]), [clearSaveErrors]);

  // 防抖更新表中文名称的函数
  const { run: debouncedUpdateTableRemarks } = useDebounceFn(
    (tableName: string, rtableId: string, value: string) => {
      const newFields = fieldsRef.current.map((f: any) => {
        if ((f.tableName && f.tableName === tableName) || (f.rtableId && f.rtableId === rtableId)) {
          return { ...f, tableRemarks: value };
        }
        return f;
      });
      setFields(newFields);
    },
    { wait: 300 } // 300ms 防抖延迟
  );

  const handleChangeSemanticType = useCallback(
    (globalIndex: number, value: string, tableName?: string) => {
      const newFields = [...fieldsRef.current];
      const touchedKeys = [`tableConfig[${globalIndex}].semanticType`];

      // 单选主键功能：一个表只能有一个主键
      if (value === 'primary_key') {
        // 遍历所有字段，将同一表的其他主键改为默认类型（包括自动映射的第一个主键）
        newFields.forEach((field: any, idx: number) => {
          // 同一个表且不是当前字段且是主键
          if (field.tableName === tableName && idx !== globalIndex && field.semanticType === 'primary_key') {
            // 根据字段类型自动改成其他类型（不考虑 tablePrikey 映射）
            const defaultType = getSemanticTypeByFieldType(field.fieldType);
            const prevDesc = newFields[idx].fieldDesc;
            newFields[idx] = withDateDefaultDesc({ ...newFields[idx], semanticType: defaultType }, defaultType);
            touchedKeys.push(`tableConfig[${idx}].semanticType`);
            if (newFields[idx].fieldDesc !== prevDesc) touchedKeys.push(`tableConfig[${idx}].fieldDesc`);
          }
        });
      }

      const prevDesc = newFields[globalIndex].fieldDesc;
      newFields[globalIndex] = withDateDefaultDesc({ ...newFields[globalIndex], semanticType: value }, value);
      // 选择日期语义类型后自动填充的默认描述同步到显示（经 store 下发，单元格自行同步）
      if (newFields[globalIndex].fieldDesc !== prevDesc) touchedKeys.push(`tableConfig[${globalIndex}].fieldDesc`);
      setFields(newFields);
      clearSaveErrors(touchedKeys);
    },
    [clearSaveErrors, setFields]
  );

  // 注册保存前全量校验器（原 formTableConfig.validateFields 改为 store 级校验，
  // 规则与原 Form.Item rules 一致；表中文名 tableHeader 仍由 form 校验）
  useEffect(() => {
    setTableConfigValidator(async () => {
      try {
        await form.validateFields();
      } catch (errorInfo: any) {
        return errorInfo?.errorFields?.[0]?.name?.[0] ?? null;
      }
      const errs: Record<string, string> = {};
      let firstKey: null | string = null;
      const push = (key: string, msg: string) => {
        errs[key] = msg;
        if (firstKey === null) firstKey = key;
      };
      fieldsRef.current.forEach((field: any, index: number) => {
        // 校验显示原值（与原表单值口径一致：空格串能过 required、长度含空格）
        const display = (name: string) => displayValuesRef.current[`tableConfig[${index}].${name}`] ?? field[name] ?? '';
        if (!field.semanticType) push(`tableConfig[${index}].semanticType`, '语义类型未选择');
        const bizName = display('bizName');
        if (bizName === '') push(`tableConfig[${index}].bizName`, '输入不能为空');
        else if (bizName.length > TEXT_CELL_MAX.bizName.max) push(`tableConfig[${index}].bizName`, TEXT_CELL_MAX.bizName.message);
        const alias = display('alias');
        if (alias === '') push(`tableConfig[${index}].alias`, '输入不能为空');
        else if (alias.length > TEXT_CELL_MAX.alias.max) push(`tableConfig[${index}].alias`, TEXT_CELL_MAX.alias.message);
        const fieldDesc = display('fieldDesc');
        if (fieldDesc.length > TEXT_CELL_MAX.fieldDesc.max) push(`tableConfig[${index}].fieldDesc`, TEXT_CELL_MAX.fieldDesc.message);
      });
      setSaveErrors(errs);
      return firstKey;
    });
    return () => setTableConfigValidator(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // 编辑模式：加载已保存的语义类型、中文名称、别名、字段描述（含兜底合并）；
    // 新增模式的默认值与兜底已在进入第二步前一次性写入 store（见 semantics-table 的 onNextStep），挂载后不再补写
    if (drawerTitle === '编辑数据语义' && fields && fields.length > 0) {
      initForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawerTitle]);

  // 批量计算默认语义类型（及日期默认描述）兜底：
  // 正常流程已在「下一步」前写入 store（见 semantics-table 的 onNextStep），此处不再触发；
  // 仅覆盖编辑模式 initForm 未能映射的残留字段等场景，绘制前一次 setFields 完成
  useLayoutEffect(() => {
    if (!fields.length) return;
    let changed = false;
    const newFields = fields.map((field: any) => {
      if (field.semanticType) return field;
      const defaultType = getDefaultSemanticType(field, drawerTitle, tablePrikey);
      if (!defaultType) return field;
      changed = true;
      return withDateDefaultDesc({ ...field, semanticType: defaultType }, defaultType);
    });
    if (changed) setFields(newFields);
    // 只依赖 fields、tablePrikey（主键映射影响默认语义类型）与 drawerTitle；写完后第二轮进入即收敛
  }, [fields, tablePrikey, drawerTitle]);

  const tableMeanConfig: TableColumnsType<DataTypea> = [
    {
      dataIndex: 'originName',
      key: 'originName',
      render: (text: string, record: DataTypea) => (
        <span>
          {text}
          <ATooltip title={<div>{record.tableName}</div>}>
            <span style={{ color: 'red', marginLeft: 8 }}>?</span>
          </ATooltip>
        </span>
      ),
      title: '英文名称'
    },
    {
      dataIndex: 'fieldType',
      key: 'fieldType',
      title: '字段类型'
    },
    {
      dataIndex: 'gender',
      key: 'gender',
      render: (_text: string | undefined, record: any) => (
        <SemanticTypeCell
          globalIndex={record.globalIndex}
          semanticType={record.semanticType}
          tableName={record.tableName}
          saveError={saveErrors[`tableConfig[${record.globalIndex}].semanticType`]}
          options={genderOptions}
          onChangeType={handleChangeSemanticType}
        />
      ),
      title: (
        <span>
          语义类型
          <TableTooltip />
        </span>
      )
    },
    {
      dataIndex: 'bizName',
      key: 'bizName',
      render: (_: string, record: any) => (
        <SemanticTextCell
          globalIndex={record.globalIndex}
          name="bizName"
          value={record.bizName}
          placeholder="请输入中文名称(逗号分割)"
          required
          saveError={saveErrors[`tableConfig[${record.globalIndex}].bizName`]}
          onCommit={commitField}
          onDisplayValue={handleDisplayValue}
          onClearSaveError={clearSaveError}
        />
      ),
      title: '中文名称'
    },
    {
      dataIndex: 'alias',
      key: 'alias',
      render: (_: string, record: any) => (
        <SemanticTextCell
          globalIndex={record.globalIndex}
          name="alias"
          value={record.alias}
          placeholder="请输入别名(逗号分割)"
          required
          saveError={saveErrors[`tableConfig[${record.globalIndex}].alias`]}
          onCommit={commitField}
          onDisplayValue={handleDisplayValue}
          onClearSaveError={clearSaveError}
        />
      ),
      title: '别名'
    },
    {
      dataIndex: 'fieldDesc',
      key: 'fieldDesc',
      render: (_: string, record: any) => (
        <SemanticTextCell
          globalIndex={record.globalIndex}
          name="fieldDesc"
          value={record.fieldDesc}
          placeholder="请输入字段描述"
          required={false}
          saveError={saveErrors[`tableConfig[${record.globalIndex}].fieldDesc`]}
          onCommit={commitField}
          onDisplayValue={handleDisplayValue}
          onClearSaveError={clearSaveError}
        />
      ),
      title: '字段描述'
    }
  ];

  // 字段类型分类
  const fieldTypeCategories = {
    // 日期时间字段
    datetime: ['DATE', 'TIME', 'DATETIME', 'TIMESTAMP', 'YEAR', 'INTERVAL'],
    // 字符串字段
    string: ['CHAR', 'VARCHAR', 'TEXT', 'STRING', 'NCHAR', 'NVARCHAR'],
    // 数值字段
    numeric: [
      'TINYINT',
      'SMALLINT',
      'MEDIUMINT',
      'INTEGER',
      'INT',
      'BIGINT',
      'NUMBER',
      'FLOAT',
      'DOUBLE',
      'REAL',
      'DECIMAL',
      'NUMERIC',
      'LONG'
    ]
    // 其他字段: BOOLEAN、BOOL、ENUM、SET、JSON、XML、ARRAY、GEOGRAPHY 等等
  };

  // 获取字段类型的排序优先级 (1: 日期, 2: 字符串, 3: 数值, 4: 其他)
  const getFieldTypePriority = (fieldType: string): number => {
    const upperFieldType = fieldType?.toUpperCase() || '';
    
    // 处理 NUMBER(x,y) 这种带括号的类型
    const baseType = upperFieldType.split('(')[0];
    
    if (fieldTypeCategories.datetime.includes(baseType)) {
      return 1;
    }
    if (fieldTypeCategories.string.includes(baseType)) {
      return 2;
    }
    if (fieldTypeCategories.numeric.includes(baseType)) {
      return 3;
    }
    return 4; // 其他类型
  };

  // 从 union 数据中提取 rtableName 映射
  function getRTableNames(viewData: any) {
    const result: Record<string, string> = {};
    function traverse(node: any, resultMap: Record<string, string>) {
      if (node.currentDs && node.currentDs.rtableId) {
        resultMap[node.currentDs.rtableId] = node.currentDs.rtableName || '';
      }
      for (const child of node.childrenDs || []) {
        traverse(child, resultMap);
      }
    }
    if (viewData && viewData.length > 0) {
      traverse(viewData[0], result);
    }
    return result;
  }

  const rTableNamesMap = union && union.length > 0 ? getRTableNames(union) : {};

  // 按表名分组字段，并保留全局索引
  const groupedFields = fields.reduce((acc: Record<string, Array<DataTypea & { globalIndex: number }>>, field: DataTypea, globalIndex: number) => {
    const tableName = field.tableName || '未命名表';
    if (!acc[tableName]) {
      acc[tableName] = [];
    }
    acc[tableName].push({ ...field, globalIndex });
    return acc;
  }, {} as Record<string, Array<DataTypea & { globalIndex: number }>>);

  // 对每个表内的字段按类型排序
  Object.keys(groupedFields).forEach(tableName => {
    groupedFields[tableName].sort((a: any, b: any) => {
      const priorityA = getFieldTypePriority(a.fieldType);
      const priorityB = getFieldTypePriority(b.fieldType);
      return priorityA - priorityB;
    });
  });

  return (
    <div className="ds-table-config-wrapper">
      <div className="ds-table-config-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 3, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #5b7cf7, #7091fa)', flexShrink: 0, display: 'inline-block' }} />
          字段语义配置
        </span>
        <AButton
          className="btn-ghost-v5"
          icon={<BulbOutlined />}
          loading={aiLoading}
          size="small"
          onClick={async () => {
            // 统一使用当前 fields 实时构造数据（新增、编辑模式一致）
            const modelDetail = JSON.stringify(assembleData(streamlinedData(fieldsRef.current)));
            if (!modelDetail || modelDetail === '{}') {
              message.warning('暂无语义数据可以提交');
              return;
            }
            try {
              setAiLoading(true);
              // 大模型 id 固定为 '16'（后端要求字符串），与 dsl 同级必传（无需查询模型列表）
              const res: any = await semanticModify({ dsl: modelDetail, chat_model_id: '16' });
              // apiRequest 返回完整 axios 响应，需手动解包
              const data: any = res?.data?.data ?? res?.response?.data?.data ?? res?.data ?? res;
              if (!data) {
                message.error('AI帮填失败');
                return;
              }

              // 把 dimensions + measures + identifiers 合并，以 techId 为 key 建立映射表
              const allItems: any[] = [
                ...(data.dimensions || []),
                ...(data.measures || []),
                ...(data.identifiers || [])
              ];
              const techIdMap = new Map<string, any>();
              allItems.forEach((item: any) => {
                if (item.techId) {
                  techIdMap.set(String(item.techId), item);
                }
              });

              // 填充逻辑：有值就用接口返回值，空值保留原有值（新增/编辑模式统一）
              const newFields = fieldsRef.current.map((field: any) => {
                const matched = techIdMap.get(String(field.tfieldId));
                if (!matched) return field;
                const nextSemanticType = (matched.type && String(matched.type).trim()) ? matched.type : field.semanticType;
                return withDateDefaultDesc({
                  ...field,
                  bizName: (matched.bizName && String(matched.bizName).trim()) ? matched.bizName : field.bizName,
                  alias: (matched.alias && String(matched.alias).trim()) ? matched.alias : field.alias,
                  fieldDesc: (matched.fieldDesc && String(matched.fieldDesc).trim()) ? matched.fieldDesc : field.fieldDesc,
                  semanticType: nextSemanticType
                }, nextSemanticType);
              });

              // 填充完成后，检查仍然缺少必填项的字段并提示（不阻止填充）
              const missingItems: string[] = [];
              newFields.forEach((field: any) => {
                const missing: string[] = [];
                if (!field.bizName || !String(field.bizName).trim()) missing.push('中文名称');
                if (!field.alias || !String(field.alias).trim()) missing.push('别名');
                if (!field.semanticType || !String(field.semanticType).trim()) missing.push('语义类型');
                if (missing.length > 0) {
                  const fieldName = field.originName || field.tfieldAlias || String(field.tfieldId);
                  missingItems.push(`${fieldName}（缺少${missing.join('、')}）`);
                }
              });
              setFields(newFields);

              // 单元格显示经 store 更新自动同步；清掉上一次全量校验的错误提示
              setSaveErrors(prev => (Object.keys(prev).length ? {} : prev));

              if (missingItems.length > 0) {
                const displayItems = missingItems.length > 3
                  ? [...missingItems.slice(0, 3), `等${missingItems.length}个字段`]
                  : missingItems;
                message.warning(`AI帮填完成，但以下字段仍缺少必填项：${displayItems.join('；')}`, 5);
              } else {
                message.success('AI帮填成功');
              }
            } catch {
              message.error('AI帮填失败');
            } finally {
              setAiLoading(false);
            }
          }}
        >
          AI帮填
        </AButton>
      </div>
      <AForm form={form}>
        <div className="space-y-5">
          {Object.entries(groupedFields).map(([tableName, tableFields]) => {
            // 获取表的中文名称，从 union 数据中通过 rtableId 获取 rtableName
            const firstField = (tableFields as DataTypea[])[0] as any;
            const rtableId = firstField?.rtableId;
            const rtableName = rtableId ? (rTableNamesMap[rtableId] || '') : '';
            const tableChineseName = (firstField?.tableRemarks && firstField.tableRemarks.trim())
              ? firstField.tableRemarks
              : (rtableName && rtableName.trim() ? rtableName : '');
            
            return (
              <div key={tableName}>
                <div className="ds-table-group-header">
                  <DatabaseOutlined />
                  <span>{tableName}</span>
                  {tableChineseName && (
                    <span style={{ fontWeight: 400, color: '#768a9f', fontSize: 12, marginLeft: 4 }}>
                      ({tableChineseName})
                    </span>
                  )}
                </div>
                <div className="ds-table-group-table">
                  <div style={{ padding: '10px 16px 8px', background: 'rgba(246, 247, 255, 0.4)', borderBottom: '1px solid rgba(130, 140, 200, 0.08)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#3e5068' }}>表中文名：</span>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <Star />
                        <ATooltip 
                          placement="top" 
                          title={form.getFieldValue(`tableHeader[${rtableId || tableName}].rtableName`) || tableChineseName || '请输入表中文名称'}
                        >
                          <AForm.Item
                            className="mb0"
                            initialValue={tableChineseName}
                            name={`tableHeader[${rtableId || tableName}].rtableName`}
                            rules={[{ message: '请输入表中文名称', required: true }, { max: 200, message: '中文名称最多200个字符' }]}
                          >
                            <AInput
                              placeholder="请输入表中文名称"
                              style={{ width: 200 }}
                              data-field-type="table-chinese-name"
                              onChange={e => {
                                const value = e.target.value;
                                form.setFieldValue(`tableHeader[${rtableId || tableName}].rtableName`, value);
                                debouncedUpdateTableRemarks(tableName, rtableId, value);
                              }}
                            />
                          </AForm.Item>
                        </ATooltip>
                      </div>
                    </div>
                  </div>
                  <ATable
                    columns={tableMeanConfig}
                    dataSource={tableFields as DataTypea[]}
                    pagination={false}
                    rowKey="key"
                    size="small"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </AForm>
    </div>
  );
}
