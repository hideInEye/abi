import { RouterProvider } from '@tanstack/react-router';
import { useMemo } from 'react';

import './App.css';
import { createAppRouter } from './router';

function App({ spaceId }: { spaceId?: number }) {
  const router = useMemo(() => createAppRouter(), []);

  return (
    <div className="App" style={{ height: '100%' }}>
      <RouterProvider router={router} context={{ spaceId }} />
    </div>
  );
}

export default App;
