import { Spin } from 'antd';
import { useSelector } from 'react-redux';

import type { RootState } from '@/store';

const GlobalLoading = () => {
    // 兼容 combineSlices 后的 loading reducer
    const pageLoading = useSelector((state: RootState) => (state.loading ? state.loading.pageLoading : false));

    if (!pageLoading) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(255,255,255,0.5)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <Spin size="large" tip="加载中..." />
        </div>
    );
};

export default GlobalLoading;
