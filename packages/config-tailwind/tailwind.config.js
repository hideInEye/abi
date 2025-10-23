/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./apps/**/*.{js,ts,jsx,tsx}', './packages/**/*.{js,ts,jsx,tsx}'],
  // 共享 preset（来自 packages/ui），可在各 app 单独覆盖
  presets: [],
  theme: {
    screens: {
      'xs': '480px',    // 新增一个超小屏
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
    },
    extend: {
      colors: {
        brandBlue: '#243c5a',
        brandGreen: '#449e48',
      },

      keyframes: {
        'text-appear': {
          '0%': { opacity: 0, transform: 'translateY(-50%)' },
          '100%': { opacity: 1, transform: 'translateY(0%)' },
        },
      },
      animation: {
        'text-appear': 'text-appear 2.5s 1',
      },
    },
  },
  plugins: [],
}
