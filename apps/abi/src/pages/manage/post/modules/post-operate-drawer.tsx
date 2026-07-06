import { enableStatusOptions } from '@/constants/business'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

type Props = Page.OperateDrawerProps

const PostOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()

  const submit = async () => {
    try {
      const values = await form.validateFields()
      handleSubmit({ ...values })
    } catch (err) {
      // eslint-disable-next-line
      console.log(err)
    }
  }

  return (
    <CommonDrawer
      open={open}
      title={operateType === 'add' ? t('page.manage.user.addUser') : t('page.manage.user.editUser')}
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton type="primary" onClick={submit}>
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <AForm form={form} layout="vertical">
        {/* 岗位名称 */}
        <AForm.Item label={t('page.manage.post.postName')} name="postName" rules={[{ required: true }]}>
          <AInput placeholder={t('page.manage.post.form.postName')} />
        </AForm.Item>

        {/* 岗位编码 */}
        <AForm.Item label={t('page.manage.post.postCode')} name="postCode" rules={[{ required: true }]}>
          <AInput placeholder={t('page.manage.post.form.postCode')} />
        </AForm.Item>

        {/* 岗位顺序 */}
        <AForm.Item label={t('page.manage.post.postSort')} name="postSort" rules={[{ required: true }]}>
          <AInputNumber className="w-full" min={0} placeholder={t('page.manage.post.form.postSort')} precision={0} />
        </AForm.Item>

        {/* 状态 */}
        <AForm.Item label={t('page.manage.post.status')} name="status">
          <ARadio.Group>
            {enableStatusOptions.map((item) => (
              <ARadio key={item.value} value={item.value}>
                {t(item.label)}
              </ARadio>
            ))}
          </ARadio.Group>
        </AForm.Item>

        {/* 备注 */}
        <AForm.Item label={t('page.manage.common.remark')} name="remark">
          <AInput.TextArea placeholder={t('page.manage.common.form.remark')} />
        </AForm.Item>
      </AForm>
    </CommonDrawer>
  )
})

export default PostOperateDrawer
