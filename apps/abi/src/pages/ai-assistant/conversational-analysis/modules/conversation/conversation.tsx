import { CloseOutlined } from '@ant-design/icons';
import { fetchEventSource } from '@microsoft/fetch-event-source';
import { Button, Input, Tag } from 'antd';
import React, { Fragment, useEffect, useRef } from 'react';

import { clearConvHistory, fetchConvHistory, fetchDataBySql } from '@/service/api/conv';

import AiEle from './AiEle';
import HumanEle from './HumanEle';
import ViewEle from './ViewEle';

interface PropsType {
  conv: any;
  onClose: () => void;
}

const Conversation: React.FC<PropsType> = memo(({ conv, onClose }) => {
  const [thinkTime, setThinkTime] = useState(0);
  const [loading, setLoading] = useState(false);
  const [convContent, setConvContent] = React.useState<any[]>([]);
  const [inputValue, setInputValue] = React.useState('');
  const [loadingAiObj, setLoadingAiObj] = useState<any>();
  const [recommendList, setRecommendList] = React.useState<string[]>([]);
  const scrollableRef = useRef<HTMLDivElement>(null);

  const getConvHistory = async () => {
    // const demo = { conv_uid: 'f0e87da0-f102-11ef-9534-0242ac110005' };
    // const res = await fetchConvHistory(demo);
    const res = await fetchConvHistory({ conv_uid: conv.conv_uid });
    const filterRes = res?.data.map((item: any, index: number) => {
      // 找到最后一个ai，添加思考时间
      if (index === res.data.length - 2) {
        return { ...item, thinkTime };
      }
      return item;
    });
    setConvContent(filterRes);
    setLoadingAiObj(undefined);
    setLoading(false);
    setThinkTime(0);
  };

  useEffect(() => {
    if (conv.conv_uid) {
      getConvHistory();
    }
  }, [conv]);

  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [convContent]);

  const getAnswer = async (question: string) => {
    const startTime = performance.now();
    setLoading(true);
    try {
      const demo = {
        app_code: 'chat_with_db_execute',
        chat_mode: 'chat_with_db_execute',
        conv_uid: 'f0e87da0-f102-11ef-9534-0242ac110005',
        max_new_tokens: 4096,
        model_name: 'ollama_proxyllm',
        select_param: 'case_2_ecom',
        temperature: 0,
        user_input: '查询不同产品的最大销售金额'
      };
      const paramsData = {
        ...conv,
        app_code: conv.app_code || conv.chat_mode,
        max_new_tokens: 4096,
        model_name: 'ollama_proxyllm',
        temperature: 0,
        user_input: question
      };
      await fetchEventSource(`${import.meta.env.VITE_CHAT_SERVICE_BASE_URL}/api/v1/chat/completions`, {
        // body: JSON.stringify(demo),
        body: JSON.stringify(paramsData),
        headers: {
          'Content-Type': 'application/json'
        },
        method: 'POST',
        onclose() {
          // 数据返回结束时触发
          const endTime = performance.now();
          setThinkTime((endTime - startTime) / 1000);
        },
        onerror() {
          console.log('eventSource error');
          setLoading(false);
        },
        onmessage(event: any) {
          console.log('onmessage', event);
          setLoadingAiObj({ context: event.data, role: 'ai' });
        },
        onopen: async event => {
          console.log('连接成功', event);
        }
      });
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getDataBySql = async () => {
    try {
      // 提取 JSON 部分
      const str = loadingAiObj.context;
      // 使用正则表达式提取SQL内容
      const sqlRegex = /"sql":\s*"([^"]*)"/;
      const match = str.match(sqlRegex);
      let sqlContent = '';
      if (match && match[1]) {
        sqlContent = match[1];
      } else {
        console.log('未找到SQL内容');
      }

      // const jsonStart = str.indexOf('{');
      // const jsonEnd = str.lastIndexOf('}') + 1;
      // console.log(jsonStart, jsonEnd);

      // const jsonString = str.slice(jsonStart, jsonEnd);
      // console.log(jsonString);

      // const obj = JSON.parse(jsonString);
      const paramsData = {
        db_name: conv.select_param,
        // query_sql: obj.sql
        query_sql: sqlContent
      };
      await fetchDataBySql(paramsData);
      // const contextData = {...res.data, ...obj}
      // setConvContent((state) => {
      //   return [
      //     ...state,
      //     loadingAiObj,
      //     { role: 'view', context: JSON.stringify(contextData) }
      //   ]
      // });
      getConvHistory();
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (thinkTime && loadingAiObj) {
      getDataBySql();
    }
  }, [thinkTime, loadingAiObj]);

  const handleClickRecommend = (item: any) => {
    if (loading) return;
    console.log('异步请求，问题：', item);
  };

  const handleClear = async () => {
    await clearConvHistory({ conv_uid: conv.conv_uid });
    getConvHistory();
  };

  const queryAnswer = (question: string) => {
    setConvContent(state => {
      return [
        ...state,
        { context: question, role: 'human' }
        // { role: 'view', isLoading: true }
      ];
    });
    
    // 检查输入内容是否为纯英文（包含空格和标点符号）
    const isEnglishInput = /^[a-zA-Z\s\.,!?;:'"()\-_]+$/.test(question.trim());
    
    // 如果是英文输入，保留内容在输入框内；否则清空输入框
    if (isEnglishInput) {
      // 英文内容保留在输入框内，不清空
      console.log('英文输入已发送，内容保留在输入框中');
    } else {
      // 非英文内容（如中文）发送后清空输入框
      setTimeout(() => {
        setInputValue('');
      }, 10);
    }
    
    getAnswer(question);
  };

  const handleOnEnter = async (e: any) => {
    if (loading) return;
    const isEnter = e.keyCode === 13;
    if (isEnter && !e.shiftKey) {
      const question = e.target.value;
      queryAnswer(question);
    }
  };

  const getRoleEle: any = (item: any) => ({
    ai: <AiEle data={item} />,
    human: <HumanEle data={item} />,
    view: <ViewEle data={item} />
  });

  return (
    <div className="min-w-[800px] flex-1">
      <header className="flex items-center justify-between border-b border-[#3470f6] bg-[#e8eefb] p-2">
        <span>AI智能助手</span>
        <span
          className="cursor-pointer px-2 text-[12px] text-[#8a8a8a]"
          onClick={onClose}
        >
          <CloseOutlined />
        </span>
      </header>
      <div
        className="overflow-y-auto bg-white p-4"
        ref={scrollableRef}
        style={{ height: 'calc(100% - 140px)' }}
      >
        {convContent?.map((item, index) => {
          return <Fragment key={index}>{getRoleEle(item)[item.role]}</Fragment>;
        })}
        {loading ? (
          <AiEle
            data={loadingAiObj}
            loading={loading}
          />
        ) : null}
      </div>
      <div className="border-t p-2 pt-4 shadow-2xl">
        {/* <div className="invisible py-2">
          <span className="mr-2">推荐问题</span>
          <span>
            {recommendList.map((item, index) => {
              return (
                <Tag
                  className="cursor-pointer"
                  key={index}
                  onClick={() => handleClickRecommend(item)}
                >
                  {item}
                </Tag>
              );
            })}
          </span>
        </div> */}
        <div>
          <Input.TextArea
            autoFocus
            placeholder="请输入你想了解的内容"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={handleOnEnter}
          />
          <div className="py-2 text-right">
            <Button
              className="mr-2"
              onClick={handleClear}
            >
              清空聊天记录
            </Button>
            <Button
              type="primary"
              onClick={() => queryAnswer(inputValue)}
            >
              发送
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default Conversation;
