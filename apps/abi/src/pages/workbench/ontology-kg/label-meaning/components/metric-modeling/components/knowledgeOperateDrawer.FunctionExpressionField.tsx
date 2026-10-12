import { Alert, Empty, Spin, message } from 'antd'
import type { FormInstance } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'

import { useOntologyFunctionDictionary, useOntologyOperatorDictionary } from '../hooks/useOntologyFunctionDictionary'
import type { KnowledgeFormValues, KnowledgeTechField } from '../types/metricModeling.types'
import { getCustomAtomicFieldTechnicalName, insertCustomAtomicFunction } from '../utils/customAtomic'
import { type OntologyFunctionDictionaryKind, buildOntologyFunctionSnippet } from '../utils/ontologyFunctionDictionary'
import type { ExpressionFieldOption } from '../utils/expressionCompletion'

import styles from './knowledgeOperateDrawer.AtomicTechnicalStep.module.scss'
import { KnowledgeFormItemLabel } from './knowledgeOperateDrawer.FormItemLabel'
import { KnowledgeExpressionTextArea } from './knowledgeOperateDrawer.ExpressionTextArea'

interface Props {
  readonly completionFields?: readonly ExpressionFieldOption[]
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
const EMPTY_COMPLETION_FIELDS: readonly ExpressionFieldOption[] = []

const OperatorRail: React.FC<{ onInsert: (value: string) => void }> = ({ onInsert }) => {
  const { error, loading, options, refresh } = useOntologyOperatorDictionary()
  return (
    <div className={styles.operatorSection}>
      <div className="text-sm text-[#3e5068] font-medium">运算符</div>
      <div>
        {error ? <Alert className="mb-3" message="运算符字典加载失败" type="error" action={<AButton size="small" onClick={() => refresh()}>重试</AButton>} /> : null}
        <div className={styles.functionRail}>
          {loading ? <Spin size="small" /> : null}
          {!loading && !error && !options.length ? <Empty description="暂无可用运算符" image={Empty.PRESENTED_IMAGE_SIMPLE} /> : null}
          {options.map(item => (
            <AButton className={styles.operatorButton} key={item.id} size="small" onMouseDown={event => event.preventDefault()} onClick={() => onInsert(item.value)}>
              {item.label}
            </AButton>
          ))}
        </div>
      </div>
    </div>
  )
}

export const KnowledgeOperateFunctionExpressionField = forwardRef<
  KnowledgeOperateFunctionExpressionFieldHandle,
  Props
>(({ completionFields = EMPTY_COMPLETION_FIELDS, dictionaryKind, fieldName, form, selectedField, validateExpression }, ref) => {
  const textAreaRef = useRef<TextAreaRef>(null)
  const selectionRef = useRef({ end: 0, start: 0 })
  const { error, loading, options, refresh } = useOntologyFunctionDictionary(dictionaryKind)
  const handleSelection: React.ReactEventHandler<HTMLTextAreaElement> = event => {
    selectionRef.current = { end: event.currentTarget.selectionEnd, start: event.currentTarget.selectionStart }
  }

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
                : '输入字母或字段名称可搜索已选来源字段；选择补全项替换光标处片段，点击函数或运算符会在光标位置插入。'
            }
            title="聚合逻辑表达式"
          />
        }
      >
        {dictionaryKind === 'composite' ? (
          <KnowledgeExpressionTextArea
            fields={completionFields}
            placeholder="请输入聚合逻辑表达式，例如 SUM(payment_amount) / COUNT(DISTINCT order_id)"
            ref={textAreaRef}
            rows={6}
            onSelect={handleSelection}
            onSelectionChange={selection => { selectionRef.current = selection }}
          />
        ) : <AInput.TextArea
          placeholder="请输入聚合逻辑表达式，例如 SUM(payment_amount) / COUNT(DISTINCT order_id)"
          ref={textAreaRef}
          rows={6}
          onSelect={handleSelection}
        />}
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
            onMouseDown={event => event.preventDefault()}
            onClick={() => handleFunctionInsert(item)}
          >
            {item.label}
          </AButton>
        ))}
      </div>
      {dictionaryKind === 'composite' ? <OperatorRail onInsert={insertText} /> : null}
    </>
  )
})

KnowledgeOperateFunctionExpressionField.displayName = 'KnowledgeOperateFunctionExpressionField'
