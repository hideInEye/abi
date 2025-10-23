/** @type {import('postcss').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // 新的 Tailwind PostCSS 插件
    autoprefixer: {}, // 自动添加浏览器前缀
  },
}
