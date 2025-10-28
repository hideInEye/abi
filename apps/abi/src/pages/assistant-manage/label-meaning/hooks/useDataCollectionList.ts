import type { IDataCollection, IDataCollectionOption } from '@/pages/assistant-manage/label-meaning/types';
import { fetchDataCollectionList } from '@/service/api';

function transformDataCollectionList(list: IDataCollection[]): IDataCollectionOption[] {
  return list.map(item => ({
    label: item.viewName,
    value: item.viewId
  }));
}

export function useDataCollectionList() {
  const [dataCollectionList, setDataCollectionList] = useState<IDataCollectionOption[]>([]);
  async function getDataCollectionList() {
    const { data } = await fetchDataCollectionList({
      pageNum: 1,
      pageSize: 10000,
      spaceId: Number(localStorage.getItem('spaceId')),
      viewName: ''
    });
    const rows = data?.data as unknown as IDataCollection[];
    setDataCollectionList(transformDataCollectionList(rows));
  }

  return {
    dataCollectionList,
    getDataCollectionList
  };
}
