export const getSpaceId = () => Number(localStorage.getItem('spaceId'))

export function getBaseApi() {
  const config = window.APP_CONFIG || {}
  let baseApi = config.VITE_BASE_API

  if (!baseApi && typeof import.meta !== 'undefined' && import.meta.env) {
    baseApi = import.meta.env.VITE_BASE_API || ''
  }

  if (!baseApi) {
    console.warn('VITE_BASE_API 未配置，使用默认值')
    baseApi = ''
  }

  return baseApi
}

export function getChatbiBaseApi() {
  let chatbiBaseApi = getBaseApi()
  if (chatbiBaseApi) {
    chatbiBaseApi = chatbiBaseApi.replace(/\/$/, '')
    if (!chatbiBaseApi.includes('/api')) {
      chatbiBaseApi = `${chatbiBaseApi}/api`
    }
  }
  return chatbiBaseApi
}
