import type { MenuProps } from 'antd';
import { Dropdown } from 'antd';
import { cloneDeep } from 'lodash';
import React from 'react';
import { useDrop } from 'react-dnd';

import { formatNodeData, formatToParamsData } from '@/utils/data-collection-operate';

import { DataCollectionOperateContext } from '../context';

import FieldSelectModal from './FieldSelectModal';
import RelationModal from './RelationModal';

const loopChildNodeToDelete = (array: any[], deleteNode: Api.DataPreparation.NodeType) => {
  for (let index = 0; index < array?.length; index += 1) {
    const item = array[index];
    if (item.uniqueId === deleteNode.uniqueId) {
      array.splice(index, 1);
    } else {
      loopChildNodeToDelete(item.childrenDs!, deleteNode);
    }
  }
};

const insertNode = (node: any, insert: Api.DataPreparation.NodeType, updateNodeField?: any) => {
  if (updateNodeField) {
    node.currentDsFields = updateNodeField;
  }
  if (node?.childrenDs) {
    node.childrenDs.push(insert);
  } else {
    node.childrenDs = [insert];
  }
  // return node;
};

const updateNode = (node: any, update: any) => {
  node.currentDsFields = update.currentDsFields;
};

// eslint-disable-next-line max-params
const loopChildNode = (array: any[], curNode: any, insert: any, updateNodeField?: any) => {
  for (let index = 0; index < array?.length; index += 1) {
    const item = array[index];
    if (item.uniqueId === curNode.uniqueId) {
      insertNode(item, insert, updateNodeField);
    } else {
      loopChildNode(item.childrenDs!, curNode, insert, updateNodeField);
    }
  }
};

const loopChildNodeToUpdate = (array: any[], curNode: any, update: any) => {
  for (let index = 0; index < array?.length; index += 1) {
    const item = array[index];
    if (item.uniqueId === curNode.uniqueId) {
      updateNode(item, update);
    } else {
      loopChildNodeToUpdate(item.childrenDs!, curNode, update);
    }
  }
};

const DropBox: React.FC<any> = memo(({ nodeData }) => {
  const ref = useRef(null);
  const { setNodeData } = useContext(DataCollectionOperateContext);
  const [relation, setRelation] = useState<any>();
  const [editNode, setEditNode] = useState<Api.DataPreparation.NodeType>();
  const [onlyUpdate, setOnlyUpdate] = useState(false);

  const [, drop] = useDrop({
    accept: 'box',
    drop(item: Api.DataPreparation.NodeType) {
      console.log('当前节点', nodeData);
      console.log('传进来的', item);
      // const current = formatToParamsData(nodeData);
      const insert = formatToParamsData(item);
      // setEditNode({ ...insert, parent: nodeData });
      setRelation({ current: insert, parent: nodeData });
      // setNodeData((_state: Api.DataPreparation.NodeType) => {
      //   const state = cloneDeep(_state);
      //   if (state.uniqueId === nodeData!.uniqueId) {
      //     insertNode(state, item);
      //   } else {
      //     loopChildNode(state.childrenDs!, nodeData!, item);
      //   }

      //   return formatNodeData(state);
      // });
    }
  });
  useEffect(() => {
    if (nodeData?.currentDs?.tableName) {
      drop(ref);
    }
  }, [drop, nodeData]);

  const handleDeleteNode = (e: any) => {
    e.stopPropagation();
    setNodeData((_state: any) => {
      const state = cloneDeep(_state);
      // 如果是根节点
      if (state.uniqueId === nodeData!.uniqueId) {
        return {};
      }
      loopChildNodeToDelete(state.childrenDs!, nodeData!);

      return formatNodeData(state);
    });
  };

  const nodeOptBtns: MenuProps['items'] = [
    {
      key: 'edit',
      label: <span className="cursor-pointer">字段选择</span>
    },
    {
      key: 'delete',
      label: (
        <span
          className="cursor-pointer"
          onClick={handleDeleteNode}
        >
          删除
        </span>
      )
    }
  ];

  const handleEditFieldSelect = () => {
    setEditNode(nodeData);
    setOnlyUpdate(true);
  };

  const onClose = (submit?: boolean, curInsert?: any) => {
    if (submit) {
      setNodeData((_state: any) => {
        const state = cloneDeep(_state);
        if (state.uniqueId === nodeData!.uniqueId) {
          if (onlyUpdate) {
            updateNode(state, curInsert);
          } else {
            insertNode(state, curInsert);
          }
        } else if (onlyUpdate) {
          loopChildNodeToUpdate(state.childrenDs!, nodeData!, curInsert);
        } else {
          loopChildNode(state.childrenDs!, nodeData!, curInsert);
        }

        return formatNodeData(state);
      });
    }
    setEditNode(undefined);
    setOnlyUpdate(false);
  };

  const onRelationClose = (submit?: boolean, data?: any) => {
    if (submit) {
      console.log(data);
      const { parentDsFields, ...curInsert } = data;
      setNodeData((_state: any) => {
        const state = cloneDeep(_state);
        console.log('父节点', nodeData);
        if (state.uniqueId === nodeData!.uniqueId) {
          insertNode(state, curInsert, parentDsFields);
        } else {
          loopChildNode(state.childrenDs!, nodeData!, curInsert);
        }
        console.log(state);
        return formatNodeData(state);
      });
    }
    setRelation(undefined);
  };

  return nodeData?.currentDs?.tableName ? (
    <>
      <div
        className="h-fit flex cursor-pointer items-center justify-between border border-l-2 border-l-blue rounded p-2 hover:border-color-blue"
        ref={ref}
        onClick={handleEditFieldSelect}
      >
        <span className="mr-2 w-150px flex items-center">
          <SvgIcon localIcon="db" />
          <ATooltip title={nodeData?.currentDs?.tableName}>
            <span className="ml-2 overflow-hidden text-ellipsis whitespace-nowrap">{nodeData?.currentDs?.tableName}</span>
          </ATooltip>
        </span>
        <Dropdown
          menu={{ items: nodeOptBtns }}
          trigger={['click']}
        >
          <span
            className="cursor-pointer rounded px-4px py-4px hover:bg-#e8e9e9"
            onClick={(e: any) => e.stopPropagation()}
          >
            <SvgIcon
              className="text-14px"
              localIcon="more"
            />
          </span>
        </Dropdown>
      </div>
      {editNode ? (
        <FieldSelectModal
          data={editNode}
          onClose={onClose}
        />
      ) : null}

      {relation ? (
        <RelationModal
          data={relation}
          onClose={onRelationClose}
        />
      ) : null}
    </>
  ) : (
    <div />
  );
});

export default DropBox;
