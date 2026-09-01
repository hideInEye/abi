import { useAppSelector } from '@/hooks/business/useStore';
import type { IDataCollection, IDataCollectionOption } from '@/pages/workbench/ontology-kg/label-meaning/types';
import { fetchDataCollectionList } from '@/service/api';
import { isFlatRequestSuccess } from '@/service/request/flat-result';
import { getSpaceId } from '@/store/slice/app';

function transformDataCollectionList(list: IDataCollection[]): IDataCollectionOption[] {
  return list.map(item => ({
    label: item.viewName,
    value: item.viewId
  }));
}

export function useDataCollectionList() {
  const spaceId = useAppSelector(getSpaceId) || 0;
  const [dataCollectionList, setDataCollectionList] = useState<IDataCollectionOption[]>([]);
  async function getDataCollectionList() {
    const result = await fetchDataCollectionList({
      pageNum: 1,
      pageSize: 10000,
      spaceId,
      viewName: ''
    });
    if (!isFlatRequestSuccess(result)) return false;
    const { data } = result;
    const rows = Array.isArray(data?.data) ? data.data as IDataCollection[] : [];
    setDataCollectionList(transformDataCollectionList(rows));
    return true;
  }

  return {
    dataCollectionList,
    getDataCollectionList
  };
}
