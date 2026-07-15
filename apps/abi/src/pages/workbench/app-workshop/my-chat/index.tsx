import { useRoute } from '@sa/simple-router';
import type { TabsProps } from 'antd';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Component as MyCollect } from '../my-collect';
import { Component as MyShare } from '../my-share';
import { Component as RecentlyUsed } from '../recently-used';

type MyChatTabKey = 'recently-used' | 'my-collect' | 'my-share';

const DEFAULT_ACTIVE_TAB: MyChatTabKey = 'recently-used';
const MY_CHAT_TAB_KEYS: MyChatTabKey[] = ['recently-used', 'my-collect', 'my-share'];

function normalizeTabKey(tabKey: unknown): MyChatTabKey {
  const key = Array.isArray(tabKey) ? tabKey[0] : tabKey;
  return MY_CHAT_TAB_KEYS.includes(key as MyChatTabKey) ? (key as MyChatTabKey) : DEFAULT_ACTIVE_TAB;
}

export const Component: React.FC & { loader?: () => Promise<any> } = () => {
  const route = useRoute();
  const queryTab = route.query?.tab;
  const [activeTab, setActiveTab] = useState<MyChatTabKey>(() => normalizeTabKey(queryTab));

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as MyChatTabKey);
  }, []);

  useEffect(() => {
    setActiveTab(normalizeTabKey(queryTab));
  }, [queryTab]);

  const tabItems = useMemo<TabsProps['items']>(
    () => [
      {
        children: (
          <div className="h-full min-h-0">
            <RecentlyUsed />
          </div>
        ),
        key: 'recently-used',
        label: '最近使用'
      },
      {
        children: (
          <div className="h-full min-h-0">
            <MyCollect />
          </div>
        ),
        key: 'my-collect',
        label: '我的收藏'
      },
      {
        children: (
          <div className="h-full min-h-0">
            <MyShare />
          </div>
        ),
        key: 'my-share',
        label: '我的分享'
      }
    ],
    []
  );

  return (
    <div className="h-full min-h-500px flex-col-stretch overflow-hidden lt-sm:overflow-auto">
      <ACard
        className="flex-col-stretch sm:flex-1-hidden border-0 card-wrapper"
        styles={{ body: { display: 'flex', flex: 1, flexDirection: 'column', minHeight: 0, overflow: 'hidden', padding: 0 } }}
      >
        <ATabs
          activeKey={activeTab}
          className="abi-attr-modeling-tabs h-full min-h-0"
          items={tabItems}
          style={{ flex: 1, minHeight: 0 }}
          onChange={handleTabChange}
        />
      </ACard>
    </div>
  );
};

export default Component;
