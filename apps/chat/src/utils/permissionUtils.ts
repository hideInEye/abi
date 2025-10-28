export const checkMicrophonePermission = async (): Promise<{
  supported: boolean;
  permission: string;
  isSecure: boolean;
  errorMessage?: string;
}> => {
  // 检查浏览器支持
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return {
      supported: false,
      permission: 'unsupported',
      isSecure: false,
      errorMessage: '浏览器不支持录音功能'
    };
  }

  // 检查HTTPS
  const isSecure = location.protocol === 'https:' || 
                   location.hostname === 'localhost' || 
                   location.hostname === '127.0.0.1';

  if (!isSecure) {
    return {
      supported: true,
      permission: 'denied',
      isSecure: false,
      errorMessage: '录音功能需要在HTTPS环境下使用'
    };
  }

  // 检查权限
  try {
    const permissionStatus = await navigator.permissions.query({ 
      name: 'microphone' as PermissionName 
    });
    
    return {
      supported: true,
      permission: permissionStatus.state,
      isSecure: true
    };
  } catch (error) {
    return {
      supported: true,
      permission: 'unknown',
      isSecure: true,
      errorMessage: '无法检查麦克风权限状态'
    };
  }
};