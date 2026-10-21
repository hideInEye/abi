import { CheckOutlined, ClockCircleOutlined, CloseOutlined, LoadingOutlined, MinusOutlined, RightOutlined, ThunderboltOutlined, ToolOutlined } from '@ant-design/icons'
import React, { useId } from 'react'

import ExploreCodeBlock, { type ExploreCodeEditPayload, type ExploreCodeLanguage, detectCodeLanguage } from '../ExploreCodeBlock'
import ExploreRichText, { containsText } from '../ExploreRichText'
import type { ExploreStep, ExploreStepOutput, ExploreThoughtNode } from '../types'

import { type ProcessBlock, type ProcessContent, getToolLabel, normalizeActionInput } from './displayModel'
import styles from './styles.module.css'
import type { ProcessDisclosure } from './useProcessDisclosure'

const CHIP_TONES: Record<string, string> = {
  running: styles.chipRunning,
  in_progress: styles.chipRunning,
  failed: styles.chipFailed,
  done: styles.chipDone,
  completed: styles.chipDone,
  cancelled: styles.chipSkipped,
  skipped: styles.chipSkipped,
}

// 与报告模式待办一致：状态放进小圆形底色徽标，避免过程里重复裸对勾。
export function StatusChip({ status }: { readonly status: string }) {
  const icon = status === 'running' || status === 'in_progress' ? <LoadingOutlined />
    : status === 'failed' ? <CloseOutlined />
    : status === 'cancelled' || status === 'skipped' ? <MinusOutlined />
    : status === 'done' || status === 'completed' ? <CheckOutlined />
    : <ClockCircleOutlined />
  return <span className={`${styles.statusChip} ${CHIP_TONES[status] || styles.chipPending}`} aria-hidden="true">{icon}</span>
}

function Disclosure({ nodeKey, automatic = false, title, icon, children, disclosure, primary = false }: {
  readonly automatic?: boolean
  readonly children: React.ReactNode
  readonly disclosure: ProcessDisclosure
  readonly icon?: React.ReactNode
  readonly nodeKey: string
  readonly primary?: boolean
  readonly title: React.ReactNode
}) {
  const id = useId()
  const open = disclosure.isOpen(nodeKey, automatic)
  return (
    <section className={styles.node}>
      <button type="button" className={`${styles.toggle} ${primary ? styles.taskToggle : ''}`} aria-expanded={open} aria-controls={id}
        onClick={(event) => disclosure.toggle(nodeKey, automatic, event.currentTarget)}>
        {icon}<span className={styles.nodeTitle}>{title}</span>
        <RightOutlined className={`${styles.chevron} ${open ? styles.expanded : ''}`} />
      </button>
      {open && <div id={id} className={styles.nested}>{children}</div>}
    </section>
  )
}

function Thought({ thought, disclosure }: { readonly disclosure: ProcessDisclosure; readonly thought: ExploreThoughtNode }) {
  return (
    <div className={styles.thought}>
      {thought.reasoning && (
        <Disclosure nodeKey={`reasoning:${thought.key}`} automatic={thought.status === 'running'} title="深度思考" icon={<ThunderboltOutlined />} disclosure={disclosure}>
          <div className={styles.reasoning}><ExploreRichText text={thought.reasoning} /></div>
        </Disclosure>
      )}
      {thought.text && <div className={styles.prose}><ExploreRichText text={thought.text} /></div>}
    </div>
  )
}

function Output({ output, onEdit }: { readonly onEdit?: (code: string, language: ExploreCodeLanguage) => void; readonly output: ExploreStepOutput }) {
  const content = output.content
  if (typeof content !== 'string' || output.outputType === 'json' || output.outputType === 'html') return null
  if (['image', 'pdf', 'word'].includes(output.outputType)) {
    if (!/^(https?:\/\/|\/[^/])/.test(content)) return null
    return <a href={content} target="_blank" rel="noreferrer">打开{output.outputType === 'image' ? '图片' : '文件'}</a>
  }
  const language = detectCodeLanguage(content)
  if (language || output.outputType === 'code') return <ExploreCodeBlock code={content} language={language || 'text'} onEdit={onEdit} />
  return containsText(content) ? <ExploreRichText text={content} hideTables /> : null
}

interface ProcessProps {
  readonly disclosure: ProcessDisclosure
  readonly highlightStepId?: string
  readonly onEditCode?: (payload: ExploreCodeEditPayload) => void
}

function ToolStep({ step, thoughts, disclosure, onEditCode, highlightStepId }: ProcessProps & { readonly step: ExploreStep; readonly thoughts: ExploreThoughtNode[] }) {
  const title = getToolLabel(step)
  const input = normalizeActionInput(step.actionInput)
  const outputs = step.outputs.filter((output) => typeof output.content === 'string' && output.outputType !== 'json' && output.outputType !== 'html'
    && (['code', 'image', 'pdf', 'word'].includes(output.outputType) || containsText(output.content as string)))
  const edit = onEditCode ? (code: string, language: ExploreCodeLanguage) => onEditCode({ code, language, title }) : undefined
  return (
    <div data-step-id={step.id} className={highlightStepId === step.id ? styles.stepHighlight : undefined}>
      <Disclosure nodeKey={`tool:${step.id}`} title={<>{title}{step.status !== 'done'
        && <span className={styles.inlineStatus}><StatusChip status={step.status} /></span>}</>}
        icon={<ToolOutlined />} disclosure={disclosure}>
        {thoughts.map((thought) => <Thought key={thought.key} thought={thought} disclosure={disclosure} />)}
        {step.detail && <div className={styles.prose}><ExploreRichText text={step.detail} /></div>}
        {step.actionIntention && <p className={styles.prose}>{step.actionIntention}</p>}
        {step.actionReason && <p className={styles.prose}>{step.actionReason}</p>}
        <div className={styles.metadata}>工具：{step.action || step.title || step.id}</div>
        {input && <Disclosure nodeKey={`input:${step.id}`} title="调用参数" disclosure={disclosure}>
          <ExploreCodeBlock code={input} language={detectCodeLanguage(input) || 'text'} onEdit={edit} />
        </Disclosure>}
        {outputs.length > 0 && <Disclosure nodeKey={`output:${step.id}`} title="执行输出" disclosure={disclosure}>
          {outputs.map((output, index) => <div key={index} className={styles.output}><Output output={output} onEdit={edit} /></div>)}
        </Disclosure>}
        {step.outputs.length === 0 && <p className={styles.metadata}>{step.status === 'running' ? '正在执行…' : '未返回输出'}</p>}
      </Disclosure>
    </div>
  )
}

function Contents({ nodes, ...props }: ProcessProps & { readonly nodes: ProcessContent[] }) {
  const stepIds = new Set(nodes.flatMap((node) => node.kind === 'step' ? [node.step.id] : []))
  return <>{nodes.map((node) => {
    if (node.kind === 'thought') {
      if (node.stepId && stepIds.has(node.stepId)) return null
      return <Thought key={node.key} thought={node} disclosure={props.disclosure} />
    }
    const thoughts = nodes.filter((candidate): candidate is ExploreThoughtNode => candidate.kind === 'thought' && candidate.stepId === node.step.id)
    return <ToolStep key={node.key} step={node.step} thoughts={thoughts} {...props} />
  })}</>
}

export default function ExploreProcess({ blocks, ...props }: ProcessProps & { readonly blocks: ProcessBlock[] }) {
  return <>{blocks.map((block) => {
    if (block.kind === 'summary') return <div key={block.key} className={styles.stageSummary}><ExploreRichText text={block.text} /></div>
    if (block.kind === 'task') {
      const title = block.task.content || '待办任务'
      if (!block.children.length) return <div key={block.key} className={styles.pendingTask}><StatusChip status={block.status} /><span>{title}</span></div>
      return <Disclosure key={block.key} nodeKey={block.key} title={title} primary icon={<StatusChip status={block.status} />}
        automatic={block.status === 'in_progress' || block.status === 'running' || block.status === 'failed' || block.status === 'cancelled'} disclosure={props.disclosure}>
        <Contents nodes={block.children} {...props} />
      </Disclosure>
    }
    return <Contents key={block.key} nodes={[block]} {...props} />
  })}</>
}
