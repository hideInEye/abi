import { Form } from 'antd'
import type { FormItemProps } from 'antd'
import React from 'react'

const RuleExpressionFormItem: React.FC<FormItemProps> = props => (
  <Form.Item
    {...props}
    validateTrigger={[]}
  />
)

export default RuleExpressionFormItem
