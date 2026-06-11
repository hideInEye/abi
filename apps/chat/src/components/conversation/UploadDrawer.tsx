import React, { useState, useEffect } from 'react';
import { Drawer, Upload, message, Progress, List, Spin, Button, Radio, Modal, Space, Empty} from 'antd';
import { CloseOutlined, DeleteOutlined, DownloadOutlined, FileExcelOutlined} from '@ant-design/icons';
import type { RcFile } from 'antd/es/upload/interface';
import SvgIcon from '../../components/SvgIcon';
import { fetchFilesList, deleteFile, uploadExcelFile } from '@/service/api/conv';
import { checkFileType, downloadFileByBlob } from '@/utils';
import { getAuthorization, handleLoginExpired } from '@/utils/auth';

interface Props {
  open: boolean;
  onClose: () => void;
  conv?: any;
  onOk: (file: UploadFile) => void;
}
interface UploadFile {
  name?: string;
  uid?: string;
  file_id: string | number;
  file_name: string;
  [key: string]: any
}
const MAX_TOTAL_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UploadDrawer: React.FC<Props> = ({ open, onClose, conv, onOk }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [currentUpload, setCurrentUpload] = useState<{ xhr?: XMLHttpRequest }>({});
  const [historyFiles, setHistoryFiles] = useState<UploadFile[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<UploadFile>({
    file_id: 0,
    file_name: ''
  });

  // 文件大小校验
  const checkFileSize = (file: RcFile) => file.size <= MAX_FILE_SIZE;

  // 取消上传
  const handleCancelUpload = () => {
    currentUpload.xhr?.abort();
    setUploading(false);
    setUploadProgress(0);
    message.info('已取消上传');
  };

  // 核心上传逻辑
  const handleUpload = (file): Promise<boolean> => {
    return new Promise((resolve, reject) => {
      // 前置校验
      if (!checkFileType(file)) {
        message.error('仅支持 .xls, .xlsx, .csv 格式');
        return reject(false);
      }
      if (!checkFileSize(file)) {
        message.error('文件大小不能超过 10MB');
        return reject(false);
      }
      if (MAX_TOTAL_FILES - historyFiles.length <= 0) {
        message.error(`单个对话内文件数量超限！最多支持 ${MAX_TOTAL_FILES} 个文件`);
        return reject(false);
      }

      // 准备上传
      setUploading(true);
      setUploadProgress(0);

      const formData = new FormData();
      const rawFile = file.originFileObj || file;
      formData.append('files', rawFile);

      const xhr = new XMLHttpRequest();
      setCurrentUpload({ xhr });

      // 进度处理
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        }
      };

      // 完成处理
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const res = JSON.parse(xhr.responseText);
            const {success, err_msg, data = []} = res || {};
            if (success) {
              setFileList(prev => {
                // 找到当前上传的文件索引
                const index = prev.findIndex(f => f.uid === file.uid);
                if (index === -1) return prev;
                
                // 创建新文件对象，合并服务器返回的数据
                const newFile = {
                  ...prev[index],
                  ...data[0],
                  status: 'done' as const,
                  uid: file.uid,
                  name: file.name
                };
            
                // 替换原数组中的对应文件
                const newList = [...prev];
                newList[index] = newFile;
                return newList;
              });
              setSelectedHistory(data[0]);
              resolve(true);
            }
            else {
              message.error(err_msg || '上传失败');
              reject(new Error(`上传失败: ${err_msg}`));
            }
          }
          catch (parseError) {
            reject(new Error('解析服务器响应失败'));
          }
        } else if (xhr.status === 401) {
          void handleLoginExpired();
          reject(new Error('登录状态已过期'));
        } else {
          reject(new Error(`上传失败: ${xhr.statusText}`));
        }
      };

      // 错误处理
      xhr.onerror = () => reject(new Error('网络错误'));
      xhr.onabort = () => reject(new Error('用户取消上传'));

      // 构建请求URL
      const query = new URLSearchParams({
        conv_uid: conv.conv_uid,
        sys_code: conv.sys_code || '1'
      });
      xhr.open('POST', `/chat-proxy/api/v2/serve/file/files/excelfile?${query}`);
      const authorization = getAuthorization();
      if (authorization) {
        xhr.setRequestHeader('Authorization', authorization);
      }
      xhr.send(formData);
    });
  };

  // 自定义上传处理
  const customRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      const success = await handleUpload(file);
      if (success) {
        onSuccess({ ...file, ...selectedHistory }, file);
        message.success(`${file.name} 上传成功`);
        getHistoryFiles();
      }
    }
    catch (error) {
      const msg = error instanceof Error ? error.message : '上传失败';
      message.error(msg);
      onError(error);
    }
    finally {
      setUploading(false);
      setCurrentUpload({});
    }
  };

  const handleDeleteHistory = (fileId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '你确定要删除这个文件吗？此操作不可撤销。',
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteFile({ bucket: 'excelfile', file_id: fileId, query: {conv_uid: conv.conv_uid, sys_code: conv?.sys_code || '1'} });
          setFileList([]);
          getHistoryFiles();
          message.success('删除成功');
        }
        catch (error) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleDownload = async (file: UploadFile) => {
    try {
      const res = await uploadExcelFile({
        bucket: 'excelfile',
        file_id: file.file_id
      });
      downloadFileByBlob(res, file.file_name);
      message.success('下载成功');
    }
    catch (error) {
      message.error('下载失败');
    }
  }

  const handleHistorySelect = (file: UploadFile) => {
    setSelectedHistory(file);
  };

  const getHistoryFiles = async () => {
    if (!conv?.conv_uid) return;
    
    try {
      setLoadingHistory(true);
      const res = await fetchFilesList({
        bucket: 'excelfile',
        conv_uid: conv.conv_uid
      });
      if (res?.success) {
        setHistoryFiles(res.data || []);
      }
    }
    catch (error) {
      message.error('获取历史文件失败');
    }
    finally {
      setLoadingHistory(false);
    }
  };
  const handleConfirm = () => {
    Modal.confirm({
      title: '文件确认',
      content: `确认选择 ${selectedHistory.file_name} 文件吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        onOk && onOk(selectedHistory);
      },
      onCancel: () => {
      },
      centered: true,
      maskClosable: false
    });
  }

  const handleChange = ({ fileList }) => {
    setFileList(prev => 
      fileList.map(f => 
        prev.find(p => p.uid === f.uid) || f
      )
    )
  };
  
  useEffect(() => {
    if (open) {
      getHistoryFiles();
      // 切换对话时清空当前选中和上传列表
      setFileList([]);
      setSelectedHistory({
        file_id: 0,
        file_name: ''
      });
    }
  }, [open, conv?.conv_uid]);

  return (
    <Drawer
      placement="right"
      onClose={onClose}
      open={open}
      width={500}
      closable={false}
      styles={{
        body: { padding: '24px' },
        header: { padding: '16px 24px', borderBottom: '1px solid #f0f0f0' }
      }}
      title={
        <div className="flex justify-between items-center">
          <span>文件管理</span>
          <CloseOutlined 
            className="cursor-pointer hover:opacity-70" 
            onClick={onClose}
          />
        </div>
      }
      footer={
        <div className="flex justify-end gap-2 px-6">
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleConfirm}>
              确认
            </Button>
          </Space>
        </div>
      }
    >
      <div className="h-full flex flex-col">
        {/* 上传区域 */}
        <div className="flex-1">
          <Upload.Dragger
            onChange={handleChange}
            accept=".xls,.xlsx,.csv"
            customRequest={customRequest}
            disabled={uploading}
            maxCount={1}
            showUploadList={false}
          >
            <div className="p-8">
              <div className="flex justify-center">
                <SvgIcon 
                  localIcon="cloud-upload" 
                  className={`text-[48px] ${uploading ? 'text-gray-400' : 'text-[#2E6CF6]'}`}
                />
              </div>
              <p className="text-center mt-4">
                {uploading ? '文件上传中...' : '点击或将文件拖拽到这里上传'}
              </p>
              <p className="text-center text-gray-400 mt-2">支持扩展名：.xls .xlsx .csv</p>
              <p className="text-center text-gray-400">限制：文件大小不超过10MB，最多1个文件</p>
            </div>
          </Upload.Dragger>
        </div>

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <div className="mt-4 border rounded-lg p-4">
            {fileList.map((file) => (
              <div key={file.uid} className="mb-4 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center flex-1 mr-4">
                    <SvgIcon localIcon="file" className="text-gray-400 mr-2" />
                    <span className="text-gray-700 truncate">{file.name}</span>
                  </div>
                  {uploading ? (
                    <button
                      className="text-gray-500 hover:text-gray-700"
                      onClick={handleCancelUpload}
                    >
                      取消
                    </button>
                  ) : (
                    <CloseOutlined
                      className="text-gray-400 cursor-pointer hover:text-gray-600"
                      onClick={() => handleDeleteHistory(file.file_id)}
                    />
                  )}
                </div>
                {uploading && (
                  <Progress 
                    percent={uploadProgress} 
                    size="small" 
                    status={uploadProgress === 100 ? 'success' : 'active'} 
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {/* 注意事项 */}
        <div className="mt-8">
          <div className="text-red-500">注意：</div>
          <ol className="list-decimal pl-5 text-gray-600 mt-2">
            <li>请上传有标准行列及表头的一维数据表格</li>
            <li>CSV文件需使用英文逗号作为分隔符</li>
            <li>Excel/CSV中的表头，建议以中文设定，可有效提高大模型返回数据的准确性</li>
          </ol>
        </div>

        {/* 历史文件 */}
        <div className="mt-6">
          <h3 className="text-gray-600 mb-2">历史文件：</h3>
          <Spin spinning={loadingHistory}>
            <List
              dataSource={historyFiles}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无数据" /> }}
              renderItem={(item: any) => (
                <List.Item
                  styles={{
                    actions: {marginLeft: '10px'},
                  }}
                  actions={[
                    <Space>
                      <DownloadOutlined 
                        onClick={() => handleDownload(item)} 
                        style={{ marginRight: 16, cursor: 'pointer' }} 
                      />
                      <DeleteOutlined 
                        onClick={() => handleDeleteHistory(item.file_id)} 
                        style={{ cursor: 'pointer' }} 
                      />
                    </Space>
                  ]}
                >
                  <div style={{ display: 'flex', alignItems: 'center', width: '80%'}}>
                    <Radio
                      checked={selectedHistory.file_id === item.file_id}
                      onChange={() => handleHistorySelect(item)}
                      style={{ marginRight: 8 }}
                    />
                    <span style={{ 
                      color: '#1677ff'
                    }}>
                      <FileExcelOutlined />
                    </span>
                    <span style={{ 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    }}>
                      {item.file_name}
                    </span>
                  </div>
                </List.Item>
              )}
            />
          </Spin>
        </div>
      </div>
    </Drawer>
  );
};

export default UploadDrawer;
