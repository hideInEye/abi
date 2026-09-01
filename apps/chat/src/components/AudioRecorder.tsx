import { useState, useRef } from 'react'
import RecordRTC from 'recordrtc'
import { message } from 'antd'
import { AudioOutlined, LoadingOutlined } from '@ant-design/icons'
import { getAuthorization, handleLoginExpired } from '@/utils/auth'
const YuyinIcon = new URL('../assets/svg-icon/video.gif', import.meta.url).href
interface AudioRecorderProps {
  onTranscribed: (text: string) => void // 识别完成后的回调
  disabled?: boolean
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onTranscribed, disabled = false }) => {
  const [recording, setRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const recorderRef = useRef<RecordRTC | null>(null)

  const startRecording = async () => {
    try {
      // 首先检查浏览器是否支持
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持录音功能')
      }

      // 检查HTTPS
      if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        throw new Error('录音功能需要在HTTPS环境下使用')
      }

      // 检查权限状态
      const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName })
      console.log('麦克风权限状态:', permissionStatus.state)

      if (permissionStatus.state === 'denied') {
        throw new Error('麦克风权限被拒绝，请在浏览器设置中允许麦克风访问')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // 常用的语音识别采样率
          channelCount: 1, // 单声道
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        // 使用浏览器支持的格式
        mimeType: 'audio/webm;codecs=opus',
        sampleRate: 16000,
        numberOfAudioChannels: 1,
        checkForInactiveTracks: true,
        bufferSize: 16384,
      })

      recorder.startRecording()
      recorderRef.current = recorder
      setRecording(true)
      console.log('开始录音，配置:', recorder.getInternalRecorder())
    } catch (error: any) {
      console.error('麦克风访问失败:', error)

      // 根据错误类型提供具体的解决建议
      let errorMessage = '无法访问麦克风'

      if (error.name === 'NotAllowedError') {
        errorMessage = '麦克风权限被拒绝，请点击地址栏的麦克风图标允许访问'
      } else if (error.name === 'NotFoundError') {
        errorMessage = '未找到麦克风设备，请检查设备连接'
      } else if (error.name === 'NotSupportedError') {
        errorMessage = '浏览器不支持录音功能'
      } else if (error.message.includes('HTTPS')) {
        errorMessage = '录音功能需要在HTTPS环境下使用，请使用安全连接'
      } else {
        errorMessage = `麦克风访问失败: ${error.message}`
      }

      message.error(errorMessage)
    }
  }

  const stopRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.stopRecording(() => {
        const blob = recorderRef.current!.getBlob()
        setAudioBlob(blob)
        setRecording(false)
        // 停止所有音频轨道
        const stream = recorderRef.current!.getInternalRecorder()?.stream
        if (stream) {
          stream.getTracks().forEach((track) => track.stop())
        }
        // 自动进行语音识别
        handleTranscribe(blob)
      })
    }
  }

  const handleTranscribe = async (blob?: Blob) => {
    const targetBlob = blob || audioBlob
    if (!targetBlob) {
      message.warning('请先录制音频')
      return
    }

    console.log('开始语音识别，文件大小:', targetBlob.size, '类型:', targetBlob.type)

    const formData = new FormData()
    // 使用实际的文件类型，而不是强制指定为 .wav
    const fileName = targetBlob.type.includes('webm') ? 'recording.webm' : 'recording.wav'
    formData.append('audio', targetBlob, fileName)

    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1])
    }

    setIsTranscribing(true)
    try {
      const authorization = getAuthorization()
      const response = await fetch('/chat-proxy/api/v2/workflow/voice-to-text', {
        method: 'POST',
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
        },
        body: formData,
      })

      if (!response.ok) {
        if (response.status === 401) {
          await handleLoginExpired()
          return
        }

        // 尝试获取错误响应的详细内容
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorText = await response.text()
          console.error('错误响应内容:', errorText)
          errorMessage += ` - ${errorText}`
        } catch (e) {
          console.error('无法读取错误响应:', e)
        }
        throw new Error(errorMessage)
      }

      const result = await response.json()
      console.log('API返回结果:', result)

      const transcribedText = result.data?.text || result.text || ''

      if (transcribedText) {
        onTranscribed(transcribedText)
        message.success('语音识别成功')
      } else {
        console.warn('未找到文本内容，完整响应:', result)
        message.warning('未识别到有效内容')
      }
    } catch (error) {
      console.error('语音识别失败详细信息:', error)
      message.error(`语音识别失败: ${error.message}`)
    } finally {
      setIsTranscribing(false)
      setAudioBlob(null)
    }
  }

  const handleClick = () => {
    if (disabled || isTranscribing) return

    if (recording) {
      stopRecording()
    } else {
      startRecording()
    }
  }

  return (
    <div
      className={`voice-btn ${recording ? 'voice-btn-active' : ''} ${disabled || isTranscribing ? 'voice-btn-disabled' : ''}`}
      onClick={handleClick}
      title={recording ? '点击停止录音' : isTranscribing ? '正在识别中...' : '点击开始语音输入'}
    >
      {isTranscribing ? (
        <LoadingOutlined className="voice-icon" />
      ) : recording ? (
        <img src={YuyinIcon} className="voice-icon voice-icon-recording" alt="语音识别中" />
      ) : (
        <AudioOutlined className="voice-icon" />
      )}
    </div>
  )
}

export default AudioRecorder
