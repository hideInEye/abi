import { schemalist } from '@/service/api/data-table-meaning';

interface PropsType {
  groupId?: number;
  schemaId: number;
}

enum ConfigType {
  'measures',
  'dimensions',
  'identifiers'
}

const paramsMap: any = {
  dimensions: 'dimensions',
  identifiers: 'primaryKeys',
  measures: 'metrics'
};

const useSchemaFields = ({ groupId, schemaId }: PropsType) => {
  const [schemaOptions, setSchemaOptions] = useState<any[]>([]);
  const fieldsDataSource = useMemo(() => {
    let fields = [];
    if (schemaOptions?.length && schemaId) {
      const filterArr = schemaOptions.filter((item: any) => (schemaId ? item.schemaId === schemaId : true));
      fields = filterArr.reduce((pre, next) => {
        try {
          if (next.modelDetail) {
            const modelDetailObj = JSON.parse(next.modelDetail);
            for (const key in modelDetailObj) {
              if (key in ConfigType) {
                const itemArr = modelDetailObj[key];

                itemArr
                  .filter((item: any) => item.techId) //  临时过滤一下脏数据（没有techId的）
                  .forEach((item: any) => {
                    // 兼容没有techId的情况
                    // const uniqId = genUniqueId(`${index}`);
                    pre.push({
                      ...item,
                      key: item.techId,
                      paramType: item.dateFormat ? 'dates' : paramsMap[key],
                      techId: item.techId
                    });
                  });
              }
            }
          }
        } catch (error) {
          console.log(error);
        }
        return pre;
      }, []);
    }
    return fields;
  }, [schemaOptions, schemaId]);

  const getSchemaOptions = async () => {
    if (!groupId) return;
    const params = {
      groupId,
      pageNum: 1,
      pageSize: 1000
    };
    const res = await schemalist(params);
    setSchemaOptions(res.data);
  };
  useEffect(() => {
    getSchemaOptions();
  }, [groupId]);

  const sourceId = useMemo(() => {
    if (schemaOptions?.length && schemaId) {
      const selected = schemaOptions.find((item: any) => item.schemaId === schemaId);
      // 优先取 schema 顶层 sourceId
      if (selected?.sourceId) return selected.sourceId;
      // 从 modelDetail 的字段中取sourceId（SQL场景）
      try {
        if (selected?.modelDetail) {
          const detail = JSON.parse(selected.modelDetail);
          const allFields = [
            ...(detail.dimensions || []),
            ...(detail.identifiers || []),
            ...(detail.measures || [])
          ];
          const found = allFields.find((f: any) => f.sourceId);
          if (found?.sourceId) return found.sourceId;
        }
      } catch (e) {
        console.error('解析sourceId失败:', e);
      }
    }
    return undefined;
  }, [schemaOptions, schemaId]);

  return {
    fieldsDataSource,
    schemaOptions,
    setSchemaOptions,
    sourceId
  };
};

export { useSchemaFields };
