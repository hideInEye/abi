interface PropsType {
  data: any;
}

const HumanEle: React.FC<PropsType> = memo(({ data }) => {
  return (
    <div className="my-6 w-full flex justify-end">
      <span className="max-width-[70%] mr-2 block rounded-lg bg-#e8eefb p-2 text-black" style={{ whiteSpace: 'pre-wrap' }}>{data?.context}</span>
      <SvgIcon
        className="text-[30px]"
        localIcon="user"
      />
    </div>
  );
});

export default HumanEle;
