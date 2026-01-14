import type { FC } from 'react'
import createSpace from '@/assets/imgs/home/create.png'
import copySpace from '@/assets/imgs/home/workspace.png'
import s from '../../home/index.module.scss'

export const ApprovSpace: FC = () => {
  return (
    <div className={`flex flex-col rounded-[10px] py-[14px] px-[20px] ${s['space-item']}`} style={{ boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.1)' }}>
      <AFlex align="center" justify="space-between" gap="16px">
        <div className="text-[18px] text-[#374557] text-nowrap flex-1 text-sm overflow-hidden text-ellipsis lh-[1.75rem] font-semibold">创建应用</div>
      </AFlex>
      <div className="bg-[#DCDCDC] h-[1px] w-full mt-[10px] mb-[23px]"></div>
      <AFlex align="center" justify="space-around">
        <div className="flex cursor-pointer flex-col items-center gap-[16px]">
          <img src={createSpace} alt="" className="w-[35px] h-[39px]" />
          创建空间
        </div>
        <div className="flex cursor-pointer flex-col items-center gap-[16px]">
          <img src={copySpace} alt="" className="w-[35px] h-[39px]" />
          复制空间
        </div>
      </AFlex>
    </div>
  )
}
