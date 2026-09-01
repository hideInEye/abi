import type { FormInstance } from 'antd';

import { useAppSelector } from '@/hooks/business/useStore';
import { getCollectionDetail } from '@/service/api';
import { isFlatRequestSuccess } from '@/service/request/flat-result';
import { getSpaceId } from '@/store/slice/app';

import type { IAllFields, IDataCollectionOption } from '../../../types';

interface DataMapsSelectProps {
  readonly dataCollectionList: IDataCollectionOption[];
  readonly dataScopeHandle: (value: IAllFields[]) => void;
  readonly form: FormInstance<any>;
}

export function DataMapsSelect({ dataCollectionList, dataScopeHandle, form }: DataMapsSelectProps) {
  const spaceId = useAppSelector(getSpaceId) || 0;
  const dataScopeChange = async () => {
    const viewId = form.getFieldValue('viewId');
    const result = await getCollectionDetail({
      spaceId,
      viewId
    });
    if (!isFlatRequestSuccess(result)) return;
    const { data } = result;
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
