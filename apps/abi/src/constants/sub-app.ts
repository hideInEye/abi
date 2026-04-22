export const SUB_APP_TOP_LEVEL_WHITE_ROUTE_NAMES = ['ai-assistant'] as const;

export const SUB_APP_PERMISSION_WHITE_ROUTE_NAMES = [
  'ai-assistant',
  'ai-assistant_conversational-analysis'
] as const;

const SUB_APP_PERMISSION_WHITE_ROUTE_PATH_PREFIXES = ['/ai-assistant'] as const;

function normalizePath(path?: string | null) {
  if (!path) return '';
  return path.trim();
}

export function isSubAppPermissionWhitePath(path?: string | null) {
  const currentPath = normalizePath(path);
  if (!currentPath) return false;

  return SUB_APP_PERMISSION_WHITE_ROUTE_PATH_PREFIXES.some(prefix => {
    return (
      currentPath === prefix ||
      currentPath.startsWith(`${prefix}/`) ||
      currentPath.includes(`${prefix}/`) ||
      currentPath.endsWith(prefix)
    );
  });
}

export function isSubAppPermissionWhiteRouteName(routeName?: string | null) {
  if (!routeName) return false;
  return SUB_APP_PERMISSION_WHITE_ROUTE_NAMES.includes(routeName as (typeof SUB_APP_PERMISSION_WHITE_ROUTE_NAMES)[number]);
}

