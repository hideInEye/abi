import dayjs from 'dayjs';
import { isEmpty, isObject } from 'lodash';
import { chatModeWithModels } from '@/constant/chat';
/**
 * 通过 Blob 下载文件
 * @param res 文件内容，通常为 ArrayBuffer 或其他二进制数据
 * @param filename 下载文件的名称
 */
export const downloadFileByBlob = (res:any, fielname: string) => {
    const blob = new Blob([res.data], {type: 'application/octet-stream;charset=UTF-8'});
    const url = window.URL.createObjectURL(blob);
    const aNode = document.createElement('a');
    if (fielname) {
        aNode.download = fielname;
    }
    aNode.style.display = 'none';
    aNode.href = url;
    document.body.appendChild(aNode);
    aNode.click();
    window.URL.revokeObjectURL(aNode.href);
    document.body.removeChild(aNode);
};
/**
 * 通过 文件下载
 * @param url 文件地址
 * @param filename 下载文件的名称
 */
export const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
};

/**
 * 生成下载文件名称
 * @param convName 会话名称
 * @param extension 文件后缀
 */
export const generateFilename = (convName: string, extension = 'png') => {
    return `【ChatBI】${convName}_${dayjs().format('YYYYMMDDHHmmss')}.${extension}`;
};

export const createTempContainer = (node: Node) => {
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      top: -9999px;
      left: -9999px;
      opacity: 0;
      pointer-events: none;
    `;
    container.appendChild(node);
    document.body.appendChild(container);
    return container;
};
export const prepareTableForExport = (tableElement: HTMLDivElement) => {
  const clonedTable = tableElement.cloneNode(true) as HTMLDivElement;
  const scrollableContent = clonedTable.querySelector('.ant-table-content');
  scrollableContent?.style.setProperty('overflow', 'visible', 'important');
  return clonedTable;
};

const parseNestedArray = (value) => {
    if (typeof value !== 'string') return value;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : value;
    } catch (e) {
      return value;
    }
};

/**
 * 解析上下文内容
 * @param {string} context - 上下文内容
 * @returns {Object|null} 解析后的数据对象或 null
 */
export const parseContext = (context: string) => {
    // 截取<chart-view>之前的内容作为 desc
    const desc = context.slice(0, context.indexOf('<chart-view'));
    // 提取 {} 中的内容
    // 提取 <chart-view content="..."> 中的内容
    const chartViewMatch = context.match(/<chart-view content="(.*?)" \/>/);
    // 如果匹配成功，则解码内容中的引号，获取JSON字符串
    const jsonMatch = chartViewMatch ? 
        chartViewMatch[1].replace(/&quot;/g, '"').replace(/NaN/g, 'null') : 
        context.slice(context.indexOf('{'), context.lastIndexOf('}') + 1);
    try {
        // 解析 JSON 字符串为 JavaScript 对象
        const data = jsonMatch ? JSON.parse(jsonMatch) : {};
        return { ...data, desc, data: data.data !== undefined ? parseNestedArray(data.data) : data.data };
    }
    catch (error) {
        console.warn('JSON解析失败，返回原始描述:', error);
        return { 
            desc,
            error: error instanceof Error ? error.message : 'Invalid JSON',
            rawData: jsonMatch || 'No JSON content found'
        };
    }
};

/**
* 解析 JSON 内容
* @param {string} content - 需要解析的内容
* @returns {Object|null} 解析后的 JSON 对象或 null
*/
export const parseJsonContent = (content: string) => {
    try {
        // 提取 {} 中的内容
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error('No JSON object found in content');
            return null;
        }

        // 获取 JSON 字符串并处理转义字符
        const jsonStr = jsonMatch[0]
            .replace(/\\n/g, '')     // 移除所有 \n
            .replace(/\\"/g, '"')    // 替换 \" 为 "
            .replace(/\\\\/g, '\\'); // 替换 \\ 为 \
      
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Failed to parse JSON content:', e);
        return null;
    }
};
// 检查是否是图表类型
export const isChartType = (type: string) => {
    return type?.includes('chart') || type?.includes('line') || type?.includes('bar') || type?.includes('pie');
};

// 用于筛选对象参数，只保留有意义的值（即排除 null、undefined、空字符串和空数组）
export const filterParams = <T extends Record<string, any>>(obj: T): Partial<T> => {
    const result: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === null || value === undefined) continue;
        if (typeof value === 'string' && value.trim() === '') continue;
        if (Array.isArray(value) && value.length === 0) continue;
        result[key as keyof T] = value;
    }
    return result;
};

/**
 * 计算标签旋转角度
 * @param {Array<string>} labels - 标签数组
 * @returns {number} 计算得出的旋转角度
 */
export const calculateRotation = (labels: string[]) => {
    // 获取最长标签的长度
    const maxLength = Math.max(...labels.map(label => label.length));
    // 获取标签数量
    const labelCount = labels.length;
    
    // 根据标签长度和数量计算角度，区分中英文字符数量（中文超过6个字符，英文超过12个字符才倾斜）
    const hasChinese = labels.some(label => /[\u4e00-\u9fa5]/.test(label));
    const lengthThreshold = hasChinese ? 6 : 12; // 中文阈值为6，英文阈值为12
    if (maxLength > lengthThreshold && labelCount > 10) {
      return 45; // 长文本且数量多时倾斜45度
    }
    else if (maxLength > lengthThreshold || labelCount > 10) {
      return 30; // 长文本或数量较多时倾斜30度
    }
    return 0; // 默认不倾斜
};

// 安全判断对象是否为空
export const isNotEmptyObject = (obj: any): boolean => {
  return isObject(obj) && !isEmpty(obj);
};

/**
 * 计算活跃的筛选条件数量
 * @param filterValues 筛选值对象
 * @returns 活跃筛选条件的数量
 */
export function countActiveFilters(filterValues: Record<string, any>): number {
    return Object.values(filterValues).filter(value => {
        // 排除未定义、null、空字符串和空数组
        if (value === undefined || value === null) return false;
        if (typeof value === 'string' && value.trim() === '') return false;
        if (Array.isArray(value) && value.length === 0) return false;
        
        // 对于对象类型，检查是否有有效的min/max值
        if (typeof value === 'object') {
            // 处理范围选择器
            if (value.min !== undefined || value.max !== undefined) {
            // 确保min/max不是空字符串
            if (typeof value.min === 'string' && value.min.trim() === '') return false;
            if (typeof value.max === 'string' && value.max.trim() === '') return false;
            return true;
            }
            
            // 处理其他对象类型（如日期对象等）
            return Object.keys(value).length > 0;
        }
        
        // 基本类型值（数字、字符串等）
        return true;
    }).length;
}

  // 文件类型校验
export const checkFileType = (file: { name: string; }) => {
    const acceptTypes = ['.xls', '.xlsx', '.csv'];
    const fileType = '.' + file.name.split('.').pop()?.toLowerCase();
    return acceptTypes.includes(fileType);
};

// 获取各类型可展示模块
export const getModulesByChatMode = (mode: string, module: string) => {
    return chatModeWithModels[mode].includes(module);
}

// 查找历史记录中human
export const getHumanInHistoryByOrderIndex = (orderIndex: number, history: any[]) => {
    return history.find(item => item.order === orderIndex)
}

export const parseMessageContent = (context) => {
    if (!context) return null;
    
    try {
      const parsed = JSON.parse(context);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
      return {
        question: context
      };
    } catch (e) {
      return {
        question: context
      };
    }
};

export const getUserName = () => {
    try {
      const userInfoString = localStorage.getItem('SOY-REACT_userInfo');
      if (!userInfoString) {
        return null;
      }
      const userInfo = JSON.parse(userInfoString);
      return userInfo.userName || null;
    } catch (error) {
      console.error('获取用户名失败:', error);
      return null;
    }
  }

// 解析 获取推荐问题 返回值，从中去除思考内容 及 推荐内容
export function parseRecommendText(inputText: string) {
  // 提取 think 内容
  const thinkMatch = inputText.match(/<think>([\s\S]*?)<\/think>/);
  const thinkContent = thinkMatch ? thinkMatch[1].trim() : null;

  // 提取并解析 JSON
  const jsonMatch = inputText.match(/```(?:json)?\n([\s\S]*?)\n```/);
  let recommendData = null;
  
  if (jsonMatch) {
    try {
      recommendData = JSON.parse(jsonMatch[1].replace(/\\"/g, '"'));
    } catch (e) {
      console.error("JSON 解析失败:", e);
    }
  }
  return { thinkContent, recommendData };
}
  
export const getSpaceId = () => Number(localStorage.getItem('spaceId'));


// 判断数据格式是单指标还是多指标
export const isSingleMetricData = (data: any[]) => {
  if (data && data.length > 0) {
    const keys = Object.keys(data[0]);
    const numberFields = keys.filter(key => {
      const value = data[0][key];
      return !isNaN(Number(value));
    });
    return numberFields.length === 1;
  }
  return false;
};

//获取推荐问题开场白
type OpeningTextConfig = {
  userGreeting: string;
  promptMessage: string;
};

const openingTextConfig: { [key: string]: OpeningTextConfig } = {
  default: {
    userGreeting: '嘿~你的数据分析小能手已上线!✨',
    promptMessage: '随时喊我问数、分析、预测，像聊天一样简单~\n 您最想分析哪个业务指标?直接告诉我吧~',
  },
  special: {
    userGreeting: '嘿~你的数据分析小能手己上线!✨',
    promptMessage: '随时喊我问数、分析、预测，像聊天一样简单~\n 先送你几个高频问题热热身',
  },
  public:{
    userGreeting:'您好，欢迎使用ChatBI智能数据分析平台。',
    promptMessage:'我是您的数据决策顾问，将结合行业实践与深度分析技术，为您提供精准、高效的数据洞察建议。请随时提出需求，我们将共同挖掘数据价值。'
  }
};

export const getOpeningText = (state: boolean): string => {
  const selectedConfig = state ? openingTextConfig.public : openingTextConfig.public;

  return `${selectedConfig.userGreeting}\n${selectedConfig.promptMessage}`;
};