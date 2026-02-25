type Props = {
  readonly bordered?: boolean;
  readonly description?: string;
  readonly className?: string;
};

export default function TableEmpty({ bordered = false, description = '暂无数据', className }: Props) {
  const baseClass = bordered ? 'rounded-8px border border-#f0f0f0 border-solid py-12' : '';
  const mergedClassName = [baseClass, className].filter(Boolean).join(' ');

  return (
    <div className={mergedClassName}>
      <AEmpty description={description} />
    </div>
  );
}

