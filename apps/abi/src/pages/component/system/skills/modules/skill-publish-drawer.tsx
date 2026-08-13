import { CheckCircleFilled, CloudUploadOutlined, FileZipOutlined, SettingOutlined } from '@ant-design/icons'
import { App, Button, Flex, Form, Input, Select } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useEffect, useMemo, useRef, useState } from 'react'

import { spaceList } from '@/service/api/data-space'
import { publishSkillApi } from '@/service/api/skill'
import { readPersistedSpaceName } from '@/utils/spaceStorage'

import '../skill.css'

type SpaceOption = {
  label: string
  value: number | string
  handle?: string
}

type SkillLite = {
  id?: number | string
  bizName?: string
  spaceId?: number | string
  spaceName?: string
}

type Props = {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
  /** 'install' 新装技能（默认）｜'update' 为已有技能上传新版本文件 */
  mode?: 'install' | 'update'
  /** 更新模式下传入当前技能信息 */
  skill?: SkillLite | null
  /** 已有技能列表，用于安装时校验重名 */
  existingSkills?: SkillLite[]
}

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let i = 0
  let size = bytes
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024
    i += 1
  }
  return `${size.toFixed(1)} ${units[i]}`
}

const SkillPublishDrawer: FC<Props> = ({ mode = 'install', onClose, onSuccess, open, skill, existingSkills = [] }) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const inputFileRef = useRef<HTMLInputElement>(null)

  const isUpdate = mode === 'update'

  const [spaces, setSpaces] = useState<SpaceOption[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // 当前用户信息与管理员判断（roles[].roleName 为“管理员”或“超级管理员”）
  const { currentSpaceId, initialFormValues, isAdmin } = useMemo(() => {
    let userInfo: any = {}
    try {
      userInfo = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
    } catch {
      userInfo = {}
    }
    const adminFlag =
      Array.isArray(userInfo?.roles) &&
      userInfo.roles.some((r: any) => {
        const name = typeof r === 'string' ? r : r?.roleName
        return name === '管理员' || name === '超级管理员'
      })
    // 更新模式：锁定为当前技能的 spaceId；否则取 localStorage
    const sid = isUpdate ? Number(skill?.spaceId) || 0 : Number(localStorage.getItem('spaceId')) || 0
    return {
      currentSpaceId: sid,
      initialFormValues: sid ? { spaceId: sid } : undefined,
      isAdmin: adminFlag,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUpdate, skill?.spaceId])

  async function loadSpaces() {
    // 更新模式不需要空间列表，直接跳过
    if (isUpdate) return
    try {
      const res: any = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'createTime',
        pageNum: 1,
        pageSize: 200,
      })
      const rows = res?.response?.data?.rows || res?.data?.rows || res?.data || []
      const opts: SpaceOption[] = (rows as any[]).map((r) => ({
        handle: r.spaceCode || r.spaceName || r.name,
        label: r.spaceName || r.name || r.spaceCode,
        // 统一为 number，避免跟 currentSpaceId（number）不匹配导致 Select 显示原始 id
        value: Number(r.spaceId ?? r.id),
      }))
      // 管理员/超管额外提供“全部空间”选项，spaceId=0
      if (isAdmin) {
        opts.unshift({ handle: 'ALL', label: '全部空间', value: 0 })
      }
      // 普通用户兑底：接口列表中未包含当前空间时，预插一个占位项避免显示原始 id
      if (!isAdmin && currentSpaceId) {
        const has = opts.some((o) => Number(o.value) === currentSpaceId)
        if (!has) {
          opts.unshift({
            handle: '',
            label: `空间 #${currentSpaceId}`,
            value: currentSpaceId,
          })
        }
      }
      setSpaces(opts)
      // 普通用户：加载完后再设默认值，确保 Select options 已存在能正确显示 label
      if (!isAdmin && currentSpaceId) {
        form.setFieldValue('spaceId', currentSpaceId)
      }
    } catch {
      setSpaces([])
    }
  }

  useEffect(() => {
    if (open) {
      form.resetFields()
      loadSpaces()
      // 同步预设一下，避免接口返回前 input 表现异常
      if (currentSpaceId && (isUpdate || !isAdmin)) {
        form.setFieldValue('spaceId', currentSpaceId)
      }
      setFile(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  /** 从 zip 文件名提取技能名称（去掉 .zip 后缀） */
  function extractSkillName(fileName: string) {
    return fileName.replace(/\.zip$/i, '')
  }

  function onFilePicked(f?: File | null) {
    if (!f) return
    const isZip = f.name.toLowerCase().endsWith('.zip') || f.type === 'application/zip' || f.type === 'application/x-zip-compressed'
    if (!isZip) {
      message.error(t('page.manage.skill.publishPage.onlyZip'))
      return
    }
    if (f.size > 100 * 1024 * 1024) {
      message.error(t('page.manage.skill.publishPage.tooLarge'))
      return
    }

    // 校验：更新模式下 zip 包名必须与当前技能名一致
    if (isUpdate && skill?.bizName) {
      const zipName = extractSkillName(f.name)
      if (zipName !== skill.bizName) {
        message.warning(`上传的包名「${zipName}」与当前技能「${skill.bizName}」不一致，请确认后重新上传`)
        return
      }
    }

    // 校验：安装模式下 zip 包名+空间 已存在则提示
    if (!isUpdate && existingSkills.length > 0) {
      const zipName = extractSkillName(f.name)
      const currentSpaceId = form.getFieldValue('spaceId')
      if (currentSpaceId && existingSkills.some((s) => s.bizName === zipName && String(s.spaceId) === String(currentSpaceId))) {
        message.warning(`空间下已存在技能「${zipName}」，如需更新请使用更新功能`)
        return
      }
    }

    setFile(f)
  }

  function handleBrowse() {
    inputFileRef.current?.click()
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields()
      if (!file) {
        message.error(t('page.manage.skill.publishPage.fileRequired'))
        return
      }
      setSubmitting(true)
      const fd = new FormData()
      const spaceIdToSubmit = isUpdate ? skill?.spaceId : values.spaceId

      // 提交前二次校验
      if (file) {
        const zipName = extractSkillName(file.name)
        // 更新模式：包名 + 空间必须匹配
        if (isUpdate && skill?.bizName && zipName !== skill.bizName) {
          message.warning(`上传的包名「${zipName}」与当前技能「${skill.bizName}」不一致`)
          return
        }
        if (isUpdate && skill?.spaceId && String(spaceIdToSubmit) !== String(skill.spaceId)) {
          message.warning('上传的空间与当前技能空间不一致')
          return
        }
        // 安装模式：重名校验
        if (!isUpdate && existingSkills.some((s) => s.bizName === zipName && String(s.spaceId) === String(spaceIdToSubmit))) {
          message.warning(`空间下已存在技能「${zipName}」，如需更新请使用更新功能`)
          return
        }
      }

      fd.append('file', file)
      // 更新模式直接从技能信息取 spaceId，不依赖表单字段
      fd.append('spaceId', String(spaceIdToSubmit ?? ''))
      // 技能类型：0 内置技能 / 1 外部技能，前端安装/更新统一提交外部技能
      fd.append('skillType', '1')
      // 追加 spacename 参数：优先从选项列表取 label，其次从本地存储取
      const matchedSpace = spaces.find((s) => String(s.value) === String(spaceIdToSubmit))
      const spacename = matchedSpace?.label || readPersistedSpaceName() || ''
      if (spacename) fd.append('spacename', spacename)
      if (values.version) fd.append('version', values.version)
      if (values.changelog) fd.append('changelog', values.changelog)

      const res: any = await publishSkillApi(fd)
      const code = res?.response?.data?.code
      if (code === 200 || res?.response?.data?.success || res?.data) {
        message.success(t('page.manage.skill.publishPage.success'))
        onSuccess?.()
        onClose()
      }
    } catch (err: any) {
      if (err?.errorFields) return
      message.error(err?.message || t('page.manage.skill.publishPage.failed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <CommonDrawer
      open={open}
      rootClassName="skill-hub-scope"
      className="ds-operate-drawer"
      description={isUpdate ? `更新${skill?.bizName}技能版本` : '上传 ZIP 包安装新技能'}
      icon={<SettingOutlined />}
      title={isUpdate ? '更新技能' : t('page.manage.skill.publish')}
      width={800}
      destroyOnClose
      footer={
        <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '12px 28px' }}>
          <Button
            onClick={onClose}
            style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px', borderRadius: 8 }}
          >
            {t('common.cancel')}
          </Button>
          <Button
            loading={submitting}
            onClick={handleSubmit}
            style={{
              background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
              border: 'none',
              borderRadius: 8,
              boxShadow: '0 2px 10px rgba(91,124,247,0.3)',
              fontWeight: 600,
              height: 38,
              padding: '0 28px',
            }}
            type="primary"
          >
            {isUpdate ? '提交更新' : t('page.manage.skill.publishPage.submit')}
          </Button>
        </div>
      }
      onClose={onClose}
    >
      <div style={{ padding: '24px 28px' }}>
        <div className="skill-hero mb-16px">
          <div className="skill-hero__title text-brand-gradient">{isUpdate ? `更新${skill?.bizName}技能` : t('page.manage.skill.publishPage.heroTitle')}</div>
          <div className="skill-hero__desc">{isUpdate ? '选择新的 ZIP 包提交，系统会在当前技能下生成一个新的草稿版本，可在详情页中发布。' : t('page.manage.skill.publishPage.heroDesc')}</div>
        </div>

        <Form form={form} layout="vertical" requiredMark initialValues={initialFormValues}>
          {!isUpdate && (
            <Form.Item label={t('page.manage.skill.publishPage.namespace')} name="spaceId" rules={[{ message: t('page.manage.skill.publishPage.namespaceRequired'), required: true }]}>
              <Select
                disabled={!isAdmin}
                options={spaces}
                placeholder={t('page.manage.skill.publishPage.namespacePh')}
                showSearch
                filterOption={(input, option) =>
                  String(option?.label || '')
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Form.Item>
          )}

          <Form.Item label={t('page.manage.skill.publishPage.version')} name="version">
            <Input placeholder={t('page.manage.skill.publishPage.versionPh')} />
          </Form.Item>

          <Form.Item label={t('page.manage.skill.publishPage.changelog')} name="changelog">
            <Input.TextArea autoSize={{ maxRows: 6, minRows: 3 }} placeholder={t('page.manage.skill.publishPage.changelogPh')} />
          </Form.Item>

          <Form.Item label={t('page.manage.skill.publishPage.skillPackage')} required>
            <div
              className={`upload-zone ${dragging ? 'is-dragging' : ''} ${file ? 'upload-zone--filled' : ''}`}
              onClick={handleBrowse}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragging(false)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDrop={(e) => {
                e.preventDefault()
                setDragging(false)
                onFilePicked(e.dataTransfer.files?.[0])
              }}
            >
              {file ? (
                <>
                  <CheckCircleFilled className="upload-zone__icon !text-green-600" />
                  <div className="flex items-center gap-8px text-14px font-600">
                    <FileZipOutlined />
                    <span>{file.name}</span>
                  </div>
                  <div className="upload-zone__hint">
                    {formatFileSize(file.size)} · {t('page.manage.skill.publishPage.clickToReplace')}
                  </div>
                </>
              ) : (
                <>
                  <CloudUploadOutlined className="upload-zone__icon" />
                  <div className="text-14px font-600">{t('page.manage.skill.publishPage.dropOrClick')}</div>
                  <div className="upload-zone__hint">{t('page.manage.skill.publishPage.zipHint')}</div>
                </>
              )}
              <input
                accept=".zip,application/zip,application/x-zip-compressed"
                ref={inputFileRef}
                style={{ display: 'none' }}
                type="file"
                onChange={(e) => {
                  onFilePicked(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </Form.Item>
        </Form>
      </div>
    </CommonDrawer>
  )
}

export default SkillPublishDrawer
