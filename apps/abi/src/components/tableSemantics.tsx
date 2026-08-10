import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { Form, type FormInstance } from 'antd';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

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

function buildGroupTreeValue(groupId: SelectId) {
  return `semantic-group-${String(groupId)}`;
}

function isSameId(left: SelectId | null | undefined, right: SelectId | null | undefined) {
  return String(left ?? '') === String(right ?? '');
}

function renderSemanticTreeTitle(label: ReactNode, type: 'group' | 'schema') {
  const Icon = type === 'group' ? FolderOutlined : FileTextOutlined;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className={type === 'group' ? 'text-#358cf3 text-15px' : 'text-#afd1fa text-14px'} />
      <span className="truncate">{label}</span>
    </span>
  );
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
  const [originalSchemaOptions, setOriginalSchemaOptions] = useState<any[]>([]);
  const [schemaOptionsByGroup, setSchemaOptionsByGroup] = useState<Record<string, { originalOptions: any[]; schemaOptions: { label: string; value: SelectId }[] }>>({});
  const semanticGroupIdWatch = Form.useWatch(groupFieldName, form)
  
  const treeData = useMemo(() => groupOptions.map(group => {
    const groupKey = String(group.value);
    const cachedOptions = schemaOptionsByGroup[groupKey]?.schemaOptions;

    return {
      searchLabel: group.label,
      title: renderSemanticTreeTitle(group.label, 'group'),
      value: buildGroupTreeValue(group.value),
      isLeaf: false,
      selectable: false,
      children: cachedOptions?.map(schema => ({
        isLeaf: true,
        searchLabel: schema.label,
        title: renderSemanticTreeTitle(schema.label, 'schema'),
        value: schema.value
      }))
    };
  }), [groupOptions, schemaOptionsByGroup]);

  function findSchemaGroup(schemaId: SelectId) {
    return Object.entries(schemaOptionsByGroup).find(([, groupSchemas]) =>
      groupSchemas.schemaOptions.some(schema => isSameId(schema.value, schemaId))
    );
  }

  function findViewId(schemaId: SelectId, nextGroupId?: SelectId | null) {
    const cachedOriginalOptions = nextGroupId ? schemaOptionsByGroup[String(nextGroupId)]?.originalOptions : undefined;
    const sourceOptions = cachedOriginalOptions || originalSchemaOptions;

    return sourceOptions.find((item: any) => String(item.schemaId) === String(schemaId))?.relViewId;
  }

  function syncSelectedSchemaOptions(gpId: SelectId | null, originalOptions: any[]) {
    setGroupId(gpId);
    setOriginalSchemaOptions(originalOptions);
    getSchemaOptions?.(originalOptions);
  }

  // 表语义
  const fetchSchemaOptions = async (gpId: SelectId | null, syncSelected = true) => {
    if (!gpId) {
      if (syncSelected) {
        syncSelectedSchemaOptions(null, []);
      }
      return;
    }
    const { data } = await schemalist({
      bizName: '',
      groupId: gpId,
      pageNum: 1,
      pageSize: 100
    });
    const nextSchemaOptions = mapOptions(data, 'bizName', 'schemaId', valueAsString);
    setSchemaOptionsByGroup(prev => ({
      ...prev,
      [String(gpId)]: {
        originalOptions: data,
        schemaOptions: nextSchemaOptions
      }
    }));
    if (syncSelected) {
      syncSelectedSchemaOptions(gpId, data);
    }
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
    if (!v) {
      form?.setFieldsValue({
        [groupFieldName]: undefined,
        semanticGroupId: undefined,
        semanticSchemaId: undefined,
        semanticsGroupId: undefined
      });
      syncSelectedSchemaOptions(null, []);
      return;
    }

    const matchedGroupEntry = findSchemaGroup(v);
    const matchedGroupId = matchedGroupEntry ? groupOptions.find(item => String(item.value) === matchedGroupEntry[0])?.value ?? matchedGroupEntry[0] : undefined;
    const nextGroupId = matchedGroupId ?? groupId;
    const nextGroupSchemas = nextGroupId ? schemaOptionsByGroup[String(nextGroupId)] : undefined;
    if (nextGroupSchemas) {
      syncSelectedSchemaOptions(nextGroupId, nextGroupSchemas.originalOptions);
    }
    form?.setFieldsValue({
      [groupFieldName]: nextGroupId,
      semanticGroupId: nextGroupId,
      semanticSchemaId: v,
      semanticsGroupId: nextGroupId
    });
    return getSchemaId({
      semanticGroupId: nextGroupId,
      semanticSchemaId: v,
      semanticsGroupId: nextGroupId,
      viewId: findViewId(v, nextGroupId)
    });
  }

  function handleLoadTreeData(node: { value?: SelectId }) {
    const rawValue = String(node.value || '');
    const group = groupOptions.find(item => buildGroupTreeValue(item.value) === rawValue);
    if (!group || schemaOptionsByGroup[String(group.value)]) {
      return Promise.resolve();
    }
    return fetchSchemaOptions(group.value, false);
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      <AForm.Item
        label="数据"
        name="semanticSchemaId"
        rules={[{ message: '请选择数据', required: true }]}
      >
        <ATreeSelect
          disabled={isEdit}
          allowClear
          loadData={handleLoadTreeData}
          placeholder="请选择数据"
          showSearch
          treeData={treeData}
          treeDefaultExpandAll={false}
          filterTreeNode={(inputValue, treeNode) => String((treeNode as { searchLabel?: SelectId })?.searchLabel || '').toLowerCase().includes(inputValue.toLowerCase())}
          onChange={backGroupIdAndSchemaId}
        />
      </AForm.Item>
    </div>
  );
};
