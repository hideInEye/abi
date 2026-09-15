import type {ProjectDataType} from '../DesignerType';

export function parseViewProjectData(projectInfo: {dataJson?: unknown} | null | undefined): ProjectDataType | null {
    if (!projectInfo || typeof projectInfo.dataJson !== 'string') return null;
    try {
        const data = JSON.parse(projectInfo.dataJson) as unknown;
        return typeof data === 'object' && data !== null && !Array.isArray(data) ? data as ProjectDataType : null;
    } catch {
        return null;
    }
}
