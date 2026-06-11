import { Form, Input, Radio, Select } from 'antd';
import { FormInstance } from 'antd/lib';
import EditorQuill from '../editor-quill';
import WeekSelect from './week-select';
import MonthSelect from './month-select';
import { useEffect } from 'react';
import EmailTitle from './email-title';
import { validateMultiEmails } from '../../../../utils';
import DailyTime from './daily-time';

const ShareEmailSetting = ({ form }: { form: FormInstance }) => {
  const separator = Form.useWatch('type', form);
  const frequency = Form.useWatch('executeFrequency', form);
  useEffect(() => {
    form.setFieldsValue({
      sendTime: null,
    });
  }, [frequency]);
  useEffect(() => {
    form.setFieldsValue({
      executeFrequency: null,
      sendTime: null,
    });
  }, [separator]);
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
      <Form.Item label="发送方式" name="type" rules={[{ required: true, message: '请选择发送方式' }]}>
        <Select placeholder="请选择发送方式">
          <Select.Option value={1}>立即发送</Select.Option>
          <Select.Option value={2}>定时发送</Select.Option>
        </Select>
      </Form.Item>
      {separator === 2 && (
        <>
          {/* 执行频率 */}
          <Form.Item label="执行频率" name="executeFrequency" rules={[{ required: true, message: '请选择执行频率' }]}>
            <Radio.Group
              options={[
                { label: '每天', value: 1 },
                { label: '每周', value: 2 },
                { label: '每月', value: 3 },
              ]}
            />
          </Form.Item>
          {/* 执行时间 */}
          <Form.Item
            label="执行时间"
            name="sendTime"
            rules={[
              {
                validator: (rule, value) => {
                  if (frequency !== 1 && (!value?.time || !value?.status)) {
                    return Promise.reject(new Error('请选择执行时间'));
                  } else if (frequency === 1 && !value?.time) {
                    return Promise.reject(new Error('请选择执行时间'));
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            {frequency === 1 && <DailyTime />}
            {frequency === 2 && <WeekSelect />}
            {frequency === 3 && <MonthSelect />}
          </Form.Item>
        </>
      )}
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
      <EditorQuill {...props} />
      <a className="text-xs text-blue-500 cursor-pointer" href="https://192.168.1.251/chat-proxy/api/v2/serve/file/files/pdffile/e2f1d322-8548-42f4-921c-03e60434a7e4">
        预览报告示例
      </a>
    </>
  );
}
