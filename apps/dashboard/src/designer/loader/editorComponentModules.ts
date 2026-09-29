export const editorComponentModules = import.meta.glob(
    ['../../comps/**/*Definition.ts', '../../comps/**/*Convert.ts'],
    {eager: true},
) as Record<string, Record<string, any>>;
