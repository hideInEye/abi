/**
 * 缓存管理工具
 * 用于管理对话相关的缓存清理
 */

/**
 * 清除对话相关的缓存
 * 在切换空间时调用，确保新空间不会显示上个空间的对话列表
 */
export function clearConversationCache() {
  // 清除对话列表缓存
  localStorage.removeItem('conv_list');
  
  // 清除其他可能的对话相关缓存
  const keysToRemove = [
    'conv_list',
    'current_conversation',
    'conversation_history',
    'chat_history'
  ];
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 清除sessionStorage中的对话相关缓存
  const sessionKeysToRemove = [
    'current_conv',
    'conv_data',
    'chat_data'
  ];
  
  sessionKeysToRemove.forEach(key => {
    sessionStorage.removeItem(key);
  });
}

/**
 * 清除指定空间相关的所有缓存
 * @param spaceId 空间ID
 */
export function clearSpaceCache(spaceId?: number) {
  // 清除对话缓存
  clearConversationCache();
  
  // 如果有指定空间ID，可以清除该空间特定的缓存
  if (spaceId) {
    const spaceSpecificKeys = [
      `space_${spaceId}_conv_list`,
      `space_${spaceId}_app_list`,
      `space_${spaceId}_data`
    ];
    
    spaceSpecificKeys.forEach(key => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
  }
}

/**
 * 清除所有应用缓存
 */
export function clearAllAppCache() {
  // 清除localStorage中的缓存
  const localStorageKeys = Object.keys(localStorage);
  const cacheKeys = localStorageKeys.filter(key => 
    key.includes('conv') || 
    key.includes('chat') || 
    key.includes('app') ||
    key.includes('space')
  );
  
  cacheKeys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  // 清除sessionStorage中的缓存
  const sessionStorageKeys = Object.keys(sessionStorage);
  const sessionCacheKeys = sessionStorageKeys.filter(key => 
    key.includes('conv') || 
    key.includes('chat') || 
    key.includes('app') ||
    key.includes('space')
  );
  
  sessionCacheKeys.forEach(key => {
    sessionStorage.removeItem(key);
  });
}