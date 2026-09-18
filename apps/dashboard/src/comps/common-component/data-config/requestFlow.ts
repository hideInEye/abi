export interface DataRequestFlowOptions<Response, Data> {
    getErrorMessage?: (response: Response) => string | undefined;
    isSuccess: (response: Response) => boolean;
    onSuccess: (data: Data) => void | Promise<void>;
    request: () => Promise<Response>;
    selectData: (response: Response) => unknown;
    transform: (data: unknown) => Data;
}

export interface DataRequestFlowResult<Data> {
    data?: Data;
    message?: string;
    success: boolean;
}

export async function runDataRequestFlow<Response, Data>({
    getErrorMessage,
    isSuccess,
    onSuccess,
    request,
    selectData,
    transform,
}: DataRequestFlowOptions<Response, Data>): Promise<DataRequestFlowResult<Data>> {
    try {
        const response = await request();
        if (!isSuccess(response)) {
            return {success: false, message: getErrorMessage?.(response) || '请求失败，请重试'};
        }
        const data = transform(selectData(response));
        await onSuccess(data);
        return {success: true, data};
    } catch (error) {
        return {
            success: false,
            message: error instanceof Error ? error.message : '请求失败，请重试',
        };
    }
}
