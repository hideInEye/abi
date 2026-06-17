import {
  CloseOutlined,
  DatabaseOutlined,
  LinkOutlined,
  TableOutlined,
} from '@ant-design/icons';

type Props = Page.OperateDrawerProps;

const DataCollectionOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();

  const handleClose = () => {
    onClose();
  };

  const submit = async () => {
    try {
      await form.validateFields();
      await handleSubmit();
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <ADrawer
      className="ds-operate-drawer"
      closeIcon={null}
      extra={<CloseOutlined onClick={handleClose} style={{ fontSize: 16, color: '#8c8c8c' }} />}
      open={open}
      size="large"
      footer={
        <div className="ds-operate-footer">
          <div className="ds-operate-footer-left" />
          <div className="ds-operate-footer-right">
            <AButton onClick={handleClose}>{t('common.cancel')}</AButton>
            <AButton className="btn-accent-gradient" onClick={submit}>
              {t('common.confirm')}
            </AButton>
          </div>
        </div>
      }
      title={
        <div className="ds-operate-title">
          <span className="ds-operate-title-icon">
            <TableOutlined />
          </span>
          <span>{operateType === 'add' ? '新增数据集' : '编辑数据集'}</span>
        </div>
      }
      onClose={handleClose}
    >
      <AForm
        form={form}
        layout="vertical"
        className="ds-operate-form"
      >
        <div className="ds-form-section">
          <div className="ds-form-section-title">
            <DatabaseOutlined />
            基本信息
          </div>
          <AForm.Item
            label={t('page.dataPreparation.dataCollection.name')}
            name="name"
            rules={[{ required: true, message: '请输入数据集名称' }]}
          >
            <AInput placeholder={t('page.dataPreparation.dataCollection.form.name')} />
          </AForm.Item>
        </div>

        <div className="ds-form-section">
          <div className="ds-form-section-title">
            <LinkOutlined />
            连接配置
          </div>
          <AForm.Item
            label={t('page.dataPreparation.dataCollection.collection')}
            name="collection"
            rules={[{ required: true, message: '请输入集合名称' }]}
          >
            <AInput placeholder={t('page.dataPreparation.dataCollection.form.collection')} />
          </AForm.Item>
          <AForm.Item
            label={t('page.dataPreparation.dataCollection.username')}
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <AInput placeholder={t('page.dataPreparation.dataCollection.form.username')} />
          </AForm.Item>
          <AForm.Item
            label={t('page.dataPreparation.dataCollection.password')}
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <AInput.Password placeholder={t('page.dataPreparation.dataCollection.form.password')} />
          </AForm.Item>
        </div>
      </AForm>
    </ADrawer>
  );
});

export default DataCollectionOperateDrawer;
