import { ReloadOutlined, SearchOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
import { Splitter } from 'antd';

import { deleteMcp, getMcpDetail, queryMcpList, registerMcp, updateMcp } from '@/service/api/pulg';
import type { PluginAddParams, PluginItem, PluginList, McpForm } from '@/types/plug';
import { getSpaceId } from '@/store/slice/app';
import { useAppSelector } from '@/hooks/business/useStore';

import { PlugUpdate } from './components/PlugUpdate.tsx';
import { PluginDetail } from './components/PluginDetail.tsx';
import { PluginGroup } from './components/PluginGroup.tsx';
import { PluginTable } from './components/PluginTable.tsx';
import { usePluginManagement } from './hooks/usePluginManagement.ts';
import { message } from 'antd';

export const Component: React.FC = () => {
  const { currentEdit, open, setCurrentEdit, setOpen } = usePluginManagement();
  const spaceId = useAppSelector(getSpaceId);
  const [groupId, setGroupId] = useState(0);
  const [groupType, setGroupType] = useState<string>('mcp-sse');
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
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
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
    if (!groupId) return;
    await deleteMcp({
      mcpId: data.pluginId.toString(),
      mcpName: data.pluginName,
      namespaceId: `s_${groupId}`
    });
    getPluginList();
  };

  const updateStatus = async (record: PluginItem) => {
    if (!groupId) return;
    // 启停切换走更新接口 (PUT)
    await updateMcp({
      namespaceId: `s_${groupId}`,
      serverSpecification: {
        id: String(record.pluginId),
        name: record.pluginName,
        version: record.versionDetail?.version || '1.0.0',
        protocol: groupType === 'mcp-streamable' ? 'streamableHttp' : 'sse',
        frontProtocol: groupType === 'mcp-streamable' ? 'streamableHttp' : 'sse',
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
    if (!groupId) return;
    setSearchValue(value);
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(value, 1);
  };

  const handleSubmit = async (formData: McpForm) => {
    if (!groupId) return;
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
      // HTTP 转 MCP 开启时 protocol 为 http/https；关闭时根据分组类型决定
      protocol: formData.restToMcpSwitch ? scheme : (groupType === 'mcp-streamable' ? 'streamableHttp' : 'sse'),
      frontProtocol: groupType === 'mcp-streamable' ? 'streamableHttp' : 'sse',
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
    setGroupType('mcp-sse');
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    setFetchKey(k => k + 1);
  }, [spaceId]);

  const setPage = (page: number) => {
    if (!groupId) return;
    setcurrent(page);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(undefined, page);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        {/* v5 Tree Panel — left sidebar */}
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <PluginGroup onGroupId={(id, _name, type) => { setGroupId(id); if (type) setGroupType(type); }} />
          </div>
        </Splitter.Panel>

        {/* Right content area */}
        <Splitter.Panel>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            {/* Searchbar */}
            <section className="abi-searchbar">
              <div className="abi-search-row">
                <AInput
                  allowClear
                  placeholder="请输入MCP名称"
                  prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                  value={searchValue}
                  onChange={e => handleSearch(e.target.value)}
                  className="abi-field-input"
                  style={{ width: '220px' }}
                />
                <ADatePicker.RangePicker
                  showTime={{ format: 'HH:mm:ss' }}
                  format="YYYY-MM-DD HH:mm:ss"
                  placeholder={['开始时间', '结束时间']}
                  value={dateRange}
                  onChange={(dates) => setDateRange(dates)}
                  className="abi-field-input"
                  style={{ width: '380px' }}
                />
                <AButton type="primary" className="btn-accent-gradient" onClick={() => handleSearch(searchValue)}>
                  <SearchOutlined /> 查询
                </AButton>
                <AButton className="btn-ghost-v5" onClick={() => { handleSearch(''); setDateRange(null); }}>
                  <ReloadOutlined /> 重置
                </AButton>
              </div>
            </section>

            {/* v5 Data Area */}
            <section className="abi-data-area">
              <PluginTable
                current={current}
                dataSource={dataSource}
                deletePlugin={toDeletePlugin}
                setcurrent={setPage}
                updateStatus={updateStatus}
                groupId={groupId}
                onAdd={() => { setOpen(true); setCurrentEdit(null); }}
                onDetail={async record => {
                  if (!groupId) return;
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
                  if (!groupId) return;
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
            </section>
          </div>
        </Splitter.Panel>
      </Splitter>

      <PlugUpdate
        currentEdit={currentEdit}
        groupType={groupType}
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
