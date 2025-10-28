import { EditOutlined } from '@ant-design/icons';
import { message } from 'antd';
import { Suspense } from 'react';

// import { enableStatusRecord } from '@/constants/business';
// import { ATG_MAP } from '@/constants/common';
import { MODAL_TYPE_OPTIONS } from '@/constants/manage';
import { fetchAddModel, fetchEditModel, fetchModelList } from '@/service/api';

import KeySearch from './modules/key-search';

const ModalOperateDrawer = lazy(() => import('./modules/modal-operate-drawer'));

export function Component() {
  const { t } = useTranslation();

  // const isMobile = useMobile();

  const { scrollConfig, tableWrapperRef } = useTableScroll();

  const handleSwitch = async (record: any) => {
    const updateRes: any = await fetchEditModel({ ...record, status: record.status === '1' ? '0' : '1' });
    if (updateRes?.response?.data?.code !== 200) return false;
    message.success('操作成功');
    run();
  };

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
          render: (_: unknown, record: any) => (
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
            </div>
          ),
          title: t('common.operate')
        }
      ] as any,
    rowKey: 'llmId'
  } as any);

  const { checkedRowKeys, editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(
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
        const updateRes: any = await fetchEditModel({ ...commonData, llmId: editingData?.llmId });
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
    <div className="h-full min-h-500px flex-col-stretch gap-16px overflow-hidden lt-sm:overflow-auto">
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
        ref={tableWrapperRef}
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
        <ATable
          scroll={scrollConfig}
          size="small"
          {...(tableProps as any)}
          pagination={false}
        />

        <Suspense>
          <ModalOperateDrawer {...generalPopupOperation} />
        </Suspense>
      </ACard>
    </div>
  );
}
