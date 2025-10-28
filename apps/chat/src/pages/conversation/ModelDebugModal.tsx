import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Drawer, Button, Space, Spin, Collapse, CollapseProps } from 'antd';
import { CloseOutlined, CopyOutlined, ExpandOutlined } from '@ant-design/icons';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { useDebugStore } from '../../store';

interface Props {
  open: boolean;
  onClose: () => void;
  convUid: number;
  roundIndex: number;
  thinkTime?: number;
}

const ModelDebugModal: React.FC<Props> = ({ open, onClose, convUid, roundIndex, thinkTime }) => {
  const [loading, setLoading] = useState(false);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);// 建立WebSocket连接
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('disconnected');
  const [toggleExpand, setToggleExpand] = useState<boolean>(false);
  const [expandJson, setExpandJson] = useState('');
  const { debugInfoMap } = useDebugStore();
  
  // useDebugStore.subscribe((state) => {
  //   console.log('subscribe', state);
  //   setDebugInfoMap(state.debugInfoMap)
  // });
  useEffect(() => {
      console.log(useDebugStore)
  },[])
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleToggleExpand = (json: string) => {
    setToggleExpand(!toggleExpand);
    setExpandJson(json);
  }

  const items: CollapseProps['items'] = useMemo(() => {
    if (!open) return []
    const debugInfo = debugInfoMap[`${convUid}_${roundIndex}`];
    if (!debugInfo) return [];
    const arr = debugInfo.map((item: any, index: number) => {
      const { inputs, outputs, metrics } = item;
      // console.log(setcur);
      
      return ({
        key: index + 1,
        label: (
          <div className='flex items-center'>
            <span className='mr-4'>{item.name?.task_name_cn || `第${index + 1}步`}</span>
            {/* <span>{<CheckCircleOutlined /> ? <CloseCircleOutlined />}</span> */}
            <span>（用时{metrics.total_time}秒 | {metrics.total_tokens}tokens）</span>
          </div>
        ),
        children: (
          <Spin spinning={!!item.loading}>
            <div className="flex flex-col h-full">
              {/* 输入区域 */}
              <div className="flex-1 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">输入</span>
                    <Space>
                      <Button 
                        type="text" 
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(inputs)}
                        className="hover:opacity-70"
                      />
                      <Button 
                        type="text" 
                        icon={<ExpandOutlined />}
                        className="hover:opacity-70"
                        onClick={() => handleToggleExpand(inputs) }
                      />
                    </Space>
                  </div>
                  <CodeMirror
                    readOnly
                    value={inputs}
                    extensions={[json()]}
                    theme="light"
                    style={{
                      fontSize: '14px',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  />
                </div>
              </div>
    
              {/* 输出区域 */}
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">输出</span>
                    <Space>
                      <Button 
                        type="text" 
                        icon={<CopyOutlined />}
                        onClick={() => handleCopy(outputs)}
                        className="hover:opacity-70"
                      />
                      <Button 
                        type="text" 
                        icon={<ExpandOutlined />}
                        className="hover:opacity-70"
                        onClick={() => handleToggleExpand(outputs)}
                      />
                    </Space>
                  </div>
                  <CodeMirror
                    readOnly
                    value={outputs}
                    extensions={[json()]}
                    theme="light"
                    style={{
                      fontSize: '14px',
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  />
                </div>
              </div>
    
              {/* 底部按钮 */}
              {/* <div className="mt-4 flex justify-end gap-2">
                <Button onClick={onClose} className="hover:opacity-70">取消</Button>
                <Button type="primary" onClick={onClose} className="hover:opacity-70">
                  确认
                </Button>
              </div> */}
            </div>
          </Spin>
        ),
      })
    })
    // const messageObj = JSON.parse(messages)
    return arr;
  }, [open, debugInfoMap, convUid, roundIndex]);

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
          { items?.length ? <Collapse accordion items={items} /> : '无数据' }
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