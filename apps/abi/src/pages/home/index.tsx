import { useEffect, useState } from 'react'
import { PlusOutlined, RightOutlined } from '@ant-design/icons'

import { deleteSpace, spaceList } from '@/service/api/data-space'
import { fetchHomeData } from '@/service/api/home'
import { useRouter } from '~/packages/simple-router/src'

import { SpaceEdit } from '../space-list/components/SpaceEdit'
import { SpaceItem } from '../space-list/components/SpaceItem'
import type { ISpaceItem } from '../space-list/types'

import { DataAssets } from './modules/DataAssets'
import { FastCreate } from './modules/FastCreate'
import { clearTabs } from '@/store/slice/tab'
import s from './index.module.scss'
import { HomeTitle } from './modules/home_title'
import { ApprovSpace } from './modules/approv_space'
import { changeSpaceId, getSpaceId } from '@/store/slice/app'
import { clearPersistedSpace, persistSpaceName } from '@/utils/spaceStorage'
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
  const [homeData, setHomeData] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null)
  const dispatch = useAppDispatch()
  const spaceId = useAppSelector(getSpaceId)
  const { push } = useRouter()

  async function getHomeData() {
    try {
      // 获取首页基础数据
      const { data: homeData } = await fetchHomeData()

      const spaceRes = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 8,
      })

      // 合并数据，用空间列表API的数据替换原有的spaceList
      let spaceData = (spaceRes as any).response?.data?.rows || []

      if (spaceData && spaceData.length > 0) {
        spaceData = spaceData.map((item: any) => ({
          ...item,
          type: 'space',
        }))
        // spaceData.unshift({
        //   spaceId: 0,
        //   spaceName: '创建应用',
        //   type: 'add',
        // })
      }
      const mergedData = {
        ...homeData,
        spaceList: spaceData.length > 0 ? spaceData : homeData.spaceList || [],
      }
      // 默认选中第一个空间
      const lgSpaceId = localStorage.getItem('spaceId')
      if (lgSpaceId && !spaceId) {
        dispatch(changeSpaceId(Number(lgSpaceId)))
      } else if (mergedData?.spaceList && mergedData.spaceList.length > 0 && mergedData.spaceList[0].spaceId && !spaceId) {
        dispatch(changeSpaceId(mergedData.spaceList[0].spaceId))
        persistSpaceName(mergedData.spaceList[0].spaceName)
      }
      setHomeData(mergedData)
    } catch (error) {
      console.error('获取首页数据失败:', error)
      // 如果出错，仍然尝试获取基础首页数据
      const { data } = await fetchHomeData()
      setHomeData(data)
    }
  }

  useEffect(() => {
    getHomeData()
  }, [])

  async function deleteSpaceHandler(space: ISpaceItem) {
    const { data } = await deleteSpace([space.spaceId])
    console.log('deleteSpaceHandler', data)
    clearPersistedSpace()
    dispatch(clearTabs())
    getHomeData()
  }

  function editSpaceHandler(space: ISpaceItem) {
    setDrawerOpen(true)
    setEditSpace(space)
  }

  function updateSpace() {
    getHomeData()
  }

  return (
    <div className={s.container}>
      <HomeTitle title="数据资产" />
      <DataAssets homeData={homeData} />
      <div className="mt-[1.375rem]"></div>
      <HomeTitle
        title="我的空间"
        action={
          <AFlex>
            <div>查看更多</div>
            <RightOutlined />
          </AFlex>
        }
        onAction={() => push('/space-list')}
      />
      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {homeData &&
          homeData?.spaceList?.map((item: ISpaceItem) =>
            item.type === 'add' ? <ApprovSpace /> : <SpaceItem deleteSpace={deleteSpaceHandler} key={item.spaceId} setEditSpace={editSpaceHandler} space={item} />,
          )}
      </section>

      {drawerOpen && <SpaceEdit drawerOpen={drawerOpen} editSpace={editSpace} setDrawerOpen={setDrawerOpen} updateSpace={updateSpace} />}
      <div className="mt-[1.375rem]"></div>
      <HomeTitle
        title="创建引导"
        // action={
        //   <a href="/guide">
        //     <AFlex>
        //       <PlusOutlined />
        //       <div>快速创建</div>
        //     </AFlex>
        //   </a>
        // }
      />
      <FastCreate spaceList={homeData?.spaceList} />
    </div>
  )
}
