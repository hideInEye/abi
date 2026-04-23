import html2canvas from 'html2canvas';
import { downloadExtMap} from '@/constant/chat';
import { generateFilename, downloadFileByBlob, prepareTableForExport, createTempContainer, downloadImage } from '@/utils';
import { dataExport } from '@/service/api/conv';

export const handleDataExport = async (params: {
    key: 'csv' | 'excel';
    fileName: string;
    exportData: any;
  }) => {
    try {
      const res = await dataExport({ 
            ...params.exportData,
            exportType: params.key,
            fileName: params.fileName
        });
      downloadFileByBlob(res, generateFilename(params.fileName, downloadExtMap[params.key]));
    }
    catch (error) {
      throw new Error('数据导出失败');
    }
};

export const handleImageExport = async (type: 'table' | 'chart', ref: React.RefObject<any>, fileName?: string) => {
    if (!ref.current) return;
  
    try {
      let imageUrl: string;

      if (type === 'table') {
        const preparedTable = prepareTableForExport(ref.current);
        const tempContainer = createTempContainer(preparedTable);
        
        const canvas = await html2canvas(preparedTable, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: null,
          onclone: (clonedDoc) => {
            clonedDoc.querySelector('.ant-table')?.style.setProperty('box-shadow', 'none', 'important');
          }
        });
        
        document.body.removeChild(tempContainer);
        imageUrl = canvas.toDataURL('image/png');
      }
      else {
        const chartInstance = ref.current?.getInstance();
        if (!chartInstance) return;
        
        imageUrl = chartInstance.getDataURL({
          type: 'png',
          backgroundColor: '#fff',
          pixelRatio: 2
        });
      }
  
      downloadImage(
        imageUrl,
        generateFilename(fileName || `${type}数据`, 'png')
      );
    }
    catch (error) {
      throw new Error('图片导出失败');
    }
};