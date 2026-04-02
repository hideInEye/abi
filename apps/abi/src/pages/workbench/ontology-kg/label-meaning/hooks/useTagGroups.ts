import type { TagGroup } from '@/pages/workbench/ontology-kg/label-meaning/types';
import { addTag, delTag } from '@/service/api/tag-meaning.ts';

export function useTag(initialGroups: TagGroup[]) {
  const [tagGroups, setTagGroups] = useState(initialGroups);

  const handleUpdate = useCallback((id: number, values: Partial<TagGroup>) => {
    setTagGroups(prev => prev.map(group => (group.tagId === id ? { ...group, ...values } : group)));
  }, []);

  const handleAdd = useCallback(async (values: TagGroup) => {
    const newTag = { ...values };
    setTagGroups(prev => [...prev, newTag]);
    await addTag(newTag);
    return newTag;
  }, []);

  const handleDelete = async (id: number) => {
    setTagGroups(prev => prev.filter((item: TagGroup) => item.tagId !== id));
    await delTag({ tagId: id });
  };

  const handleQueryTag = () => {};

  return { handleAdd, handleDelete, handleQueryTag, handleUpdate, tagGroups };
}
