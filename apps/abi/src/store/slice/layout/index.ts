import { createSlice } from '@reduxjs/toolkit'

import type { PayloadAction } from '@reduxjs/toolkit'

interface InitialStateType {
  selectedMenuKey: string
  selectedSecondaryMenuKey: string
}

const initialState: InitialStateType = {
  selectedMenuKey: '',
  selectedSecondaryMenuKey: '',
}

export const layoutSlice = createSlice({
  initialState,
  name: 'layout',
  reducers: {
    setSelectedMenuKey(state, action: PayloadAction<string>) {
      state.selectedMenuKey = action.payload
    },
    setSelectedSecondaryMenuKey(state, action: PayloadAction<string>) {
      state.selectedSecondaryMenuKey = action.payload
    },
  },
  selectors: {
    selectSelectedMenuKey: (auth) => auth.selectedMenuKey,
    selectSelectedSecondaryMenuKey: (auth) => auth.selectedSecondaryMenuKey,
  },
})
export const { selectSelectedMenuKey, selectSelectedSecondaryMenuKey } = layoutSlice.selectors
export const { setSelectedMenuKey, setSelectedSecondaryMenuKey } = layoutSlice.actions
