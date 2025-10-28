import type { UploadFile } from 'antd';
import { Upload } from 'antd';
import type { UploadChangeParam } from 'antd/es/upload';

import { uploadFile } from '@/service/api';

interface PropsType {
  children: React.ReactElement;
  onChange?: (val: UploadFile[]) => void;
  setData: (val: any) => void;
  value?: UploadFile[];
}

const Uploader: FC<PropsType> = memo(({ children, onChange, setData, value }) => {
  const [uploading, setUploading] = useState<boolean>(false);
  const customRequest = async (options: any) => {
    const { file } = options;
    setUploading(true);
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
        }
      } else {
        onChange!([{ ...file, name: file.name, status: 'error' }]);
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
      accept=".xls,.xlsx,.csv"
      customRequest={customRequest}
      // beforeUpload={beforeUpload}
      disabled={uploading}
      fileList={value}
      maxCount={1}
      // showUploadList={false}
      onChange={handleChange}
    >
      {children}
    </Upload.Dragger>
  );
});

export default Uploader;
