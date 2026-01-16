import type { FC } from 'react'
import createSpace from '@/assets/imgs/home/create.png'
import copySpace from '@/assets/imgs/home/workspace.png'
import s from '../../home/index.module.scss'

export const ApprovSpace: FC = () => {
  return (
    <div className={`flex flex-col rounded-[0.625rem] py-3.5 px-5 shadow-[0_0.5rem_1rem_0_rgba(0,0,0,0.1)] ${s['space-item']}`}>
      <AFlex align="center" justify="space-between" className="gap-4">
        <div className="text-lg text-[#374557] text-nowrap flex-1 text-sm overflow-hidden text-ellipsis leading-7 font-semibold">创建应用</div>
      </AFlex>
      <div className="bg-[#DCDCDC] h-px w-full mt-2.5 mb-[1.4375rem]"></div>
      <AFlex align="center" justify="space-around">
        <div className="flex cursor-pointer flex-col items-center gap-4">
          <img src={createSpace} alt="" className="w-[2.1875rem] h-[2.4375rem]" />
          创建空间
        </div>
        <div className="flex cursor-pointer flex-col items-center gap-4">
          <img src={copySpace} alt="" className="w-[2.1875rem] h-[2.4375rem]" />
          复制空间
        </div>
      </AFlex>
    </div>
  )
}
