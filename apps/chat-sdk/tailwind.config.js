/** @type {import('tailwindcss').Config} */
// 与 apps/chat/tailwind.config.js 保持一致；preflight 由 vite.config.ts 的 scopeGlobalCss 收进浮窗作用域
export default {
  content: ['./src/**/**/*.{html,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [require('@tailwindcss/typography')],
}
