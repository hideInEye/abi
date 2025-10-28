import { useState } from 'react';

export const useSpaceADrawer = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<string | null>(null);
  return {
    drawerOpen,
    editSpace,
    setDrawerOpen,
    setEditSpace
  };
};
