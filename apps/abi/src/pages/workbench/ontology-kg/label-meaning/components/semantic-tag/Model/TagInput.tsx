import { tabTypeOptions } from '../../../constants';

export function TagInput() {
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <AForm.Item
          label="标签语义"
          name="tagName"
          rules={[
            { message: '请输入标签语义', required: true },
            { max: 50, message: '不能超过50个字符' },
            { message: '支持中英文，无特殊字符下划线', pattern: /^[\u4E00-\u9FA5a-zA-Z_]+$/ }
          ]}
        >
          <AInput placeholder="请输入标签语义" />
        </AForm.Item>

        <AForm.Item
          label="标签类型"
          name="tagType"
          rules={[{ message: '请选择标签类型', required: true }]}
        >
          <ASelect
            options={tabTypeOptions}
            placeholder="请选择标签语义"
          />
        </AForm.Item>

        <AForm.Item
          label="英文名"
          name="engName"
          rules={[
            { message: '请输入英文名', required: true },
            { max: 50, message: '不能超过50个字符' },
            {
              message: '请输入正确格式英文名,英文单词以_分割',
              pattern: /^[a-zA-Z]+(_[a-zA-Z]+)*$/
            }
          ]}
        >
          <AInput placeholder="请输入英文名" />
        </AForm.Item>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <AForm.Item
          label="别名"
          name="alias"
          rules={[{ max: 50, message: '不能超过50个字符' }]}
        >
          <AInput placeholder="请输入别名" />
        </AForm.Item>
      </div>
    </>
  );
}
