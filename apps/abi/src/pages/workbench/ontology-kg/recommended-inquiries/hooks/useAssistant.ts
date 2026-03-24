import { fetchAssistantConfigList } from '@/service/api/assistant-manage.ts';

interface AssistantConfig {
  agentAlias: string | null;
  agentId: number;
  bizName: string;
  createBy: string;
  createTime: string;
  groupId: number;
  modelConfig: string;
  queryConfig: string;
  remark: string;
  schemaId: number;
  spaceId: number;
  status: string;
  techName: string;
  updateBy: string;
  updateTime: string;
}

interface AssistantConfigOption {
  label: string;
  value: number;
}

function transformAssistantConfigList(list: AssistantConfig[]): AssistantConfigOption[] {
  return list.map(item => ({
    label: item.bizName,
    value: item.agentId
  }));
}

export function useAssistant() {
  const [assistantConfigList, setAssistantConfigList] = useState<AssistantConfigOption[]>([]);

  async function getAssistantConfigList() {
    const res = await fetchAssistantConfigList();
    setAssistantConfigList(transformAssistantConfigList(res.data.data));
  }

  return { assistantConfigList, getAssistantConfigList };
}
