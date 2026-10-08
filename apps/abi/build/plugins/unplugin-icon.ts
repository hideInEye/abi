import path from 'node:path';
import process from 'node:process';

import { FileSystemIconLoader } from 'unplugin-icons/loaders';
import Icons from 'unplugin-icons/vite';
import type { PluginOption } from 'vite';

export function setupUnPluginIcon(viteEnv: Env.ImportMeta) {
  const { VITE_ICON_LOCAL_PREFIX, VITE_ICON_PREFIX } = viteEnv;
  
  const localIconPath = path.join(process.cwd(), 'src/assets/svg-icon');
  
  /** The name of the local icon collection */
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, '');
  
  const plugins: PluginOption[] = [
    Icons({
      compiler: 'jsx',
      customCollections: {
        [collectionName]: FileSystemIconLoader(localIconPath, svg =>
          svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')
        )
      },
      defaultClass: 'inline-block',
      jsx: 'react',
      scale: 1
    })
  ];

  return plugins;
}
