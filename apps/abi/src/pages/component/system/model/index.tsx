import PageTitle from '@/components/stateless/common/PageTitle'
import { message } from 'antd'
import { Suspense } from 'react'

import MetadataAnalysisDrawer from '@/components/metadata-analysis/MetadataAnalysisDrawer'
import type { MetadataAnalysisContext } from '@/components/metadata-analysis/types'
import { deleteModel, fetchAddModel, fetchEditModel, fetchModelList } from '@/service/api'

const ModalOperateDrawer = lazy(() => import('./modules/modal-operate-drawer'))
const ProviderList = lazy(() => import('./modules/provider-list'))
const ModelCardList = lazy(() => import('./modules/model-card-list'))

export function Component() {
  const { t } = useTranslation()

  const [searchValue, setSearchValue] = useState('')
  const [searchType, setSearchType] = useState<'modelName' | 'baseModel'>('modelName')
  const [analysisContext, setAnalysisContext] = useState<MetadataAnalysisContext | null>(null)
  const [activeProviderId, setActiveProviderId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'0' | '1' | '2'>('0')

  const handleDelete = async (id: number) => {
    const res = await deleteModel(id)
    if (res.response.data.code === 200) {
      message.success(res.response.data.msg)
      return onDeleted()
    } else {
      message.error(res.response.data.msg)
    }
  }

  const { data, run, tableProps, updateSearchParams } = useTable({
    apiFn: fetchModelList as any,
    apiParams: {
      pageNum: 1,
      pageSize: 999,
      modelName: searchValue,
    },
    columns: () => [] as any,
    rowKey: 'llmId',
  } as any)

  const { editingData, generalPopupOperation, handleAdd, handleEdit, onDeleted } = useTableOperate(data as any, run, async (res: any, operateType) => {
    const { apiKey, baseUrl, context_length, max_token, maxRetries, modelUID, secretKey, temperature, timeOut, type, ...elseProps } = res as any
    let modelConfigObject: any = {
      apiKey,
      baseUrl,
      context_length,
      modelUID,
      secretKey,
    }
    if (res.modelType === 'llm') {
      modelConfigObject = {
        apiKey,
        baseUrl,
        context_length,
        max_token,
        maxRetries,
        modelUID,
        secretKey,
        temperature,
        timeOut,
        type,
      }
    }
    const modelConfig = JSON.stringify(modelConfigObject)
    const commonData = { ...elseProps, modelConfig }

    if (operateType === 'add') {
      const addRes: any = await fetchAddModel(commonData)
      if (addRes?.response?.data?.code !== 200) return false
    } else {
      const updateRes: any = await fetchEditModel({ ...commonData, llmId: editingData?.llmId, status: '1' })
      if (updateRes?.response?.data?.code !== 200) return false
    }
  })

  function edit(row: any) {
    try {
      const config = JSON.parse(row.modelConfig)
      const formatRow = { ...row, ...config }
      handleEdit(formatRow)
    } catch (error) {
      console.log(error)
    }
  }

  const handleSearch = () => {
    const keyword = searchValue.trim()
    updateSearchParams({
      pageNum: 1,
      modelName: keyword ? keyword : undefined,
    } as any)
  }

  const handleSelectProvider = (id: string | null) => {
    setActiveProviderId(id)
  }

  const handleTabChange = (tab: '0' | '1' | '2') => {
    setActiveTab(tab)
    setActiveProviderId(null)
  }

  // 根据左侧选中的供应商或 Tab 过滤模型列表
  const allModels: any[] = (tableProps as any).dataSource || []
  const displayModels = useMemo(() => {
    if (activeProviderId) {
      return allModels.filter((m: any) => m.providerName === activeProviderId)
    }
    return allModels
  }, [allModels, activeProviderId])

  return (
    <div className="flex flex-col p-6" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <PageTitle />
      <div style={{ display: 'flex', flex: 1, gap: 16, minHeight: 0, overflow: 'hidden', marginTop: 8 }}>
        {/* 左侧供应商列表 */}
        <div
          style={{
            width: 280,
            flexShrink: 0,
            background: '#fff',
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
              searchValue={searchValue}
              searchType={searchType}
              onSearchValueChange={setSearchValue}
              onSearchTypeChange={setSearchType}
              onSearch={handleSearch}
              onAdd={() => handleAdd()}
              onEdit={edit}
              onDelete={handleDelete}
              onAnalysis={setAnalysisContext}
            />
          </Suspense>
        </div>
      </div>

      <Suspense>
        <ModalOperateDrawer {...generalPopupOperation} />
      </Suspense>
      <MetadataAnalysisDrawer
        context={analysisContext}
        open={Boolean(analysisContext)}
        onClose={() => setAnalysisContext(null)}
      />
    </div>
  )
}
