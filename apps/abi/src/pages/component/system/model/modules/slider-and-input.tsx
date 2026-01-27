import { Slider } from 'antd';

interface PropsType {
  onChange?: (value: number) => void;
  value?: number;
}

const SliderAndInput: FC<PropsType & any> = memo(props => {
  return (
    <div className="flex">
      <Slider
        className="w-full"
        // max={20}
        min={0}
        // value={value}
        // onChange={onChange}
        {...props}
      />
      <AInputNumber
        min={0}
        style={{ margin: '0 16px', width: 200 }}
        precision={0}
        // value={value}
        // onChange={onChange as any}
        {...props}
      />
    </div>
  );
});

export default SliderAndInput;
