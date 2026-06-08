import { SearchOutlined } from '@ant-design/icons';
import React, { useState, useEffect } from 'react';
// import PageTitle from '@/components/stateless/common/PageTitle';

import { deleteMcp, getMcpDetail, queryMcpList, registerMcp, updateMcp } from '@/service/api/pulg';
import type { PluginAddParams, PluginItem, PluginList, McpForm } from '@/types/plug';

import { PlugUpdate } from './components/PlugUpdate.tsx';
import { PluginDetail } from './components/PluginDetail.tsx';
import { PluginGroup } from './components/PluginGroup.tsx';
import { PluginTable } from './components/PluginTable.tsx';
import { usePluginManagement } from './hooks/usePluginManagement.ts';
import { message } from 'antd';

export const Component: React.FC = () => {
  const { currentEdit, open, setCurrentEdit, setOpen } = usePluginManagement();
  const [groupId, setGroupId] = useState(0);
  const [dataSource, setDataSource] = useState<{
    code: number;
    msg: string;
    rows: PluginAddParams[];
    total: number;
  }>({ code: 0, msg: '', rows: [], total: 0 });
  const [current, setcurrent] = useState(1);
  const [searchValue, setSearchValue] = useState('');
  const [detailRecord, setDetailRecord] = useState<PluginItem | null>(null);
  const pageSize = 10;

  const getPluginList = async (mcpName?: string) => {
    const res: any = await queryMcpList({
      pageNo: current,
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
    getPluginList(value);
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
    getPluginList(searchValue);
  }, [groupId]);

  const setPage = (page: number) => {
    setcurrent(page);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList();
  };

  return (
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="flex-col-stretch sm:flex-1-hidden card-wrapper h-full border-0"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <AFlex className="gap-6 h-full" style={{ flex: 1, minHeight: 0 }}>
          <div className="abi-group-sidebar">
            <PluginGroup onGroupId={setGroupId} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <div className="flex items-center gap-3 mb-3">
              <AInput
                allowClear
                placeholder="请输入MCP服务名称"
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                style={{ width: '12rem' }}
              />
              <AButton
                type="primary"
                className="ml-auto"
                disabled={!groupId}
                onClick={() => {
                  setOpen(true);
                  setCurrentEdit(null);
                }}
              >
                新增
              </AButton>
            </div>

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
                  // 后端返回成功则以详情接口数据为准，否则降级使用行数据
                  setDetailRecord({ ...record, ...(remote && typeof remote === 'object' ? remote : {}) });
                } catch {
                  setDetailRecord(record);
                }
              }}
              updateCurrentEdit={async record => {
                // 编辑前先拉详情，补充 backendEndpoints/toolSpec/remoteServerConfig 等字段用于回显
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
          </div>
        </AFlex>

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
      </ACard>
    </div>
  );
};
