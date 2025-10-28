import { Segmented } from 'antd';

import FieldSelectTable from './field-select-table';
import PreviewTable from './preview-table';

const dataPreviewOptions = [
  {
    label: '数据预览',
    value: 1
  },
  {
    label: '字段选择',
    value: 2
  }
];

const DataPreview: FC<{ onChange?: (val: any) => void; value?: any }> = memo(({ onChange, value }) => {
  const [tab, setTab] = useState(1);

  return (
    <>
      <Segmented
        options={dataPreviewOptions}
        value={tab}
        onChange={val => setTab(val)}
      />
      {tab === 1 ? (
        <PreviewTable data={value} />
      ) : (
        <FieldSelectTable
          data={value}
          setData={onChange!}
        />
      )}
    </>
  );
});

export default DataPreview;
