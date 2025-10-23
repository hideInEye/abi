export type LoginFormValues = {
  userName: string
  password: string
}

export type LoginModelState = {
  loading: boolean
}

export type loginModel = App.Model & {
  state: LoginModelState
}