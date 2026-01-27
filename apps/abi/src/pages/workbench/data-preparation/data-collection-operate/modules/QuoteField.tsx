import { DeleteOutlined, EditOutlined, InfoCircleOutlined, SearchOutlined } from '@ant-design/icons';
import type { Dispatch, ReactElement } from 'react';

interface ModalPropsType {
  initialVal?: Api.DataPreparation.CalculatedParamsType[];
  onClose: (val?: Api.DataPreparation.CalculatedParamsType) => void;
  tfieldId: string;
}

const CalculatedParamsModal: React.FC<ModalPropsType> = memo(({ initialVal, onClose, tfieldId }) => {
  const [form] = AForm.useForm<Api.DataPreparation.CalculatedParamsType>();

  useEffect(() => {
    if (initialVal?.length) {
      form.setFieldsValue(initialVal[0]);
    }
  }, [form, initialVal]);
  const onFinish = async () => {
    const values = await form.validateFields();
    onClose({ ...values, tfieldId, tfieldShowName: values.originName, tfieldType: 'q' });
  };
  return (
    <ADrawer
      closable={false}
      open={true}
      title="添加计算参数"
      width={320}
      extra={
        <ASpace>
          <AButton onClick={() => onClose()}>取消</AButton>
          <AButton
            type="primary"
            onClick={onFinish}
          >
            保存
          </AButton>
        </ASpace>
      }
      onClose={() => onClose()}
    >
      <AForm
        autoComplete="off"
        form={form}
        labelCol={{ span: 8 }}
        name="basic"
        style={{ maxWidth: 600 }}
        wrapperCol={{ span: 16 }}
      >
        <AForm.Item
          label="参数名称"
          name="originName"
          rules={[{ message: '请输入参数名称', required: true }]}
        >
          <AInput />
        </AForm.Item>

        <AForm.Item
          label="参数默认值"
          name="value"
          rules={[{ message: '请输入一个数字', required: true }]}
        >
          <AInputNumber
            className="w-full"
            precision={0}
          />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
});

interface PropsType {
  allFields: any;
  disabled?: boolean;
  height?: string;
  notAddTarget?: boolean;
  onSelect: (val: any) => void;
  setTarget: Dispatch<any>;
  target: any[];
  tfieldId: string;
}

const ItemBox: React.FC<{ children: ReactElement<any, any> } & any> = memo(({ children, disabled, ...elseProps }) => {
  return (
    <div
      {...elseProps}
      className={`mb-1 w-full flex items-center justify-between border rounded bg-#fafafa px-2 py-1 hover:border-#8c96ff ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </div>
  );
});

const QuoteField: React.FC<PropsType> = memo(
  ({
    allFields = [],
    disabled = false,
    height = 'calc(100vh - 120px)',
    notAddTarget = false,
    onSelect,
    setTarget,
    target,
    tfieldId
  }) => {
    const [search, setSearch] = useState('');
    const [hoverTarget, setHoverTarget] = useState(false);
    const [visible, setVisible] = useState(false);
    const dOptions = useMemo(() => {
      return allFields.filter(
        (item: any) => item.originName.toLocaleLowerCase().includes(search) && item.tfieldType === 'd'
      );
    }, [search, allFields]);
    const qOptions = useMemo(() => {
      return allFields.filter(
        (item: any) => item.originName.toLocaleLowerCase().includes(search) && item.tfieldType === 'q'
      );
    }, [search, allFields]);
    const handleCloseModal = (val?: Api.DataPreparation.CalculatedParamsType) => {
      if (val) {
        setTarget([val]);
      }
      setVisible(false);
    };

    return (
      <div className="w-25% pr-10px">
        <header className="pb-8px">
          <span className="mr-1">点击引用字段</span>
          <ATooltip
            title={
              <div>
                <div>引用字段以 &quot;[&quot; 开始， &quot;]&quot; 结束</div>
                <div>请勿修改引用内容，否则将引用失败</div>
                <div>若输入与引用字段相同格式的内容，将被当作引用字段处理</div>
              </div>
            }
          >
            <InfoCircleOutlined />
          </ATooltip>
        </header>
        <div
          className="border rounded p-10px"
          style={{ height }}
        >
          <AInput
            className="mb-16px"
            placeholder="通过名称搜索"
            prefix={<SearchOutlined />}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <header className="pb-8px">维度</header>
          <div
            className="overflow-auto"
            style={{ height: 'calc(50% - 60px)' }}
          >
            {dOptions.length ? (
              dOptions.map((item: any, index: number) => (
                <ItemBox
                  disabled={disabled}
                  key={index}
                  onClick={() => {
                    if (disabled) return;
                    onSelect(item);
                  }}
                >
                  <div className="flex items-center">
                    <SvgIcon
                      className="mr-2"
                      localIcon="text"
                    />
                    <span className="text-14px">{item.tfieldShowName}</span>
                  </div>
                </ItemBox>
              ))
            ) : (
              <div className="w-full text-center">暂无数据</div>
            )}
          </div>
          <header className="flex items-center justify-between pb-8px">
            <span>指标</span>
            {notAddTarget ? null : (
              <ATooltip title={target.length ? '仅支持添加一个计算参数。' : '添加计算参数。'}>
                <AButton
                  type="text"
                  icon={
                    <SvgIcon
                      className="text-16px"
                      localIcon="add-calculated-params"
                    />
                  }
                  onClick={() => (target.length ? false : setVisible(true))}
                />
              </ATooltip>
            )}
          </header>
          <div
            className="overflow-auto"
            style={{ height: 'calc(50% - 50px)' }}
          >
            {!qOptions.length && !target.length ? (
              <div className="w-full text-center">暂无数据</div>
            ) : (
              <>
                {qOptions.map((item: any, index: number) => (
                  <ItemBox
                    disabled={disabled}
                    key={index}
                    onClick={() => {
                      if (disabled) return;
                      onSelect(item);
                    }}
                  >
                    <div className="flex items-center">
                      <SvgIcon
                        className="mr-2"
                        localIcon="text"
                      />
                      <span className="text-14px">{item.tfieldShowName}</span>
                    </div>
                  </ItemBox>
                ))}
                {target.length ? (
                  <ItemBox>
                    <div
                      className="w-full flex justify-between"
                      onClick={() => onSelect(target[0])}
                      onMouseLeave={() => setHoverTarget(false)}
                      onMouseOver={() => setHoverTarget(true)}
                    >
                      <div
                        className="flex items-center"
                        style={{ width: hoverTarget ? 'calc(100% - 40px)' : '100%' }}
                      >
                        <SvgIcon
                          className="mr-2 text-16px color-green"
                          localIcon="add-calculated-params"
                        />
                        <div
                          className="ellipsis-text overflow-hidden whitespace-nowrap text-14px"
                          title={target[0].originName}
                        >
                          {target[0].originName}
                        </div>
                      </div>
                      {hoverTarget ? (
                        <div className="flex items-center">
                          <EditOutlined
                            className="tex-14px mr-2"
                            onClick={() => setVisible(true)}
                          />
                          <DeleteOutlined
                            className="tex-14px"
                            onClick={() => setTarget([])}
                          />
                        </div>
                      ) : null}
                    </div>
                  </ItemBox>
                ) : null}
              </>
            )}
          </div>
        </div>

        {visible ? (
          <CalculatedParamsModal
            initialVal={target}
            tfieldId={tfieldId}
            onClose={handleCloseModal}
          />
        ) : null}
      </div>
    );
  }
);

export default QuoteField;
