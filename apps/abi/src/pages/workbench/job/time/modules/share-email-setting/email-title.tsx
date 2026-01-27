import { Input } from 'antd';
interface EmailTitleProps {
  value?: string;
  onChange?: (value: string) => void;
}
const EmailTitle:React.FC<EmailTitleProps> = (props) => {
  const {value ="",onChange} = props;
  return (
    <>
      <Input placeholder="请输入收件人标题" value={value} onChange={(e) => onChange?.(e.target.value)} />
      <span className="text-xs text-gray-500">
        默认自动生成格式: {`{对话名称}`}+报告+分隔符+{`{发送日期}`}
      </span>
    </>
  );
}
export default EmailTitle;
