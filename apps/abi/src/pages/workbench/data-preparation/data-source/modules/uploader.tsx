import type { UploadFile } from 'antd';
import { message, Upload } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';

import { uploadFile } from '@/service/api';

interface PropsType {
  children: React.ReactElement;
  onChange?: (val: UploadFile[]) => void;
  setData: (val: any) => void;
  value?: UploadFile[];
  maxSize?: number;
  setUploadError: (error: { messageTitle: string; message: string }) => void;
  setPreviewVisible?: (visible: boolean) => void;
}

const Uploader: FC<PropsType> = memo(({ children, onChange, setData, value, maxSize, setUploadError, setPreviewVisible }) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const customRequest = async (options: any) => {
    const { file } = options;
    
    setUploading(true);
    if (maxSize && file.size > maxSize) {
      setUploadError({ messageTitle: '上传失败: 文件大小超过限制', message: `单个文件最大支持 10MB` });
      setUploading(false);
      setPreviewVisible?.(true);
      return;
    }
    const formData: any = new FormData();
    formData.append('file', file);
    formData.append('id', 0);
    formData.append('editType', 0);
    try {
      const res = await uploadFile(formData);
      if (res.data) {
        const resData = res.data;
        if (resData?.sheets?.length) {
          const dataInfo = resData.sheets[0];
          resData.sheets[0].fields =
            dataInfo?.fields?.map((item: any, index: number) => ({ ...item, checked: true, index })) || [];

          setData(resData.sheets);
          onChange!([{ ...file, ...resData, name: file.name }]);
          message.success('文件上传成功');
        }
      } else {
        const msg  = res.response?.data?.msg;
        setUploadError({ messageTitle: msg || '文件解析失败', message: msg || '文件解析失败' });
        setPreviewVisible?.(true);
        // onChange!([{ ...file, name: file.name, status: 'error' }]);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (info: UploadChangeParam<UploadFile<any>>) => {
    onChange!(info.fileList);
  };

  return (
    <Upload.Dragger
      accept=".xls,.csv,.xlsx"
      customRequest={customRequest}
      // beforeUpload={beforeUpload}
      disabled={uploading}
      fileList={value}
      maxCount={1}
      // showUploadList={false}
      // onChange={handleChange}
    >
      {children}
    </Upload.Dragger>
  );
});

export default Uploader;
