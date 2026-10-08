// @unocss-include
import systemLogo from '@/assets/svg-icon/logo.svg?raw';
import { $t } from '@/locales';
import { localStg } from '@/utils/storage';

function getLoadingRgb(color: string) {
  const shortHex = /^#([\da-f])([\da-f])([\da-f])$/i.exec(color);
  if (shortHex) {
    const [, r, g, b] = shortHex;
    return { b: Number.parseInt(`${b}${b}`, 16), g: Number.parseInt(`${g}${g}`, 16), r: Number.parseInt(`${r}${r}`, 16) };
  }

  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(color);
  if (hex) {
    return { b: Number.parseInt(hex[3], 16), g: Number.parseInt(hex[2], 16), r: Number.parseInt(hex[1], 16) };
  }

  const rgb = /^rgba?\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)/i.exec(color);
  if (rgb) return { b: Number(rgb[3]), g: Number(rgb[2]), r: Number(rgb[1]) };

  return { b: 255, g: 108, r: 100 };
}

export function setupLoading() {
  const themeColor = localStg.get('themeColor') || '#646cff';

  const { b, g, r } = getLoadingRgb(themeColor);

  const primaryColor = `--primary-color: ${r} ${g} ${b}`;

  const loadingClasses = [
    'left-0 top-0',
    'left-0 bottom-0 animate-delay-500',
    'right-0 top-0 animate-delay-1000',
    'right-0 bottom-0 animate-delay-1500'
  ];

  const logoWithClass = systemLogo.replace('<svg', `<svg class="size-128px text-primary"`);

  const dot = loadingClasses
    .map(item => {
      return `<div class="absolute w-16px h-16px bg-primary rounded-8px animate-pulse ${item}"></div>`;
    })
    .join('\n');

  const loading = `
<div class="fixed-center flex-col" style="${primaryColor}">
  ${logoWithClass}
  <div class="w-56px h-56px my-36px">
    <div class="relative h-full animate-spin">
      ${dot}
    </div>
  </div>
  <h2 class="text-28px font-500 text-#646464">${$t('system.loading')}</h2>
</div>`;

  const app = document.getElementById('root');

  if (app) {
    app.innerHTML = loading;
  }
}
