import type { FormInstance } from 'antd';

import { getCollectionDetail } from '@/service/api';

import type { IAllFields, IDataCollectionOption } from '../../types';

interface DataMapsSelectProps {
  readonly dataCollectionList: IDataCollectionOption[];
  readonly dataScopeHandle: (value: IAllFields[]) => void;
  readonly form: FormInstance<any>;
}

export function DataMapsSelect({ dataCollectionList, dataScopeHandle, form }: DataMapsSelectProps) {
  const dataScopeChange = async () => {
    const viewId = form.getFieldValue('viewId');
    const { data } = await getCollectionDetail({
      spaceId: Number(localStorage.getItem('spaceId')),
      viewId
    });
    dataScopeHandle(data?.allFields);
  };

  useEffect(() => {
    const viewId = form.getFieldValue('viewId');
    if (viewId) {
      dataScopeChange();
    }
  }, []);

  return (
    <AForm.Item
      label="数据范围"
      name="viewId"
      rules={[{ message: '请选择数据范围', required: true }]}
    >
      <ASelect
        options={dataCollectionList}
        placeholder="请选择数据范围"
        onChange={dataScopeChange}
      />
    </AForm.Item>
  );
}
