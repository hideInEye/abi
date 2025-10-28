import type { PluginItem } from '@/types/plug';

export const usePluginManagement = () => {
  const [open, setOpen] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<PluginItem | null>(null);
  return { currentEdit, open, setCurrentEdit, setOpen };
};
