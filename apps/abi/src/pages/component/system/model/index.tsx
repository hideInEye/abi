import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { message } from 'antd'
import { Suspense } from 'react'

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage'
import { deleteModel, fetchAddModel, fetchEditModel, fetchModelList } from '@/service/api'

const ModalOperateDrawer = lazy(() => import('./modules/modal-operate-drawer'))

export function Component() {
  const { t } = useTranslation()

  const [searchValue, setSearchValue] = useState('')

  // const isMobile = useMobile();

  const handleSwitch = async (record: any) => {
    const updateRes: any = await fetchEditModel({ ...record, status: record.status === '1' ? '0' : '1' })
    if (updateRes?.response?.data?.code !== 200) return false
    message.success('操作成功')
    run()
  }

  const handleDelete = async (id: number) => {
    const res = await deleteModel(id)
    console.log(res, 'res')
    if (res.response.data.code === 200) {
      message.success(res.response.data.msg)
      return onDeleted()
    } else {
      message.error(res.response.data.msg)
    }
  }

  const { data, run, tableProps, updateSearchParams } = useTable({
    apiFn: fetchModelList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 10,
      modelName: searchValue,
      // spaceId: 1 // 空间id
    },
    columns: () =>
      [
        {
          align: 'left',
          dataIndex: 'providerName',
          key: 'providerName',
          render: (providerName: string) => PROVIDER_OPTIONS.find((item) => item.value === providerName)?.label || providerName,
          title: '供应商',
        },
        {
          align: 'left',
          dataIndex: 'modelName',
          key: 'modelName',
          title: '模型名称',
        },
        {
          align: 'left',
          dataIndex: 'modelType',
          key: 'modelType',
          render: (type: string) => MODAL_TYPE_OPTIONS.find((item) => item.value === type)?.label,
          title: '模型类型',
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: string, record: any) => {
            return <ASwitch checked={status === '1'} onClick={() => handleSwitch(record)} />
          },
          title: '状态',
        },
        {
          align: 'left',
          dataIndex: 'remark',
          key: 'remark',
          title: '描述',
        },
        {
          align: 'center',
          dataIndex: 'createBy',
          key: 'createBy',
          title: '创建人',
        },
        {
          align: 'center',
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.dataPreparation.dataSource.createTime'),
          width: 160,
        },
        {
          align: 'center',
          fixed: 'right',
          key: 'operate',
          render: (_: unknown, record: any) => (
            <div className="flex-center gap-8px">
              <ATooltip title={t('page.manage.common.edit')}>
                <AButton
                  color="primary"
                  icon={<EditOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => {
                    // const config = JSON.parse(record.configuration);
                    // const formatRecord = { ...record, ...config };
                    // edit(formatRecord);
                    edit(record)
                  }}
                />
              </ATooltip>
              <APopconfirm title={t('common.confirmDelete')} onConfirm={() => handleDelete(record.llmId)}>
                <ATooltip title={t('page.manage.common.delete')}>
                  <AButton className="text-red" color="danger" disabled={_.type === 'special-user'} icon={<DeleteOutlined />} type="text" />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate'),
        },
      ] as any,
    rowKey: 'llmId',
  } as any)

  const { editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted, rowSelection } = useTableOperate(data as any, run, async (res: any, operateType) => {
    const { apiKey, baseUrl, context_length, max_token, maxRetries, modelUID, secretKey, temperature, timeOut, type, ...elseProps } = res as any
    let modelConfigObject: any = {
      apiKey,
      baseUrl,
      context_length,
      modelUID,
      secretKey,
      // max_token,
      // maxRetries,
      // temperature,
      // timeOut
    }
    if (res.modelType === 'llm') {
      modelConfigObject = {
        apiKey,
        baseUrl,
        context_length,
        max_token,
        maxRetries,
        modelUID,
        secretKey,
        temperature,
        timeOut,
        type,
      }
    }
    const modelConfig = JSON.stringify(modelConfigObject)
    const commonData = {
      ...elseProps,
      modelConfig,
    }

    if (operateType === 'add') {
      // add request 调用新增的接口
      const addRes: any = await fetchAddModel(commonData)
      if (addRes?.response?.data?.code !== 200) return false
    } else {
      // edit request 调用编辑的接口
      // const sourceId = (editingData as any)?.sourceId;
      const updateRes: any = await fetchEditModel({ ...commonData, llmId: editingData?.llmId, status: '1' })
      if (updateRes?.response?.data?.code !== 200) return false
    }
  })

  // async function handleBatchDelete() {
  //   // request
  //   console.log(checkedRowKeys);
  //   onBatchDeleted();
  // }

  function edit(row: any) {
    try {
      const config = JSON.parse(row.modelConfig)
      const formatRow = { ...row, ...config }
      handleEdit(formatRow)
    } catch (error) {
      console.log(error)
    }
  }
  const handleSearch = () => {
    const keyword = searchValue.trim()
    updateSearchParams({
      pageNum: 1,
      modelName: keyword ? keyword : undefined,
    } as any)
  }

  return (
    <div className="flex flex-col gap-4 p-6" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <h1 className="text-base font-medium">大模型列表</h1>
      <div className="flex items-center gap-4">
        <AInput placeholder="请输入模型名称" value={searchValue} onChange={(e) => setSearchValue(e.target.value)} onPressEnter={handleSearch} style={{ width: '12.5rem' }} />
        <AButton className="ml-auto" type="primary" onClick={() => handleAdd()}>
          新增
        </AButton>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%',
          }}
        >
          <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
            <ATable
              size="small"
              rowSelection={rowSelection}
              className="model-table"
              scroll={tableProps.dataSource?.length > 0 ? { x: 'max-content' } : undefined}
              {...(tableProps as any)}
              pagination={false}
            />
          </div>
        </div>

        <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
          <APagination {...(tableProps as any).pagination} showSizeChanger style={{ padding: '0' }} />
        </div>
      </div>

      <Suspense>
        <ModalOperateDrawer {...generalPopupOperation} />
      </Suspense>
    </div>
  )
}
