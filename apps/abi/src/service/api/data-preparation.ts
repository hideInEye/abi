import { apiRequest } from '../request';

/** get data-source list */
export async function fetchDataSourceList(data?: Api.DataPreparation.DataSourceSearchParamsType) {
  const res = (await apiRequest<Api.DataPreparation.DatasourceListType>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/queryDataSourcelist'
  })) as any;
  res.data.data = res.data?.list || [];
  return res;
}

/** validate data-source */
export function validDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/validDataSource'
  });
}

/** update data-source */
export function updateDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/updateDataSource'
  });
}

/** update data-source */
export function addDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/addDataSource'
  });
}

// 新增数据源时额外调用接口，用于ai对话
export function addDb(data?: any) {
  return apiRequest<any>({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    data,
    method: 'post',
    url: '/chat-proxy/api/v1/chat/db/add'
  });
}

// 删除数据源时额外调用接口，用于ai对话
export function deleteDb(dbName: string) {
  return apiRequest<any>({
    baseURL: import.meta.env.VITE_CHAT_SERVICE_BASE_URL,
    method: 'post',
    url: `/chat-proxy/api/v1/chat/db/delete?db_name=${dbName}`
  });
}

/** fetch datasource type options */
export function fetchDataSourceTypeOptions() {
  return apiRequest<any>({
    method: 'post',
    url: '/abi-data/api/v1/source/getDataSourceType'
  });
}

/** delete datasource */
export function deleteDataSource(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/deleteDataSource'
  });
}

/** get tables by datasource */
export function fetchTablesBySource(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/getTables'
  });
}

/** get field by datasource */
export async function getFieldByDataSource(data: any) {
  const res = await apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/getTableField'
  });

  return { data: res.data.map((item: any) => ({ ...item, ...data })) };
}

/** 获取预览数据 */
export function getPreviewDataByTable(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/previewDataWithLimit'
  });
}

// 数据集
/** get data-collection list */
export async function fetchDataCollectionList(data?: any) {
  const res: any = await apiRequest<Api.DataPreparation.DatasourceListType>({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/qyeryDataSetList'
  });
  res.data.data = res.data?.list || [];
  return res;
}

// 删除数据集
export async function deleteCollection(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/deleteDataSet'
  });
}

// 获取数据集详情
export async function getCollectionDetail(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/queryDataSetDetail'
  });
}

// 预览数据集数据
export async function getPreviewData(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/previewData'
  });
}

// 运行sql，获取预览数据
export async function getPreviewSql(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/previewSql'
  });
}

// 根据sql获取字段
export async function getFieldsBySql(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/tableField'
  });
}

// 添加数据集
export async function addDataSet(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/addDataSet'
  });
}

// 保存数据集数据
export async function saveDataSet(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/dataset/saveDataSet'
  });
}
// 2.根据数据源id查询 数据集、表资源（血缘管系上方 筛选条件）
export async function getRelResList(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/getRelResList'
  });
}
// 1.获取数据源下血缘关系
export async function getBloodRel(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/getBloodRel'
  });
}

// 上传文件
export async function uploadFile(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/abi-data/api/v1/source/uploadFile'
  });
}

// 血缘关系列表（关系模型）
export async function queryLineageRelationList(data: any) {
  return await apiRequest({
    method: 'post',
     data,
    url: '/abi-data/api/v1/lineage/getRelation'
  });
}
