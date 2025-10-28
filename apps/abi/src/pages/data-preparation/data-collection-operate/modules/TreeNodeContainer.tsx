import type { FC } from 'react';
import { useDrop } from 'react-dnd';

import { formatNodeData, formatToParamsData } from '@/utils/data-collection-operate';

import { DataCollectionOperateContext } from '../context';

import FieldSelectModal from './FieldSelectModal';
import TreeNode from './TreeNode';

export const TreeNodeContainer: FC = () => {
  const ref = useRef<any>(null);
  const [editNode, setEditNode] = useState<any>();
  const { nodeData, setNodeData } = useContext(DataCollectionOperateContext);

  const useDropFn = useCallback(() => {
    return {
      accept: 'box',
      canDrop(_item: any, monitor: any) {
        const isOver = monitor.isOver({ shallow: true });
        return isOver;
      },
      drop(item: Api.DataPreparation.NodeType) {
        // 如果已经有根元素了，则不再有后续
        if (ref.current?.children?.[0]?.children?.[0].children?.length) return;
        const formatData = formatToParamsData(item);
        setEditNode(formatData);

        // setNodeData((state: any) => {
        //   return formatNodeData(state?.name ? state : item);
        // });
      }
      // hover(item, monitor) {
      //   const isOver = monitor.isOver({ shallow: true });
      //   console.log(isOver);
      // }
    };
  }, [nodeData]);

  const [, drop] = useDrop(useDropFn);

  useEffect(() => {
    drop(ref);
  }, [drop, nodeData, ref]);

  const onClose = (submit?: boolean, curInsert?: any) => {
    if (submit) {
      console.log(curInsert);
      setNodeData((state: any) => {
        console.log(state);
        return formatNodeData(state?.currentDs ? state : curInsert);
      });
    }
    setEditNode(undefined);
  };

  return (
    <>
      <div
        className="h-full p-4"
        ref={ref}
      >
        <TreeNode
          nodeData={nodeData}
          setNodeData={data => setNodeData(data)}
        />
      </div>
      {editNode ? (
        <FieldSelectModal
          data={editNode}
          onClose={onClose}
        />
      ) : null}
    </>
  );
};
