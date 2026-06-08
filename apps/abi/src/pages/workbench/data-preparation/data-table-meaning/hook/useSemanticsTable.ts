import { deleteTableSemantics, schemalist } from '@/service/api/data-table-meaning';

export function useSemanticsTable() {
  const [tableSchemaList, setTableSchemaList] = useState<any[]>([]);

  async function fetchTableSchemaList(grouppageSize: number, gpId: number, bizName = '', startTime?: string, endTime?: string) {
    const { response } = await schemalist({
      bizName,
      endTime,
      groupId: gpId,
      pageNum: 1,
      pageSize: grouppageSize,
      startTime
    });
    const { rows } = response.data as unknown as { rows: any[] };
    setTableSchemaList(rows || []);
  }

  function deleteTable(record: any) {
    deleteTableSemantics(record.schemaId);
    setTimeout(() => {
      fetchTableSchemaList(100, record.groupId);
    }, 1000);
  }

  return {
    deleteTable,
    fetchTableSchemaList,
    setTableSchemaList,
    tableSchemaList
  };
}
