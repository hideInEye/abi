// import PageTitle from '@/components/stateless/common/PageTitle'
import { message } from 'antd'
import { Suspense } from 'react'

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer'
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types'
import { deleteModel, fetchAddModel, fetchEditModel, fetchModelList, fetchProviderList, copyModel, setDefaultModel } from '@/service/api'
import { getSpaceId } from '@/store/slice/app'
import { useAppSelector } from '@/hooks/business/useStore'

const ModalOperateDrawer = lazy(() => import('./modules/modal-operate-drawer'))
const ProviderList = lazy(() => import('./modules/provider-list'))
const ModelCardList = lazy(() => import('./modules/model-card-list'))

export function Component() {
  const { t } = useTranslation()
  const spaceId = useAppSelector(getSpaceId)

  const [searchValue, setSearchValue] = useState('')
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null)
  const [activeProviderId, setActiveProviderId] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<'0' | '1' | '2'>('0')
  const [providers, setProviders] = useState<any[]>([])
  const [providersLoading, setProvidersLoading] = useState(false)

  useEffect(() => {
    const loadProviders = async () => {
      setProvidersLoading(true)
      try {
        const data = await fetchProviderList()
        setProviders(Array.isArray(data) ? data : [])
      } finally {
        setProvidersLoading(false)
      }
    }
    loadProviders()
  }, [])

  const handleDelete = async (id: number) => {
    const res = await deleteModel(id)
    if (res.response.data.code === 200) {
      message.success(res.response.data.msg)
      return onDeleted()
    } else {
      message.error(res.response.data.msg)
    }
  }

  const handleCopy = async (id: number) => {
    const res: any = await copyModel(id)
    if (res?.response?.data?.code === 200) {
      message.success('复制成功')
      run()
    } else {
      message.error(res?.response?.data?.msg || '复制失败')
    }
  }

  const handleSetDefault = async (id: number) => {
    const res: any = await setDefaultModel(id)
    if (res?.response?.data?.code === 200) {
      message.success('设置默认模型成功')
      run()
    } else {
      message.error(res?.response?.data?.msg || '设置失败')
    }
  }

  const { data, run, tableProps, updateSearchParams } = useTable({
    apiFn: fetchModelList as any,
    apiParams: useMemo(() => ({
      pageNum: 1,
      pageSize: 999,
      modelName: searchValue,
      spaceId,
    }), [spaceId]),
    columns: () => [] as any,
    rowKey: 'modelId',
  } as any)

  const { editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(data as any, run, async (res: any, operateType) => {
    const { apiKey, apiBase, contextLength, modelUID, secretKey, temperature, timeOut, maxRetries, ...elseProps } = res as any
    // 构建 config 对象
    const configObj: any = {
      apiKey: apiKey || '',
      baseUrl: apiBase || '',
      secretKey: secretKey || '',
    }
    if (res.modelType === '1') {
      configObj.temperature = temperature ?? 0.7
      configObj.max_token = res.max_token || 4096
      configObj.timeOut = timeOut || 60
      configObj.maxRetries = maxRetries || 3
      configObj.contextLength = contextLength || 4096
    }
    const commonData = {
      ...elseProps,
      apiBase: apiBase || '',
      apiKey: apiKey || '',
      config: JSON.stringify(configObj),
    }

    if (operateType === 'add') {
      const addRes: any = await fetchAddModel(commonData)
      if (addRes?.response?.data?.code !== 200) return false
    } else {
      const updateRes: any = await fetchEditModel({ ...commonData, modelId: editingData?.modelId })
      if (updateRes?.response?.data?.code !== 200) return false
    }
  })

  function edit(row: any) {
    try {
      // 新接口 config 字段存储配置
      const config = row.config ? JSON.parse(row.config) : {}
      const formatRow = {
        ...row,
        apiKey: config.apiKey || row.apiKey || '',
        apiBase: config.baseUrl || row.apiBase || '',
        secretKey: config.secretKey || row.secretKey || '',
        temperature: config.temperature,
        max_token: config.max_token,
        timeOut: config.timeOut,
        maxRetries: config.maxRetries,
        contextLength: config.contextLength || row.contextLength,
      }
      handleEdit(formatRow)
    } catch (error) {
      console.log(error)
      handleEdit(row)
    }
  }

  const handleSearch = () => {
    const keyword = searchValue.trim()
    updateSearchParams({
      pageNum: 1,
      modelName: keyword ? keyword : undefined,
    } as any)
  }

  const handleSelectProvider = (id: number | null) => {
    setActiveProviderId(id)
  }

  const handleTabChange = (tab: '0' | '1' | '2') => {
    setActiveTab(tab)
    setActiveProviderId(null)
  }

  // 根据左侧选中的供应商过滤模型列表
  const allModels: any[] = (tableProps as any).dataSource || []
  const displayModels = useMemo(() => {
    if (activeProviderId) {
      // 新接口模型有 providerId 字段，直接匹配
      return allModels.filter((m: any) => m.providerId === activeProviderId)
    }
    return allModels
  }, [allModels, activeProviderId])

  return (
    <div className="flex flex-col p-6" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0, overflow: 'hidden' }}>
        {/* 左侧供应商列表 */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: '#FDFEFF',
            borderRadius: 8,
            border: '1px solid #f0f0f0',
            padding: '12px 8px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Suspense>
            <ProviderList
              providers={providers}
              loading={providersLoading}
              activeProviderId={activeProviderId}
              activeTab={activeTab}
              onSelect={handleSelectProvider}
              onTabChange={handleTabChange}
            />
          </Suspense>
        </div>

        {/* 右侧卡片网格 */}
        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
          <Suspense>
            <ModelCardList
              models={displayModels}
              providers={providers}
              searchValue={searchValue}
              onSearchValueChange={setSearchValue}
              onAdd={() => handleAdd()}
              onEdit={edit}
              onCopy={handleCopy}
              onSetDefault={handleSetDefault}
              onDelete={handleDelete}
              onAnalysis={setAnalysisContext}
            />
          </Suspense>
        </div>
      </div>

      <Suspense>
        <ModalOperateDrawer {...generalPopupOperation} providers={providers} />
      </Suspense>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  )
}
