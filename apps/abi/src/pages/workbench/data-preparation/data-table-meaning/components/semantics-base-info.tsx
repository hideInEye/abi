import { Form } from 'antd';

import { dataSetList } from '@/service/api/data-table-meaning';

import { useTableStore } from '../store/useTableStore';

function transformDataSet(data: any) {
  return data.map((item: any) => ({
    label: item.viewName,
    value: item.viewId,
    ...item
  }));
}

export default function DataTableMeaningBaseInfo() {
  const [form] = Form.useForm();
  const { setFormBaseInfo } = useTableStore();
  const { drawerTitle, setChinaname, setDescribe, setDownSelectLabel, setDownSelectVal, setEnglishname } =
    useTableStore();
  const { chineseName, desc, downSelectLabel, downSelectVal, englishName } = useTableStore();

  const [dropDownData, setDropDownData] = useState<any[]>([]);
  const fetchDataSetList = async () => {
    const { response } = await dataSetList();
    const { code, data } = response.data;
    if (Number(code) === 200) {
      setDropDownData(transformDataSet(data?.list));
    }
  };

  function initForm() {
    form.setFieldValue('chineseName', chineseName);
    form.setFieldValue('englishName', englishName);
    form.setFieldValue('desc', desc);
    form.setFieldValue('downSelectLabel', downSelectLabel);
    form.setFieldValue('downSelectVal', downSelectVal);
  }

  useEffect(() => {
    setFormBaseInfo(form);
    fetchDataSetList();

    initForm();
  }, []);

  return (
    <AForm
      form={form}
      onValuesChange={v => {
        if (v?.chineseName) {
          setChinaname(v?.chineseName);
          form.setFieldValue('chineseName', v?.chineseName);
        }

        if (v?.desc) {
          setDescribe(v?.desc);
          form.setFieldValue('desc', v?.desc);
        }

        if (v?.englishName) {
          setEnglishname(v?.englishName);
          form.setFieldValue('englishName', v?.englishName);
        }

        if (v?.downSelectLabel) {
          const findData = dropDownData.find(item => Number(item.value) === Number(v?.downSelectLabel));
          if (findData) {
            form.setFieldValue('downSelectLabel', findData.label);
            form.setFieldValue('downSelectVal', findData.value);

            setDownSelectLabel(findData.label);
            setDownSelectVal(findData.value);
          }
        }
      }}
    >
      <AForm.Item
        required
        label="数据集"
        labelCol={{ span: 3 }}
        name="downSelectLabel"
        rules={[{ message: '数据集未选择', required: true }]}
      >
        <ASelect options={dropDownData} />
      </AForm.Item>

      <AForm.Item
        label="数据语义"
        labelCol={{ span: 3 }}
        name="chineseName"
        rules={[{ message: '请输入数据语义', required: true }, { max: 50, message: '数据语义最多50个字符' }]}
      >
        <AInput placeholder="数据语义" />
      </AForm.Item>

      <AForm.Item
        required
        label="英文名"
        labelCol={{ span: 3 }}
        name="englishName"
        rules={[
          { message: '请输入英文名', required: true },
          { max: 50, message: '英文名最多50个字符' },
          {
            message: '请输入英文字符,以下划线分割',
            pattern: /^[\u4E00-\u9FA5a-zA-Z_]+$/
          }
        ]}
      >
        <AInput placeholder="英文名" />
      </AForm.Item>

      <AForm.Item
        label="描述"
        labelCol={{ span: 3 }}
        name="desc"
        rules={[{ max: 500, message: '描述最多500个字符' }]}
      >
        <AInput.TextArea placeholder="描述" maxLength={500} showCount />
      </AForm.Item>
    </AForm>
  );
}
