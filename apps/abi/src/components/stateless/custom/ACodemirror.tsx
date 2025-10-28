import CodeMirror from '@uiw/react-codemirror';

interface Props {
  readonly onChange?: (val: string) => void;
  readonly value?: string;
}

const ACodemirror = ({ onChange, value, ...props }: Props & any) => {
  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      {...props}
    />
  );
};

export default ACodemirror;
