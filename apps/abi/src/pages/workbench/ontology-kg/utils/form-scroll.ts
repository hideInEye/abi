import type { FormInstance } from 'antd'

type FormFieldName = Array<number | string> | number | string

interface ValidationErrorInfo {
  errorFields?: Array<{
    name?: FormFieldName
  }>
}

export function getFirstErrorFieldName(error: unknown): FormFieldName | undefined {
  const errorFields = (error as ValidationErrorInfo | undefined)?.errorFields
  if (!Array.isArray(errorFields)) {
    return undefined
  }

  return errorFields.find(item => item?.name !== undefined)?.name
}

export function scrollToFirstFormError(form: FormInstance, error: unknown) {
  const firstName = getFirstErrorFieldName(error)
  if (!firstName) {
    return
  }

  const schedule = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (callback: FrameRequestCallback) => setTimeout(callback, 0)
  schedule(() => {
    form.scrollToField(firstName as any, {
      behavior: 'smooth',
      block: 'center',
    })
  })
}

export async function validateFieldsAndScroll<T = any>(form: FormInstance, fields?: FormFieldName[]): Promise<T | undefined> {
  try {
    return await form.validateFields(fields as any)
  } catch (error) {
    scrollToFirstFormError(form, error)
    return undefined
  }
}
