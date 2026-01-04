import { useEffect, useState } from 'react';
import { RightOutlined } from '@ant-design/icons';

import { deleteSpace, spaceList } from '@/service/api/data-space';
import { fetchHomeData } from '@/service/api/home';
import { useRouter } from '~/packages/simple-router/src';

import { SpaceEdit } from '../space-list/components/SpaceEdit';
import { SpaceItem } from '../space-list/components/SpaceItem';
import type { ISpaceItem } from '../space-list/types';

import { DataAssets } from './modules/DataAssets';
import { FastCreate } from './modules/FastCreate';
import { clearTabs } from '@/store/slice/tab';
import s from './index.module.scss';
import cx from 'classnames';
/**
 * 首页组件
 * 系统的主要仪表板页面，提供数据概览和快速访问入口
 * 包含以下主要功能模块：
 * 1. 数据资产概览 - 显示空间、数据源、数据集、AI助手等统计数据
 * 2. 我的空间列表 - 展示用户创建的数据空间，支持编辑和删除
 * 3. 快速创建入口 - 提供常用功能的快速创建入口
 * 支持空间管理操作，作为用户进入系统后的第一个页面
 */
export function Component() {
  const [homeData, setHomeData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null);
  const dispatch = useAppDispatch();

  const { push } = useRouter();

  async function getHomeData() {
    try {
      // 获取首页基础数据
      const { data: homeData } = await fetchHomeData();
      
      const spaceRes = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 5
      });
      
      // 合并数据，用空间列表API的数据替换原有的spaceList
      const spaceData = (spaceRes as any).response?.data?.rows || [];
      const mergedData = {
        ...homeData,
        spaceList: spaceData.length > 0 ? spaceData : (homeData.spaceList || [])
      };
      
      setHomeData(mergedData);
    } catch (error) {
      console.error('获取首页数据失败:', error);
      // 如果出错，仍然尝试获取基础首页数据
      const { data } = await fetchHomeData();
      setHomeData(data);
    }
  }

  useEffect(() => {
    getHomeData();
  }, []);

  async function deleteSpaceHandler(space: ISpaceItem) {
    const { data } = await deleteSpace([space.spaceId]);
    console.log('deleteSpaceHandler', data);
    localStorage.removeItem('spaceId');
    dispatch(clearTabs());
    getHomeData();
  }

  function editSpaceHandler(space: ISpaceItem) {
    setDrawerOpen(true);
    setEditSpace(space);
  }

  function updateSpace() {
    getHomeData();
  }
  return (
    <div className='h-full bg-[#fff]'>
    <ACard className={cx(s.container)}>
      {homeData && <DataAssets homeData={homeData} />}

      <AFlex
        className="md:my-[4px] lg:my-[6px] xl:my-[8px] 2xl:my-[12px]"
        justify="space-between"
      >
        <h1 className="text-base font-bold">我的空间</h1>
        <div className="flex items-center gap-1 text-primary">
          <p
            className="cursor-pointer text-sm"
            onClick={() => push('/space-list')}
          >
            查看更多
          </p>
          <RightOutlined />
        </div>
      </AFlex>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-5">
        {homeData &&
          homeData?.spaceList?.map((item: ISpaceItem) => (
            <SpaceItem
              deleteSpace={deleteSpaceHandler}
              key={item.spaceId}
              setEditSpace={editSpaceHandler}
              space={item}
            />
          ))}
      </section>

      {drawerOpen && (
        <SpaceEdit
          drawerOpen={drawerOpen}
          editSpace={editSpace}
          setDrawerOpen={setDrawerOpen}
          updateSpace={updateSpace}
        />
      )}

      <FastCreate spaceList={homeData?.spaceList} />
    </ACard>
    </div>
  );
}
