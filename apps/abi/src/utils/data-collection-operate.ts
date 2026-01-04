import { cloneDeep } from 'lodash';

export const genUniqueId = (deep: string) => {
  // 生成一个 0 到 1 之间的随机数，转换为字符串后截取 10 位
  const randomNumber = Math.random().toString().slice(2, 12);
  return `1${randomNumber}${deep}`;
};

const loopAddUniqueId = (nodeArr: any[], deep: number) => {
  nodeArr.forEach((item, index) => {
    if (item.childrenDs) {
      loopAddUniqueId(item.childrenDs, deep + 1);
    } else {
      // const uniqueId = `${item.currentDs?.tableName}-${deep}-${index}`;
      const uniqueId = genUniqueId(`${deep}${index}`);
      item.uniqueId = uniqueId;
      item.currentDs.rtableId = uniqueId;

      if (item.currentDsFields?.length) {
        item.currentDsFields = item.currentDsFields.map((fItem: any, fIndex: number) => ({
          ...fItem,
          // tfieldId: `${uniqueId}-${fItem.originName}`
          rtableId: item.currentDs.rtableId,
          tfieldId: `${uniqueId}${fIndex}`,
          // tfieldName: fItem.originName,
          tfieldShowName: fItem.originName
        }));
      }
    }
  });
};

// 将拖拽的表数据变成传参的格式
export const formatToParamsData = (data: any) => {
  const { tableName } = data;
  const tableInfo = { sql: '', table: tableName };
  // const currentDs = {
  //   dataType,
  //   rtableId,
  //   sourceId,
  //   tableInfo: JSON.stringify(tableInfo),
  //   tableName
  // };
  const currentDs = {
    ...data,
    tableInfo: JSON.stringify(tableInfo)
  };
  const currentDsFields: any = null;
  // [
  // {
  //   checked: true,
  //   groupType: 'q',
  //   originName: 'name',
  //   rtableId: 2,
  //   sourceId: 1086750650123030528,
  //   tfieldId: 5,
  //   tfieldName: 'name',
  //   tfieldShowName: 'name',
  //   type: 'STRING'
  // },
  // {
  //   checked: true,
  //   groupType: 'q',
  //   originName: 'sex',
  //   rtableId: 2,
  //   sourceId: 1086750650123030528,
  //   tfieldId: 4,
  //   tfieldName: 'sex',
  //   tfieldShowName: 'sex',
  //   type: 'STRING'
  // }
  // ];
  // const unionToParent
  return {
    currentDs,
    currentDsFields
  };
};

// 给节点添加uniqueId
export const formatNodeData = (data: any = {}) => {
  const { currentDsFields } = data;
  // const uniqueId = currentDs.tableName;
  const uniqueId = genUniqueId(`${0}${0}`);
  data.uniqueId = uniqueId;
  data.currentDs.rtableId = uniqueId;
  if (!data.unionToParent) {
    data.unionToParent = {};
  }
  if (!data.childrenDs) {
    data.childrenDs = [];
  }

  if (currentDsFields?.length) {
    data.currentDsFields = currentDsFields.map((item: any, index: number) => ({
      ...item,
      rtableId: data.currentDs.rtableId,
      tfieldId: `${uniqueId}${index}`,
      // tfieldName: item.originName,
      tfieldShowName: item.originName
    }));
  }
  if (data.childrenDs) {
    const deep = 1;
    loopAddUniqueId(data.childrenDs, deep);
  }

  console.log(data);
  return data;
};

// 将节点数据的所有字段数据取出来
export const getAllFieldsByNodeData = (nodeData: any) => {
  let resFields: any[] = [];

  const loopConcatFields = (node: any) => {
    if (nodeData.currentDsFields?.length) {
      resFields = resFields.concat(node.currentDsFields);
    }
    if (node.childrenDs?.length) {
      node.childrenDs.forEach((item: any) => {
        loopConcatFields(item);
      });
    }
  };

  loopConcatFields(nodeData);
  return resFields;
};

// 保存时将nodeData节点数据转换成allFields编辑之后数据
export const updateNodeDataByAllFields = (_nodData: any, allFields: any) => {
  const nodeData = cloneDeep(_nodData);

  const loopConcatFields = (node: any) => {
    if (node.currentDsFields?.length) {
      node.currentDsFields = node.currentDsFields.map((item: any) => {
        const curItem = allFields.find((aItem: any) => aItem.tfieldId === item.tfieldId);
        return curItem || item;
      });
    }
    if (node.childrenDs?.length) {
      node.childrenDs.forEach((item: any) => {
        loopConcatFields(item);
      });
    }
  };

  loopConcatFields(nodeData);

  return nodeData;
};

const loopDs = (ds: any, arr: any) => {
  if (ds?.length) {
    ds.forEach((node: any) => {
      const { childrenDs, currentDs } = node;
      if (currentDs) {
        arr.push(currentDs.tableName);
        loopDs(childrenDs, arr);
      }
    });
  }
};

export const getTableArr = (node: any = {}) => {
  const arr = [];
  const { childrenDs, currentDs } = node;
  if (currentDs) {
    arr.push(currentDs.tableName);
    loopDs(childrenDs, arr);
  }

  return arr;
};
