import { localStg } from '@/utils/storage';

import { apiRequest } from '../request';
import { getUserId } from '../request/shared';

// 从本地登录信息取当前用户 ID：优先 userInfo.userId（登录接口可能不返回 userId，单独存的 userId 会是空串）
function getCurrentUserId(): number {
  const userInfo: any = localStg.get('userInfo');
  if (userInfo?.userId != null && userInfo.userId !== '') return Number(userInfo.userId);
  const uid = getUserId();
  return uid != null && uid !== '' ? Number(uid) : 0;
}

/** get data-source list */
export async function fetchDataSourceList(data?: Api.DataPreparation.DataSourceSearchParamsType) {
  const res = (await apiRequest<Api.DataPreparation.DatasourceListType>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/queryDataSourcelist'
  })) as any;
  res.data.data = res.data?.list || [];
  return res;
}

/** validate data-source */
export function validDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/validDataSource'
  });
}

/** update data-source */
export function updateDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/updateDataSource'
  });
}

/** update data-source */
export function addDataSource(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/addDataSource'
  });
}

// 新增数据源时额外调用接口，用于ai对话
export function addDb(data?: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/chat-proxy/api/v1/chat/db/add'
  });
}

// 删除数据源时额外调用接口，用于ai对话
export function deleteDb(dbName: string) {
  return apiRequest<any>({
    method: 'post',
    url: `/api/chat-proxy/api/v1/chat/db/delete?db_name=${dbName}`
  });
}

/** fetch datasource type options */
export function fetchDataSourceTypeOptions() {
  return apiRequest<any>({
    method: 'post',
    url: '/api/abi-data/api/v1/source/getDataSourceType'
  });
}

/** delete datasource */
export function deleteDataSource(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/deleteDataSource'
  });
}

/** get tables by datasource */
export function fetchTablesBySource(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/getTables'
  });
}

/** get field by datasource */
export async function getFieldByDataSource(data: any) {
  const res = await apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/getTableField'
  });

  return { data: res.data.map((item: any) => ({ ...item, ...data })) };
}

/** 获取预览数据 */
export function getPreviewDataByTable(data: any) {
  return apiRequest<any>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/previewDataWithLimit'
  });
}

// 数据集
/** get data-collection list */
export async function fetchDataCollectionList(data?: any) {
  const res: any = await apiRequest<Api.DataPreparation.DatasourceListType>({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/qyeryDataSetList'
  });
  res.data.data = res.data?.list || [];
  return res;
}

// 删除数据集
export async function deleteCollection(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/deleteDataSet'
  });
}

// 获取数据集详情
export async function getCollectionDetail(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/queryDataSetDetail'
  });
}

// 预览数据集数据
export async function getPreviewData(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/previewData'
  });
}

// 运行sql，获取预览数据
export async function getPreviewSql(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/previewSql'
  });
}

// 根据sql获取字段
export async function getFieldsBySql(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/tableField'
  });
}

// 添加数据集
export async function addDataSet(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/addDataSet'
  });
}

// 保存数据集数据
export async function saveDataSet(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/dataset/saveDataSet'
  });
}
// 2.根据数据源id查询 数据集、表资源（血缘管系上方 筛选条件）
export async function getRelResList(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/getRelResList'
  });
}
// 1.获取数据源下血缘关系
export async function getBloodRel(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/getBloodRel'
  });
}

// 上传文件
export async function uploadFile(data: any) {
  return await apiRequest({
    data,
    method: 'post',
    url: '/api/abi-data/api/v1/source/uploadFile'
  });
}

// 血缘关系列表（关系模型）
export async function queryLineageRelationList(data: any) {
  return await apiRequest({
    method: 'post',
     data,
    url: '/api/abi-data/api/v1/lineage/getRelation'
  });
}

interface GenerateSqlParams {
  /** 自然语言描述 */
  messages: string;
  /** 数据源 ID（必传） */
  sourceId: string;
  /** 数据源类型（必传） */
  sourceType: string;
  /** 数据库名（必传，取自数据源 configuration.dbName） */
  dbName: string;
  /** 选择表勾选的表名列表 */
  tables?: string[];
}

/**
 * 数据集 SQL 模式：自然语言生成 SQL（非流式）
 * 返回 data.items 即为生成的 SQL 语句
 */
export async function generateSql({ messages, sourceId, sourceType, dbName, tables }: GenerateSqlParams) {
  const body = {
    model: 'Qwen3.7-max',
    stream: false,
    temperature: 0,
    max_new_tokens: 4096,
    incremental: true,
    enable_vis: false,
    context: {
      chat_model_id: 16,
      space_id: Number(localStorage.getItem('spaceId')),
      app_id: 0,
      user_id: getCurrentUserId(),
      chat_mode: 'chat_with_db_execute',
      embed_model_id: 6,
      conv_uid: `sql-${Date.now()}`,
      extra: {
        extra_body: {
          enable_thinking: false
        },
        source_id: sourceId,
        source_type: sourceType,
        db_name: dbName,
        tables: tables || []
      }
    },
    messages
  };

  return await apiRequest<any>({
    method: 'post',
    data: body,
    url: '/api/chat-proxy/api/v2/workflow/chat/completions/sql-template'
  });
}
