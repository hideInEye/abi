import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { Button, List, Popconfirm } from 'antd';
import React, { useState } from 'react';

import { useDataPreparationStore } from '@/pages/component/data/data-dictionary/store';

import { type QuestionGroupItem } from './useGroupManagement';

interface GroupListProps {
  readonly groups: QuestionGroupItem[];
  readonly onDelete: (itemId: number) => void;
  readonly onEdit: (item: QuestionGroupItem) => void;
  readonly onGroupId: (groupId: number) => void;
}

const GroupList: React.FC<GroupListProps> = ({ groups, onDelete, onEdit, onGroupId }) => {
  const [selectedTagId, setSelectedTagId] = useState<number | null>();
  const { setGroupInfo } = useDataPreparationStore();

  useEffect(() => {
    setSelectedTagId(groups[0]?.groupId);
    onGroupId(groups[0]?.groupId);
    setGroupInfo({
      groupName: groups[0]?.groupName,
      groupNameEn: groups[0]?.remark
    });
  }, [groups]);

  const handleEditGroup = (item: QuestionGroupItem) => {
    onEdit(item);
  };

  const handleDelete = (item: QuestionGroupItem) => {
    onDelete(item.groupId);
  };

  const handleGroupNameClick = (item: QuestionGroupItem) => {
    setSelectedTagId(item.groupId);
    onGroupId(item.groupId);
    setGroupInfo({
      groupName: item.groupName,
      groupNameEn: item.remark
    });
  };

  return (
    <List
      dataSource={groups}
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
                okText="确定"
                title="提示"
                description="确定删除该组吗？"
                onConfirm={() => handleDelete(item)}
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
            className={selectedTagId === item.groupId ? 'bg-#646CFF text-#fff w-fit' : ''}
            style={{
              borderRadius: '4px',
              cursor: 'pointer',
              padding: '8px'
            }}
            onClick={() => handleGroupNameClick(item)}
          >
            {item.groupName}
          </div>
        </List.Item>
      )}
    />
  );
};

export default GroupList;
