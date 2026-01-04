/*
 * @Author: kangxiaozhong kangxiaozhong@trusfort.com
 * @Date: 2025-11-10 15:39:09
 * @LastEditors: kangxiaozhong kangxiaozhong@trusfort.com
 * @LastEditTime: 2025-11-12 18:57:03
 * @FilePath: /trust-abi-web/chatbi/src/constants/manage.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
// 供应商
export const PROVIDER_OPTIONS = [
  {
    label: '通义千问',
    value: 'Qwen'
  },
  {
    label: 'DeepSeek',
    value: 'DeepSeek'
  },
  {
    label: '硅基流动',
    value: 'SiliconFlow'
  },
  {
    label: 'OpenAI',
    value: 'OpenAI'
  },
  {
    label: 'Ollama',
    value: 'Ollama'
  },
  {
    label: '移动大模型',
    value: 'MobileIoT'
  }
];

// 模型类型
export const MODAL_TYPE_OPTIONS = [
  {
    label: '大模型',
    value: 'llm'
  },
  {
    label: '嵌入模型',
    value: 'embedding'
  }
  // {
  //   label: '重排模型',
  //   value: 'rerank'
  // }
];

// LLM类型
export const LLM_TYPE_OPTIONS = [
  {
    label: '对话',
    value: 'dialogue'
  },
  {
    label: '生成',
    value: 'generate'
  }
];
