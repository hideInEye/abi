export type LoginFormValues = {
  username: string
  password: string
}

export type LoginModelState = {
  loading: boolean
}

export type loginModel = App.Model & {
  state: LoginModelState
}