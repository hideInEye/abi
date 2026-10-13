import { Alert, Button, Skeleton, message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'

import { deleteSpace } from '@/service/api/data-space'
import { changeSpaceId, getSpaceId } from '@/store/slice/app'
import { clearTabs } from '@/store/slice/tab'
import { clearPersistedSpace, persistSpaceName } from '@/utils/spaceStorage'
import { useRouter } from '~/packages/simple-router/src'

import { LazyFeatureFallback, RetryableLazy } from '@/components/common/RetryableLazy'
import { SpaceItem } from '../space-list/components/SpaceItem'
import type { ISpaceItem } from '../space-list/types'

import {
  abortHomeResources,
  getCachedHomeOverview,
  getCachedHomeSpaces,
  invalidateHomeResources,
  loadHomeOverview,
  loadHomeSpaces,
} from './homeResources'
import s from './index.module.scss'
import { DataAssets } from './modules/DataAssets'
import { FastCreate } from './modules/FastCreate'
import { ApprovSpace } from './modules/approv_space'
import { HomeTitle } from './modules/home_title'

const loadSpaceEdit = () => import('../space-list/components/SpaceEdit').then(module => ({ default: module.SpaceEdit }))

export function Component() {
  const [homeData, setHomeData] = useState<any>(() => getCachedHomeOverview() ?? null)
  const [spaces, setSpaces] = useState<ISpaceItem[]>(() => getCachedHomeSpaces() ?? [])
  const [homeLoading, setHomeLoading] = useState(() => !getCachedHomeOverview())
  const [spacesLoading, setSpacesLoading] = useState(() => !getCachedHomeSpaces())
  const [homeError, setHomeError] = useState('')
  const [spacesError, setSpacesError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null)
  const dispatch = useAppDispatch()
  const spaceId = useAppSelector(getSpaceId)
  const { push } = useRouter()
  const homeLoadRunRef = useRef(0)
  const spacesLoadRunRef = useRef(0)
  const spaceIdRef = useRef(spaceId)
  spaceIdRef.current = spaceId

  const loadOverview = useCallback((force = false) => {
    const run = ++homeLoadRunRef.current
    if (!getCachedHomeOverview()) setHomeLoading(true)
    setHomeError('')

    void loadHomeOverview(force)
      .then(payload => {
        if (homeLoadRunRef.current === run) setHomeData(payload)
      })
      .catch(error => {
        if (error?.name !== 'AbortError' && homeLoadRunRef.current === run) {
          console.error('获取首页数据失败:', error)
          setHomeError('数据资产加载失败')
        }
      })
      .finally(() => {
        if (homeLoadRunRef.current === run) setHomeLoading(false)
      })
  }, [])

  const loadSpaces = useCallback((force = false) => {
    const run = ++spacesLoadRunRef.current
    if (!getCachedHomeSpaces()) setSpacesLoading(true)
    setSpacesError('')
    void loadHomeSpaces(force)
      .then(nextSpaces => {
        if (spacesLoadRunRef.current !== run) return
        setSpaces(nextSpaces)
        const persistedSpaceId = Number(localStorage.getItem('spaceId'))
        if (persistedSpaceId > 0 && !spaceIdRef.current) {
          dispatch(changeSpaceId(persistedSpaceId))
        } else if (!spaceIdRef.current && nextSpaces[0]?.spaceId) {
          dispatch(changeSpaceId(nextSpaces[0].spaceId))
          persistSpaceName(nextSpaces[0].spaceName)
        }
      })
      .catch(error => {
        if (error?.name !== 'AbortError' && spacesLoadRunRef.current === run) {
          console.error('获取空间列表失败:', error)
          setSpacesError('我的空间加载失败')
        }
      })
      .finally(() => {
        if (spacesLoadRunRef.current === run) setSpacesLoading(false)
      })
  }, [dispatch])

  useEffect(() => {
    loadOverview()
    loadSpaces()
    return () => {
      homeLoadRunRef.current += 1
      spacesLoadRunRef.current += 1
      abortHomeResources()
    }
  }, [loadOverview, loadSpaces])

  async function deleteSpaceHandler(space: ISpaceItem) {
    const result = await deleteSpace([space.spaceId])
    if (result.error) {
      message.error('删除空间失败，请重试')
      return
    }
    clearPersistedSpace()
    dispatch(clearTabs())
    invalidateHomeResources()
    loadOverview(true)
    loadSpaces(true)
  }

  function editSpaceHandler(space: ISpaceItem) {
    void loadSpaceEdit()
    setDrawerOpen(true)
    setEditSpace(space)
  }

  function createSpaceHandler() {
    void loadSpaceEdit()
    setEditSpace(null)
    setDrawerOpen(true)
  }

  function updateSpace() {
    invalidateHomeResources()
    loadOverview(true)
    loadSpaces(true)
  }

  return (
    <div className={s.container}>
      <HomeTitle title="数据资产" className={s['section-title-spacious']} />
      {homeLoading && !homeData ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : homeError && !homeData ? (
        <Alert action={<Button size="small" onClick={() => loadOverview(true)}>重试</Button>} message={homeError} showIcon type="error" />
      ) : (
        <DataAssets homeData={homeData} />
      )}

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
        {spacesLoading && !spaces.length ? (
          <Skeleton active paragraph={{ rows: 3 }} />
        ) : spacesError && !spaces.length ? (
          <Alert action={<Button size="small" onClick={() => loadSpaces(true)}>重试</Button>} message={spacesError} showIcon type="error" />
        ) : spaces
          .filter((item: ISpaceItem) => item.type !== 'add')
          .slice(0, 7)
          .map((item: ISpaceItem, index: number) => (
            <SpaceItem deleteSpace={deleteSpaceHandler} index={index} key={item.spaceId} setEditSpace={editSpaceHandler} space={item} />
          ))}
      </div>

      {drawerOpen && (
        <RetryableLazy
          loader={loadSpaceEdit}
          componentProps={{ drawerOpen, editSpace, setDrawerOpen, updateSpace }}
          fallback={<LazyFeatureFallback label="正在加载空间编辑器…" style={{ position: 'fixed', inset: 0, zIndex: 1000, minHeight: '100vh' }} />}
        />
      )}

      <HomeTitle title="创建引导" className={s['section-title-spacious']} />
      <FastCreate />
    </div>
  )
}
