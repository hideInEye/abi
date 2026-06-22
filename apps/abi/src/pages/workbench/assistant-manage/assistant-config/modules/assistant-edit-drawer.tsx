import {
  ArrowLeftOutlined,
  BookOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  ExperimentOutlined,
  GlobalOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SecurityScanOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Button, Checkbox, Drawer, Input, Modal, Radio, Spin, Switch, Tag, Tooltip, message } from 'antd';
import { useEffect, useMemo, useState } from 'react';

import { queryToolListApi } from '@/service/api/tool';
import type { ToolItem } from '@/service/api/tool';
import { queryMcpList } from '@/service/api/pulg';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import React from 'react';

/**
 * 助手新增/编辑 - 全屏 Drawer
 * 左（助手画像）/ 中（基础配置 / 知识 / 能力）/ 右（调试预览）
 */

interface Props {
  visible?: boolean;
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

// ── 工具选择 ──
type ToolGroupKey = 'mcp' | 'builtin';
type ToolOption = { id: string; name: string; group: ToolGroupKey; description?: string };

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
- 所有提供的数据和分析仅供参考，不构成具体的投资建议。s
- 不能提供实时交易或交易执行服务，仅限于提供信息和分析。`;

// 推荐问题
const RECOMMEND_QUESTIONS = [
  '如何查询特定股票的实时价格和交易量？',
  '市场行情有哪些重要的经济数据和事件需要关注？',
  '你能提供哪些投资策略和建议来应对当前的市场行情？'
];

// 折叠面板分组
type SectionKey = 'model' | 'opening' | 'semanticKnowledge' | 'ontologyNetwork' | 'mcpTools' | 'builtinTools' | 'skills' | 'questions';

const AssistantEditDrawer: React.FC<Props> = ({ visible = false,agent, groupId: propsGroupId, onClose }) => {
  const spaceId = useAppSelector(getSpaceId);
  const isEdit = !!agent?.id;
  const [name, setName] = useState<string>(agent?.name || '投资顾问');
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

  const [mcpTools, setMcpTools] = useState<ToolOption[]>([]);
  const [builtinTools, setBuiltinTools] = useState<ToolOption[]>([]);
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set());
  const [loadingTools, setLoadingTools] = useState(false);

  /** 加载助手详情（mock：从 agent prop 读取） */
  function loadDetail() {
    if (!agent) return;
    setName(agent.name || '投资顾问');
    setPrompt(agent.prompt || DEFAULT_PROMPT);
    setDescription(agent.description || '');
    setStatus(agent.status || '0');
  }

  useEffect(() => {
    if (agent?.id) loadDetail();
  }, [agent]);

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

  /** 保存：状态设为草稿（mock） */
  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setStatus('0');
    message.success('已保存为草稿');
    onClose(true);
    setSaving(false);
  };

  /** 上线：状态设为发布（mock） */
  const handlePublish = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    setStatus('1');
    message.success('已上线，状态设为发布');
    onClose(true);
    setSaving(false);
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
    semanticKnowledge: false,
    model: false,
    mcpTools: false,
    ontologyNetwork: false,
    opening: false,
    questions: false,
    skills: false,
    builtinTools: false
  });

  const toggle = (key: SectionKey) => setOpenMap(p => ({ ...p, [key]: !p[key] }));

  const headerIcon = useMemo(
    () => (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #fa8c16 0%, #fa541c 100%)',
          borderRadius: 8,
          color: '#fff',
          display: 'flex',
          fontSize: 14,
          fontWeight: 700,
          height: 28,
          justifyContent: 'center',
          width: 28,
          boxShadow: '0 2px 8px rgba(250, 140, 22, 0.3)'
        }}
      >
        =
      </div>
    ),
    []
  );

  return (
    <Drawer
      open={visible}
      destroyOnClose
      closable={false}
      placement="right"
      width="100%"
      bodyStyle={{
        background: 'linear-gradient(135deg, rgba(240, 244, 255, 0.6) 0%, rgba(239, 243, 255, 0.6) 50%, rgba(239, 242, 255, 0.6) 100%)',
        padding: 0
      }}
      headerStyle={{ display: 'none' }}
      onClose={() => onClose(false)}
    >
      <Spin spinning={loadingDetail}>
      {/* 顶部栏 */}
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 255, 0.95) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(130, 140, 200, 0.15)',
          display: 'flex',
          height: 60,
          padding: '0 20px',
          boxShadow: '0 2px 12px rgba(91, 124, 247, 0.08)'
        }}
      >
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => onClose(false)}
          style={{
            borderRadius: 8,
            transition: 'all 0.3s ease'
          }}
        />
        <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginLeft: 10 }}>
          {headerIcon}
          {editingName ? (
            <Input
              autoFocus
              size="small"
              style={{
                width: 200,
                borderRadius: 8,
                border: '1px solid rgba(130, 140, 200, 0.2)'
              }}
              value={name}
              onBlur={() => setEditingName(false)}
              onChange={e => setName(e.target.value)}
              onPressEnter={() => setEditingName(false)}
            />
          ) : (
            <>
              <span style={{ fontSize: 17, fontWeight: 600, color: '#1a2744' }}>{name}</span>
              <EditOutlined
                style={{ color: '#5b7cf7', cursor: 'pointer', transition: 'all 0.2s ease' }}
                onClick={() => setEditingName(true)}
              />
            </>
          )}
        </div>
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginLeft: 'auto' }}>
          <Button
            onClick={handleSave}
            style={{
              borderRadius: 8,
              border: '1px solid rgba(130, 140, 200, 0.2)',
              fontWeight: 500,
              transition: 'all 0.3s ease'
            }}
          >
            保存
          </Button>
          <Button
            loading={saving}
            type="primary"
            onClick={handlePublish}
            style={{
              background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 4px 12px rgba(91, 124, 247, 0.3)',
              fontWeight: 600,
              transition: 'all 0.3s ease'
            }}
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
          height: 'calc(100vh - 60px)'
        }}
      >
        {/* 左：助手画像 */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 255, 0.6) 100%)',
            backdropFilter: 'blur(8px)',
            borderRight: '1px solid rgba(130, 140, 200, 0.12)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <SectionHeader title="助手配置" />
          <div style={{ padding: '14px 18px 0' }}>
            <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, color: '#3e5068' }}>助手画像</span>
              <Button
                icon={<ThunderboltOutlined />}
                size="small"
                style={{
                  color: '#5b7cf7',
                  fontWeight: 500
                }}
                type="link"
              >
                自动优化
              </Button>
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden', padding: '10px 18px 18px' }}>
            <Input.TextArea
              bordered={false}
              style={{
                height: '100%',
                resize: 'none',
                background: 'rgba(255, 255, 255, 0.6)',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: 13,
                lineHeight: 1.6
              }}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
            />
          </div>
        </div>

        {/* 中：基础配置 / 知识 / 能力 */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 250, 255, 0.7) 50%, rgba(246, 247, 255, 0.65) 100%)',
            backdropFilter: 'blur(12px)',
            borderRight: '1px solid rgba(130, 140, 200, 0.15)',
            overflow: 'auto',
            position: 'relative'
          }}
        >
          <GroupTitle title="基础配置" color="#5b7cf7" icon={<SettingOutlined />} />
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

          <GroupTitle title="知识语义" color="#10b981" icon={<BookOutlined />} />
          <CollapseRow
            extra={<PlusOutlined style={{ color: '#5b7cf7' }} />}
            open={openMap.semanticKnowledge}
            title="数据语义"
            onToggle={() => toggle('semanticKnowledge')}
          />
          <CollapseRow
            extra={<PlusOutlined style={{ color: '#5b7cf7' }} />}
            open={openMap.ontologyNetwork}
            title="本体网络"
            onToggle={() => toggle('ontologyNetwork')}
          />

          <GroupTitle title="扩展能力" color="#f59e0b" icon={<ThunderboltOutlined />} />
          <CollapseRow
            extra={<PlusOutlined style={{ color: '#5b7cf7' }} />}
            open={openMap.mcpTools}
            title="MCP"
            onToggle={() => toggle('mcpTools')}
          >
            {/* MCP工具分组 */}
            <div style={{ padding: '4px 24px 8px' }}>
              <ToolGroupHeader
                checked={isGroupAllChecked('mcp')}
                count={mcpTools.length}
                indeterminate={isGroupIndeterminate('mcp')}
                title="MCP工具"
                onChange={checked => handleGroupCheck('mcp', checked)}
              />
              {mcpTools.length === 0 ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '4px 0 4px 28px' }}>暂无MCP工具</div>
              ) : (
                mcpTools.map(item => (
                  <ToolItemRow
                    key={item.id}
                    description={item.description}
                    name={item.name}
                    selected={selectedToolIds.has(item.id)}
                    onToggle={() => handleToolCheck(item.id, !selectedToolIds.has(item.id))}
                  />
                ))
              )}
            </div>

            {/* 内置工具分组 */}
            <div style={{ padding: '4px 24px 8px' }}>
              <ToolGroupHeader
                checked={isGroupAllChecked('builtin')}
                count={builtinTools.length}
                indeterminate={isGroupIndeterminate('builtin')}
                title="内置工具"
                onChange={checked => handleGroupCheck('builtin', checked)}
              />
              {builtinTools.length === 0 ? (
                <div style={{ color: '#bfbfbf', fontSize: 12, padding: '4px 0 4px 28px' }}>暂无内置工具</div>
              ) : (
                builtinTools.map(item => (
                  <ToolItemRow
                    key={item.id}
                    description={item.description}
                    name={item.name}
                    selected={selectedToolIds.has(item.id)}
                    onToggle={() => handleToolCheck(item.id, !selectedToolIds.has(item.id))}
                  />
                ))
              )}
            </div>
          </CollapseRow>

          <CollapseRow
            extra={
              <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                <QuestionCircleOutlined style={{ color: '#8fa0b5' }} />
                <PlusOutlined style={{ color: '#5b7cf7' }} />
              </span>
            }
            open={openMap.skills}
            title="技能"
            titleExtra={<QuestionCircleOutlined style={{ color: '#8fa0b5', marginLeft: 4 }} />}
            onToggle={() => toggle('skills')}
          />

          {/* 推荐问题 */}
          <CollapseRow
            extra={
              <PlusOutlined
                style={{ color: '#5b7cf7' }}
                onClick={e => { e.stopPropagation(); setRecDrawerOpen(true); }}
              />
            }
            open={openMap.questions}
            title="示例"
            onToggle={() => toggle('questions')}
          >
            {recQuestions.length === 0 ? (
              <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>暂无推荐问题</div>
            ) : (
              recQuestions.slice(0, 3).map((q, i) => (
                <div
                  key={i}
                  style={{ color: '#3e5068', fontSize: 13, padding: '6px 24px', lineHeight: 1.6 }}
                >
                  {i + 1}. {q}
                </div>
              ))
            )}
            {recQuestions.length > 3 && (
              <div
                style={{ color: '#5b7cf7', cursor: 'pointer', fontSize: 12, padding: '6px 24px', fontWeight: 500 }}
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
              borderTop: '1px solid rgba(130, 140, 200, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(139, 92, 246, 0.02) 100%)',
              gap: 12,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  flexShrink: 0
                }}
              >
                <ExperimentOutlined />
              </div>
              <span style={{ color: '#1a2744', fontSize: 15, fontWeight: 500, letterSpacing: '0.03em' }}>开启调试模式</span>
            </div>
            <Switch
              checked={enableDebug}
              onChange={setEnableDebug}
            />
          </div>

          {/* 访问权限 */}
          <div
            style={{
              alignItems: 'center',
              borderTop: '1px solid rgba(130, 140, 200, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              padding: '18px 24px',
              background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.04) 0%, rgba(236, 72, 153, 0.02) 100%)',
              gap: 12,
              boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 16,
                  boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                  flexShrink: 0
                }}
              >
                <SecurityScanOutlined />
              </div>
              <span style={{ color: '#1a2744', fontSize: 15, fontWeight: 500, letterSpacing: '0.03em' }}>访问权限</span>
            </div>
            <Switch
              checked={publicAccess === '1'}
              onChange={(checked) => setPublicAccess(checked ? '1' : '0')}
              checkedChildren="空间可见"
              unCheckedChildren="仅自己可见"
            />
          </div>
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
              style={{
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                border: 'none',
                borderRadius: 6
              }}
            >
              批量添加
            </Button>
          }
          onClose={() => setRecDrawerOpen(false)}
        >
          {recQuestions.length === 0 ? (
            <div style={{ color: '#8fa0b5', padding: '32px 0', textAlign: 'center' }}>暂无推荐问题</div>
          ) : (
            recQuestions.map((q, i) => (
              <div
                key={i}
                style={{
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(130, 140, 200, 0.08)',
                  display: 'flex',
                  gap: 8,
                  padding: '12px 0'
                }}
              >
                <span style={{ color: '#8fa0b5', flexShrink: 0, fontSize: 13, width: 24 }}>{i + 1}.</span>
                <span style={{ flex: 1, fontSize: 13, color: '#3e5068' }}>{q}</span>
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
          <div style={{ color: '#3e5068', fontSize: 13, marginBottom: 12 }}>
            每行一个问题，提交后将批量创建。
          </div>
          <Input.TextArea
            autoSize={{ minRows: 10, maxRows: 16 }}
            placeholder={`请输入问题，每行一个问题\n例如：\n如何使用这个系统？\n系统支持哪些功能？\n如何导出数据？`}
            value={batchText}
            onChange={e => setBatchText(e.target.value)}
            style={{
              borderRadius: 8,
              border: '1px solid rgba(130, 140, 200, 0.2)'
            }}
          />
        </Modal>

        {/* 右：调试预览 */}
        <div
          style={{
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 255, 0.6) 100%)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <SectionHeader icon={headerIcon} title="调试预览" />
          <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
            <div style={{
              color: '#8fa0b5',
              fontSize: 12,
              marginBottom: 18,
              textAlign: 'center',
              fontWeight: 500
            }}>
              ----------- 配置已更新 -----------
            </div>
            <div style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
              <div
                style={{
                  alignItems: 'center',
                  background: 'linear-gradient(135deg, #fa8c16 0%, #fa541c 100%)',
                  borderRadius: 8,
                  color: '#fff',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 700,
                  height: 28,
                  justifyContent: 'center',
                  width: 28,
                  boxShadow: '0 2px 8px rgba(250, 140, 22, 0.3)'
                }}
              >
                =
              </div>
              <div
                style={{
                  background: 'rgba(246, 247, 255, 0.8)',
                  backdropFilter: 'blur(8px)',
                  borderRadius: 10,
                  fontSize: 13,
                  lineHeight: 1.7,
                  padding: '12px 16px',
                  color: '#3e5068',
                  border: '1px solid rgba(130, 140, 200, 0.1)'
                }}
              >
                你好，我是你的{name}，专注于利用先进技术和算法，为你提供实时的股票价格查询和市场行情分析，帮助你做出更明智的投资决策。
              </div>
            </div>
          </div>

          {/* 推荐问题 + 输入栏 */}
          <div style={{ padding: '10px 24px 18px' }}>
            <div style={{ color: '#5f7490', fontSize: 12, marginBottom: 10, fontWeight: 500 }}>推荐问题</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
              {RECOMMEND_QUESTIONS.map(q => (
                <Tag
                  key={q}
                  color="processing"
                  style={{
                    background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.08) 0%, rgba(112, 145, 250, 0.08) 100%)',
                    border: '1px solid rgba(91, 124, 247, 0.2)',
                    borderRadius: 8,
                    color: '#5b7cf7',
                    cursor: 'pointer',
                    fontSize: 12,
                    margin: 0,
                    padding: '6px 12px',
                    width: 'fit-content',
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {q}
                </Tag>
              ))}
            </div>
            <Input
              placeholder="请输入问题"
              size="large"
              suffix={<SendOutlined style={{ color: '#5b7cf7' }} />}
              style={{
                borderRadius: 10,
                border: '1px solid rgba(130, 140, 200, 0.2)',
                background: 'rgba(255, 255, 255, 0.6)'
              }}
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
      background: 'linear-gradient(180deg, rgba(248, 250, 255, 0.8) 0%, rgba(246, 247, 255, 0.8) 100%)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(130, 140, 200, 0.12)',
      display: 'flex',
      gap: 10,
      height: 44,
      padding: '0 18px'
    }}
  >
    {icon}
    <span style={{ fontWeight: 600, color: '#3e5068' }}>{title}</span>
  </div>
);

// 中栏分组小标题
const GroupTitle: React.FC<{ title: string; color?: string; icon?: React.ReactNode }> = ({ title, color = '#5b7cf7', icon }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}08 0%, ${color}04 100%)`,
      color: '#1a2744',
      fontSize: 14,
      fontWeight: 600,
      padding: '16px 24px',
      borderBottom: `1px solid ${color}15`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      position: 'relative',
      overflow: 'hidden'
    }}
  >
    {icon && (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 16,
          boxShadow: `0 4px 12px ${color}50, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
          flexShrink: 0
        }}
      >
        {icon}
      </div>
    )}
    <span style={{ letterSpacing: '0.03em', fontSize: 15 }}>{title}</span>
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
const CollapseRow: React.FC<CollapseRowProps> = ({ children, extra, onToggle, open, title, titleExtra }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <div 
      style={{ 
        borderBottom: '1px solid rgba(130, 140, 200, 0.08)',
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          alignItems: 'center',
          cursor: 'pointer',
          display: 'flex',
          height: 48,
          padding: '0 20px',
          transition: 'all 0.2s ease',
          background: isHovered ? 'rgba(91, 124, 247, 0.03)' : 'transparent'
        }}
        onClick={onToggle}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)' : 'rgba(130, 140, 200, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            transition: 'all 0.3s ease',
            boxShadow: open ? '0 2px 8px rgba(91, 124, 247, 0.3)' : 'none'
          }}
        >
          {open ? (
            <CaretDownOutlined style={{ color: '#fff', fontSize: 10 }} />
          ) : (
            <CaretRightOutlined style={{ color: '#8fa0b5', fontSize: 10 }} />
          )}
        </div>
        <span style={{ fontWeight: 500, color: '#1a2744', fontSize: 13 }}>{title}</span>
        {titleExtra}
        <span style={{ marginLeft: 'auto' }} onClick={e => e.stopPropagation()}>
          {extra}
        </span>
      </div>
      {open && children ? (
        <div 
          style={{ 
            paddingBottom: 12,
            background: 'rgba(248, 250, 255, 0.3)',
            animation: 'fadeIn 0.3s ease'
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
};

// 工具分组全选标题行
interface ToolGroupHeaderProps {
  title: string;
  count: number;
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}
const ToolGroupHeader: React.FC<ToolGroupHeaderProps> = ({ title, count, checked, indeterminate, onChange }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignItems: 'center',
        background: hovered ? 'rgba(91, 124, 247, 0.04)' : 'transparent',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        gap: 8,
        padding: '6px 8px',
        userSelect: 'none',
        transition: 'all 0.2s ease',
        marginBottom: 4
      }}
      onClick={() => onChange(!checked)}
    >
      <Checkbox
        checked={checked}
        indeterminate={indeterminate}
        onChange={e => onChange(e.target.checked)}
        onClick={e => e.stopPropagation()}
      />
      <span style={{ fontSize: 12, fontWeight: 600, color: '#595959' }}>{title}</span>
      <span style={{ color: '#bfbfbf', fontSize: 11 }}>({count})</span>
    </div>
  );
};

// 单个工具项行
interface ToolItemRowProps {
  name: string;
  description?: string;
  selected: boolean;
  onToggle: () => void;
}
const ToolItemRow: React.FC<ToolItemRowProps> = ({ name, description, selected, onToggle }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        alignItems: 'center',
        background: selected ? 'rgba(91, 124, 247, 0.06)' : hovered ? 'rgba(91, 124, 247, 0.04)' : 'transparent',
        borderRadius: 6,
        cursor: 'pointer',
        display: 'flex',
        gap: 10,
        padding: '6px 8px 6px 28px',
        userSelect: 'none',
        transition: 'all 0.2s ease'
      }}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        onChange={() => onToggle()}
        onClick={e => e.stopPropagation()}
      />
      <div style={{
        alignItems: 'center',
        background: '#fff7e6',
        borderRadius: 6,
        color: '#fa8c16',
        display: 'flex',
        height: 24,
        justifyContent: 'center',
        width: 24,
        flexShrink: 0
      }}>
        <ThunderboltOutlined style={{ fontSize: 14 }} />
      </div>
      <Tooltip title={description || name}>
        <span style={{
          color: selected ? '#5b7cf7' : '#1a2744',
          fontSize: 13,
          fontWeight: selected ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          transition: 'all 0.2s ease'
        }}>{name}</span>
      </Tooltip>
    </div>
  );
};

export default AssistantEditDrawer;
