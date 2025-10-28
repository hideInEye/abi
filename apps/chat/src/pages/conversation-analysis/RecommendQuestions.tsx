import React, { forwardRef, useImperativeHandle, useState, useReducer, useEffect, useRef } from 'react';
import { Form, message, Switch, Spin } from 'antd';
import PromptEditor from '../../components/PromptEditor';
import { CHECKED_MAP } from '../../constant';
import { fetchRecommendQuestions,fetchChatPromptsConfig } from '../../service/api/conv';
import Markdown from 'react-markdown';
import { cloneDeep } from 'lodash';

interface PromptItem {
  prompt_id: number;
  chat_scene: string;
  sub_chat_scene: string;
  prompt_code: string;
  prompt_type: string;
  prompt_name: string;
  content: string;
  remark: string | null;
  response_schema: string | null;
  input_variables: string;
  model: string | null;
  prompt_language: string;
  user_code: string | null;
  user_name: string | null;
  sys_code: string | null;
  create_time: string;
  update_time: string;
  prompt_sub_scene_zh: string;
}

export interface RecommendQuestionsHandle {
  resetState: () => void;
  getSwitchStates: () => Record<string, boolean>;
  setInitialValues: (values: Record<string, boolean>) => void; // 新增方法用于设置初始值
  getData: () => void;
}

const switchMap = new Map<string, boolean>();

// 修改组件
const RecommendQuestions = forwardRef<RecommendQuestionsHandle, { isEdit?:Boolean,chatId?:Number }>(({ isEdit,chatId }, ref) => {
  const [loading, setLoading] = useState(false);
  const [promptList, setPromptList] = useState<PromptItem[]>([]);
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});
  const [editingScene, setEditingScene] = useState<PromptItem | null>(null);
  const [chatConfig, setChatConfig] = useState<any[]>([]);
  const [state, dispatch] = useReducer((state: any, field: any) => {
    return { ...state, ...field };
  }, {
    promptContent: ''
  });
  const hasFetched = useRef(false);
  useImperativeHandle(ref, () => ({
    resetState: () => {
      // 重置所有状态
      setLoading(false);
      setPromptList([]);
      setSwitchStates({});
      dispatch({ promptContent: '' });
    },
    getSwitchStates: () => switchStates,
    getData: () => {
      let upData = promptList
      upData = upData.map((item)=>({
        ...item,
        content: item.prompt_code === editingScene?.prompt_code ? editingScene?.content : item.content,
      }))
      return upData
    },
    setInitialValues: (values: Record<string, boolean>) => {
      // 设置初始值
      setSwitchStates(values);
    }
  }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchRecommendQuestions({});
      let data = [];
      data = response.data || [];

      if (data.length > 0) {
        setPromptList(data);
        setSwitchStates({意图识别:true});
      }
    } catch (error) {
      message.error('获取数据失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchUpData = async () => {
    try {
      setLoading(true);
      const response = await fetchChatPromptsConfig({chat_id:chatId});

      if (response && response.data) {
        let data = [];
        const chatConfig = JSON.parse(response?.data?.chat_config || '{}');  
        data = chatConfig.prompts || [];

        if (data.length > 0) {
          setPromptList(data);
          setChatConfig(data)

          const statusObj:any = {}
          data.forEach((item: any) => {
            if (item.status === '1') {
              statusObj[item.prompt_sub_scene_zh] = true;  
            }
          });
          setSwitchStates({...statusObj,意图识别:true});
        }
      }
    } catch (error) {
      console.error('获取数据失败:');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isEdit && !hasFetched.current) {
      fetchUpData();
      hasFetched.current = true;  // 设置为已请求
    } else if (!isEdit) {
      fetchData();
    }
  }, [isEdit, chatId]);

  const handleSwitchChange = (scene: string, checked: boolean, item: PromptItem) => {
    // setSwitchStates(prev => ({
    //   ...prev,
    //   [scene]: checked
    // }));
    switchMap.set(scene, checked);
    setEditingScene(item)
  };

  const handleEditorChange = (value: string) => {
    setEditingScene((prev: any) => ({
      ...prev,
      content: value
    }));

    if (chatConfig) {
      let _config: PromptItem[] = cloneDeep(chatConfig);
      _config = _config.map((item) => ({
        ...item,
        content: item.prompt_code === editingScene?.prompt_code ? value : item.content,
      }));
      setChatConfig(_config);
    } else {
      console.warn('chatConfig is null or undefined');
    }
  };
  console.log('switchMap',switchMap);
  
  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="flex h-full">
        <div className="w-[23%] p-4 border-r overflow-y-auto">
          <Form layout="vertical" className="flex-1">
            {promptList.map((item, index) => {
              // 跳过倒数第二个元素
              if (index === promptList.length - 2) {
                return null;
              }
              return (
                <Form.Item key={item.prompt_id}>
                  <div className="flex justify-between items-center">
                    <span 
                      className="cursor-pointer" 
                    >
                      {item.prompt_sub_scene_zh}
                    </span>
                    <Switch
                      disabled={item.prompt_code === 'intent_detection'}
                      checked={switchMap.get(item.prompt_sub_scene_zh) || false}
                      onChange={(checked) => handleSwitchChange(item.prompt_sub_scene_zh, checked,item)}
                    />
                  </div>
                </Form.Item>
              );
            })}
          </Form>
        </div>
        <div className="w-[77%] p-4">
          <div className="mb-4 text-lg font-medium">
            提示词模板
            <span className="text-sm text-gray-500 text-red-500 ml-2">{`{...}`} 为只读区域，请勿修改</span>
          </div>
          <PromptEditor
            value={editingScene?.content || ''}
            onChange={handleEditorChange}
          />
        </div>
      </div>      
    </Spin>

  );
});

RecommendQuestions.displayName = 'RecommendQuestions';

export default RecommendQuestions;