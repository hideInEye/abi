import { AppstoreOutlined, DownOutlined, SettingOutlined, UnorderedListOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

export interface ColumnOption {
  /** Column key (must be unique) */
  key: string;
  /** Display label */
  label: string;
  /** Whether the column is currently visible */
  visible: boolean;
}

interface ViewControlsProps {
  /** Current view mode */
  viewMode?: 'list' | 'card';
  /** Called when view mode changes */
  onViewModeChange?: (mode: 'list' | 'card') => void;
  /** Column options for the picker */
  columns: ColumnOption[];
  /** Called when column visibility changes */
  onColumnToggle: (key: string, visible: boolean) => void;
  /** Hide view mode toggle (list/card) buttons */
  hideViewToggle?: boolean;
}

/**
 * 视图切换 + 列选择器 — v5 风格
 * 包含：列表/豆腐块切换按钮 + 列可见性选择下拉
 */
export function ViewControls({
  columns,
  hideViewToggle = false,
  onColumnToggle,
  onViewModeChange,
  viewMode = 'list',
}: ViewControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
      {/* View Toggle */}
      {!hideViewToggle && (
        <div className="abi-view-toggle">
          <button
            className={`abi-vt-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('list')}
            title="列表视图"
          >
            <UnorderedListOutlined />
          </button>
          <button
            className={`abi-vt-btn ${viewMode === 'card' ? 'active' : ''}`}
            onClick={() => onViewModeChange?.('card')}
            title="卡片视图"
          >
            <AppstoreOutlined />
          </button>
        </div>
      )}

      {/* Column Picker */}
      <div className="abi-col-picker" ref={dropdownRef}>
        <button className="abi-col-picker-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <SettingOutlined />
          列设置
          <DownOutlined style={{ fontSize: 11, transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'none' }} />
        </button>
        {dropdownOpen && (
          <div className="abi-col-dropdown">
            {columns.map(col => (
              <label key={col.key}>
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={e => onColumnToggle(col.key, e.target.checked)}
                />
                {col.label}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
