import React, { useCallback, useState, useEffect } from 'react';
import SvgIcon from "../../components/SvgIcon";
import { RedoOutlined } from "@ant-design/icons";

interface OpeningsEleProps {
  data: {
    context: string;
    question: { 
      items:any[],
      page:number,
      page_size:number,
      total_count:number,
      total_pages:number,
    };
  };
  getAnswer?: (props: any) => void;
}

const OpeningsEle: React.FC<OpeningsEleProps> = ({ data, getAnswer }) => {
  const [batchIndex, setBatchIndex] = useState(0);
  // 当数据更新时重置batchIndex
  useEffect(() => {
    setBatchIndex(0);
  }, [data?.question?.items]);

  const formattedContext = data?.context?.split('\n').map((line, index) => (
    <span key={index}>
      {line}
      <br />
    </span>
  ));
  const itemsData:any = data?.question?.items || []
  const oneBatch = 3;

  const handleChangeBatch = useCallback((allData: string[]) => {
    // 计算下一批的起始位置
    const nextBatchStart = (batchIndex + 1) * oneBatch;
    
    // 如果下一批的起始位置超出数据长度，回到第一批
    if (nextBatchStart >= allData.length) {
      setBatchIndex(0);
    } else {
      setBatchIndex(batchIndex + 1);
    }
  }, [batchIndex, oneBatch])

  const handleRefreshRecommendations = useCallback(() => {
    handleChangeBatch(itemsData);
  }, [handleChangeBatch, itemsData])

  return (
    <div className="my-4 w-full flex items-start">
      <div className="flex-shrink-0">
        <SvgIcon
          className="text-[30px]"
          localIcon="bot"
        />
      </div>
      <div className="ml-2 max-w-[80%]">
        <div className="bg-[#e8eefb] rounded-lg px-4 py-2 text-[13px] text-gray-700 relative" style={{ lineHeight: 1.5 }}>
          <div className="absolute left-[-6px] top-3 w-3 h-3 bg-[#e8eefb] transform rotate-45"></div>
          {formattedContext}
          <>
            {
              itemsData !== undefined && (
                itemsData?.length ? (
                  <div className='mt-[20px]'>
                    {
                      itemsData.slice(oneBatch * batchIndex, oneBatch * (batchIndex + 1)).map((question: string,index:number) => (
                        <p key={question} className="mb-2">
                          <a onClick={() => {
                            getAnswer!({ question });
                          }}>{oneBatch * batchIndex + index + 1}.{question}</a>
                        </p>
                      ))
                    }
                    {
                      itemsData.length > oneBatch && (
                        <div className="flex items-center justify-center mt-4 mb-2">
                          <a onClick={handleRefreshRecommendations}><RedoOutlined />再换一批</a>
                        </div>)
                    }
                  </div>
                ) : ''
              )
            }
          </>
        </div>
      </div>
    </div>
  );
};

export default OpeningsEle;