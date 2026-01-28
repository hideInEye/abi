import { useEffect, useState } from 'react';

import { $t } from '@/locales';
import { deleteSpace, spaceList } from '@/service/api/data-space';
import { spaceRoleList } from '@/service/api/role';

import { SpaceEdit } from './components/SpaceEdit';
import { SpaceItem } from './components/SpaceItem';
import SpaceSearch from './components/SpaceSearch';
import type { ISpaceItem } from './types';
import { message } from 'antd';

export function Component() {
  const [spaceData, setSpaceData] = useState<ISpaceItem[]>([]);

  const [pageNum, setPageNum] = useState(1);
  const pageSize = 12;
  const [total, setTotal] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editSpace, setEditSpace] = useState<ISpaceItem | null>(null);

  async function fetchSpaceData(params: {
    isAsc: 'asc' | 'desc';
    orderByColumn: string;
    pageNum: number;
    pageSize: number;
    spaceName?: string;
  }) {
    const res = await spaceList(params);
    const { data } = res.response as any;
    const { rows, total: totalCount } = data;
    setSpaceData(rows);
    setTotal(totalCount);
  }

  useEffect(() => {
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize
    });
  }, []);

  function searchHandler(searchText: string) {
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: 12,
      spaceName: searchText
    });
  }

  function addNewSpaceHandler() {
    spaceRoleList({ pageNum: 1, pageSize: 100000 }).then(res => {
      const { data } = res.data as any;
      if (Array.isArray(data)) {
        const haiRole = data.some(i => i.roleKey === 'creator');
        if (haiRole) {
          setDrawerOpen(true);
          setEditSpace(null);
        } else {
          message.error($t('page.home.noSpaceRoleTips'));
        }
      }
    });
  }

  function editSpaceHandler(space: ISpaceItem) {
    setDrawerOpen(true);
    setEditSpace(space);
  }

  async function deleteSpaceHandler(space: ISpaceItem) {
    await deleteSpace([space.spaceId]);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize
    });
  }

  function updateSpace() {
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum,
      pageSize
    });
  }

  function nextPageHandler(page: number) {
    setPageNum(page);
    fetchSpaceData({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: page,
      pageSize
    });
  }

  return (
    <ACard>
      <h1 className="text-base font-bold">{$t('page.home.mySpace')}</h1>
      <SpaceSearch
        addNewSpaceHandler={addNewSpaceHandler}
        searchHandler={searchHandler}
      />

      <div>
        <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {spaceData &&
            spaceData.map(item => (
              <SpaceItem
                deleteSpace={deleteSpaceHandler}
                key={item.spaceId}
                setEditSpace={editSpaceHandler}
                space={item}
              />
            ))}
        </section>
        <div className="flex justify-end mt-4 [&_.ant-pagination-item]:bg-[transparent]">
          <APagination
            current={pageNum}
            pageSize={pageSize}
            total={total}
            onChange={nextPageHandler}
          />
        </div>
      </div>

      {drawerOpen && (
        <SpaceEdit
          drawerOpen={drawerOpen}
          editSpace={editSpace}
          setDrawerOpen={setDrawerOpen}
          updateSpace={updateSpace}
        />
      )}
    </ACard>
  );
}
