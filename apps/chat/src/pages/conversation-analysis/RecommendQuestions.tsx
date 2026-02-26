import React, { forwardRef, useImperativeHandle, useState, useEffect, useRef, useMemo } from 'react';
import { Form, message, Spin, Tabs, Checkbox, Switch } from 'antd';
import PromptEditor from '../../components/PromptEditor';
import { fetchRecommendQuestions,fetchChatPromptsConfig } from '../../service/api/conv';
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

// 默认的开关状态配置
const defaultSwitchStatesConfig: Record<string, boolean> = {
  // 基本配置
  'intent_detection': true,
  'sql_generation': true,
  'exception_guidance': true,

  // 智能问数
  'db_intent_clarify': true,
  'db_data_summary': true,
  'dim_indicator_query_rewrite': true,

  // 归因分析
  'analysis_intent_clarify': true,
  'analysis_data_summary': true,
  'analysis_query_rewrite': true,

  // 预测分析
  'predict_intent_clarify': true,
  'predict_data_summary': true,
  'predict_query_rewrite': true,

  // Excel分析
  'excel_analysis': true,
  'excel_output': true,

  // 大屏生成
  'dashboard_intent_clarify': false,
  'dashboard_analysis': false,
};

// 场景分类配置（根据实际后端数据）
const SCENE_CATEGORIES = [
   { 
    key: 'basic', 
    label: '基本配置', 
    // 基本配置使用特定的sub_chat_scene来识别，不限制chat_scene
    matchBySubScene: true,
    scenes: ['intent_detection', 'sql_generation', 'exception_guidance'] 
  },
  { 
    key: 'smart_query', 
    label: '智能问数', 
    chatScene: 'chat_with_db_execute',
    scenes: ['db_intent_clarify', 'dim_indicator_query_rewrite', 'db_data_summary']
  },
  { 
    key: 'attribution', 
    label: '归因分析', 
    chatScene: 'chat_with_analysis',
    scenes: ['analysis_intent_clarify', 'analysis_data_summary', 'analysis_query_rewrite']
  },
  { 
    key: 'prediction', 
    label: '预测分析', 
    chatScene: 'chat_with_predict',
    scenes: ['predict_intent_clarify', 'predict_data_summary', 'predict_query_rewrite']
  },
  { 
    key: 'excel', 
    label: 'Excel分析', 
    chatScene: 'chat_wiht_excel',
    scenes: ['excel_analysis', 'excel_output']
  },
  { 
    key: 'dashboard', 
    label: '大屏生成', 
    chatScene: 'chat_with_dashboard',
    scenes: ['dashboard_intent_clarify', 'dashboard_analysis']
  }
];

// 修改组件
const RecommendQuestions = forwardRef<RecommendQuestionsHandle, { isEdit?:Boolean,chatId?:Number }>(({ isEdit,chatId }, ref) => {
  const [loading, setLoading] = useState(false);
  const [promptList, setPromptList] = useState<PromptItem[]>([]);
  const [switchStates, setSwitchStates] = useState<Record<string, boolean>>({});
  const [chatConfig, setChatConfig] = useState<any[]>([]);
  const [activeInfo, setActiveInfo] = useState({
    category: 'basic',
    tabKey: undefined as string | undefined, // 保存 sub_chat_scene 作为唯一键
  });
  const hasFetched = useRef(false);

  const selectedCategory = activeInfo.category;

  const editingScene = useMemo(() => {
    if (!activeInfo.tabKey) return null;
    return promptList.find(p => p.sub_chat_scene === activeInfo.tabKey) || null;
  }, [activeInfo.tabKey, promptList]);

  const promptStructure = useMemo(() => {
    return JSON.stringify(promptList.map(p => ({ id: p.prompt_id, sub: p.sub_chat_scene })));
  }, [promptList]);

  useImperativeHandle(ref, () => ({
    resetState: () => {
      // 重置所有状态
      setLoading(false);
      setPromptList([]);
      setSwitchStates({});
    },
    getSwitchStates: () => switchStates,
    setInitialValues: (values: Record<string, boolean>) => {
      // 设置初始值
      setSwitchStates(values);
    },
    getData: () => {
      let upData = promptList
      upData = upData.map((item)=>({
        ...item,
        content: item.prompt_code === editingScene?.prompt_code ? editingScene?.content : item.content,
      }))
      return upData
    },
  }));

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await fetchRecommendQuestions({});
      let data = [];
      data = response.data || [];

      if (data.length > 0) {
        setPromptList(data);
        const initialStates: Record<string, boolean> = {};
        data.forEach((item: PromptItem) => {
          const config = defaultSwitchStatesConfig[item.sub_chat_scene];
          if (config !== undefined) {
            initialStates[item.sub_chat_scene] = config;
          }
        });
        setSwitchStates(initialStates);
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

      let prompts: any[] = [];
      if (response && response.data) {
        const parsed = JSON.parse(response?.data?.chat_config || '{}');
        prompts = Array.isArray(parsed?.prompts) ? parsed.prompts : [];
      }

      if (prompts.length === 0) {
        const defaultEnabled: any = {};
        Object.keys(defaultSwitchStatesConfig).forEach((k) => {
          if (defaultSwitchStatesConfig[k] === true) defaultEnabled[k] = true;
        });
        setSwitchStates(defaultEnabled);

        const recommendRes = await fetchRecommendQuestions({});
        const list = recommendRes.data || [];
        setPromptList(list);
        setChatConfig(list);
        return;
      }

      const statusObj: any = {};
      prompts.forEach((item: any) => {
        if (item?.status === '1') {
          statusObj[item.sub_chat_scene] = true;
        }
      });
      setSwitchStates(statusObj);

      setPromptList(prompts);
      setChatConfig(prompts);
    } catch (error) {
      console.error('获取数据失败:');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    hasFetched.current = false;
  }, [chatId]);

  useEffect(() => {
    if (isEdit && !hasFetched.current) {
      fetchUpData();
      hasFetched.current = true;  // 设置为已请求
    } else if (!isEdit) {
      fetchData();
    }
  }, [isEdit, chatId]);

  const handleSwitchChange = (sceneKey: string, checked: boolean) => {
    setSwitchStates(prev => ({
      ...prev,
      [sceneKey]: checked
    }));
    switchMap.set(sceneKey, checked);
  };


  // 辅助函数：根据分类过滤场景
  const filterScenesByCategory = (category: any, list: PromptItem[]) => {
    const filtered = list.filter(item => {
      // 如果是基本配置，只匹配sub_chat_scene
      if (category.matchBySubScene) {
        return category.scenes.includes(item.sub_chat_scene);
      }
      // 其他分类需要同时匹配chat_scene和sub_chat_scene
      const chatSceneMatch = Array.isArray(category.chatScene)
        ? category.chatScene.includes(item.chat_scene)
        : item.chat_scene === category.chatScene;
      return chatSceneMatch && category.scenes.includes(item.sub_chat_scene);
    });

    // 根据类别的 scenes 顺序进行排序，确保标签页顺序稳定
    const order: string[] = category.scenes || [];
    return filtered.sort((a, b) => {
      const ai = order.indexOf(a.sub_chat_scene);
      const bi = order.indexOf(b.sub_chat_scene);
      const aIdx = ai === -1 ? Number.MAX_SAFE_INTEGER : ai;
      const bIdx = bi === -1 ? Number.MAX_SAFE_INTEGER : bi;
      return aIdx - bIdx;
    });
  };

  // 获取当前分类的场景列表
  const getCurrentCategoryScenes = () => {
    const category = SCENE_CATEGORIES.find(cat => cat.key === selectedCategory);
    if (!category) return [];
    return filterScenesByCategory(category, promptList);
  };


  const handleEditorChange = (value: string) => {
    // 如果内容没有实际变化，则不执行任何操作，避免不必要的渲染循环
    if (!editingScene || value === editingScene.content) {
      return;
    }

    // 创建一个新的编辑场景对象
    const newEditingScene = { ...editingScene, content: value };

    // 更新提示词列表，确保使用新创建的场景对象，以保证数据一致性
    const newPromptList = promptList.map(p => {
      if (p.prompt_id === editingScene.prompt_id) {
        return newEditingScene;
      }
      return p;
    });
    setPromptList(newPromptList);
  };

  // 根据选择的分类和提示词列表，管理当前正在编辑的场景
  useEffect(() => {
    // 当 prompt 列表加载或分类改变后，确保 activeTabKey 有效
    const category = SCENE_CATEGORIES.find(cat => cat.key === activeInfo.category);
    if (!category) return;

    const categoryScenes = filterScenesByCategory(category, promptList);
    const currentTabExists = categoryScenes.some(s => s.sub_chat_scene === activeInfo.tabKey);

    // 如果当前分类下有场景，但没有选中的 tab，或选中的 tab 不属于当前分类，则默认选第一个
    if (categoryScenes.length > 0 && !currentTabExists) {
      setActiveInfo(prev => ({ ...prev, tabKey: categoryScenes[0].sub_chat_scene }));
    } else if (categoryScenes.length === 0) {
      // 如果当前分类下没有场景，则清空 tab
      setActiveInfo(prev => ({ ...prev, tabKey: undefined }));
    }
  }, [activeInfo.category, promptList.length]); 


  const currentScenes = getCurrentCategoryScenes();
  // console.log('selectedCategory:', selectedCategory);
  // console.log('currentScenes:', currentScenes);
  
  // 打印所有场景的sub_chat_scene，方便调试
  if (promptList.length > 0) {
    // console.log('所有场景的sub_chat_scene:', promptList.map(p => ({
    //   sub_chat_scene: p.sub_chat_scene,
    //   chat_scene: p.chat_scene,
    //   name: p.prompt_sub_scene_zh
    // })));
  }
  
  const tabItems = currentScenes.map(item => ({
    key: item.sub_chat_scene,
    label: item.prompt_sub_scene_zh
  }));

  // 检查分类是否全部选中（只检查可编辑的场景）
  const isCategoryChecked = (categoryKey: string) => {
    const category = SCENE_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) return false;
    const categoryScenes = filterScenesByCategory(category, promptList);
    
    // 过滤出可编辑的场景
    const editableScenes = categoryScenes.filter(scene => {
      const isDisabled = scene.prompt_code === 'intent_detection' || 
                       scene.prompt_code === 'sql_generation' || 
                       scene.prompt_code === 'exception_guidance' ||
                       scene.sub_chat_scene === 'dim_indicator_query_rewrite' ||
                       scene.sub_chat_scene === 'analysis_query_rewrite' ||
                       scene.sub_chat_scene === 'predict_query_rewrite';
      return !isDisabled;
    });
    
    // 如果没有可编辑的场景，返回false
    if (editableScenes.length === 0) return false;
    
    // 检查所有可编辑的场景是否都选中
    return editableScenes.every(item => switchStates[item.sub_chat_scene]);
  };

  // 切换分类的所有场景
  const handleCategorySwitchChange = (categoryKey: string, checked: boolean) => {
    const category = SCENE_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) return;

    const categoryScenes = filterScenesByCategory(category, promptList);
    const editableScenes = categoryScenes.filter(scene => {
      const isDisabled = scene.prompt_code === 'intent_detection' || 
                       scene.prompt_code === 'sql_generation' || 
                       scene.prompt_code === 'exception_guidance' ||
                       scene.sub_chat_scene === 'dim_indicator_query_rewrite' ||
                       scene.sub_chat_scene === 'analysis_query_rewrite' ||
                       scene.sub_chat_scene === 'predict_query_rewrite';
      return !isDisabled;
    });

    const newSwitchStates = { ...switchStates };
    editableScenes.forEach(scene => {
      newSwitchStates[scene.sub_chat_scene] = checked;
    });
    setSwitchStates(newSwitchStates);
  };

  // 点击左侧文字切换分类与右侧内容（不做开关逻辑）
  const handleCategoryTextClick = (categoryKey: string) => {
    // 同步更新分类与标签页：在点击时立即计算并设置新分类的第一个标签，避免依赖渲染后的 useEffect 修正
    const category = SCENE_CATEGORIES.find(cat => cat.key === categoryKey);
    if (!category) {
      setActiveInfo(prev => ({ ...prev, category: categoryKey, tabKey: undefined }));
      return;
    }
    const categoryScenes = filterScenesByCategory(category, promptList);
    setActiveInfo({
      category: categoryKey,
      tabKey: categoryScenes.length > 0 ? categoryScenes[0].sub_chat_scene : undefined,
    });
  };

  return (
    <Spin spinning={loading} tip="加载中...">
      <div className="flex h-full">
        {/* 左侧分类列表 */}
        <div className="w-[180px] border-r pr-2 overflow-y-auto">
          <Form layout="vertical" className="flex-1">
            {SCENE_CATEGORIES.map(category => {
              const categoryScenes = filterScenesByCategory(category, promptList);
              const hasScenes = categoryScenes.length > 0;
              const isChecked = isCategoryChecked(category.key);
              console.log(isChecked);
              
              return (
                <Form.Item key={category.key}>
                  <div className={`flex items-center p-2 rounded-md gap-x-2 ${selectedCategory === category.key ? 'bg-blue-100' : ''}`}>
                    <span
                      className={`flex-grow ${hasScenes ? 'cursor-pointer' : 'cursor-not-allowed text-gray-400'} ${selectedCategory === category.key ? 'text-[#2E6CF6]' : ''}`}
                      onClick={() => hasScenes && handleCategoryTextClick(category.key)}
                      title={hasScenes ? '切换分类' : '暂无可用场景'}
                    >
                      {category.label}
                    </span>
                    <Switch
                      checked={isChecked}
                      disabled={category.key === 'basic' || category.key === 'smart_query' || category.key === 'attribution' || category.key === 'prediction' ||category.key === 'excel'}
                      onChange={(checked) => handleCategorySwitchChange(category.key, checked)}
                    />
                  </div>
                </Form.Item>
              );
            })}
          </Form>
        </div>

        {/* 右侧标签页和提示词编辑区域 */}
        <div className="flex-1 pl-6">
          {currentScenes.length > 0 && editingScene && (
            <Tabs
              destroyInactiveTabPane
              activeKey={activeInfo.tabKey}
              items={currentScenes.map(scene => ({
                key: scene.sub_chat_scene,
                label: scene.prompt_sub_scene_zh,
                children: (
                  <div className="mt-4">
                    <div className="mb-4">
                      <div className="text-red-500 mb-2">
                        提示词模板 {'{...'} 为只读区域，请勿修改
                      </div>
                    </div>
                    <PromptEditor
                      value={scene.content}
                      onChange={handleEditorChange}
                    />
                  </div>
                )
              }))}
              onChange={(key) => {
                setActiveInfo(prev => ({ ...prev, tabKey: key }));
              }}
              // tabBarExtraContent={
              //   editingScene && (
              //     <Checkbox
              //       checked={switchStates[editingScene.sub_chat_scene] || false}
              //       disabled={defaultSwitchStatesConfig[editingScene.sub_chat_scene]?.disabled || false}
              //       onChange={(e) => handleSwitchChange(editingScene.sub_chat_scene, e.target.checked)}
              //     >
              //       启用
              //     </Checkbox>
              //   )
              // }
            />
          )}
        </div>
      </div>      
    </Spin>

  );
});

RecommendQuestions.displayName = 'RecommendQuestions';

export default RecommendQuestions;