import { SearchOutlined } from '@ant-design/icons'
import { Alert, Empty, Input, Spin } from 'antd'
import type { FormInstance } from 'antd'
import React, { useMemo, useState } from 'react'

import { TableSemantics } from '@/components/tableSemantics'
import type { TableSemanticParams } from '@/pages/workbench/data-preparation/data-table-meaning/types'
import {
  buildRuleFieldTree,
  createRuleFieldOptions
} from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression'

import type { KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { getMappedBizNameParts } from '../../../utils/ontologyName'
import { getKnowledgeTechFieldId } from '../utils/atomicMetricSource'
import { getCustomAtomicFieldTechnicalName } from '../utils/customAtomic'
import type { ExpressionFieldOption } from '../utils/expressionCompletion'

import type { AtomicSemanticSelection } from './knowledgeOperateDrawer.AtomicTechnicalStep'
import { KnowledgeOperateFunctionExpressionField } from './knowledgeOperateDrawer.FunctionExpressionField'
import styles from './knowledgeOperateDrawer.DerivativeCustomTechnicalSection.module.scss'

interface Props {
  readonly allFields: KnowledgeTechField[]
  readonly editing?: boolean
  readonly fieldError?: boolean
  readonly fieldLoading?: boolean
  readonly form: FormInstance<KnowledgeFormValues>
  readonly onRetryFields?: () => void
  readonly onSchemaChange: (selection: AtomicSemanticSelection) => Promise<void>
  readonly validateSqlExpression: (_: unknown, value?: string) => Promise<void>
}

export const KnowledgeOperateDerivativeCustomTechnicalSection: React.FC<Props> = ({
  allFields,
  editing,
  fieldError,
  fieldLoading,
  form,
  onRetryFields,
  onSchemaChange,
  validateSqlExpression
}) => {
  const [searchText, setSearchText] = useState('')
  const selectedIdsWatch = AForm.useWatch('customSourceFieldIds', { form, preserve: true })
  const selectedIds: string[] = selectedIdsWatch ?? form.getFieldValue('customSourceFieldIds') ?? []
  const ruleFields = useMemo(() => createRuleFieldOptions(allFields), [allFields])
  const fieldOptions = useMemo<ExpressionFieldOption[]>(() => {
    const categoryNames = { dates: '日期', dimensions: '维度', measures: '度量' }
    const fieldsById = new Map(allFields.map(field => [getKnowledgeTechFieldId(field), field]))
    return ruleFields.map(option => {
      const field = fieldsById.get(option.id)
      return {
        category: categoryNames[option.category],
        id: option.id,
        label: getMappedBizNameParts(String(field?.bizName || field?.tfieldAlias || field?.fieldName || option.label)).displayName,
        name: getCustomAtomicFieldTechnicalName(field) || option.sourceName,
      }
    })
  }, [allFields, ruleFields])
  const fieldTree = useMemo(() => {
    const optionsById = new Map(fieldOptions.map(option => [option.id, option]))
    return buildRuleFieldTree(ruleFields).map(root => ({
      ...root,
      checkable: false,
      children: root.children?.flatMap(table => table.children || []).map(leaf => {
        const option = optionsById.get(leaf.value)!
        return {
          ...leaf,
          label: option.name,
          searchText: `${option.name} ${option.label} ${option.category}`,
          title: <span className={styles.fieldTitle}><span className={styles.fieldName}>{option.name}</span><span className={styles.fieldLabel}>{option.label}</span></span>,
        }
      }),
    }))
  }, [fieldOptions, ruleFields])
  const selectedFields = useMemo(() => fieldOptions.filter(field => selectedIds.includes(field.id)), [fieldOptions, selectedIds])

  return (
    <>
      <div className="grid grid-cols-2 gap-x-8">
        <TableSemantics
          form={form}
          getSchemaId={onSchemaChange}
          getSchemaOptions={(_: TableSemanticParams[]) => {}}
          groupFieldName="semanticsGroupId"
          isEdit={editing}
          label="数据语义"
          type="shema"
        />
        <AForm.Item label="来源字段" name="customSourceFieldIds">
          <ATreeSelect
            allowClear
            multiple
            showSearch
            treeCheckable
            disabled={editing}
            treeDefaultExpandAll
            treeExpandAction="click"
            maxTagCount={2}
            loading={fieldLoading}
            placeholder="请选择来源字段"
            searchValue={searchText}
            treeData={fieldTree}
            treeNodeFilterProp="searchText"
            treeNodeLabelProp="label"
            onSearch={setSearchText}
            onDropdownVisibleChange={visible => { if (!visible) setSearchText('') }}
            dropdownRender={menu => (
              <>
                <div className={styles.search} onKeyDown={event => event.stopPropagation()}>
                  <Input
                    allowClear
                    placeholder="搜索来源字段"
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={event => setSearchText(event.target.value)}
                  />
                </div>
                {menu}
                <div className={styles.selectionFooter}>
                  <span>已选择 {selectedIds.length} 个字段</span>
                  <AButton disabled={editing || !selectedIds.length} type="link" onClick={() => form.setFieldValue('customSourceFieldIds', [])}>清空</AButton>
                </div>
              </>
            )}
            notFoundContent={
              fieldLoading ? (
                <Spin size="small" />
              ) : (
                <Empty
                  description="当前数据语义暂无可选字段"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }
          />
        </AForm.Item>
      </div>

      {fieldError ? (
        <Alert
          className="mb-4"
          message="数据语义字段加载失败"
          type="error"
          action={
            <AButton
              size="small"
              onClick={onRetryFields}
            >
              重试
            </AButton>
          }
        />
      ) : null}

      <KnowledgeOperateFunctionExpressionField
        completionFields={selectedFields}
        dictionaryKind="composite"
        fieldName="expr"
        form={form}
        validateExpression={validateSqlExpression}
      />
    </>
  )
}
