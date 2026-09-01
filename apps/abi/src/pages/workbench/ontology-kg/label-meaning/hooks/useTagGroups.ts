import type { TagGroup } from '@/pages/workbench/ontology-kg/label-meaning/types';
import { addTag, delTag } from '@/service/api/tag-meaning.ts';
import { assertFlatRequestSuccess } from '@/service/request/flat-result';

export function useTag(initialGroups: TagGroup[]) {
  const [tagGroups, setTagGroups] = useState(initialGroups);

  const handleUpdate = useCallback((id: number, values: Partial<TagGroup>) => {
    setTagGroups(prev => prev.map(group => (group.tagId === id ? { ...group, ...values } : group)));
  }, []);

  const handleAdd = useCallback(async (values: TagGroup) => {
    const newTag = { ...values };
    const result = await addTag(newTag);
    assertFlatRequestSuccess(result);
    setTagGroups(prev => [...prev, newTag]);
    return newTag;
  }, []);

  const handleDelete = async (id: number) => {
    const result = await delTag({ tagId: id });
    assertFlatRequestSuccess(result);
    setTagGroups(prev => prev.filter((item: TagGroup) => item.tagId !== id));
  };

  const handleQueryTag = () => {};

  return { handleAdd, handleDelete, handleQueryTag, handleUpdate, tagGroups };
}
