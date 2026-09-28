import { Alert, Empty, Spin, message } from 'antd'
import type { FormInstance } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'

import { useOntologyFunctionDictionary } from '../hooks/useOntologyFunctionDictionary'
import type { KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { getCustomAtomicFieldTechnicalName, insertCustomAtomicFunction } from '../utils/customAtomic'
import { type OntologyFunctionDictionaryKind, buildOntologyFunctionSnippet } from '../utils/ontologyFunctionDictionary'

import styles from './knowledgeOperateDrawer.AtomicTechnicalStep.module.scss'
import { KnowledgeFormItemLabel } from './knowledgeOperateDrawer.FormItemLabel'

interface Props {
  readonly dictionaryKind: OntologyFunctionDictionaryKind
  readonly fieldName: 'atomicAggregationExpression' | 'expr'
  readonly form: FormInstance<KnowledgeFormValues>
  readonly selectedField?: KnowledgeTechField
  readonly validateExpression: (_: unknown, value?: string) => Promise<void>
}

export interface KnowledgeOperateFunctionExpressionFieldHandle {
  insertText: (text: string) => void
}

const FIELD_CURSOR_MARKER = '__ONTOLOGY_FIELD_CURSOR__'

export const KnowledgeOperateFunctionExpressionField = forwardRef<
  KnowledgeOperateFunctionExpressionFieldHandle,
  Props
>(({ dictionaryKind, fieldName, form, selectedField, validateExpression }, ref) => {
  const textAreaRef = useRef<TextAreaRef>(null)
  const selectionRef = useRef({ end: 0, start: 0 })
  const { error, loading, options, refresh } = useOntologyFunctionDictionary(dictionaryKind)

  const insertText = useCallback(
    (snippet: string, cursorOffset = snippet.length) => {
      const currentExpression = String(form.getFieldValue(fieldName) || '')
      const result = insertCustomAtomicFunction(currentExpression, snippet, selectionRef.current)
      const nextCursor = result.cursor - snippet.length + Math.max(0, Math.min(cursorOffset, snippet.length))
      form.setFieldValue(fieldName, result.expression)
      selectionRef.current = { end: nextCursor, start: nextCursor }
      window.setTimeout(() => {
        const textArea = textAreaRef.current?.resizableTextArea?.textArea
        textArea?.focus()
        textArea?.setSelectionRange(nextCursor, nextCursor)
      })
    },
    [fieldName, form]
  )

  useImperativeHandle(ref, () => ({ insertText }), [insertText])

  const handleFunctionInsert = (option: (typeof options)[number]) => {
    const sourceFieldName = getCustomAtomicFieldTechnicalName(selectedField)
    if (dictionaryKind === 'atomic' && !sourceFieldName) {
      message.warning('请先选择来源字段')
      return
    }
    if (sourceFieldName) {
      insertText(buildOntologyFunctionSnippet(option, sourceFieldName))
      return
    }
    const expressionTemplate = buildOntologyFunctionSnippet(option, FIELD_CURSOR_MARKER)
    const markerIndex = expressionTemplate.indexOf(FIELD_CURSOR_MARKER)
    const snippet = expressionTemplate.replace(FIELD_CURSOR_MARKER, '')
    insertText(snippet, markerIndex >= 0 ? markerIndex : snippet.length)
  }

  return (
    <>
      <AForm.Item
        required
        name={fieldName}
        rules={[{ validator: validateExpression }]}
        label={
          <KnowledgeFormItemLabel
            helpText={
              dictionaryKind === 'atomic'
                ? '可直接输入或组合表达式；点击下方函数会在光标位置插入当前来源字段。'
                : '可直接输入或组合表达式；点击来源字段会插入到当前光标位置，点击下方函数会插入函数模板。'
            }
            title="聚合逻辑表达式"
          />
        }
      >
        <AInput.TextArea
          placeholder="请输入聚合逻辑表达式，例如 SUM(payment_amount) / COUNT(DISTINCT order_id)"
          ref={textAreaRef}
          rows={6}
          onSelect={event => {
            selectionRef.current = {
              end: event.currentTarget.selectionEnd,
              start: event.currentTarget.selectionStart
            }
          }}
        />
      </AForm.Item>

      <div className="mb-2 text-sm text-[#3e5068] font-medium">聚合函数</div>
      {error ? (
        <Alert
          className="mb-3"
          message="聚合函数字典加载失败"
          type="error"
          action={
            <AButton
              size="small"
              onClick={() => refresh()}
            >
              重试
            </AButton>
          }
        />
      ) : null}
      <div className={styles.functionRail}>
        {loading ? <Spin size="small" /> : null}
        {!loading && !error && !options.length ? (
          <Empty
            description="暂无可用聚合函数"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : null}
        {options.map(item => (
          <AButton
            className={styles.functionButton}
            key={item.id}
            size="small"
            onClick={() => handleFunctionInsert(item)}
          >
            {item.label}
          </AButton>
        ))}
      </div>
    </>
  )
})

KnowledgeOperateFunctionExpressionField.displayName = 'KnowledgeOperateFunctionExpressionField'
