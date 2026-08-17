import { FileTextOutlined, FolderOutlined } from '@ant-design/icons';
import { Form, type FormInstance } from 'antd';
import { type Key, type ReactNode, useEffect, useMemo, useState } from 'react';

import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types';
import { buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';
import { schemalist } from '@/service/api/data-table-meaning';
import { type TableSemanticsGroupType, tableSemanticsGroupList } from '@/service/api/table-semantics';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

type SelectId = number | string;

function getResponseData(res: any) {
  return res?.response?.data?.data ?? res?.response?.data ?? res?.data;
}

function normalizeList(data: any): any[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (!data || typeof data !== 'object') {
    return [];
  }
  if (Array.isArray(data.rows)) {
    return data.rows;
  }
  if (Array.isArray(data.list)) {
    return data.list;
  }
  if (Array.isArray(data.records)) {
    return data.records;
  }
  if (Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

function mapOptions(list: any[], labelKey: string, valueKey: string, valueAsString = false) {
  return list.map(item => ({
    label: item[labelKey],
    value: valueAsString ? String(item[valueKey]) : item[valueKey]
  }));
}

function buildGroupTreeValue(groupId: SelectId) {
  return `semantic-group-${String(groupId)}`;
}

interface SemanticGroupOption {
  groupId: SelectId;
  groupName: string;
  parentId?: SelectId;
  sortOrder?: number;
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
  readonly selectedGroupId?: SelectId | null;
  readonly type: TableSemanticsGroupType;
  readonly valueAsString?: boolean;
}

export const TableSemantics = ({ form, getSchemaId, getSchemaOptions, isEdit = false, selectedGroupId, type, groupFieldName = 'semanticGroupId', valueAsString = false }: IProps) => {
  const spaceId = useAppSelector(getSpaceId);
  const [groupOptions, setGroupOptions] = useState<SemanticGroupOption[]>([]);
  const [groupId, setGroupId] = useState<SelectId | null>(null);
  const [originalSchemaOptions, setOriginalSchemaOptions] = useState<any[]>([]);
  const [schemaOptionsByGroup, setSchemaOptionsByGroup] = useState<Record<string, { originalOptions: any[]; schemaOptions: { label: string; value: SelectId }[] }>>({});
  const semanticGroupIdWatch = Form.useWatch(groupFieldName, { form, preserve: true })
  
  const treeData = useMemo(() => {
    const buildNodes = (groups: SemanticGroupOption[]): any[] =>
      groups.map((group) => {
        const groupKey = String(group.groupId);
        const cachedOptions = schemaOptionsByGroup[groupKey]?.schemaOptions;
        const childGroupNodes = Array.isArray((group as any).children) ? buildNodes((group as any).children) : [];
        const schemaNodes = cachedOptions?.map(schema => ({
          isLeaf: true,
          searchLabel: schema.label,
          title: renderSemanticTreeTitle(schema.label, 'schema'),
          value: schema.value
        })) || [];
        const children = [...childGroupNodes, ...schemaNodes];

        return {
          ...(children.length || schemaOptionsByGroup[groupKey] ? { children } : {}),
          isLeaf: false,
          searchLabel: group.groupName,
          selectable: false,
          title: renderSemanticTreeTitle(group.groupName, 'group'),
          value: buildGroupTreeValue(group.groupId)
        };
      });

    return buildNodes(buildGroupTree(groupOptions, '0', true));
  }, [groupOptions, schemaOptionsByGroup]);

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
    const res = await schemalist({
      bizName: '',
      groupId: String(gpId),
      pageNum: 1,
      pageSize: 1000
    });
    const rows = normalizeList(getResponseData(res));
    const currentSchemaId = form?.getFieldValue('semanticSchemaId');
    const nextSchemaOptions = mapOptions(rows, 'bizName', 'schemaId', valueAsString)
      .map(item => ({
        ...item,
        value: currentSchemaId !== undefined && currentSchemaId !== null && isSameId(item.value, currentSchemaId) ? currentSchemaId : item.value
      }))
      .filter(item => item.label && item.value !== undefined && item.value !== null && item.value !== '');
    setSchemaOptionsByGroup(prev => ({
      ...prev,
      [String(gpId)]: {
        originalOptions: rows,
        schemaOptions: nextSchemaOptions
      }
    }));
    if (syncSelected) {
      syncSelectedSchemaOptions(gpId, rows);
    }
  };

  function handleTreeExpand(expandedValues: Key[]) {
    expandedValues.forEach((value) => {
      const rawValue = String(value || '');
      const group = groupOptions.find(item => buildGroupTreeValue(item.groupId) === rawValue);
      if (group && !schemaOptionsByGroup[String(group.groupId)]) {
        void fetchSchemaOptions(group.groupId, false);
      }
    });
  }

  // 分组
  const fetchGroupOptions = async () => {
    const res = await tableSemanticsGroupList({
      groupName: '',
      groupType: type,
      pageNum: 1,
      pageSize: 100,
      spaceId
    });
    const rows = normalizeList(getResponseData(res));
    setGroupOptions(
      rows
        .map(item => ({
          groupId: valueAsString ? String(item.groupId) : item.groupId,
          groupName: String(item.groupName || ''),
          parentId: item.parentId === undefined || item.parentId === null ? '0' : (valueAsString ? String(item.parentId) : item.parentId),
          sortOrder: Number(item.sortOrder ?? 0)
        }))
        .filter(item => item.groupName && item.groupId !== undefined && item.groupId !== null && item.groupId !== '')
    );
  };

  useEffect(() => {
    fetchGroupOptions();

    if (form) {
      const values = form.getFieldsValue(true);
      setGroupId(selectedGroupId ?? values[groupFieldName] ?? values.semanticGroupId ?? values.semanticsGroupId ?? null);
    }
  }, [form, groupFieldName, selectedGroupId, spaceId]);

  useEffect(() => {
    const formValues = form?.getFieldsValue(true) || {};
    const nextGroupId = selectedGroupId ?? semanticGroupIdWatch ?? formValues[groupFieldName] ?? formValues.semanticGroupId ?? formValues.semanticsGroupId ?? groupId ?? null;
    fetchSchemaOptions(nextGroupId);
  }, [form, groupFieldName, groupId, selectedGroupId, semanticGroupIdWatch]);

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
    const matchedGroupId = matchedGroupEntry ? groupOptions.find(item => String(item.groupId) === matchedGroupEntry[0])?.groupId ?? matchedGroupEntry[0] : undefined;
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
    const group = groupOptions.find(item => buildGroupTreeValue(item.groupId) === rawValue);
    if (!group || schemaOptionsByGroup[String(group.groupId)]) {
      return Promise.resolve();
    }
    return fetchSchemaOptions(group.groupId, false);
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      <AForm.Item hidden name="semanticGroupId">
        <AInput />
      </AForm.Item>
      <AForm.Item hidden name="semanticsGroupId">
        <AInput />
      </AForm.Item>
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
          onTreeExpand={handleTreeExpand}
          onChange={backGroupIdAndSchemaId}
        />
      </AForm.Item>
    </div>
  );
};
