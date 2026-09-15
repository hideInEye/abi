export interface ProjectLoadFlowOptions<T> {
    isCurrent?: () => boolean;
    load: () => Promise<T | null>;
    onLoaded: (loaded: boolean) => void;
    onSuccess: (data: T) => void | Promise<void>;
    onError: (message: string) => void;
}

export async function runProjectLoadFlow<T>({
    load,
    onLoaded,
    onSuccess,
    onError,
    isCurrent = () => true,
}: ProjectLoadFlowOptions<T>): Promise<boolean> {
    try {
        const data = await load();
        if (!isCurrent()) return false;
        if (!data) {
            onError('无项目数据或项目不存在');
            onLoaded(false);
            return false;
        }
        await onSuccess(data);
        if (!isCurrent()) return false;
        onLoaded(true);
        return true;
    } catch {
        if (!isCurrent()) return false;
        onError('项目数据加载失败');
        onLoaded(false);
        return false;
    }
}
