import Editor from '@monaco-editor/react';
import { ExclamationCircleFilled, SearchOutlined } from '@ant-design/icons';
import { App, Button, Drawer, Form, Input, Select, Space, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';

import PageTitle from '@/components/stateless/common/PageTitle';
import type { CreateToolParams, ToolItem, UpdateToolParams } from '@/service/api/tool';
import {
  createToolApi,
  deleteToolApi,
  getToolDetailApi,
  queryToolListApi,
  updateToolApi
} from '@/service/api/tool';

/** Monaco 代码编辑器适配 Form.Item value/onChange */
interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
  height?: string | number;
}
function CodeEditor({ value, onChange, language = 'plaintext', height = '300px' }: CodeEditorProps) {
  return (
    <div
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: 6,
        overflow: 'hidden'
      }}
    >
      <Editor
        height={height}
        language={language}
        value={value ?? ''}
        onChange={v => onChange?.(v ?? '')}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2
        }}
      />
    </div>
  );
}

export function Component() {
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();

  const [keyword, setKeyword] = useState('');
  const [list, setList] = useState<ToolItem[]>([]);
  const [loading, setLoading] = useState(false);

  // 弹窗状态
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTool, setEditingTool] = useState<ToolItem | null>(null);
  const [saving, setSaving] = useState(false);

  // 编辑弹窗 tab
  const [activeTab, setActiveTab] = useState('script');

  async function fetchList() {
    setLoading(true);
    try {
      const res: any = await queryToolListApi({});
      const rows =
        res?.response?.data?.data ||
        res?.data?.data ||
        res?.data ||
        [];
      setList(Array.isArray(rows) ? rows : []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  const filteredList = useMemo(() => {
    const kw = keyword.trim().toLowerCase();
    if (!kw) return list;
    return list.filter(
      it =>
        (it.toolName || '').toLowerCase().includes(kw) ||
        (it.toolLabel || '').toLowerCase().includes(kw)
    );
  }, [list, keyword]);

  function handleAdd() {
    setEditingTool(null);
    form.resetFields();
    form.setFieldsValue({ status: '0' });
    setActiveTab('script');
    setModalOpen(true);
  }


  async function handleEdit(record: ToolItem) {
    setActiveTab('script');
    setModalOpen(true);
    setEditingTool(record);
    // 先用列表数据预填充，避免空白闪烁
    form.setFieldsValue({
      toolName: record.toolName,
      toolLabel: record.toolLabel,
      description: record.description,
      status: record.status ?? '0'
    });
    // 调用详情接口获取完整数据后回填
    try {
      const res: any = await getToolDetailApi({ toolId: record.toolId });
      const detail: ToolItem =
        res?.response?.data?.data || res?.data?.data || res?.data || res;
      if (detail) {
        setEditingTool(detail);
        form.setFieldsValue({
          toolName: detail.toolName,
          toolLabel: detail.toolLabel,
          description: detail.description,
          status: detail.status ?? '0',
          scriptContent: detail.scriptContent,
          startupParams: detail.startupParams,
          inputSchema: detail.inputSchema,
          outputSchema: detail.outputSchema
        });
      }
    } catch {
      message.error('获取工具详情失败');
    }
  }

  function handleDelete(record: ToolItem) {
    modal.confirm({
      title: '确认删除',
      content: `确定要删除工具「${record.toolName}」吗？删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteToolApi({ toolId: record.toolId });
          message.success('删除成功');
          fetchList();
        } catch {
          message.error('删除失败');
        }
      }
    });
  }

  async function handleSave() {
    try {
      const values = await form.validateFields();
      setSaving(true);

      if (editingTool) {
        // 编辑
        const params: UpdateToolParams = {
          toolId: editingTool.toolId,
          toolName: values.toolName,
          toolLabel: values.toolLabel,
          description: values.description,
          status: values.status,
          scriptContent: values.scriptContent,
          startupParams: values.startupParams,
          inputSchema: values.inputSchema,
          outputSchema: values.outputSchema
        };
        await updateToolApi(params);
        message.success('保存成功');
      } else {
        // 新增
        const params: CreateToolParams = {
          toolName: values.toolName,
          toolLabel: values.toolLabel,
          description: values.description,
          status: values.status,
          scriptContent: values.scriptContent,
          startupParams: values.startupParams,
          inputSchema: values.inputSchema,
          outputSchema: values.outputSchema
        };
        await createToolApi(params);
        message.success('新增成功');
      }

      setModalOpen(false);
      fetchList();
    } catch (err: any) {
      if (err?.errorFields) return; // 表单校验失败
      message.error(editingTool ? '保存失败' : '新增失败');
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnsType<ToolItem> = [
    {
      title: '工具名称',
      dataIndex: 'toolName',
      key: 'toolName',
      width: 220
    },
    {
      title: '标签',
      dataIndex: 'toolLabel',
      key: 'toolLabel',
      align: 'center',
      width: 160,
      render: (text: string) => (text ? <Tag color="blue">{text}</Tag> : '-')
    },
    {
      title: '功能描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => text || '-'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) =>
        String(status) === '0' ? (
          <Tag color="success">启用</Tag>
        ) : (
          <Tag color="default">禁用</Tag>
        )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      width: 200,
      render: (t: string) => (t ? t.replace('T', ' ') : '-')
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="default" onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button danger type="primary" onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      )
    }
  ];

  const tabItems = [
    { key: 'script', label: 'Python 脚本' },
    { key: 'startupParams', label: '启动参数' },
    { key: 'inputSchema', label: '输入参数 Schema' },
    { key: 'outputSchema', label: '输出参数 JSON Schema' },
    { key: 'remark', label: '备注' }
  ];

  return (
    <div
      className="flex flex-col gap-2 p-6"
      style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}
    >
      <div className="flex items-center justify-between">
        <PageTitle />
        <Button type="primary" onClick={handleAdd}>
          新增
        </Button>
      </div>
      <div className="flex items-center gap-4">
        <Input
          allowClear
          placeholder="搜索工具名称或标签"
          prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          style={{ width: '12rem' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            maxHeight: '100%'
          }}
        >
          <div style={{ overflow: 'auto', maxHeight: '100%' }}>
            <Table<ToolItem>
              rowKey="toolId"
              columns={columns}
              dataSource={filteredList}
              loading={loading}
              pagination={false}
              size="small"
              scroll={list.length > 0 ? { x: 'max-content' } : undefined}
            />
          </div>
        </div>
      </div>

      {/* 新增/编辑抽屛 */}
      <Drawer
        title={editingTool ? '编辑内置工具' : '新增内置工具'}
        open={modalOpen}
        width={720}
        destroyOnClose
        onClose={() => setModalOpen(false)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
              <Button type="primary" loading={saving} onClick={handleSave}>
                保存
              </Button>
            </Space>
          </div>
        }
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Form.Item
            label="工具名称"
            name="toolName"
            rules={[{ required: true, message: '请输入工具名称' }]}
          >
            <Input placeholder="如：builtin_increment" />
          </Form.Item>

          <Form.Item
            label="标签"
            name="toolLabel"
            rules={[{ required: true, message: '请输入工具标签' }]}
          >
            <Input placeholder="如：计算器" />
          </Form.Item>

          <Form.Item label="功能描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入功能描述" />
          </Form.Item>

          <Form.Item label="状态" name="status">
            <Select style={{ width: 160 }}>
              <Select.Option value="0">启用</Select.Option>
              <Select.Option value="1">禁用</Select.Option>
            </Select>
          </Form.Item>

          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />

          {/* Python 脚本 */}
          <div style={{ display: activeTab === 'script' ? 'block' : 'none' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 12px',
                background: '#fffbe6',
                border: '1px solid #ffe58f',
                borderRadius: 6,
                marginBottom: 12
              }}
            >
              <ExclamationCircleFilled style={{ color: '#faad14', fontSize: 14, marginTop: 3 }} />
              <div style={{ fontSize: 13, lineHeight: '20px', color: 'rgba(0,0,0,0.85)' }}>
                <div style={{ fontWeight: 500, marginBottom: 2 }}>安全警告</div>
                <div style={{ color: 'rgba(0,0,0,0.65)' }}>
                  Python 脚本将以服务器进程权限执行，请确保代码来源可信。请勿编写删除文件、访问网络等高危操作，或交由管理员审核后发布。
                </div>
              </div>
            </div>
            <Form.Item name="scriptContent" noStyle>
              <CodeEditor language="python" height="320px" />
            </Form.Item>
          </div>
          {/* 启动参数 */}
          <div style={{ display: activeTab === 'startupParams' ? 'block' : 'none' }}>
            <Form.Item name="startupParams" noStyle>
              <CodeEditor language="json" height="320px" />
            </Form.Item>
          </div>
          {/* 输入参数 Schema */}
          <div style={{ display: activeTab === 'inputSchema' ? 'block' : 'none' }}>
            <Form.Item name="inputSchema" noStyle>
              <CodeEditor language="json" height="320px" />
            </Form.Item>
          </div>
          {/* 输出参数 JSON Schema */}
          <div style={{ display: activeTab === 'outputSchema' ? 'block' : 'none' }}>
            <Form.Item name="outputSchema" noStyle>
              <CodeEditor language="json" height="320px" />
            </Form.Item>
          </div>
          {/* 备注 */}
          <div style={{ display: activeTab === 'remark' ? 'block' : 'none' }}>
            <Form.Item name="remark" noStyle>
              <Input.TextArea rows={12} placeholder="备注信息" />
            </Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

export default Component;
