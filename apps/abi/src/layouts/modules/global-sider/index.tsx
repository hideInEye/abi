import { default as assistIcon, default as DeassistIcon } from '@/assets/imgs/home/assis.png'
import componentsIcon from '@/assets/imgs/home/components.png'
import DecomponentsIcon from '@/assets/imgs/home/decomponents.png'
import DedialogueIcon from '@/assets/imgs/home/dedialogue.png'
import DehomeIcon from '@/assets/imgs/home/dehome.png'
import DeworkbenchIcon from '@/assets/imgs/home/deworkbench.png'
import dialogueIcon from '@/assets/imgs/home/dialogue.png'
import homeIcon from '@/assets/imgs/home/home.png'
import appLogo from '@/assets/imgs/home/home_logo.png'
import DeuserIcon from '@/assets/imgs/home/hoveruser.png'
import userIcon from '@/assets/imgs/home/user.png'
import workbenchIcon from '@/assets/imgs/home/workbench.png'
import { selectSelectedMenuKey, selectSelectedSecondaryMenuKey, setSelectedMenuKey, setSelectedSecondaryMenuKey } from '@/store/slice/layout'

import { Layout } from 'antd'
import { useRouter } from '~/packages/simple-router/src'
const { Sider } = Layout

const primaryMenuData = [
  { key: 'home', label: '主页', icon: homeIcon, checkIcon: DehomeIcon,url: '/home' },
  { key: 'dialogue', label: '对话', icon: dialogueIcon, checkIcon: DedialogueIcon ,url: '/ai-assistant/conversational-analysis' },
  { key: 'workbench', label: '工作台', icon: workbenchIcon, checkIcon: DeworkbenchIcon ,url: '/workbench' },
  { key: 'components', label: '组件', icon: componentsIcon, checkIcon: DecomponentsIcon ,url: '/components' },
]

const secondaryMenuData = [
  { key: 'assist', icon: assistIcon, checkIcon: DeassistIcon },
  { key: 'user', icon: userIcon, checkIcon: DeuserIcon },
]

const GlobalSider: FC = memo(() => {
  const  selectedMenuKey  = useAppSelector(selectSelectedMenuKey)
  const  selectedSecondaryMenuKey  = useAppSelector(selectSelectedSecondaryMenuKey)
  const router = useRouter()
  const dispatch = useAppDispatch()
  const redirectHome = () => {
    router.push('/home', {
      query: {
        redirect: '/home'
      }
    })
  }
  return (
    <Sider width="5.5rem" className="fixed left-0 top-0 h-screen bg-white">
      <div className="flex h-full flex-col justify-between items-center py-6">
        <div className="mt-6 mb-10 flex items-center justify-center cursor-pointer" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="h-14 w-14 rounded-full shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.28)]" />
        </div>
        <div className="flex gap-[1.6875rem] flex-col text-[#848FA2]">
          {primaryMenuData.map((item) => {
            const isActive = item.key !== selectedMenuKey
            return (
              <div
                onClick={() => {
                  dispatch(setSelectedMenuKey(item.key))
                  router.push(item.url)
                }}
                className={`flex items-center px-3 py-[0.6875rem] flex-col gap-[0.5625rem] cursor-pointer ${!isActive ? 'bg-[#fff] shadow-[0_0.25rem_0.375rem_0_rgba(137,147,166,0.15)] rounded-[0.625rem] text-[#3366FF]' : ''}`}
              >
                <img src={isActive ? item.checkIcon : item.icon} alt={item.label} className="h-6 w-6" />
                <span className="text-base">{item.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex gap-6 flex-col text-[#848FA2]">
          {secondaryMenuData.map((item) => {
            const isActive = item.key === selectedSecondaryMenuKey
            return (
              <div
                onClick={() => {
                  dispatch(setSelectedSecondaryMenuKey(item.key))
                  dispatch(setSelectedMenuKey(''))
                }}
              >
                <img src={isActive ? item.checkIcon : item.icon} className="h-6 w-6" />
                {/* <span className="text-base">{item.label}</span> */}
              </div>
            )
          })}
        </div>
      </div>
    </Sider>
  )
})

export default GlobalSider
