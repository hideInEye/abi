import { Form, Input } from 'antd';
import { FormInstance } from 'antd/lib';
import EditorQuill from '../editor-quill';
import EmailTitle from './email-title';
import { validateMultiEmails } from '../../../../utils';
import { ScheduleFormItems, ScheduleModeSegmented } from '../../../schedule/schedule-fields';
import styles from './index.module.css';

const ShareEmailSetting = ({ form }: { form: FormInstance }) => {
  const scheduleMode = Form.useWatch('scheduleMode', form);
  return (
    <>
      <Form.Item
        label="收件人邮箱"
        name="senderEmailAddress"
        rules={[
          {
            validator(_, value) {
              if (!value) {
                return Promise.reject(new Error('请输入收件人邮箱'));
              }
              const { valid, invalidEmails } = validateMultiEmails(value);
              if (valid) return Promise.resolve();
              return Promise.reject(new Error(`以下邮箱格式不正确：${invalidEmails.join(', ')}`));
            },
          },
        ]}
      >
        <Input placeholder="请输入收件人邮箱,多个邮箱地址以逗号分割" />
      </Form.Item>
      <Form.Item
        label="收件人标题"
        name="emailTitle"
        rules={[
          { required: true, message: '请输入收件人标题' },
          { max: 200, message: '最多200个字符' },
        ]}
      >
        <EmailTitle />
      </Form.Item>
      {/* 发送方式：管理端同款三 tab 调度（单次/连续/定期），提交时在 controller 映射回旧接口参数 */}
      <Form.Item label="发送方式" name="scheduleMode" rules={[{ required: true, message: '请选择发送方式' }]}>
        <ScheduleModeSegmented />
      </Form.Item>
      <ScheduleFormItems mode={scheduleMode} />
      <Form.Item label="邮件正文" name="emailContent">
        <EmailContent />
      </Form.Item>
    </>
  );
};

export default ShareEmailSetting;

export function EmailContent(props: any) {
  return (
    <>
      <EditorQuill {...props} className={styles.emailEditor} />
      <a className={`${styles.previewLink} text-xs text-blue-500 cursor-pointer`} href="https://192.168.1.195/chat-proxy/api/v2/serve/file/files/pdffile/e2f1d322-8548-42f4-921c-03e60434a7e4">
        预览报告示例
      </a>
    </>
  );
}
