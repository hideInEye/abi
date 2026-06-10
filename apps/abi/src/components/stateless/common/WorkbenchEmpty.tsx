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
      <img src={emptySvg} alt="empty" style={{ width: 400, height: 400 }} />
      <p style={{ marginTop: 24, color: '#768a9f', fontSize: 16, letterSpacing: 1 }}>
        点击左侧菜单栏，开始进入工作环境
      </p>
    </div>
  )
}

export default WorkbenchEmpty
