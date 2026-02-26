import React, { useState, useEffect } from 'react';

import { addPlugin, deletePlugin, queryPluginList, updatePlugin } from '@/service/api/pulg';
import type { PluginAddParams, PluginForm, PluginItem, PluginList } from '@/types/plug';

import { PlugUpdate } from './components/PlugUpdate.tsx';
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
  const pageSize = 10;

  const getPluginList = async (pluginName?: string) => {
    const res = await queryPluginList({
      pageNum: current,
      pageSize,
      pluginName: pluginName || '',
      spaceId: Number(localStorage.getItem('spaceId')),
      groupId: groupId,
    });

    setDataSource(res.response.data as any);
  };

  const toDeletePlugin = async (data: PluginList) => {
    await deletePlugin({
      plugin_ids: data.pluginId.toString(),
      plugin_type: data.pluginType,
      space_id: Number(localStorage.getItem('spaceId'))
    });
    getPluginList();
  };

  const updateStatus = async (record: PluginItem) => {
    await updatePlugin({
      parse_mode_config: record.parseModeConfig,
      plugin_id: record.pluginId,
      plugin_name: record.pluginName,
      plugin_type: record.pluginType,
      remark: record.remark,
      service_config: record.serviceConfig,
      space_id: Number(localStorage.getItem('spaceId')),
      status: record.status === 0 ? 1 : 0,
      group_id: groupId
    });
    getPluginList();
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setcurrent(1);
    setDataSource({ code: 0, msg: '', rows: [], total: 0 });
    getPluginList(value);
  };

  const handleSubmit = async (formData: PluginForm) => {
    let res:any=null
    if (currentEdit) {
     res =  await updatePlugin({
        parse_mode_config: JSON.stringify(formData.parse_mode_config),
        plugin_id: currentEdit.pluginId,
        plugin_name: formData.plugin_name,
        plugin_type: formData.plugin_type,
        remark: formData.remark,
        service_config: JSON.stringify(formData.service_config),
        space_id: Number(localStorage.getItem('spaceId')),
        status: currentEdit.status,
        group_id: groupId
      });
    }else {
      const { parse_mode_config, service_config, ...rest } = formData;
      const data = {
        ...rest,
        parse_mode_config: JSON.stringify(parse_mode_config),
        service_config: JSON.stringify(service_config),
        space_id: Number(localStorage.getItem('spaceId')),
        group_id: groupId
      };
      res = await addPlugin(data);
    }

    
    const { code, msg="服务器错误" } = res.response.data;
    if (code === 200) {
      setOpen(false);
      getPluginList();
    }else {
      message.error(msg)
    }
  };

  useEffect(() => {
    getPluginList();
  }, []);
  useEffect(() => {
    if (groupId !== null) {
      setcurrent(1);
      setDataSource({ code: 0, msg: '', rows: [], total: 0 });
      getPluginList(searchValue);
    }
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
          <div style={{ borderRight: '0.0625rem solid #d9d9d9', paddingRight: '1rem' }}>
            <PluginGroup onGroupId={setGroupId} />
          </div>

          <div className="flex-1 flex flex-col min-h-0 h-full overflow-hidden">
            <h1 style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 600, fontSize: '1.125rem', color: '#333333', paddingBottom: '0.5rem' }}>插件</h1>
            <ASpace className="mb-3 flex justify-between">
              <AInput
                placeholder="请输入插件名称"
                value={searchValue}
                onChange={e => handleSearch(e.target.value)}
                style={{ fontFamily: 'PingFangSC, PingFang SC', fontWeight: 400, fontSize: '1rem', color: '#333333' }}
              />
              <AButton
                type="primary"
                disabled={!groupId}
                onClick={() => {
                  setOpen(true);
                  setCurrentEdit(null);
                }}
              >
                新增
              </AButton>
            </ASpace>

            <PluginTable
              current={current}
              dataSource={dataSource}
              deletePlugin={toDeletePlugin}
              setcurrent={setPage}
              updateStatus={updateStatus}
              updateCurrentEdit={record => {
                setCurrentEdit(record);
                setOpen(true);
              }}
            />
          </div>
        </AFlex>

        <PlugUpdate
          currentEdit={currentEdit}
          open={open}
          onClose={() => setOpen(false)}
          onSubmit={handleSubmit}
        />
      </ACard>
    </div>
  );
};
