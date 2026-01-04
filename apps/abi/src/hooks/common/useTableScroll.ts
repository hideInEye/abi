import { useEffect, useRef, useState } from 'react';

// Minimal hook to compute antd table scroll config based on wrapper height
export function useTableScroll(offset = 200) {
  const tableWrapperRef = useRef<HTMLDivElement | null>(null);
  const [scrollConfig, setScrollConfig] = useState<{ y?: number }>(() => ({ y: undefined }));

  useEffect(() => {
    function update(): void {
      try {
        const el = tableWrapperRef.current;
        if (!el) {
          setScrollConfig({ y: undefined });
          return;
        }

        // compute available height inside wrapper
        const rect = el.getBoundingClientRect();
        const available = window.innerHeight - rect.top - offset - 30;
        setScrollConfig({ y: Math.max(200, Math.floor(available)) });
      } catch {
        setScrollConfig({ y: undefined });
      }
    }

    update();
    window.addEventListener('resize', update);
    const ro = new ResizeObserver(update);
    if (tableWrapperRef.current) ro.observe(tableWrapperRef.current);

    return () => {
      window.removeEventListener('resize', update);
      try {
        ro.disconnect();
      } catch {}
    };
  }, [offset]);

  return { scrollConfig, tableWrapperRef } as const;
}
