import { apiRequest } from "@/services/request/index"
import { LoginFormValues } from "@/types/login"

export const login = (data: LoginFormValues) =>{

  return apiRequest({
    url: '/auth/login',
    method: 'POST',
    data
  })
}

export const getUserInfo = () => {
  return apiRequest({
    url: '/system/user/getInfo',
    method: 'GET',
  })
}