import { useState } from 'react';

import { useDataPreparationStore } from '../store';
import type { DictionaryItem } from '../types';

export const useEnumDrawer = () => {
  const [enumerationModalOpen, setEnumerationModalOpen] = useState(false);
  const { setEnumInfo } = useDataPreparationStore();

  const open = (v: DictionaryItem) => {
    setEnumInfo(v);
    setEnumerationModalOpen(true);
  };

  const close = () => {
    setEnumerationModalOpen(false);
    setEnumInfo(null);
  };

  return {
    close,
    enumerationModalOpen,
    open
  };
};
