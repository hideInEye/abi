import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Collapse, List, Popconfirm } from 'antd';
import React, { useEffect, useState } from 'react';

import { deleteTableSemanticsGroup, tableSemanticsGroupList } from '@/service/api/table-semantics';

import { EditGroup } from '../components/semantics-edit-group';
import { useTableSemanticsStore } from '../store/useTableSemanticsStore';
import { useTableStore } from '../store/useTableStore';
import type { groupitem } from '../types';

const { Panel } = Collapse;

interface DataGroupProps {
  readonly groupName: string;
  readonly onDefaultGroupUpdate: (data: any) => void;
}

export const SemanticsGroup: React.FC<DataGroupProps> = ({ groupName, onDefaultGroupUpdate }) => {
  const { setEditAddGroup, setEditGroupItem, setGroupModalOpen } = useTableSemanticsStore();
  const [listSemanticGroup, setListSemanticGroup] = useState<groupitem[]>([]);
  const { groupId, setGroupId } = useTableStore();

  const groupNameClick = async (item: any) => {
    setGroupId(item.groupId);
    onDefaultGroupUpdate(item);
  };

  const groupList = async () => {
    const pageSize = 1000;
    const pageNum = 1;
    const spaceId = Number(localStorage.getItem('spaceId'));
    const { response } = await tableSemanticsGroupList({
      groupName,
      groupType: 'shema',
      pageNum,
      pageSize,
      spaceId
    });
    const { rows } = response.data as unknown as { rows: any[] };
    if (rows.length > 0) {
      groupNameClick(rows[0]);
      setListSemanticGroup(rows);
    }
  };

  useEffect(() => {
    setListSemanticGroup([]);
    groupList();
  }, [groupName]);

  const handleDelete = async (key: number) => {
    await deleteTableSemanticsGroup(key);
    setListSemanticGroup([]);
    groupList();
  };

  function handleEditGroup(item: any) {
    setGroupModalOpen(true);
    setEditAddGroup(2);
    setEditGroupItem(item);
  }

  function handleUpdateData() {
    groupList();
  }

  return (
    <div>
      <EditGroup updateGroupData={handleUpdateData} />
      <Collapse defaultActiveKey={['1']}>
        <Panel
          className="min-w-100"
          header="表语义组"
          key="1"
          extra={
            <Button
              color="primary"
              icon={<PlusOutlined />}
              size="small"
              variant="outlined"
              onClick={e => {
                e.stopPropagation();
                setGroupModalOpen(true);
                setEditAddGroup(1);
              }}
            >
              添加组
            </Button>
          }
        >
          <List
            dataSource={listSemanticGroup}
            itemLayout="horizontal"
            renderItem={item => (
              <List.Item
                key={item.groupId}
                actions={[
                  <>
                    <Button
                      icon={<EditOutlined />}
                      type="text"
                      onClick={() => handleEditGroup(item)}
                    />
                    <Popconfirm
                      cancelText="取消"
                      key={item.groupId}
                      okText="确定"
                      title="确定删除该组吗？"
                      onConfirm={() => handleDelete(item.groupId)}
                    >
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        type="text"
                      />
                    </Popconfirm>
                  </>
                ]}
              >
                <div
                  className={groupId === item.groupId ? 'bg-#646CFF text-#fff w-fit' : ''}
                  style={{
                    borderRadius: '4px',
                    cursor: 'pointer',
                    padding: '8px'
                  }}
                  onClick={() => groupNameClick(item)}
                >
                  {item.groupName}
                </div>
              </List.Item>
            )}
          />
        </Panel>
      </Collapse>
    </div>
  );
};
