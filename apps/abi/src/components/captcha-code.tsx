import { fetchCaptchaImage } from '@/service/api/auth'
import { Input, Space, Spin } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface CaptchaRef {
  refresh: () => void
  getUuid: () => string
}

interface CaptchaProps {
  className?: string
  width?: number | string
  height?: number | string
  imageClassName?: string
  inputClassName?: string
  onRefresh: (uuid: string) => void
  onChange?: (value: string) => void
}

const INPUT_WRAPPER_CLASSES =
  'h-12 rounded-xl border border-black/10 bg-white/90 shadow-sm transition hover:!border-[#1890FF] focus-within:!border-[#1890FF] focus-within:!shadow-[0_0_0_0.1875rem_rgba(24,144,255,0.2)]'

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ className, width, height, imageClassName, inputClassName, onChange, onRefresh }, ref) => {
    const [imgSrc, setImgSrc] = useState('')
    const [uuid, setUuid] = useState('')
    const [loading, setLoading] = useState(false)

    // 获取验证码
    const fetchCaptcha = async () => {
      setLoading(true)
      try {
        const { data, error } = await fetchCaptchaImage()
        if (!error && data) {
          const imgData = data.img.startsWith('data:') ? data.img : `data:image/png;base64,${data.img}`
          setImgSrc(imgData)
          setUuid(data.uuid)
          onRefresh(data.uuid)
        }
      } finally {
        setLoading(false)
      }
    }

    // 刷新验证码
    const refresh = () => {
      fetchCaptcha()
    }

    // 供父组件调用
    useImperativeHandle(ref, () => ({
      refresh,
      getUuid: () => uuid,
    }))

    useEffect(() => {
      fetchCaptcha()
    }, [])

    return (
      <Space className={className}>
        <Input
          size="large"
          placeholder="验证码"
          onChange={(e) => {
            onChange?.(e.target.value)
          }}
          className={`${INPUT_WRAPPER_CLASSES} ${inputClassName || ''} !px-4 !text-base !text-[#333333] [&_.ant-input]:!text-[#333333]`}
        />
        <Spin spinning={loading} size="small">
          <img
            src={imgSrc}
            alt="验证码"
            width={width}
            height={height}
            className={`${imageClassName || ''} block cursor-pointer select-none bg-white`}
            style={{ height, width }}
            onClick={refresh}
            title="点击刷新验证码"
          />
        </Spin>
      </Space>
    )
  }
)

export default Captcha
