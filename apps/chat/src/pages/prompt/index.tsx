import React, { useState, useEffect } from 'react';
import PromptEditor from '../../components/PromptEditor';

const PromptPage: React.FC = () => {
  const [content, setContent] = useState(`你叫 {智能体名称} ，是 {智能体角色设定} 。

一句话描述智能体的工作目标，比如你已经充分掌握了关于{主题}的知识库，可以回复用户的关于这方面的问题。

## 回答主题简介
智能体需要回复的主题简介信息，比如如果是某产品的客服，这里可以写一下产品定位、公司信息、核心功能介绍等

## 工作流程
### 步骤一：问题理解与回复分析
1. 认真理解从知识库 {知识库示例} 中召回的内容和用户输入的问题，判断召回的内容是否是用户问题的答案。
2. 如果你不能理解用户的问题，例如用户的问题太简单、不包含必要信息，此时你需要追问用户，直到你确定已理解了用户的问题和需求。`);

  // 计算只读区域（花括号内的内容）
  const calculateReadOnlyRanges = (text: string) => {
    const ranges: { start: number; end: number }[] = [];
    let startIndex = 0;
    
    while (true) {
      // 查找左花括号
      const leftBrace = text.indexOf('{', startIndex);
      if (leftBrace === -1) break;
      
      // 查找右花括号
      const rightBrace = text.indexOf('}', leftBrace);
      if (rightBrace === -1) break;
      
      // 添加范围（包括花括号）
      ranges.push({
        start: leftBrace + 1, // 不包括左花括号
        end: rightBrace      // 不包括右花括号
      });
      
      startIndex = rightBrace + 1;
    }
    
    return ranges;
  };

  const [readOnlyRanges, setReadOnlyRanges] = useState<{ start: number; end: number }[]>([]);

  useEffect(() => {
    setReadOnlyRanges(calculateReadOnlyRanges(content));
  }, [content]);

  const handleChange = (newValue: string) => {
    setContent(newValue);
    console.log('编辑器内容更新:', newValue);
    // 重新计算只读区域
    setReadOnlyRanges(calculateReadOnlyRanges(newValue));
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">提示词编辑</h1>
      <div className="mb-4">
        <h2 className="text-lg font-medium mb-2">编辑区域说明：</h2>
        <ul className="list-disc list-inside text-gray-600">
          <li>花括号{"{...}"}内的内容为不可编辑区域</li>
          <li>其他区域可以自由编辑</li>
        </ul>
      </div>
      <PromptEditor
        value={content}
        onChange={handleChange}
        readOnlyRanges={readOnlyRanges}
      />
      <div className="mt-4 text-sm text-gray-500">
        当前只读区域: {JSON.stringify(readOnlyRanges, null, 2)}
      </div>
    </div>
  );
};

export default PromptPage; 