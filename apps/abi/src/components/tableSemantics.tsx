import { Form, type FormInstance } from 'antd';
import { useEffect, useState } from 'react';

import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types';
import { schemalist } from '@/service/api/data-table-meaning';
import { type TableSemanticsGroupType, tableSemanticsGroupList } from '@/service/api/table-semantics';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

type SelectId = number | string;

function mapOptions(list: any[], labelKey: string, valueKey: string, valueAsString = false) {
  return list.map(item => ({
    label: item[labelKey],
    value: valueAsString ? String(item[valueKey]) : item[valueKey]
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
    semanticGroupId: SelectId | null;
    semanticSchemaId: SelectId;
    semanticsGroupId: SelectId | null;
    viewId: SelectId;
  }) => void | Promise<void>;
  readonly getSchemaOptions?: (schemaOptions: TableSemanticParams[]) => void;
  readonly groupFieldName?: 'semanticGroupId' | 'semanticsGroupId';
  readonly isEdit?: boolean;
  readonly type: TableSemanticsGroupType;
  readonly valueAsString?: boolean;
}

export const TableSemantics = ({ form, getSchemaId, getSchemaOptions, isEdit = false, type, groupFieldName = 'semanticGroupId', valueAsString = false }: IProps) => {
  const spaceId = useAppSelector(getSpaceId);
  const [groupOptions, setGroupOptions] = useState<{ label: string; value: SelectId }[]>([]);
  const [groupId, setGroupId] = useState<SelectId | null>(null);
  const [schemaOptions, setSchemaOptions] = useState<{ label: string; value: SelectId }[]>([]);
  const [originalSchemaOptions, setOriginalSchemaOptions] = useState<any[]>([]);
  const semanticGroupIdWatch = Form.useWatch(groupFieldName, form)
  
  function findViewId(schemaId: SelectId) {
    return originalSchemaOptions.find((item: any) => String(item.schemaId) === String(schemaId))?.relViewId;
  }

  // 表语义
  const fetchSchemaOptions = async (gpId: SelectId | null) => {
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
    setSchemaOptions(mapOptions(data, 'bizName', 'schemaId', valueAsString));
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
    setGroupOptions(mapOptions(data, 'groupName', 'groupId', valueAsString));
  };

  useEffect(() => {
    fetchGroupOptions();

    if (form) {
      const values = form.getFieldsValue();
      setGroupId(values[groupFieldName] ?? values.semanticGroupId ?? values.semanticsGroupId ?? null);
    }
  }, [form, groupFieldName, spaceId]);

  useEffect(() => {
    fetchSchemaOptions(groupId ?? semanticGroupIdWatch ?? null);
  }, [groupId, semanticGroupIdWatch]);

  function backGroupIdAndSchemaId(v: SelectId) {
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
