// import { enableStatusOptions } from '@/constants/business';

// import ButtonAuthModal from './button-auth-modal';

type Props = Page.OperateDrawerProps;

// type Model = 'database_address' | 'name' | 'port' | 'type';

// type RuleKey = Exclude<keyof Model, 'port'>;

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();

  // const { defaultRequiredRule } = useFormRules();

  // const [buttonAuthVisible, { setFalse: closeButtonAuthModal, setTrue: openButtonAuthModal }] = useBoolean();

  // const [menuAuthVisible, { setFalse: closeMenuAuthModal, setTrue: openMenuAuthModal }] = useBoolean();

  // const rules: Record<RuleKey, App.Global.FormRule> = {
  //   database_address: defaultRequiredRule,
  //   name: defaultRequiredRule,
  //   type: defaultRequiredRule
  // };

  return (
    <ADrawer
      open={open}
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            type="primary"
            onClick={handleSubmit}
          >
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      title={
        operateType === 'add'
          ? t('page.dataPreparation.dataCollection.addCollection')
          : t('page.dataPreparation.dataCollection.editDatasource')
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        layout="vertical"
      >
        <AForm.Item
          label={t('page.dataPreparation.dataCollection.name')}
          name="name"
          // rules={[rules.name]}
        >
          <AInput placeholder={t('page.dataPreparation.dataCollection.form.name')} />
        </AForm.Item>
        <AForm.Item
          label={t('page.dataPreparation.dataCollection.collection')}
          name="name"
          // rules={[rules.name]}
        >
          <AInput placeholder={t('page.dataPreparation.dataCollection.form.collection')} />
        </AForm.Item>
        <AForm.Item
          label={t('page.dataPreparation.dataCollection.username')}
          name="username"
          // rules={[rules.name]}
        >
          <AInput placeholder={t('page.dataPreparation.dataCollection.form.username')} />
        </AForm.Item>
        <AForm.Item
          label={t('page.dataPreparation.dataCollection.password')}
          name="password"
          // rules={[rules.name]}
        >
          <AInput.Password placeholder={t('page.dataPreparation.dataCollection.form.password')} />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
});

export default DatasourceOperateDrawer;
