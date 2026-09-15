import { message } from 'antd'
import { useEffect, useState } from 'react'

import { deleteSpace, spaceList } from '@/service/api/data-space'
import { fetchHomeData } from '@/service/api/home'
import { changeSpaceId, getSpaceId } from '@/store/slice/app'
import { clearTabs } from '@/store/slice/tab'
import { clearPersistedSpace, persistSpaceName } from '@/utils/spaceStorage'
import { useRouter } from '~/packages/simple-router/src'

import { SpaceEdit } from '../space-list/components/SpaceEdit'
import { SpaceItem } from '../space-list/components/SpaceItem'
import type { ISpaceItem } from '../space-list/types'

import { mergeHomeSpaceData, readRequiredFlatData, readSpaceRows } from './homeRequests'
import s from './index.module.scss'
import { DataAssets } from './modules/DataAssets'
import { FastCreate } from './modules/FastCreate'
import { ApprovSpace } from './modules/approv_space'
import { HomeTitle } from './modules/home_title'

export function Component() {
  const [homeData, setHomeData] = useState<any>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null)
  const dispatch = useAppDispatch()
  const spaceId = useAppSelector(getSpaceId)
  const { push } = useRouter()

  async function getHomeData() {
    try {
      const homePayload = readRequiredFlatData<Record<string, any>>(await fetchHomeData(), '获取首页数据失败')

      const spaceRes = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'spaceId',
        pageNum: 1,
        pageSize: 8,
      })

      const spaceData = readSpaceRows(spaceRes as any)
      const mergedData = mergeHomeSpaceData(homePayload, spaceData)
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
      message.error('获取首页数据失败，请稍后重试')
    }
  }

  useEffect(() => {
    getHomeData()
  }, [])

  async function deleteSpaceHandler(space: ISpaceItem) {
    const result = await deleteSpace([space.spaceId])
    if (result.error) {
      message.error('删除空间失败，请重试')
      return
    }
    clearPersistedSpace()
    dispatch(clearTabs())
    await getHomeData()
  }

  function editSpaceHandler(space: ISpaceItem) {
    setDrawerOpen(true)
    setEditSpace(space)
  }

  function createSpaceHandler() {
    setEditSpace(null)
    setDrawerOpen(true)
  }

  async function updateSpace() {
    await getHomeData()
  }

  return (
    <div className={s.container}>
      <HomeTitle title="数据资产" className={s['section-title-spacious']} />
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
