import { Input } from 'antd'
import type { TextAreaRef } from 'antd/es/input/TextArea'
import React, { forwardRef, useId, useImperativeHandle, useMemo, useRef, useState } from 'react'

import { insertCustomAtomicFunction } from '../utils/customAtomic'
import { filterExpressionFields, getExpressionCompletionToken, type ExpressionCompletionToken, type ExpressionFieldOption } from '../utils/expressionCompletion'

import styles from './knowledgeOperateDrawer.ExpressionTextArea.module.scss'

interface Props {
  readonly fields: readonly ExpressionFieldOption[]
  readonly id?: string
  readonly onChange?: (value: string) => void
  readonly onSelect?: React.ReactEventHandler<HTMLTextAreaElement>
  readonly onSelectionChange?: (selection: { start: number; end: number }) => void
  readonly placeholder?: string
  readonly rows?: number
  readonly value?: string
}

function getCaretPosition(textarea: HTMLTextAreaElement) {
  const computed = window.getComputedStyle(textarea)
  const mirror = document.createElement('div')
  for (const property of ['box-sizing', 'width', 'font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'padding', 'border', 'tab-size']) {
    mirror.style.setProperty(property, computed.getPropertyValue(property))
  }
  Object.assign(mirror.style, { overflowWrap: 'break-word', position: 'absolute', visibility: 'hidden', whiteSpace: 'pre-wrap' })
  mirror.textContent = textarea.value.slice(0, textarea.selectionStart)
  const marker = document.createElement('span')
  marker.textContent = textarea.value.slice(textarea.selectionStart) || '.'
  mirror.appendChild(marker)
  document.body.appendChild(mirror)
  const position = {
    left: Math.max(8, Math.min(marker.offsetLeft - textarea.scrollLeft, textarea.clientWidth - 436)),
    top: Math.max(8, marker.offsetTop - textarea.scrollTop + (Number.parseFloat(computed.lineHeight) || 22)),
  }
  mirror.remove()
  return position
}

export const KnowledgeExpressionTextArea = forwardRef<TextAreaRef, Props>(({ fields, id, onChange, onSelect, onSelectionChange, placeholder, rows, value = '' }, ref) => {
  const textareaRef = useRef<TextAreaRef>(null)
  const composing = useRef(false)
  const listId = useId()
  const [completion, setCompletion] = useState<(ExpressionCompletionToken & { left: number; top: number }) | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const options = useMemo(() => filterExpressionFields(fields, completion?.query || ''), [completion?.query, fields])
  const showSuggestions = Boolean(completion && options.length)

  useImperativeHandle(ref, () => textareaRef.current!)

  const updateCompletion = (textarea: HTMLTextAreaElement) => {
    if (composing.current) return
    const token = getExpressionCompletionToken(textarea.value, textarea.selectionStart, textarea.selectionEnd)
    setCompletion(token ? { ...token, ...getCaretPosition(textarea) } : null)
    setActiveIndex(0)
  }

  const chooseField = (field: ExpressionFieldOption) => {
    if (!completion) return
    const result = insertCustomAtomicFunction(value, field.name, completion)
    onChange?.(result.expression)
    onSelectionChange?.({ start: result.cursor, end: result.cursor })
    setCompletion(null)
    window.setTimeout(() => {
      const textarea = textareaRef.current?.resizableTextArea?.textArea
      textarea?.focus()
      textarea?.setSelectionRange(result.cursor, result.cursor)
    })
  }

  return (
    <div className={styles.editor}>
      <Input.TextArea
        aria-activedescendant={showSuggestions ? `${listId}-${activeIndex}` : undefined}
        aria-autocomplete="list"
        aria-controls={showSuggestions ? listId : undefined}
        id={id}
        placeholder={placeholder}
        ref={textareaRef}
        rows={rows}
        value={value}
        onBlur={() => setCompletion(null)}
        onChange={(event) => {
          onChange?.(event.target.value)
          onSelectionChange?.({ start: event.target.selectionStart, end: event.target.selectionEnd })
          updateCompletion(event.target)
        }}
        onCompositionStart={() => {
          composing.current = true
          setCompletion(null)
        }}
        onCompositionEnd={(event) => {
          composing.current = false
          updateCompletion(event.currentTarget)
        }}
        onKeyDown={(event) => {
          if (!showSuggestions || composing.current || event.nativeEvent.isComposing) return
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const nextIndex = (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
            setActiveIndex(nextIndex)
            document.getElementById(`${listId}-${nextIndex}`)?.scrollIntoView({ block: 'nearest' })
          } else if (event.key === 'Enter') {
            event.preventDefault()
            chooseField(options[activeIndex] || options[0])
          } else if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setCompletion(null)
          }
        }}
        onScroll={() => setCompletion(null)}
        onSelect={(event) => {
          onSelect?.(event)
          updateCompletion(event.currentTarget)
        }}
      />
      {showSuggestions && completion ? (
        <div aria-label="来源字段补全" className={styles.suggestions} id={listId} role="listbox" style={{ left: completion.left, top: completion.top }}>
          {options.map((field, index) => (
            <button
              aria-selected={index === activeIndex}
              className={styles.suggestion}
              id={`${listId}-${index}`}
              key={field.id}
              role="option"
              tabIndex={-1}
              type="button"
              onClick={() => chooseField(field)}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className={styles.name} title={field.name}>
                {field.name}
              </span>
              <span className={styles.description} title={`${field.category} · ${field.label}`}>
                {field.category} · {field.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
})

KnowledgeExpressionTextArea.displayName = 'KnowledgeExpressionTextArea'
