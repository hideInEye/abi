import React from 'react';

import {
  addDictionaryEnum,
  deleteDictionaryEnum,
  queryDictionaryEnum,
  updateDictionaryEnum
} from '@/service/api/dictionary';

import { useDataPreparationStore } from '../store';
import type { DictionaryEnumItem } from '../types';

import { AddOrEditEnum } from './EnumAddOrEdit';
import { TableEnum } from './EnumTable';

interface EnumDrawerProps {
  readonly close: () => void;
  readonly enumerationModalOpen: boolean;
}

export const EnumDrawer: React.FC<EnumDrawerProps> = ({ close, enumerationModalOpen }) => {
  const { enumInfo } = useDataPreparationStore();
  const [enumEditObj, setEnumEditObj] = useState<any>(null);
  const [enumModalOpen, setEnumModalOpen] = useState(false);
  const [enumerationDataSource, setEnumerationDataSource] = useState<{
    code: number;
    msg: string;
    rows: any[];
    total: number;
  }>();
  const [dictNumber, setDictNumber] = useState(1);

  const enumClose = () => {
    setEnumModalOpen(false);
    setEnumEditObj(null);
  };

  const getEnumInfo = async (params: any) => {
    const res = await queryDictionaryEnum(params);
    setEnumerationDataSource(res.response.data as any);
  };

  useEffect(() => {
    if (enumInfo?.dictField) {
      getEnumInfo({
        dictField: enumInfo!.dictField,
        dictLabel: '',
        pageNum: dictNumber,
        pageSize: 10
      });
    }
  }, [enumInfo?.dictId, dictNumber]);

  const dictSearch = (value: string) => {
    setDictNumber(1);
    setEnumerationDataSource({
      code: 0,
      msg: '',
      rows: [],
      total: 0
    });

    getEnumInfo({
      dictField: enumInfo!.dictField,
      dictLabel: value,
      pageNum: dictNumber,
      pageSize: 10
    });
  };

  const refreshEnumInfo = () => {
    setEnumModalOpen(false);
    setEnumEditObj(null);
    getEnumInfo({
      dictField: enumInfo!.dictField,
      dictLabel: '',
      pageNum: dictNumber,
      pageSize: 10
    });
  };

  const enumSure = async (values: DictionaryEnumItem) => {
    const apiCall = values.type === 'add' ? addDictionaryEnum : updateDictionaryEnum;
    try {
      const res = await apiCall({
        ...values,
        dictId: enumInfo!.dictId
      });

      if (res.response.data.code === 200) {
        refreshEnumInfo();
      }
    } catch (error) {
      console.error('Failed to save dictionary enum:', error);
    } finally {
      setEnumModalOpen(false);
      setEnumEditObj(null);
    }
  };

  const handleEnumDelete = async (dict: DictionaryEnumItem) => {
    const res = await deleteDictionaryEnum(dict.dictCode);
    if (res.response.data.code === 200) {
      setDictNumber(1);
      getEnumInfo({
        dictField: enumInfo!.dictField,
        dictLabel: '',
        pageNum: dictNumber,
        pageSize: 10
      });
    }
  };

  const handleEnumEdit = (record: DictionaryEnumItem) => {
    setEnumEditObj(record);
    setEnumModalOpen(true);
  };

  return (
    <>
      <ADrawer
        open={enumerationModalOpen}
        title="字典枚举"
        width={1000}
        footer={
          <AFlex className="justify-end gap-2">
            <AButton
              type="default"
              onClick={close}
            >
              取消
            </AButton>
            <AButton
              type="primary"
              onClick={close}
            >
              完成
            </AButton>
          </AFlex>
        }
        onClose={close}
      >
        <AFlex className="mb2 justify-between gap-2">
          <AInput
            className="w-50"
            placeholder="请输入字典标签"
            onChange={e => dictSearch(e.target.value)}
          />
          <AButton
            type="primary"
            onClick={() => setEnumModalOpen(true)}
          >
            新增
          </AButton>
        </AFlex>
        <TableEnum
          dataSource={enumerationDataSource}
          dictNumber={dictNumber}
          onDelete={handleEnumDelete}
          onEdit={handleEnumEdit}
          onPageChange={setDictNumber}
        />
      </ADrawer>
      <AddOrEditEnum
        editObj={enumEditObj}
        open={enumModalOpen}
        onClose={enumClose}
        onSure={enumSure}
      />
    </>
  );
};
