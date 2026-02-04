import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { Suspense } from 'react';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { MODAL_TYPE_OPTIONS, PROVIDER_OPTIONS } from '@/constants/manage';
import { deleteModel, fetchAddModel, fetchEditModel, fetchModelList } from '@/service/api';

import KeySearch from './modules/key-search';

const ModalOperateDrawer = lazy(() => import('./modules/modal-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  // const isMobile = useMobile();

  const handleSwitch = async (record: any) => {
    const updateRes: any = await fetchEditModel({ ...record, status: record.status === '1' ? '0' : '1' });
    if (updateRes?.response?.data?.code !== 200) return false;
    message.success('操作成功');
    run();
  };

  const handleDelete =async (id:number) => {
    const res =  await deleteModel(id)
    console.log(res,'res');
    if(res.response.data.code===200) {
      message.success(res.response.data.msg)
      return onDeleted()
    }else {
      message.error(res.response.data.msg)
    }
  }

  const { columnChecks, data, run, searchProps, setColumnChecks, tableProps } = useTable({
    apiFn: fetchModelList as any,
    apiParams: {
      // current: 1,
      // size: 10,
      modelName: ''
      // spaceId: 1 // 空间id
    },
    columns: () =>
      [
        {
          align: 'center',
          dataIndex: 'providerName',
          key: 'providerName',
          render: (providerName: string) => PROVIDER_OPTIONS.find(item => item.value === providerName)?.label || providerName,
          title: '供应商'
        },
        {
          align: 'center',
          dataIndex: 'modelName',
          key: 'modelName',
          title: '模型名称'
        },
        {
          dataIndex: 'modelType',
          key: 'modelType',
          render: (type: string) => MODAL_TYPE_OPTIONS.find(item => item.value === type)?.label,
          title: '模型类型'
        },
        {
          align: 'center',
          dataIndex: 'status',
          key: 'status',
          render: (status: string, record: any) => {
            return (
              <ASwitch
                checked={status === '1'}
                onClick={() => handleSwitch(record)}
              />
            );
          },
          title: '状态'
        },
        {
          dataIndex: 'remark',
          key: 'remark',
          title: '描述'
        },
        {
          dataIndex: 'createBy',
          key: 'createBy',
          title: '创建人'
        },
        {
          dataIndex: 'createTime',
          key: 'createTime',
          title: t('page.dataPreparation.dataSource.createTime'),
          width: 160
        },
        {
          align: 'center',
          key: 'operate',
          render: (_: unknown, record: any,index:number) => (
            <div className="flex-center gap-8px">
              <AButton
                color="primary"
                icon={<EditOutlined />}
                size="small"
                variant="link"
                onClick={() => {
                  // const config = JSON.parse(record.configuration);
                  // const formatRecord = { ...record, ...config };
                  // edit(formatRecord);
                  edit(record);
                }}
              />
              <APopconfirm
                title={t('common.confirmDelete')}
                onConfirm={() => handleDelete(record.llmId)}
              >
                <ATooltip title={t('page.manage.common.delete')}>
                  <AButton
                    className="text-red"
                    color="danger"
                    disabled={_.type === 'special-user'}
                    icon={<DeleteOutlined />}
                    type="text"
                  />
                </ATooltip>
              </APopconfirm>
            </div>
          ),
          title: t('common.operate')
        }
      ] as any,
    rowKey: 'llmId'
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted, rowSelection } = useTableOperate(
    data as any,
    run,
    async (res: any, operateType) => {
      const {
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
        ...elseProps
      } = res as any;
      let modelConfigObject: any = {
        apiKey,
        baseUrl,
        context_length,
        modelUID,
        secretKey
        // max_token,
        // maxRetries,
        // temperature,
        // timeOut
      };
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
          type
        };
      }
      const modelConfig = JSON.stringify(modelConfigObject);
      const commonData = {
        ...elseProps,
        modelConfig
      };

      if (operateType === 'add') {
        // add request 调用新增的接口
        const addRes: any = await fetchAddModel(commonData);
        if (addRes?.response?.data?.code !== 200) return false;
      } else {
        // edit request 调用编辑的接口
        // const sourceId = (editingData as any)?.sourceId;
        const updateRes: any = await fetchEditModel({ ...commonData, llmId: editingData?.llmId, status: '1' });
        if (updateRes?.response?.data?.code !== 200) return false;
      }
    }
  );

  // async function handleBatchDelete() {
  //   // request
  //   console.log(checkedRowKeys);
  //   onBatchDeleted();
  // }

  function edit(row: any) {
    try {
      const config = JSON.parse(row.modelConfig);
      const formatRow = { ...row, ...config };
      handleEdit(formatRow);
    } catch (error) {
      console.log(error);
    }
  }

  return (
    <div
      className="flex flex-col gap-4 p-6"
      style={{ height: 'calc(100vh - 3rem)', minHeight: 0, overflow: 'hidden' }}
    >
      {/* <ACollapse
        bordered={false}
        className="card-wrapper"
        defaultActiveKey={isMobile ? undefined : '1'}
        items={[
          {
            children: <KeySearch {...searchProps} />,
            key: '1',
            label: t('common.search')
          }
        ]}
      /> */}
      <ACard>
        <KeySearch {...searchProps} />
      </ACard>

      <ACard
        bordered={false}
        className="flex-col-stretch sm:flex-1-hidden card-wrapper"
        styles={{ body: { flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
        title="大模型管理"
        extra={
          <TableHeaderOperation
            add={() => handleAdd()}
            columns={columnChecks}
            disabledDelete={checkedRowKeys.length === 0}
            loading={tableProps.loading}
            refresh={run}
            setColumnChecks={setColumnChecks}
            // onDelete={handleBatchDelete}
          />
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              border: '0.0625rem solid #d9d9d9',
              borderRadius: '0.5rem',
              overflow: 'hidden',
              width: '100%',
              maxHeight: '100%'
            }}
          >
            <div style={{ overflow: 'auto', maxHeight: '100%' }}>
              <ATable
                size="small"
                rowSelection={rowSelection}
                className="model-table"
                {...(tableProps as any)}
                pagination={false}
              />
            </div>
          </div>

          <div style={{ padding: '0.75rem 0', display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
            <APagination {...(tableProps as any).pagination} showSizeChanger />
          </div>
        </div>

        <Suspense>
          <ModalOperateDrawer {...generalPopupOperation} />
        </Suspense>
      </ACard>
    </div>
  );
}
