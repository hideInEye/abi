import { cloneDeep } from 'lodash';
import React from 'react';

import { formatNodeData } from '@/utils/data-collection-operate';

import DropBox from './DropBox';
import RelationModal from './RelationModal';

interface PropsType {
  nodeData: any;
  setNodeData: (data: any) => void;
}

const updateParentNode = (node: any, dsFields: any) => {
  node.currentDsFields = dsFields;
};

const loopChildNodeToUpdateParent = (array: any[], parentN: any, curN: any) => {
  const { parentDsFields } = curN;
  for (let index = 0; index < array?.length; index += 1) {
    const item = array[index];
    if (item.uniqueId === parentN.uniqueId) {
      updateParentNode(item, parentDsFields);
    } else {
      loopChildNodeToUpdateParent(item.childrenDs!, parentN, curN);
    }
  }
};

const loopChildNodeToUpdateCur = (array: any[], parentN: any, curN: any) => {
  const { currentDsFields, unionToParent } = curN;
  for (let index = 0; index < array?.length; index += 1) {
    const item = array[index];
    if (item.uniqueId === curN.uniqueId) {
      item.currentDsFields = currentDsFields;
      item.unionToParent = unionToParent;
    } else {
      loopChildNodeToUpdateCur(item.childrenDs!, parentN, curN);
    }
  }
};

const TreeNode: React.FC<PropsType> = memo(({ nodeData, setNodeData }) => {
  // const [cacheNodeData, setCacheNodeData] = useState(nodeData);
  const [relation, setRelation] = useState<any>();
  const handleSetRelation = (current: any, parent: any) => {
    setRelation({ current, parent });
  };
  const onRelationClose = (submit?: boolean, data?: any) => {
    if (submit) {
      console.log(data);
      // const { parentDsFields, ...curInsert } = data;
      // const update = { currentDsFields: parentDsFields };
      setNodeData((_state: any) => {
        const state = cloneDeep(_state);
        console.log('父节点', nodeData);
        if (state.uniqueId === nodeData!.uniqueId) {
          updateParentNode(state, data.parentDsFields);
        }
        loopChildNodeToUpdateParent(state.childrenDs!, nodeData!, data);
        loopChildNodeToUpdateCur(state.childrenDs!, nodeData!, data);
        console.log(state);
        return formatNodeData(state);
      });
    }
    setRelation(undefined);
  };
  return (
    <>
      <div className="relative flex pb-[10px]">
        <DropBox nodeData={nodeData} />
        {nodeData.childrenDs?.length ? (
          <>
            {/* 每个根节点多一节 */}
            <div className="relative top-20px h-1px w-20px bg-#ccc" />
            <div>
              {nodeData.childrenDs?.map((childNodeData: any, index: number) => (
                <div
                  className="relative flex"
                  key={index}
                >
                  {/* 竖线 */}
                  {nodeData.childrenDs!.length === index + 1 ? null : (
                    <span
                      className={`absolute bottom-[-20px] left-0 block border-l border-#ccc ${index ? 'top-0' : 'top-20px'}`}
                    />
                  )}
                  <i
                    className="cursor-pointer"
                    onClick={() => handleSetRelation(childNodeData, nodeData)}
                  >
                    <SvgIcon
                      className="absolute left-50px top-9px z-1 text-24px"
                      localIcon={`connect-${childNodeData.unionToParent?.unionType}`}
                    />
                  </i>
                  <span className="relative left-0 top-20px block h-1px w-100px bg-#ccc" />
                  <TreeNode
                    nodeData={childNodeData}
                    setNodeData={setNodeData}
                  />
                </div>
              ))}
            </div>
          </>
        ) : null}
      </div>
      {relation ? (
        <RelationModal
          data={relation}
          onClose={onRelationClose}
        />
      ) : null}
    </>
  );
});

export default TreeNode;
