import { CheckCircleFilled, CloudUploadOutlined, FileZipOutlined } from '@ant-design/icons';
import { App, Drawer, Flex, Form, Input, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { spaceList } from '@/service/api/data-space';
import { publishSkillApi } from '@/service/api/skill';

import '../skill.css';

type SpaceOption = {
  label: string;
  value: number | string;
  handle?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

function formatFileSize(bytes: number) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

const SkillPublishDrawer: FC<Props> = ({ onClose, onSuccess, open }) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const inputFileRef = useRef<HTMLInputElement>(null);

  const [spaces, setSpaces] = useState<SpaceOption[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadSpaces() {
    try {
      const res: any = await spaceList({
        isAsc: 'desc',
        orderByColumn: 'createTime',
        pageNum: 1,
        pageSize: 200
      });
      const rows = res?.response?.data?.rows || res?.data?.rows || res?.data || [];
      const opts: SpaceOption[] = (rows as any[]).map(r => ({
        handle: r.spaceCode || r.spaceName || r.name,
        label: r.spaceName || r.name || r.spaceCode,
        value: r.spaceId ?? r.id
      }));
      setSpaces(opts);
    } catch {
      setSpaces([]);
    }
  }

  useEffect(() => {
    if (open) {
      loadSpaces();
      form.resetFields();
      setFile(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onFilePicked(f?: File | null) {
    if (!f) return;
    const isZip =
      f.name.toLowerCase().endsWith('.zip') ||
      f.type === 'application/zip' ||
      f.type === 'application/x-zip-compressed';
    if (!isZip) {
      message.error(t('page.manage.skill.publishPage.onlyZip'));
      return;
    }
    if (f.size > 100 * 1024 * 1024) {
      message.error(t('page.manage.skill.publishPage.tooLarge'));
      return;
    }
    setFile(f);
  }

  function handleBrowse() {
    inputFileRef.current?.click();
  }

  async function handleSubmit() {
    try {
      const values = await form.validateFields();
      if (!file) {
        message.error(t('page.manage.skill.publishPage.fileRequired'));
        return;
      }
      setSubmitting(true);
      const fd = new FormData();
      fd.append('file', file);
      fd.append('spaceId', String(values.spaceId));
      if (values.version) fd.append('version', values.version);
      if (values.changelog) fd.append('changelog', values.changelog);

      const res: any = await publishSkillApi(fd);
      const code = res?.response?.data?.code;
      if (code === 200 || res?.response?.data?.success || res?.data) {
        message.success(t('page.manage.skill.publishPage.success'));
        onSuccess?.();
        onClose();
      }
    } catch (err: any) {
      if (err?.errorFields) return;
      message.error(err?.message || t('page.manage.skill.publishPage.failed'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Drawer
      destroyOnClose
      open={open}
      rootClassName="skill-hub-scope"
      title={t('page.manage.skill.publish')}
      width={640}
      footer={
        <Flex justify="flex-end" gap={8}>
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            className="brand-button"
            loading={submitting}
            type="primary"
            onClick={handleSubmit}
          >
            {t('page.manage.skill.publishPage.submit')}
          </AButton>
        </Flex>
      }
      onClose={onClose}
    >
      <div className="skill-hero mb-16px">
        <div className="skill-hero__title text-brand-gradient">{t('page.manage.skill.publishPage.heroTitle')}</div>
        <div className="skill-hero__desc">{t('page.manage.skill.publishPage.heroDesc')}</div>
      </div>

      <Form
        form={form}
        layout="vertical"
        requiredMark
      >
        <Form.Item
          label={t('page.manage.skill.publishPage.namespace')}
          name="spaceId"
          rules={[{ message: t('page.manage.skill.publishPage.namespaceRequired'), required: true }]}
        >
          <Select
            options={spaces}
            placeholder={t('page.manage.skill.publishPage.namespacePh')}
            showSearch
            filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(input.toLowerCase())}
          />
        </Form.Item>

        <Form.Item
          label={t('page.manage.skill.publishPage.version')}
          name="version"
        >
          <Input placeholder={t('page.manage.skill.publishPage.versionPh')} />
        </Form.Item>

        <Form.Item
          label={t('page.manage.skill.publishPage.changelog')}
          name="changelog"
        >
          <Input.TextArea
            autoSize={{ maxRows: 6, minRows: 3 }}
            placeholder={t('page.manage.skill.publishPage.changelogPh')}
          />
        </Form.Item>

        <Form.Item
          label={t('page.manage.skill.publishPage.skillPackage')}
          required
        >
          <div
            className={`upload-zone ${dragging ? 'is-dragging' : ''} ${file ? 'upload-zone--filled' : ''}`}
            onClick={handleBrowse}
            onDragEnter={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setDragging(false);
            }}
            onDragOver={e => {
              e.preventDefault();
              setDragging(true);
            }}
            onDrop={e => {
              e.preventDefault();
              setDragging(false);
              onFilePicked(e.dataTransfer.files?.[0]);
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
              className="hidden"
              ref={inputFileRef}
              type="file"
              onChange={e => {
                onFilePicked(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </div>
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default SkillPublishDrawer;
