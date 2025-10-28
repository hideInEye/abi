import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    pageLoading: false
};

const loadingSlice = createSlice({
    name: 'loading',
    initialState,
    reducers: {
        showPageLoading(state) {
            state.pageLoading = true;
        },
        hidePageLoading(state) {
            state.pageLoading = false;
        }
    }
});

export const { hidePageLoading, showPageLoading } = loadingSlice.actions;
export default loadingSlice.reducer;
