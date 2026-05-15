import { Avatar, Typography } from 'antd'

type UserProfileCardProps = {
  collapsed: boolean
  userName: string
}

function getUserInitial(userName: string): string {
  const initial = userName.trim().charAt(0).toUpperCase()
  return initial || 'U'
}

export function UserProfileCard({ collapsed, userName }: UserProfileCardProps) {
  return (
    <div className={`mt-2.5 min-h-16 rounded-xl bg-[#f7f8fa] py-3 flex items-center transition-[padding] duration-200 ease-out ${collapsed ? 'px-2 justify-center' : 'px-3'}`}>
      <Avatar size={40} className="shrink-0">
        {getUserInitial(userName)}
      </Avatar>
      <div className={`min-w-0 overflow-hidden transition-all duration-200 ease-out ${collapsed ? 'ml-0 w-0 opacity-0' : 'ml-2.5 w-[130px] opacity-100'}`}>
        <Typography.Text className="block truncate text-[18px] font-semibold text-[#111827]">{userName}</Typography.Text>
      </div>
    </div>
  )
}

