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
    label: 'Local (内置)',
    value: 'Local',
    icon: '/model-provider-icon/logo.png'
  },
  {
    label: 'OpenAI',
    value: 'OpenAI',
    icon: '/model-provider-icon/openai.png'
  },
  {
    label: 'Gemini',
    value: 'Gemini',
    icon: '/model-provider-icon/gemini.svg'
  },
  {
    label: 'Ollama',
    value: 'Ollama',
    icon: '/model-provider-icon/ollama.png'
  },
  {
    label: 'DeepSeek',
    value: 'DeepSeek',
    icon: '/model-provider-icon/deepseek.png'
  },
  {
    label: 'vLLM',
    value: 'vLLM',
    icon: '/model-provider-icon/vllm.ico'
  },
  {
    label: 'Azure OpenAI',
    value: 'AzureOpenAI',
    icon: '/model-provider-icon/azure.png'
  },
  {
    label: '阿里云百炼',
    value: 'BaiLian',
    icon: '/model-provider-icon/bailian.jpeg'
  },
  {
    label: '智谱AI',
    value: 'ZhipuAI',
    icon: '/model-provider-icon/zhipu.png'
  },
  {
    label: '火山引擎(豆包)',
    value: 'Doubao',
    icon: '/model-provider-icon/doubao.png'
  },
  {
    label: 'Moonshot',
    value: 'Moonshot',
    icon: '/model-provider-icon/moonshot.ico'
  },
  {
    label: 'SiliconFlow (硅基流动)',
    value: 'SiliconFlow',
    icon: '/model-provider-icon/logo-siliconflow.svg'
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
