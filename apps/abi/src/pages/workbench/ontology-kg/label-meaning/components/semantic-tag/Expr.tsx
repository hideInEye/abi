import { ProfileOutlined } from '@ant-design/icons'
import React, { forwardRef, useMemo } from 'react'

import { OntologyFormSectionTitle } from '@/pages/workbench/ontology-kg/components/OntologyFormSectionTitle'

import {
  RuleExpressionBuilder,
  type RuleExpressionBuilderHandle,
  RuleExpressionFormItem,
  type RuleFieldOption,
  validateRuleLayers,
  validateRuleLogicUniformity
} from '../rule-expression'

interface ExpressionBuilderProps {
  readonly fieldLoading?: boolean
  readonly fields: RuleFieldOption[]
}

const ExpressionBuilder = forwardRef<RuleExpressionBuilderHandle, ExpressionBuilderProps>(
  ({ fieldLoading = false, fields }, ref) => {
    const rules = useMemo(
      () => [
        {
          validator: (_: unknown, value: unknown) => {
            const baseValidation = validateRuleLayers(value, fields)
            const logicValidation = validateRuleLogicUniformity(value)
            const issues = [...baseValidation.issues, ...logicValidation.issues]
            return issues.length === 0
              ? Promise.resolve()
              : Promise.reject(new Error(issues[0]?.message || '请完善表达式定义'))
          }
        }
      ],
      [fields]
    )

    return (
      <div className="my10">
        <OntologyFormSectionTitle icon={<ProfileOutlined />}>表达式定义</OntologyFormSectionTitle>
        <RuleExpressionFormItem
          name="exp"
          rules={rules}
        >
          <RuleExpressionBuilder
            fieldLoading={fieldLoading}
            fields={fields}
            ref={ref}
            uniformLogic
          />
        </RuleExpressionFormItem>
      </div>
    )
  }
)

ExpressionBuilder.displayName = 'ExpressionBuilder'

export default ExpressionBuilder
