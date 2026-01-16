export const HomeTitle = ({ title, action, onAction }: { title: string; action?: React.ReactNode; onAction?: () => void }) => {
  return (
    <>
      <AFlex className="pb-4" justify="space-between">
        <div className="font-semibold text-3xl text-[#333] leading-[2.625rem] text-left">{title}</div>
        {action && (
          <div className="py-[0.5625rem] cursor-pointer px-[1.0625rem] border border-[#3366FF] rounded-[1.125rem] text-[#3366FF]" onClick={onAction}>
            {action}
          </div>
        )}
      </AFlex>
    </>
  )
}
