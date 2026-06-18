import {
  ArrowLeftOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Button, Checkbox, Drawer, Input, Modal, Radio, Spin, Switch, Tag, Tooltip, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { queryToolListApi } from '@/service/api/tool';
import type { ToolItem } from '@/service/api/tool';
import { queryMcpList } from '@/service/api/pulg';
import { fetchAppDetailApi, addAppApi, updateAppApi } from '@/service/api/abi-chat-app';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';

/**
 * 助手新增/编辑 - 全屏 Drawer
 * 左（助手画像）/ 中（基础配置 / 知识 / 能力）/ 右（调试预览）
 */

interface Props {
  agent?: AgentMock | null;
  groupId?: number;
  onClose: (refresh?: boolean) => void;
}

export interface AgentMock {
  id: string | number;
  name: string;
  iconBg?: string;
  iconLetter?: string;
  description?: string;
  prompt?: string;
  groupId?: number | string;
  /** status: '0'草稿 | '1'发布 | '2'下线 */
  status?: '0' | '1' | '2';
}

// 默认提示词模板（图片中的"投资顾问"prompt）
const DEFAULT_PROMPT = `## 角色
你是一个投资顾问，专门利用先进的技术和算法，为用户提供实时的股票价格查询和市场行情分析，帮助用户做出更明智的投资决策。

## 技能
1. 实时股票价格查询：
  - 提供实时的股票价格信息，包括开盘价、最高价、最低价和收盘价等。
  - 支持多个股票市场和交易所的股票价格查询，包括但不限于美股、港股和A股等。
  - 提供股票的实时交易量和市值等额外信息，帮助用户更全面地了解股票的实时表现。

2. 市场行情分析：
  - 分析股票市场的整体趋势，包括市场上涨或下跌的原因分析。
  - 提供重要经济数据和事件的分析，如GDP增长率、失业率、利率变动等，以及这些数据和事件对市场的潜在影响。
  - 分析个股的表现，包括财务报告分析、行业地位、竞争对手比较等，以提供更深入的个股研究。
  - 提供投资策略和建议，如分散投资、长期持有等，帮助用户根据市场行情做出投资决策。

## 限制
- 仅提供与股票市场相关的信息和分析，不涉及其他类型的投资，如债券、期货、外汇等。
- 所有提供的数据和分析仅供参考，不构成具体的投资建议。
- 不能提供实时交易或交易执行服务，仅限于提供信息和分析。`;

// 推荐问题
const RECOMMEND_QUESTIONS = [
  '如何查询特定股票的实时价格和交易量？',
  '市场行情有哪些重要的经济数据和事件需要关注？',
  '你能提供哪些投资策略和建议来应对当前的市场行情？'
];

// 折叠面板分组
type SectionKey = 'model' | 'opening' | 'knowledge' | 'tools' | 'skills' | 'questions';

const AssistantEditDrawer: React.FC<Props> = ({ agent, groupId: propsGroupId, onClose }) => {
  const spaceId = useAppSelector(getSpaceId);
  const isEdit = !!agent?.id;

  const [name, setName] = useState<string>(agent?.name || '');
  const [editingName, setEditingName] = useState(false);
  const [prompt, setPrompt] = useState<string>(agent?.prompt || '');
  const [description, setDescription] = useState<string>(agent?.description || '');
  // status: '0'草稿 '1'发布 '2'下线
  const [status, setStatus] = useState<'0' | '1' | '2'>(agent?.status || '0');
  // 调试模式 enable_debug: '0'禁用 '1'启用
  const [enableDebug, setEnableDebug] = useState(false);
  // 公开访问 public_access: '0'关闭(私密) '1'开启(空间可见)
  const [publicAccess, setPublicAccess] = useState<'0' | '1'>('1');
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  // rec_query 推荐问题列表
  const [recQuestions, setRecQuestions] = useState<string[]>([]);
  const [recDrawerOpen, setRecDrawerOpen] = useState(false);
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchText, setBatchText] = useState('');

  const handleBatchAdd = () => {
    const lines = batchText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      setRecQuestions(prev => [...prev, ...lines]);
      message.success(`已添加 ${lines.length} 个推荐问题`);
    }
    setBatchText('');
    setBatchModalOpen(false);
  };

  const handleDeleteQuestion = (index: number) => {
    setRecQuestions(prev => prev.filter((_, i) => i !== index));
  };

  // ── 工具选择 ──
  type ToolGroupKey = 'mcp' | 'builtin';
  type ToolOption = { id: string; name: string; group: ToolGroupKey; description?: string };

  const [mcpTools, setMcpTools] = useState<ToolOption[]>([]);
  const [builtinTools, setBuiltinTools] = useState<ToolOption[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [loadingTools, setLoadingTools] = useState(false);

  /** 加载助手详情 */
  async function loadDetail() {
    if (!agent?.id) return;
    setLoadingDetail(true);
    try {
      const res: any = await fetchAppDetailApi({ appId: agent.id });
      // createFlatRequest 返回 { data, error, response }，data 即为解包后的详情
      const d = res?.data ?? res?.response?.data?.data ?? res;
      if (d) {
        setName(d.appName ?? d.name ?? '');
        setPrompt(d.appPrompt ?? d.prompt ?? '');
        setDescription(d.description ?? '');
        setStatus((d.status as any) ?? '0');
        setEnableDebug(String(d.enableDebug) === '1');
        setPublicAccess(String(d.publicAccess) === '1' ? '1' : '0');
        const rq = d.recQuery ?? [];
        setRecQuestions(Array.isArray(rq) ? rq.map((q: any) => typeof q === 'string' ? q : q?.question ?? '') : []);
        // 回填工具选中状态
        if (Array.isArray(d.tools)) {
          const ids = new Set<string>();
          d.tools.forEach((t: any) => {
            const toolType = t.toolType === '2' || t.toolType === 'mcp' ? 'mcp' : 'builtin';
            const cfg = t.toolConfig;
            if (Array.isArray(cfg)) {
              cfg.forEach((c: any) => ids.add(`${toolType}_${c.id}`));
            }
          });
          setSelectedToolIds(ids);
        }
      }
    } catch {
      message.error('加载助手详情失败');
    } finally {
      setLoadingDetail(false);
    }
  }

  useEffect(() => {
    if (agent?.id) loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agent?.id]);

  /** 构建提交数据 */
  function buildPayload(overrideStatus?: string) {
    const toolConfigs = Array.from(selectedToolIds).map(id => {
      const [group, ...rest] = id.split('_');
      const toolId = rest.join('_');
      return {
        toolType: group === 'mcp' ? '2' : '1',
        toolConfig: [{ type: 'tool', id: Number(toolId) || toolId }]
      };
    });
    const payload: any = {
      appName: name,
      spaceId,
      groupId: isEdit ? (agent?.groupId ?? 0) : (propsGroupId ?? 0),
      description,
      appPrompt: prompt,
      prologue: '',
      recQuery: recQuestions,
      status: overrideStatus ?? status,
      enableDebug: enableDebug ? '1' : '0',
      publicAccess,
      tools: toolConfigs,
    };
    if (isEdit && agent?.id) {
      payload.appId = agent.id;
    }
    return payload;
  }

  /** 保存：状态设为草稿 */
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = buildPayload('0');
      if (isEdit) {
        await updateAppApi(payload);
      } else {
        await addAppApi(payload);
      }
      setStatus('0');
      message.success('已保存为草稿');
      onClose(true);
    } catch (err: any) {
      message.error(err?.message ?? '保存失败');
    } finally {
      setSaving(false);
    }
  };

  /** 上线：状态设为发布 */
  const handlePublish = async () => {
    setSaving(true);
    try {
      const payload = buildPayload('1');
      if (isEdit) {
        await updateAppApi(payload);
      } else {
        await addAppApi(payload);
      }
      setStatus('1');
      message.success('已上线，状态设为发布');
      onClose(true);
    } catch (err: any) {
      message.error(err?.message ?? '发布失败');
    } finally {
      setSaving(false);
    }
  };

  async function fetchToolGroups() {
    setLoadingTools(true);
    try {
      const [mcpRes, builtinRes]: any[] = await Promise.all([
        queryMcpList({ pageNo: 1, pageSize: 200 }),
        queryToolListApi({})
      ]);
      const mcpPayload = mcpRes?.response?.data?.data?.data ?? {};
      const mcpItems: any[] = mcpPayload.pageItems ?? [];
      setMcpTools(mcpItems.map((m: any) => ({
        id: `mcp_${m.id}`,
        name: m.name || m.pluginName || '-',
        group: 'mcp' as ToolGroupKey,
        description: m.description || ''
      })));
      const bRows = builtinRes?.response?.data?.data || builtinRes?.data?.data || builtinRes?.data || [];
      const bList: ToolItem[] = Array.isArray(bRows) ? bRows : [];
      setBuiltinTools(bList.map(t => ({
        id: `builtin_${t.toolId}`,
        name: t.toolName || '-',
        group: 'builtin' as ToolGroupKey,
        description: t.description || ''
      })));
    } catch {
      setMcpTools([]);
      setBuiltinTools([]);
    } finally {
      setLoadingTools(false);
    }
  }

  useEffect(() => { fetchToolGroups(); }, []);

  const allToolOptions = useMemo(() => [...mcpTools, ...builtinTools], [mcpTools, builtinTools]);

  function handleGroupCheck(group: ToolGroupKey, checked: boolean) {
    const ids = allToolOptions.filter(t => t.group === group).map(t => t.id);
    setSelectedToolIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => checked ? next.add(id) : next.delete(id));
      return next;
    });
  }
  function handleToolCheck(id: string, checked: boolean) {
    setSelectedToolIds(prev => {
      const next = new Set(prev);
      checked ? next.add(id) : next.delete(id);
      return next;
    });
  }
  function isGroupAllChecked(group: ToolGroupKey) {
    const items = allToolOptions.filter(t => t.group === group);
    return items.length > 0 && items.every(t => selectedToolIds.has(t.id));
  }
  function isGroupIndeterminate(group: ToolGroupKey) {
    const items = allToolOptions.filter(t => t.group === group);
    const c = items.filter(t => selectedToolIds.has(t.id)).length;
    return c > 0 && c < items.length;
  }

  const [openMap, setOpenMap] = useState<Record<SectionKey, boolean>>({
    knowledge: false,
    model: false,
    opening: false,
    questions: false,
    skills: false,
    tools: true
  });

  const toggle = (key: SectionKey) => setOpenMap(p => ({ ...p, [key]: !p[key] }));

  const headerIcon = useMemo(
    () => (
      <div
        style={{
          alignItems: 'center',
          background: '#fa8c16',
          borderRadius: 6,
          color: '#fff',
          display: 'flex',
          fontSize: 14,
          fontWeight: 700,
          height: 24,
          justifyContent: 'center',
          width: 24
        }}
      >
        =
      </div>
    ),
    []
  );

  return (
    <Drawer
      open
      destroyOnClose
      closable={false}
      placement="right"
      width="100%"
      bodyStyle={{ background: '#FCFDFF', padding: 0 }}
      headerStyle={{ display: 'none' }}
      onClose={() => onClose(false)}
    >
      <Spin spinning={loadingDetail}>
      {/* 顶部栏 */}
      <div
        style={{
          alignItems: 'center',
          background: '#FCFDFF',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          height: 56,
          padding: '0 16px'
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => onClose(false)}
        />
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginLeft: 8 }}>
          {headerIcon}
          {editingName ? (
            <Input
              autoFocus
              size="small"
              style={{ width: 200 }}
              value={name}
              onBlur={() => setEditingName(false)}
              onChange={e => setName(e.target.value)}
              onPressEnter={() => setEditingName(false)}
            />
          ) : (
            <>
              <span style={{ fontSize: 16, fontWeight: 600 }}>{name}</span>
              <EditOutlined
                style={{ color: '#999', cursor: 'pointer' }}
                onClick={() => setEditingName(true)}
              />
            </>
          )}
        </div>
        <div style={{ alignItems: 'center', display: 'flex', gap: 8, marginLeft: 'auto' }}>
          <Button loading={saving} onClick={handleSave}>保存</Button>
          <Button
            loading={saving}
            type="primary"
            onClick={handlePublish}
          >
            上线
          </Button>
        </div>
      </div>

      {/* 三栏主体 */}
      <div
        style={{
          display: 'grid',
          gap: 0,
          gridTemplateColumns: '1fr 1fr 1fr',
          height: 'calc(100vh - 56px)'
        }}
      >
        {/* 左：助手画像 */}
        <div style={{ background: '#FCFDFF', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader title="助手配置" />
          <div style={{ padding: '12px 16px 0' }}>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>助手画像</span>
              <Button
                icon={<ThunderboltOutlined />}
                size="small"
                style={{ color: '#1677ff' }}
                type="link"
              >
                自动优化
              </Button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '8px 16px 16px' }}>
            <Input.TextArea
              bordered={false}
              style={{ height: '100%', resize: 'none' }}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {/* 中：基础配置 / 知识 / 能力 */}
        <div style={{ background: '#FCFDFF', borderRight: '1px solid #f0f0f0', overflow: 'auto' }}>
          <GroupTitle title="基础配置" />
          <CollapseRow
            open={openMap.model}
            title="AI模型配置"
            onToggle={() => toggle('model')}
          />
          <CollapseRow
            open={openMap.opening}
            title="开场引导"
            onToggle={() => toggle('opening')}
          />

          <GroupTitle title="知识" />
          <CollapseRow
            open={openMap.knowledge}
            title="知识库"
            onToggle={() => toggle('knowledge')}
          />

          <GroupTitle title="能力" />
          <CollapseRow
            extra={<PlusOutlined style={{ color: '#999' }} />}
            open={openMap.tools}
            title="工具"
            onToggle={() => toggle('tools')}
          >
            {/* MCP工具分组 */}
            <div style={{ padding: '4px 24px 8px' }}>
              <div
                style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: 8, paddingBottom: 4, userSelect: 'none' }}
                onClick={() => handleGroupCheck('mcp', !isGroupAllChecked('mcp'))}
              >
                <Checkbox
                  checked={isGroupAllChecked('mcp')}
                  indeterminate={isGroupIndeterminate('mcp')}
                  onChange={e => handleGroupCheck('mcp', e.target.checked)}
                  onClick={e => e.stopPropagation()}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#595959' }}>MCP工具</span>
                <span style={{ color: '#bfbfbf', fontSize: 11 }}>({mcpTools.length})</span>
              </div>
              {mcpTools.length === 0 ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '4px 0 4px 28px' }}>暂无MCP工具</div>
              ) : (
                mcpTools.map(item => (
                  <div
                    key={item.id}
                    style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: 10, padding: '6px 0 6px 28px', userSelect: 'none' }}
                    onClick={() => handleToolCheck(item.id, !selectedToolIds.has(item.id))}
                  >
                    <Checkbox
                      checked={selectedToolIds.has(item.id)}
                      onChange={e => handleToolCheck(item.id, e.target.checked)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{ alignItems: 'center', background: '#fff7e6', borderRadius: 6, color: '#fa8c16', display: 'flex', height: 24, justifyContent: 'center', width: 24, flexShrink: 0 }}>
                      <ThunderboltOutlined style={{ fontSize: 14 }} />
                    </div>
                    <Tooltip title={item.description || item.name}>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </Tooltip>
                  </div>
                ))
              )}
            </div>

            {/* 内置工具分组 */}
            <div style={{ padding: '4px 24px 8px' }}>
              <div
                style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: 8, paddingBottom: 4, userSelect: 'none' }}
                onClick={() => handleGroupCheck('builtin', !isGroupAllChecked('builtin'))}
              >
                <Checkbox
                  checked={isGroupAllChecked('builtin')}
                  indeterminate={isGroupIndeterminate('builtin')}
                  onChange={e => handleGroupCheck('builtin', e.target.checked)}
                  onClick={e => e.stopPropagation()}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#595959' }}>内置工具</span>
                <span style={{ color: '#bfbfbf', fontSize: 11 }}>({builtinTools.length})</span>
              </div>
              {builtinTools.length === 0 ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '4px 0 4px 28px' }}>暂无内置工具</div>
              ) : (
                builtinTools.map(item => (
                  <div
                    key={item.id}
                    style={{ alignItems: 'center', cursor: 'pointer', display: 'flex', gap: 10, padding: '6px 0 6px 28px', userSelect: 'none' }}
                    onClick={() => handleToolCheck(item.id, !selectedToolIds.has(item.id))}
                  >
                    <Checkbox
                      checked={selectedToolIds.has(item.id)}
                      onChange={e => handleToolCheck(item.id, e.target.checked)}
                      onClick={e => e.stopPropagation()}
                    />
                    <div style={{ alignItems: 'center', background: '#fff7e6', borderRadius: 6, color: '#fa8c16', display: 'flex', height: 24, justifyContent: 'center', width: 24, flexShrink: 0 }}>
                      <ThunderboltOutlined style={{ fontSize: 14 }} />
                    </div>
                    <Tooltip title={item.description || item.name}>
                      <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </Tooltip>
                  </div>
                ))
              )}
            </div>
          </CollapseRow>

          <CollapseRow
            extra={
              <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <QuestionCircleOutlined style={{ color: '#bfbfbf' }} />
                <PlusOutlined style={{ color: '#999' }} />
              </span>
            }
            open={openMap.skills}
            title="技能"
            titleExtra={<QuestionCircleOutlined style={{ color: '#bfbfbf', marginLeft: 4 }} />}
            onToggle={() => toggle('skills')}
          />

          {/* 推荐问题 */}
          <CollapseRow
            extra={
              <PlusOutlined
                style={{ color: '#999' }}
                onClick={e => { e.stopPropagation(); setRecDrawerOpen(true); }}
              />
            }
            open={openMap.questions}
            title="推荐问题"
            onToggle={() => toggle('questions')}
          >
            {recQuestions.length === 0 ? (
              <div style={{ color: '#bfbfbf', fontSize: 13, padding: '6px 24px' }}>暂无推荐问题</div>
            ) : (
              recQuestions.slice(0, 3).map((q, i) => (
                <div
                  key={i}
                  style={{ color: '#595959', fontSize: 13, padding: '5px 24px', lineHeight: 1.6 }}
                >
                  {i + 1}. {q}
                </div>
              ))
            )}
            {recQuestions.length > 3 && (
              <div
                style={{ color: '#1677ff', cursor: 'pointer', fontSize: 12, padding: '4px 24px' }}
                onClick={() => setRecDrawerOpen(true)}
              >
                查看全部 {recQuestions.length} 条
              </div>
            )}
          </CollapseRow>

          {/* 开启调试模式 */}
          <div
            style={{
              alignItems: 'center',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 16px'
            }}
          >
            <span style={{ color: '#262626', fontSize: 14 }}>开启调试模式</span>
            <Switch
              checked={enableDebug}
              onChange={setEnableDebug}
            />
          </div>

          {/* 访问权限 */}
          <div
            style={{
              alignItems: 'center',
              borderTop: '1px solid #f0f0f0',
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '14px 16px'
            }}
            onClick={() => setVisibilityModalOpen(true)}
          >
            <span style={{ color: '#262626', fontSize: 14 }}>访问权限</span>
            <span style={{ color: '#8c8c8c', fontSize: 13 }}>
              {publicAccess === '1' ? '空间可见' : '仅自己可见'}
              <CaretRightOutlined style={{ fontSize: 11, marginLeft: 4 }} />
            </span>
          </div>

          {/* 可见范围弹窗 */}
          <Modal
            centered
            destroyOnClose
            open={visibilityModalOpen}
            title="可见范围"
            width={420}
            okText="确定"
            cancelText="取消"
            onOk={() => setVisibilityModalOpen(false)}
            onCancel={() => setVisibilityModalOpen(false)}
          >
            <Radio.Group
              style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: '20px 0' }}
              value={publicAccess}
              onChange={e => setPublicAccess(e.target.value)}
            >
              <Radio value="1">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 4 }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                    <GlobalOutlined style={{ fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>空间</span>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 12, paddingLeft: 26 }}>此组织中的所有人都可以查看并参与</div>
                </div>
              </Radio>
              <Radio value="0">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginLeft: 4 }}>
                  <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
                    <LockOutlined style={{ fontSize: 16 }} />
                    <span style={{ fontSize: 14, fontWeight: 500 }}>私密</span>
                  </div>
                  <div style={{ color: '#8c8c8c', fontSize: 12, paddingLeft: 26 }}>只有你可以查看并参与</div>
                </div>
              </Radio>
            </Radio.Group>
          </Modal>
        </div>

        {/* 推荐问题管理抖幕 */}
        <Drawer
          destroyOnClose
          open={recDrawerOpen}
          placement="right"
          title="推荐问题"
          width={400}
          extra={
            <Button
              size="small"
              type="primary"
              onClick={() => setBatchModalOpen(true)}
            >
              批量添加
            </Button>
          }
          onClose={() => setRecDrawerOpen(false)}
        >
          {recQuestions.length === 0 ? (
            <div style={{ color: '#bfbfbf', padding: '32px 0', textAlign: 'center' }}>暂无推荐问题</div>
          ) : (
            recQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  alignItems: 'center',
                  borderBottom: '1px solid #f5f5f5',
                  display: 'flex',
                  gap: 8,
                  padding: '10px 0'
                }}
              >
                <span style={{ color: '#bfbfbf', flexShrink: 0, fontSize: 13, width: 24 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13 }}>{q}</span>
                <AButton
                  danger
                  size="small"
                  type="link"
                  onClick={() => handleDeleteQuestion(i)}
                >
                  删除
                </AButton>
              </div>
            ))
          )}
        </Drawer>

        {/* 批量添加问题 Modal */}
        <Modal
          centered
          destroyOnClose
          okText="确认"
          cancelText="取消"
          open={batchModalOpen}
          title="批量添加问题"
          width={560}
          onOk={handleBatchAdd}
          onCancel={() => { setBatchModalOpen(false); setBatchText(''); }}
        >
          <div style={{ color: '#595959', fontSize: 13, marginBottom: 10 }}>
            每行一个问题，提交后将批量创建。
          </div>
          <Input.TextArea
            autoSize={{ minRows: 10, maxRows: 16 }}
            placeholder={`请输入问题，每行一个问题\n例如：\n如何使用这个系统？\n系统支持哪些功能？\n如何导出数据？`}
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
          />
        </Modal>

        {/* 右：调试预览 */}
        <div style={{ background: '#FCFDFF', display: 'flex', flexDirection: 'column' }}>
          <SectionHeader icon={headerIcon} title="调试预览" />
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 24px' }}>
            <div style={{ color: '#bfbfbf', fontSize: 12, marginBottom: 16, textAlign: 'center' }}>
              ----------- 配置已更新 -----------
            </div>
            <div style={{ alignItems: 'flex-start', display: 'flex', gap: 8 }}>
              <div
                style={{
                  alignItems: 'center',
                  background: '#fa8c16',
                  borderRadius: 6,
                  color: '#fff',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  height: 24,
                  justifyContent: 'center',
                  width: 24
                }}
              >
                =
              </div>
              <div
                style={{
                  background: '#f5f5f5',
                  borderRadius: 8,
                  fontSize: 13,
                  lineHeight: 1.7,
                  padding: '10px 14px'
                }}
              >
                你好，我是你的{name}，专注于利用先进技术和算法，为你提供实时的股票价格查询和市场行情分析，帮助你做出更明智的投资决策。
              </div>
            </div>
          </div>

          {/* 推荐问题 + 输入栏 */}
          <div style={{ padding: '8px 24px 16px' }}>
            <div style={{ color: '#8c8c8c', fontSize: 12, marginBottom: 8 }}>推荐问题</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {RECOMMEND_QUESTIONS.map(q => (
                <Tag
                  key={q}
                  color="processing"
                  style={{
                    background: '#f0f5ff',
                    border: '1px solid #adc6ff',
                    borderRadius: 6,
                    color: '#2f54eb',
                    cursor: 'pointer',
                    fontSize: 12,
                    margin: 0,
                    padding: '4px 10px',
                    width: 'fit-content'
                  }}
                >
                  {q}
                </Tag>
              ))}
            </div>
            <Input
              placeholder="请输入问题"
              size="large"
              suffix={<SendOutlined style={{ color: '#bfbfbf' }} />}
            />
          </div>
        </div>
      </div>
      </Spin>
    </Drawer>
  );
};

// 区域大标题（带浅灰背景）
const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({ icon, title }) => (
  <div
    style={{
      alignItems: 'center',
      background: '#FCFDFF',
      borderBottom: '1px solid #f0f0f0',
      display: 'flex',
      gap: 8,
      height: 40,
      padding: '0 16px'
    }}
  >
    {icon}
    <span style={{ fontWeight: 500 }}>{title}</span>
  </div>
);

// 中栏分组小标题
const GroupTitle: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      background: '#FCFDFF',
      color: '#595959',
      fontSize: 13,
      padding: '8px 16px'
    }}
  >
    {title}
  </div>
);

// 折叠行
interface CollapseRowProps {
  title: string;
  open: boolean;
  onToggle: () => void;
  extra?: React.ReactNode;
  titleExtra?: React.ReactNode;
  children?: React.ReactNode;
}
const CollapseRow: React.FC<CollapseRowProps> = ({ children, extra, onToggle, open, title, titleExtra }) => (
  <div style={{ borderBottom: '1px solid #f5f5f5' }}>
    <div
      style={{
        alignItems: 'center',
        cursor: 'pointer',
        display: 'flex',
        height: 44,
        padding: '0 16px'
      }}
      onClick={onToggle}
    >
      {open ? (
        <CaretDownOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />
      ) : (
        <CaretRightOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />
      )}
      <span>{title}</span>
      {titleExtra}
      <span style={{ marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
        {extra}
      </span>
    </div>
    {open && children ? <div style={{ paddingBottom: 8 }}>{children}</div> : null}
  </div>
);

export default AssistantEditDrawer;
