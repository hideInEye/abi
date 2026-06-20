import React, { useCallback, useEffect } from 'react'
import { Splitter } from 'antd'

import { Group } from '@/components/stateful/group/Group.tsx'

import { useTagManagement } from '../../hooks/useTagManagement.ts'
import { TagModal } from '../../module/TagModal.tsx'
import { TagSearch } from '../../module/TagSearch.tsx'
import { TagTable } from '../../module/TagTable.tsx'

/**
 * 标签语义管理内容组件。
 * 用于属性建模页签内展示，保留原标签语义的分组、搜索、列表和抽屉能力。
 */
export const Component: React.FC = () => {
  const {
    editingGroup,
    getTagList,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSearch,
    isModalOpen,
    setGroupId,
    setIsModalOpen,
    tagList,
    tagSave
  } = useTagManagement()

  const handleGroupChange = useCallback((id: number) => {
    setGroupId(id)
  }, [setGroupId])

  useEffect(() => {
    getTagList({})
  }, [groupId])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <Splitter style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <Splitter.Panel defaultSize={280} min={200} max={400} resizable>
          <div className="abi-group-sidebar" style={{ height: '100%' }}>
            <Group
              config={{
                button: '添加标签语义组',
                inputLabel: '标签语义组名称',
                inputPlaceholder: '请输入标签语义组名称',
                modalAddTitle: '新增标签语义组',
                modalEditTitle: '编辑标签语义组',
                panelTitle: '标签语义组',
                rule: [
                  [
                    { message: '请输入标签语义组名称', required: true },
                    { max: 50, message: '标签语义组名称不能超过50个字符' }
                  ]
                ],
                type: 'tag'
              }}
              onGroupId={handleGroupChange}
            />
          </div>
        </Splitter.Panel>

        <Splitter.Panel>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%' }}>
            <TagSearch onSearch={handleSearch} />
            <section className="abi-data-area">
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <AButton
                  type="primary"
                  className="btn-accent-gradient"
                  onClick={handleAdd}
                  disabled={!groupId}
                >
                  + 新增标签语义
                </AButton>
              </div>
              <TagTable
                dataSource={tagList}
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            </section>

            {isModalOpen && (
              <TagModal
                editingGroup={editingGroup}
                isModalOpen={isModalOpen}
                onCancel={setIsModalOpen}
                onSave={tagSave}
              />
            )}
          </div>
        </Splitter.Panel>
      </Splitter>
    </div>
  )
}

export default Component
