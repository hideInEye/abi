import { transformRecordToOption } from '@/utils/common';

export const enableStatusRecord: Record<Api.Common.EnableStatus, App.I18n.I18nKey> = {
  '0': 'page.manage.common.status.enable',
  '1': 'page.manage.common.status.disable'
};

export const enableStatusOptions = transformRecordToOption(enableStatusRecord);

export const permissonRanaeRecord: Record<Api.Common.PermissionRanage, App.I18n.I18nKey> = {
  '1': 'page.manage.role.permissionRangeMap.all',
  '2': 'page.manage.role.permissionRangeMap.custom',
  '3': 'page.manage.role.permissionRangeMap.department',
  '4': 'page.manage.role.permissionRangeMap.departmentAndBelow',
  '5': 'page.manage.role.permissionRangeMap.myself'
};

export const permissonRanaeOptions = transformRecordToOption(permissonRanaeRecord);

export const userGenderRecord: Record<Api.SystemManage.UserGender, App.I18n.I18nKey> = {
  '0': 'page.manage.user.gender.male',
  '1': 'page.manage.user.gender.female'
};

export const userGenderOptions = transformRecordToOption(userGenderRecord);

export const menuTypeRecord: Record<Api.SystemManage.MenuType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.type.directory',
  '2': 'page.manage.menu.type.menu',
  // '3': 'page.manage.menu.type.button'
};

export const menuTypeOptions = transformRecordToOption(menuTypeRecord);

export const menuCacheRecord: Record<Api.SystemManage.MenuCache, App.I18n.I18nKey> = {
  '0': 'page.manage.menu.menuCache.cache',
  '1': 'page.manage.menu.menuCache.donotcache'
};

export const menuCacheOptions = transformRecordToOption(menuCacheRecord);

export const menuVisibleRecord: Record<Api.SystemManage.MenuVisible, App.I18n.I18nKey> = {
  '0': 'common.visible.show',
  '1': 'common.visible.hidden'
};

export const menuVisibleOptions = transformRecordToOption(menuVisibleRecord);

export const menuIconTypeRecord: Record<Api.SystemManage.IconType, App.I18n.I18nKey> = {
  '1': 'page.manage.menu.iconType.iconify',
  '2': 'page.manage.menu.iconType.local'
};

export const menuIconTypeOptions = transformRecordToOption(menuIconTypeRecord);
