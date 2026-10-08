export type AppCleanup = () => void;

let registeredCleanup: AppCleanup | null = null;

export function registerAppCleanup(cleanup: AppCleanup): AppCleanup {
    let completed = false;
    const runOnce = () => {
        if (completed) return;
        completed = true;
        if (registeredCleanup === runOnce) registeredCleanup = null;
        cleanup();
    };

    registeredCleanup?.();
    registeredCleanup = runOnce;
    return runOnce;
}

export function runRegisteredAppCleanup(): void {
    const cleanup = registeredCleanup;
    registeredCleanup = null;
    cleanup?.();
}
