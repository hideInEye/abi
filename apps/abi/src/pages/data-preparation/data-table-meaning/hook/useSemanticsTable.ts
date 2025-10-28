import { deleteTableSemantics, schemalist } from '@/service/api/data-table-meaning';

export function useSemanticsTable() {
  const [tableSchemaList, setTableSchemaList] = useState([]);

  async function fetchTableSchemaList(grouppageSize: number, gpId: number, bizName = '') {
    const { response } = await schemalist({
      bizName,
      groupId: gpId,
      pageNum: 1,
      pageSize: grouppageSize
    });
    const { rows } = response.data as unknown as { rows: any[] };
    setTableSchemaList(rows as any);
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
