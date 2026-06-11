import emptySvg from '@/assets/svg-icon/Empty-rafiki.svg'

const WorkbenchEmpty: FC = () => {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%'
    }}>
      {/* 插画视觉居中：SVG 内部构图偏右，用 transform 向左微调 */}
      <img
        src={emptySvg}
        alt="empty"
        style={{ width: 400, height: 400, transform: 'translateX(-20px)' }}
      />
      <p style={{ marginTop: 48, color: '#768a9f', fontSize: 16, letterSpacing: 1 }}>
        点击左侧菜单栏，开始进入工作环境
      </p>
    </div>
  )
}

export default WorkbenchEmpty
