import React from 'react';

import { AddOrEditDictionary } from './DictionaryAddOrEdit';
import { FormInstance } from 'antd';

interface DictionaryModalProps {
  readonly editObj: any;
  readonly onClose: () => void;
  readonly onSure: (values: any,form:FormInstance) => void;
  readonly open: boolean;
}

export const DictionaryModal: React.FC<DictionaryModalProps> = ({ editObj, onClose, onSure, open }) => {
  return (
    <AddOrEditDictionary
      editObj={editObj}
      open={open}
      onClose={onClose}
      onSure={onSure}
    />
  );
};
