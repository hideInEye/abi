import { MoreOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
// import PageTitle from '@/components/stateless/common/PageTitle';

import { deleteMcp, getMcpDetail, queryMcpList, registerMcp, updateMcp } from '@/service/api/pulg';
import type { PluginAddParams, PluginItem, PluginList, McpForm } from '@/types/plug';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';
import { ViewControls } from '@/components/ViewControls';
import type { ColumnOption } from '@/components/ViewControls';

import { PlugUpdate } from './components/PlugUpdate.tsx';
import { PluginDetail } from './components/PluginDetail.tsx';
import { PluginGroup } from './components/PluginGroup.tsx';
import { PluginTable } from './components/PluginTable.tsx';
import { usePluginManagement } from './hooks/usePluginManagement.ts';
import { Dropdown, message } from 'antd';

export const Component: React.FC = () => {
  const { currentEdit, open, setCurrentEdit, setOpen } = usePluginManagement();
  const spaceId = useAppSelector(getSpaceId);
  const [groupId, setGroupId] = useState(0);
  const [fetchKey, setFetchKey] = useState(0);
  const [dataSource, setDataSource] = useState<{
    code: number;
    msg: string;
    rows: PluginAddParams[];
    total: number;
  }>({ code: 0, msg: '', rows: [], total: 0 });
  const [current, setcurrent] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [detailRecord, setDetailRecord] = useState<PluginItem | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [columnOptions, setColumnOptions] = useState<ColumnOption[]>([
    { key: 'pluginName', label: 'MCP服务名称', visible: true },
    { key: 'remark', label: '描述', visible: true },
    { key: 'capabilities', label: '支持能力', visible: true },
    { key: 'pluginType', label: '类型', visible: true },
    { key: 'version', label: '版本', visible: true },
    { key: 'status', label: '状态', visible: true },
  ]);
  const handleColumnToggle = (key: string, visible: boolean) => {
    setColumnOptions(prev => prev.map(c => c.key === key ? { ...c, visible } : c));
  };
  const pageSize = 10;

  const getPluginList = async (mcpName?: string, pageOverride?: number) => {
    const res: any = await queryMcpList({
      pageNo: pageOverride ?? current,
      pageSize,
      mcpName: mcpName || undefined,
      search: 'blur',
      namespaceId: `s_${groupId}`
    });

    // 新接口字段适配：pageItems → rows
    // 响应结构：{ code, msg, data: { data: { totalCount, pageItems } } }
    const payload = res?.response?.data?.data?.data ?? {};
    const pageItems: any[] = payload.pageItems ?? [];
    const rows = pageItems.map(item => ({
      ...item,
      pluginId: item.id,
      pluginName: item.name,
      remark: item.description,
      pluginType: item.protocol,
      status: item.enabled ? 1 : 0
    }));
    setDataSource({
      code: 0,
      msg: '',
      rows: rows as any,
      total: payload.totalCount ?? 0
    });
  };

  const toDeletePlugin = async (data: PluginList) => {
    await deleteMcp({
      mcpId: data.pluginId.toString(),
      mcpName: data.pluginName,
      namespaceId: `s_${groupId}`
    });
    getPluginList();
  };

  const updateStatus = async (record: PluginItem) => {
    // 启停切换走更新接口 (PUT)
    await updateMcp({
      namespaceId: `s_${groupId}`,
      serverSpecification: {
        id: String(record.pluginId),
        name: record.pluginName,
        version: record.versionDetail?.version || '1.0.0',
        protocol: 'sse',
        frontProtocol: 'sse',
        description: record.remark || '',
        remoteServerConfig: {
          url: '',
          connectTimeout: 5000,
          readTimeout: 30000
        },
        enabled: record.status === 0,
        capabilities: record.capabilities ?? []
      }
    });
    getPluginList();
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(value, 1);
  };

  const handleSubmit = async (formData: McpForm) => {
    // 根据 HTTP 转 MCP 开关区分两种模式构造接口参数
    let addressWithPort: string;
    let scheme: string;
    let serverUrl: string;
    let endpointPort: string | number;
    let endpointAddress: string;

    if (formData.restToMcpSwitch) {
      // HTTP 转 MCP：用户填 address + port + 传输协议
      scheme = (formData.transport || 'HTTP').toLowerCase();
      endpointAddress = (formData.address || '').trim();
      endpointPort = (formData.port || '').trim();
      addressWithPort = `${endpointAddress}:${endpointPort}`;
      serverUrl = `${scheme}://${addressWithPort}/mcp`;
    } else {
      // MCP 直接接入：用户填完整 URL，解析出 address/port
      try {
        const u = new URL((formData.mcpEndpointUrl || '').trim());
        scheme = u.protocol.replace(':', '') || 'http';
        endpointAddress = u.hostname;
        endpointPort = u.port || (scheme === 'https' ? '443' : '80');
        addressWithPort = `${endpointAddress}:${endpointPort}`;
        serverUrl = formData.mcpEndpointUrl as string;
      } catch {
        message.error('MCP Server Endpoint URL 格式不正确');
        return;
      }
    }

    const serverSpec: Record<string, any> = {
      name: formData.mcp_name,
      // HTTP 转 MCP 开启时 protocol 为 http/https；关闭时维持 sse
      protocol: formData.restToMcpSwitch ? scheme : 'sse',
      frontProtocol: 'sse',
      description: formData.description || '',
      version: formData.version,
      remoteServerConfig: {
        url: serverUrl,
        connectTimeout: 5000,
        readTimeout: 30000
      }
    };
    if (currentEdit) {
      serverSpec.id = String(currentEdit.pluginId);
    }
    const endpointSpec = {
      type: 'DIRECT',
      data: {
        address: addressWithPort,
        port: endpointPort
      }
    };
    // 高级配置 + Tools → toolSpecification（均为可选）
    const toolSpec: Record<string, any> = {};
    if (formData.securitySchemes && formData.securitySchemes.length > 0) {
      toolSpec.securitySchemes = formData.securitySchemes;
    }
    if (formData.securityExtensions && Object.keys(formData.securityExtensions).length > 0) {
      toolSpec.extensions = formData.securityExtensions;
    }
    if (formData.tools && formData.tools.length > 0) {
      toolSpec.tools = formData.tools;
    }
    try {
      const fn = currentEdit ? updateMcp : registerMcp;
      await fn({
        namespaceId: `s_${groupId}`,
        serverSpecification: serverSpec,
        endpointSpecification: endpointSpec,
        ...(Object.keys(toolSpec).length > 0 ? { toolSpecification: toolSpec } : {})
      });
      message.success(currentEdit ? '编辑成功' : '创建成功');
      setOpen(false);
      getPluginList();
    } catch (err: any) {
      message.error(err?.message || (currentEdit ? '编辑失败' : '创建失败'));
    }
  };

  useEffect(() => {
    // 初始 groupId=0 时等待 PluginGroup 回传真实分组 id 后再拉列表，避免重复请求
    if (!groupId) return;
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(searchValue, 1);
  }, [groupId, fetchKey]);

  // 空间切换时重置分组 + 强制刷新，让 PluginGroup 重新回调新空间的 groupId
  useEffect(() => {
    setGroupId(0);
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    setFetchKey(k => k + 1);
  }, [spaceId]);

  const setPage = (page: number) => {
    setcurrent(page);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(undefined, page);
  };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      {/* v5 Tree Panel — left sidebar */}
      <div className="abi-group-sidebar">
        <PluginGroup onGroupId={setGroupId} />
      </div>

      {/* Right content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder="请输入MCP服务名称"
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchValue}
              onChange={e => handleSearch(e.target.value)}
              className="abi-field-input"
              style={{ width: '16rem' }}
            />
            <ADatePicker.RangePicker
              placeholder={['开始时间', '结束时间']}
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              className="abi-field-input"
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={() => handleSearch(searchValue)}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={() => { handleSearch(''); setDateRange(null); }}>
              重置
            </AButton>
          </div>
        </section>

        {/* v5 Data Area */}
        <section className="abi-data-area">
          <div className="abi-toolbar">
            <div className="abi-toolbar-left">
              <AButton type="primary" className="btn-accent-gradient" disabled={!groupId} onClick={() => { setOpen(true); setCurrentEdit(null); }}>
                + 新增MCP服务
              </AButton>
            </div>
            <ViewControls
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              columns={columnOptions}
              onColumnToggle={handleColumnToggle}
            />
          </div>
          {viewMode === 'list' ? (
          <PluginTable
            current={current}
            dataSource={dataSource}
            deletePlugin={toDeletePlugin}
            setcurrent={setPage}
            updateStatus={updateStatus}
            onDetail={async record => {
              try {
                const res: any = await getMcpDetail({
                  mcpId: String(record.pluginId),
                  mcpName: record.pluginName,
                  namespaceId: `s_${groupId}`
                });
                const remote = res?.response?.data?.data ?? res?.response?.data;
                setDetailRecord({ ...record, ...(remote && typeof remote === 'object' ? remote : {}) });
              } catch {
                setDetailRecord(record);
              }
            }}
            updateCurrentEdit={async record => {
              try {
                const res: any = await getMcpDetail({
                  mcpId: String(record.pluginId),
                  mcpName: record.pluginName,
                  namespaceId: `s_${groupId}`
                });
                const remote = res?.response?.data?.data ?? res?.response?.data;
                setCurrentEdit({ ...record, ...(remote && typeof remote === 'object' ? remote : {}) });
              } catch {
                setCurrentEdit(record);
              }
              setOpen(true);
            }}
          />
          ) : (
            <div style={{ flex: 1, overflow: 'auto', minHeight: 0 }}>
              {dataSource.rows.length === 0 ? (
                <div style={{ marginTop: 80, textAlign: 'center' }}>
                  <AEmpty description="暂无MCP服务" />
                </div>
              ) : (
                <div className="abi-card-grid">
                  <div className="abi-card-grid-inner">
                    {dataSource.rows.map((record: any) => (
                      <div key={record.pluginId} className="abi-data-card" style={{ position: 'relative' }}>
                        <div className="abi-data-card-head">
                          <div className="abi-data-card-title">
                            <span className="abi-data-card-name">{record.pluginName}</span>
                          </div>
                          <ASwitch checked={record.status === 1} size="small" onChange={() => updateStatus(record)} />
                        </div>
                        <div className="abi-data-card-body">
                          <div className="row"><span className="lbl">描述</span><span className="val">{record.remark || '-'}</span></div>
                          <div className="row"><span className="lbl">类型</span><span className="val">{record.pluginType || '-'}</span></div>
                          <div className="row"><span className="lbl">版本</span><span className="val">{record.versionDetail?.version || '-'}</span></div>
                        </div>
                        <div style={{ position: 'absolute', bottom: 18, right: 20, zIndex: 10 }}>
                          <Dropdown
                            menu={{
                              items: [
                                { key: 'edit', label: <span>编辑</span> },
                                { key: 'delete', danger: true, label: <APopconfirm title="提示" description="确定删除该MCP服务吗？" onConfirm={() => toDeletePlugin(record)}><span>删除</span></APopconfirm> },
                              ],
                              onClick: ({ key, domEvent }) => {
                                domEvent.stopPropagation();
                                if (key === 'edit') {
                                  getMcpDetail({ mcpId: String(record.pluginId), mcpName: record.pluginName, namespaceId: `s_${groupId}` }).then((res: any) => {
                                    const remote = res?.response?.data?.data ?? res?.response?.data;
                                    setCurrentEdit({ ...record, ...(remote && typeof remote === 'object' ? remote : {}) });
                                    setOpen(true);
                                  });
                                }
                              }
                            }}
                            trigger={['hover']}
                          >
                            <AButton type="text" size="small" style={{ color: '#8c8c8c' }}><MoreOutlined /></AButton>
                          </Dropdown>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <PlugUpdate
        currentEdit={currentEdit}
        namespaceId={`s_${groupId}`}
        open={open}
        onClose={() => setOpen(false)}
        onSubmit={handleSubmit}
      />

      <PluginDetail
        open={Boolean(detailRecord)}
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
      />
    </div>
  );
};
