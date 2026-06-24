import type { FormInstance } from 'antd';
import { useEffect, useState } from 'react';

import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types';
import { schemalist } from '@/service/api/data-table-meaning';
import { type TableSemanticsGroupType, tableSemanticsGroupList } from '@/service/api/table-semantics';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

function mapOptions(list: any[], labelKey: string, valueKey: string) {
  return list.map(item => ({
    label: item[labelKey],
    value: item[valueKey]
  }));
}

interface IProps {
  readonly form?: FormInstance;
  readonly getSchemaId: ({
    semanticGroupId,
    semanticSchemaId,
    semanticsGroupId,
    viewId
  }: {
    semanticGroupId: number | null;
    semanticSchemaId: number;
    semanticsGroupId: number | null;
    viewId: number;
  }) => void;
  readonly getSchemaOptions?: (schemaOptions: TableSemanticParams[]) => void;
  readonly groupFieldName?: 'semanticGroupId' | 'semanticsGroupId';
  readonly isEdit?: boolean;
  readonly type: TableSemanticsGroupType;
}

export const TableSemantics = ({ form, getSchemaId, getSchemaOptions, isEdit = false, type,groupFieldName = 'semanticGroupId' }: IProps) => {
  const spaceId = useAppSelector(getSpaceId);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: number }[]>([]);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [schemaOptions, setSchemaOptions] = useState<{ label: string; value: number }[]>([]);
  const [originalSchemaOptions, setOriginalSchemaOptions] = useState<any[]>([]);

  function findViewId(schemaId: number) {
    return originalSchemaOptions.find((item: any) => item.schemaId === schemaId)?.relViewId;
  }

  // 表语义
  const fetchSchemaOptions = async (gpId: number | null) => {
    if (!gpId) {
      setSchemaOptions([]);
      setOriginalSchemaOptions([]);
      getSchemaOptions?.([]);
      return;
    }
    const { data } = await schemalist({
      bizName: '',
      groupId: gpId,
      pageNum: 1,
      pageSize: 100
    });
    setSchemaOptions(mapOptions(data, 'bizName', 'schemaId'));
    getSchemaOptions?.(data);
    setOriginalSchemaOptions(data);
  };

  // 分组
  const fetchGroupOptions = async () => {
    const { data } = await tableSemanticsGroupList({
      groupName: '',
      groupType: type,
      pageNum: 1,
      pageSize: 100,
      spaceId
    });
    setGroupOptions(mapOptions(data, 'groupName', 'groupId'));
  };

  useEffect(() => {
    fetchGroupOptions();

    if (form) {
      const { semanticGroupId } = form.getFieldsValue();
      setGroupId(semanticGroupId);
    }
  }, [spaceId]);

  useEffect(() => {
    fetchSchemaOptions(groupId);
  }, [groupId]);

  function backGroupIdAndSchemaId(v: number) {
    return getSchemaId({
      semanticGroupId: groupId,
      semanticSchemaId: v,
      semanticsGroupId: groupId,
      viewId: findViewId(v)
    });
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      <AForm.Item
        label="数据语义组"
        name={groupFieldName}
        rules={[{ message: '请选择数据语义组', required: true }]}
      >
        <ASelect
          disabled={isEdit}
          allowClear
          options={groupOptions}
          placeholder="选择数据语义组"
          onChange={(v)=>{
            setGroupId(v)
            form?.setFieldsValue({ semanticSchemaId: null })
          }}
        />
      </AForm.Item>

      <AForm.Item
        label="数据语义"
        name="semanticSchemaId"
        rules={[{ message: '请选择数据语义', required: true }]}
      >
        <ASelect
          disabled={isEdit}
          allowClear
          options={schemaOptions}
          placeholder="选择数据语义"
          onChange={backGroupIdAndSchemaId}
        />
      </AForm.Item>
    </div>
  );
};
