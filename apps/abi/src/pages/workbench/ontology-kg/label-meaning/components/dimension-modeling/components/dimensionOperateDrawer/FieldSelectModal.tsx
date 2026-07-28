import { Modal } from 'antd'
import React from 'react'

import type { DimensionFieldOption } from '../../types/dimensionModeling.types'

interface Props {
  readonly onCancel: () => void
  readonly onConfirm: (selectedKeys: string[]) => void
  readonly open: boolean
  readonly options: DimensionFieldOption[]
  readonly selectedKeys: string[]
}

function formatFieldLabel(item: DimensionFieldOption) {
  const bizName = item.bizName || item.techId
  const tableName = item.sourceTableName || item.originName || item.techId
  return `${bizName}(${tableName})`
}

export const FieldSelectModal: React.FC<Props> = ({ onCancel, onConfirm, open, options, selectedKeys }) => {
  const [keyword, setKeyword] = useState('')
  const [innerKeys, setInnerKeys] = useState<string[]>(selectedKeys)

  useEffect(() => {
    if (!open) {
      return
    }
    setKeyword('')
    setInnerKeys(selectedKeys)
  }, [open, selectedKeys])

  const filteredOptions = useMemo(() => {
    const search = keyword.trim()
    if (!search) {
      return options
    }
    return options.filter(
      item =>
        String(item.bizName || '').includes(search) ||
        String(item.originName || '').includes(search) ||
        String(item.techId || '').includes(search) ||
        String(item.sourceTableName || '').includes(search)
    )
  }, [keyword, options])

  return (
    <Modal
      destroyOnClose
      open={open}
      title="选择关联字段"
      width={420}
      onCancel={onCancel}
      onOk={() => onConfirm(innerKeys)}
    >
      <AInput
        allowClear
        className="mb-3"
        placeholder="搜索字段名..."
        value={keyword}
        onChange={e => setKeyword(e.target.value)}
      />
      <div className="mb-3 flex items-center gap-3 text-xs">
        <a
          onClick={() => {
            setInnerKeys(filteredOptions.map(item => item.key))
          }}
        >
          全选
        </a>
        <a
          onClick={() => {
            setInnerKeys([])
          }}
        >
          取消全选
        </a>
      </div>
      <div className="max-h-360px overflow-x-hidden overflow-y-auto pr-2">
        <ACheckbox.Group
          className="flex w-full flex-col gap-2"
          value={innerKeys}
          onChange={values => setInnerKeys(values as string[])}
        >
          {filteredOptions.map(item => (
            <ACheckbox
              className="w-full whitespace-normal break-all rounded px-1 py-1"
              key={item.key}
              value={item.key}
            >
              {formatFieldLabel(item)}
            </ACheckbox>
          ))}
        </ACheckbox.Group>
      </div>
    </Modal>
  )
}
