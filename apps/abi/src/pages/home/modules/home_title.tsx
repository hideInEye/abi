export const HomeTitle = ({ title, action, onAction }: { title: string; action?: React.ReactNode; onAction?: () => void }) => {
  return (
    <>
      <AFlex className="pb-[16px]" justify="space-between">
        <div className="font-semibold text-30px text-[#333] leading-42px text-left">{title}</div>
        {action && (
          <div className="py-9px cursor-pointer px-17px border border-[#3366FF] rounded-[18px] text-[#3366FF]" onClick={onAction}>
            {action}
          </div>
        )}
      </AFlex>
    </>
  )
}
