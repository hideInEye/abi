import React, { useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import { Spin } from 'antd';
import { fetchCaptchaImage } from '@/service/api/auth';

export interface CaptchaRef {
  refresh: () => void;
  getUuid: () => string;
}

interface CaptchaProps {
  width?: number;
  height?: number;
  onChange?: (uuid: string) => void;
}

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ width = 120, height = 38, onChange }, ref) => {
    const [imgSrc, setImgSrc] = useState('');
    const [uuid, setUuid] = useState('');
    const [loading, setLoading] = useState(false);

    // 获取验证码
    const fetchCaptcha = async () => {
      setLoading(true);
      try {
        const { data, error } = await fetchCaptchaImage();
        if (!error && data) {
          const imgData = data.img.startsWith('data:') ? data.img : `data:image/png;base64,${data.img}`;
          setImgSrc(imgData);
          setUuid(data.uuid);
          onChange?.(data.uuid);
        }
      } finally {
        setLoading(false);
      }
    };

    // 刷新验证码
    const refresh = () => {
      fetchCaptcha();
    };

    // 供父组件调用
    useImperativeHandle(ref, () => ({
      refresh,
      getUuid: () => uuid,
    }));

    useEffect(() => {
      fetchCaptcha();
    }, []);

    return (
      <Spin spinning={loading} size="small">
        <img
          src={imgSrc}
          alt="验证码"
          width={width}
          height={height}
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
    );
  }
);

export default Captcha;
