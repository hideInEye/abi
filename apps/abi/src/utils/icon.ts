export function getLocalIcons(): string[] {
  const svgIcons = import.meta.glob('../assets/svg-icon/*.svg');
  return Object.keys(svgIcons)
    .map(path => path.split('/').at(-1)?.replace('.svg', '') || '')
    .filter(Boolean);
}
