interface MoveableRequester {
    request: (requesterName: string, params: Record<string, unknown>, isInstant: boolean) => unknown;
}

export function requestRollback(
    movable: MoveableRequester | null,
    hasTargets: () => boolean,
    requesterName: string,
    params: Record<string, unknown>,
    finish: () => void,
): void {
    if (!movable) {
        finish();
        return;
    }
    Promise.resolve().then(() => {
        if (!hasTargets()) {
            finish();
            return;
        }
        try {
            movable.request(requesterName, params, true);
        } catch {
            finish();
        }
    });
}
