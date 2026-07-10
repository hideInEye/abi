import { useEffect, useState } from 'react'
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

export function Component() {
  const [homeData, setHomeData] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null)
  const dispatch = useAppDispatch()
  const spaceId = useAppSelector(getSpaceId)
  const { push } = useRouter()

  async function getHomeData() {
    try {
      const { data: homeData } = await fetchHomeData()

      const spaceRes = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 8,
      })

      let spaceData = (spaceRes as any).response?.data?.rows || []

      if (spaceData && spaceData.length > 0) {
        spaceData = spaceData.map((item: any) => ({
          ...item,
          type: 'space',
        }))
      }
      const mergedData = {
        ...homeData,
        spaceList: spaceData.length > 0 ? spaceData : homeData.spaceList || [],
      }
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

  function createSpaceHandler() {
    setEditSpace(null)
    setDrawerOpen(true)
  }

  function updateSpace() {
    getHomeData()
  }

  return (
    <div className={s.container}>
      <HomeTitle title="数据资产" />
      <DataAssets homeData={homeData} />

      <HomeTitle
        title="我的空间"
        className={s['section-title-spacious']}
        action={
          <span>更多空间</span>
        }
        onAction={() => push('/space-list')}
      />
      <div className={s['space-grid']}>
        <ApprovSpace key="create" onClick={createSpaceHandler} />
        {homeData?.spaceList
          ?.filter((item: ISpaceItem) => item.type !== 'add')
          ?.slice(0, 7)
          ?.map((item: ISpaceItem, index: number) => (
            <SpaceItem deleteSpace={deleteSpaceHandler} index={index} key={item.spaceId} setEditSpace={editSpaceHandler} space={item} />
          ))}
      </div>

      {drawerOpen && <SpaceEdit drawerOpen={drawerOpen} editSpace={editSpace} setDrawerOpen={setDrawerOpen} updateSpace={updateSpace} />}

      <HomeTitle title="创建引导" className={s['section-title-spacious']} />
      <FastCreate />
    </div>
  )
}
