export interface ProjectSaveFlowOptions {
    onSaved: () => void | Promise<void>;
    save: () => Promise<boolean>;
    syncStatus?: () => void | Promise<void>;
}

export async function runProjectSaveFlow({
    onSaved,
    save,
    syncStatus,
}: ProjectSaveFlowOptions): Promise<boolean> {
    const saved = await save();
    if (!saved) return false;

    await onSaved();
    await syncStatus?.();
    return true;
}
