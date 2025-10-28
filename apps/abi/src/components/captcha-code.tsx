import React, { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';

export interface CaptchaRef {
  refresh: () => void;
  getValue: () => string;
}

interface CaptchaProps {
  width?: number;
  height?: number;
  length?: number;
  onChange?: (code: string) => void;
}

const Captcha = forwardRef<CaptchaRef, CaptchaProps>(
  ({ width = 120, height = 30, length = 4, onChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [code, setCode] = useState('');

    // 生成验证码
    const generateCode = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 去除易混淆字符
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    // 绘制验证码
    const drawCaptcha = (code: string) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 清空画布
      ctx.clearRect(0, 0, width, height);

      // 背景
      ctx.fillStyle = randomColor(180, 240);
      ctx.fillRect(0, 0, width, height);

      // 绘制文字
      for (let i = 0; i < code.length; i++) {
        const char = code[i];
        const fontSize = randomNum(22, 28);
        const deg = randomNum(-30, 30); // 随机旋转角度

        ctx.font = `${fontSize}px Verdana`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = randomColor(50, 160);
        ctx.save();
        ctx.translate(20 * i + 15, height / 2);
        ctx.rotate((deg * Math.PI) / 180);
        ctx.fillText(char, 0, 0);
        ctx.restore();
      }

      // 干扰线
      for (let i = 0; i < 4; i++) {
        ctx.strokeStyle = randomColor(40, 180);
        ctx.beginPath();
        ctx.moveTo(randomNum(0, width), randomNum(0, height));
        ctx.lineTo(randomNum(0, width), randomNum(0, height));
        ctx.stroke();
      }

      // 干扰点
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = randomColor(0, 255);
        ctx.beginPath();
        ctx.arc(randomNum(0, width), randomNum(0, height), 1, 0, 2 * Math.PI);
        ctx.fill();
      }
    };

    // 刷新验证码
    const refresh = () => {
      const newCode = generateCode();
      setCode(newCode);
      onChange?.(newCode);
      drawCaptcha(newCode);
    };

    // 供父组件调用
    useImperativeHandle(ref, () => ({
      refresh,
      getValue: () => code,
    }));

    useEffect(() => {
      refresh();
    }, []);

    return (
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onClick={refresh}
        style={{
          cursor: 'pointer',
          borderRadius: 4,
          userSelect: 'none',
          background: '#fff',
        }}
        title="点击刷新验证码"
      />
    );
  }
);

export default Captcha;

// 工具函数
function randomNum(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min) + min);
}
function randomColor(min: number, max: number): string {
  const r = randomNum(min, max);
  const g = randomNum(min, max);
  const b = randomNum(min, max);
  return `rgb(${r},${g},${b})`;
}
