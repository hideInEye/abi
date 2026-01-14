import { fetchCaptchaImage } from '@/service/api/auth'
import { Input, Space, Spin } from 'antd'
import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

export interface CaptchaRef {
  refresh: () => void
  getUuid: () => string
}

interface CaptchaProps {
  width?: number
  height?: number
  onRefresh: (uuid: string) => void
  onChange?: (value: string) => void
}

const INPUT_WRAPPER_CLASSES = 'h-14 rounded-[12px] border border-white/60 bg-white/90 shadow-sm transition hover:!border-[#3366FF] focus-within:!border-[#3366FF] focus-within:!shadow-[0_0_0_2px_rgba(51,102,255,0.15)]'

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(({ width = 120, height = 38, onChange, onRefresh }, ref) => {
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
    <Space>
      <Input
        size="large"
        placeholder="验证码"
        onChange={(e) => {
          onChange?.(e.target.value)
        }}
        // prefix={<img className=" w-[28px] h-[28px]" src={passwordIcon} />}
        className={`${INPUT_WRAPPER_CLASSES} !px-4 !text-base !text-[#333333] [&_.ant-input]:!text-[#333333]`}
      />
      <Spin spinning={loading} size="small">
        <img
          src={imgSrc}
          alt="验证码"
          width={width}
          className="h-14"
          onClick={refresh}
          style={{
            cursor: 'pointer',
            borderRadius: 4,
            userSelect: 'none',
            background: '#fff',
            display: 'block',
          }}
          title="点击刷新验证码"
        />
      </Spin>
    </Space>
  )
})

export default Captcha
