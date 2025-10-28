import { PlayCircleOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { Tabs, message } from 'antd';
import type { Dispatch } from 'react';
import React from 'react';

import { getPreviewSql } from '@/service/api';

import styles from '../index.module.css';

import DataPreview from './DataPreview';

interface PropsType {
  previewData: any;
  setPreviewData: Dispatch<any>;
  sourceId?: string;
  sql: string;
}

const BottomSql: React.FC<PropsType> = memo(({ previewData, setPreviewData, sourceId, sql }) => {
  const [loading, setLoading] = useState(false);

  const items: TabsProps['items'] = [
    {
      children: (
        <DataPreview
          isSql
          previewData={previewData}
        />
      ),
      key: '1',
      label: '运行结果'
    }
  ];

  const handlePreview = async () => {
    if (!sql) {
      message.error('请输入sql语句');
    }
    if (!sourceId) {
      message.error('请选择数据源');
    }
    try {
      setLoading(true);
      const res = await getPreviewSql({
        sourceId,
        sql
      });
      if (res.data) {
        setPreviewData(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-full">
      <Tabs
        className={styles['bottom-tabs-container']}
        defaultActiveKey="1"
        items={items}
      />
      <div className="absolute right-10px top-8px">
        <AButton
          icon={<PlayCircleOutlined className="text-[12px]" />}
          loading={loading}
          size="small"
          onClick={handlePreview}
        >
          运行
        </AButton>
      </div>
    </div>
  );
});

export default BottomSql;
