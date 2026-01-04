import React, { useMemo, useState, useCallback } from 'react';
import { Drawer, Button, Space, Spin, Collapse, CollapseProps } from 'antd';
import { CloseOutlined, CopyOutlined, ExpandOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { useDebugStore } from '../../store';
import { SUB_CHAT_MODE_MAP } from '../../constant/chat';

interface Props {
  open: boolean;
  onClose: () => void;
  convUid: number;
  roundIndex: number;
  thinkTime?: number;
}

// 提取 CodeEditor 组件，使用 React.memo 优化
const CodeEditor: React.FC<{ value: string; onCopy: () => void; onExpand: () => void; title: string }> = React.memo(({ value, onCopy, onExpand, title }) => {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="font-medium">{title}</span>
        <Space>
          <Button 
            type="text" 
            icon={<CopyOutlined />}
            onClick={onCopy}
            className="hover:opacity-70"
          />
          <Button 
            type="text" 
            icon={<ExpandOutlined />}
            className="hover:opacity-70"
            onClick={onExpand}
          />
        </Space>
      </div>
      <CodeMirror
        readOnly
        value={value}
        extensions={[json()]}
        theme="light"
        style={{
          fontSize: '14px',
          borderRadius: '4px',
          overflow: 'hidden'
        }}
      />
    </div>
  );
});

CodeEditor.displayName = 'CodeEditor';

const ModelDebugModal: React.FC<Props> = ({ open, onClose, convUid, roundIndex, thinkTime }) => {
  const [loading] = useState(false);
  const [toggleExpand, setToggleExpand] = useState<boolean>(false);
  const [expandJson, setExpandJson] = useState('');
  const [activeKeys, setActiveKeys] = useState<string | string[]>([]);
  const { debugInfoMap } = useDebugStore();
  
  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleToggleExpand = useCallback((json: string) => {
    setToggleExpand(prev => !prev);
    setExpandJson(json);
  }, []);

  // 优化：只在弹窗打开且有数据时才处理
  const processedDebugInfo = useMemo(() => {
    if (!open) return [];
    const debugInfo = debugInfoMap[`${convUid}_${roundIndex}`];
    if (!debugInfo) return [];
    
    // 过滤掉空元素和 loading 元素，避免显示重复或无效数据
    const validDebugInfo = debugInfo.filter((item: any) => item && !item.loading);
    
    // 根据 current_stage 去重，确保每个阶段只显示一次
    const uniqueDebugInfo = validDebugInfo.reduce((acc: any[], item: any) => {
      const existingIndex = acc.findIndex(
        (accItem) => accItem.metrics?.current_stage === item.metrics?.current_stage
      );
      if (existingIndex === -1) {
        acc.push(item);
      } else {
        // 如果已存在，用新数据覆盖（保留最新的）
        acc[existingIndex] = item;
      }
      return acc;
    }, []);
    
    return uniqueDebugInfo;
  }, [open, convUid, roundIndex, debugInfoMap]);

  // 延迟渲染：只在面板展开时渲染 CodeMirror
  const items: CollapseProps['items'] = useMemo(() => {
    if (!processedDebugInfo.length) return [];
    
    return processedDebugInfo.map((item: any, index: number) => {
      const { inputs, outputs, metrics } = item;
      const key = String(index + 1);
      const isActive = activeKeys.includes(key);
      
      // 获取步骤显示名称，优先级：后端返回的task_name_cn > sub_chat_mode映射 > 默认
      const getStepName = () => {
        if (item.name?.task_name_cn) {
          return item.name.task_name_cn;
        }
        if (item.name?.sub_chat_mode && SUB_CHAT_MODE_MAP[item.name.sub_chat_mode]) {
          return SUB_CHAT_MODE_MAP[item.name.sub_chat_mode];
        }
        return `第${index + 1}步`;
      };
      
      return {
        key,
        label: (
          <div className='flex items-center'>
            <span className='mr-4'>{getStepName()}</span>
            <span>（用时{metrics.total_time}秒 | {metrics.total_tokens}tokens）</span>
          </div>
        ),
        children: (
          <Spin spinning={!!item.loading}>
            <div className="flex flex-col h-full">
              {/* 输入区域 - 只在展开时渲染 */}
              <div className="flex-1 mb-4">
                {isActive ? (
                  <CodeEditor 
                    value={inputs}
                    title="输入"
                    onCopy={() => handleCopy(inputs)}
                    onExpand={() => handleToggleExpand(inputs)}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-400">
                    展开以查看输入内容
                  </div>
                )}
              </div>
    
              {/* 输出区域 - 只在展开时渲染 */}
              <div className="flex-1">
                {isActive ? (
                  <CodeEditor 
                    value={outputs}
                    title="输出"
                    onCopy={() => handleCopy(outputs)}
                    onExpand={() => handleToggleExpand(outputs)}
                  />
                ) : (
                  <div className="bg-gray-50 rounded-lg p-4 text-gray-400">
                    展开以查看输出内容
                  </div>
                )}
              </div>
            </div>
          </Spin>
        ),
      };
    });
  }, [processedDebugInfo, activeKeys, handleCopy, handleToggleExpand]);

  // 处理 Collapse 展开/收起
  const handleCollapseChange = useCallback((keys: string | string[]) => {
    setActiveKeys(keys);
  }, []);

  return (
    <>
      <Drawer
        title={
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-lg font-medium">模型调试</span>
              {thinkTime ? <span className="text-gray-400 text-sm">(用时{thinkTime}秒)</span> : null}
            </div>
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="hover:opacity-70"
            />
          </div>
        }
        placement="right"
        onClose={onClose}
        open={open}
        width={800}
        closable={false}
      >
        <Spin spinning={loading} className="h-full">
          { items?.length ? (
            <Collapse 
              accordion 
              items={items} 
              activeKey={activeKeys}
              onChange={handleCollapseChange}
            />
          ) : '无数据' }
        </Spin>
      </Drawer>
      { toggleExpand ?  (
        <Drawer title='内容' width='100vw' height='100vh' open zIndex={1001} onClose={() => {
          setToggleExpand(false);
          setExpandJson('');
        }}>
          <CodeMirror
            readOnly
            value={expandJson}
            extensions={[json()]}
            theme="light"
            style={{
              fontSize: '14px',
              borderRadius: '4px',
            }}
          />
        </Drawer>
      ) : null}

    </>
  );
};

export default ModelDebugModal;