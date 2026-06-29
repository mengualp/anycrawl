import { log } from "@anycrawl/libs";

export const CLOAKBROWSER_RUNTIME = "cloakbrowser" as const;

type LaunchFunction = (options?: Record<string, unknown>) => Promise<unknown>;
type PlaywrightPersistentContextFunction = (
    options: Record<string, unknown> & { userDataDir: string },
) => Promise<unknown>;

export interface CloakBrowserLauncher {
    launch: LaunchFunction;
    __anycrawlBrowserRuntime: typeof CLOAKBROWSER_RUNTIME;
}

export interface CloakBrowserPlaywrightLauncher extends CloakBrowserLauncher {
    name: () => "chromium";
    launchPersistentContext: (
        userDataDir: string,
        options?: Record<string, unknown>,
    ) => Promise<unknown>;
}

type CloakBrowserModule = {
    launch?: LaunchFunction;
    ensureBinary?: () => Promise<unknown>;
    launchPersistentContext?: PlaywrightPersistentContextFunction;
};
type LoadedCloakBrowserModule = CloakBrowserModule & {
    launch: LaunchFunction;
};

let binaryPromise: Promise<void> | null = null;
let playwrightLauncherPromise: Promise<CloakBrowserPlaywrightLauncher> | null = null;
let puppeteerLauncherPromise: Promise<CloakBrowserLauncher> | null = null;

const ensureCloakBrowserBinary = async (): Promise<void> => {
    binaryPromise ??= (async () => {
        const mod = await import("cloakbrowser") as CloakBrowserModule;
        if (typeof mod.ensureBinary === "function") {
            await mod.ensureBinary();
        }
    })();
    await binaryPromise;
};

const loadCloakBrowserModule = async (
    moduleName: "cloakbrowser" | "cloakbrowser/puppeteer",
): Promise<LoadedCloakBrowserModule> => {
    await ensureCloakBrowserBinary();
    const mod = await import(moduleName) as CloakBrowserModule;
    if (typeof mod.launch !== "function") {
        throw new Error(`${moduleName} does not export a launch function`);
    }
    return mod as LoadedCloakBrowserModule;
};

const createPlaywrightLauncher = async (): Promise<CloakBrowserPlaywrightLauncher> => {
    const mod = await loadCloakBrowserModule("cloakbrowser");
    if (typeof mod.launchPersistentContext !== "function") {
        throw new Error("cloakbrowser does not export a launchPersistentContext function");
    }

    log.info("[CloakBrowser] Using cloakbrowser Playwright launcher");
    return {
        name: () => "chromium",
        launch: mod.launch,
        launchPersistentContext: (userDataDir, options = {}) => mod.launchPersistentContext!({
            ...options,
            userDataDir,
        }),
        __anycrawlBrowserRuntime: CLOAKBROWSER_RUNTIME,
    };
};

const createPuppeteerLauncher = async (): Promise<CloakBrowserLauncher> => {
    const mod = await loadCloakBrowserModule("cloakbrowser/puppeteer");
    log.info("[CloakBrowser] Using cloakbrowser Puppeteer launcher");
    return {
        launch: mod.launch,
        __anycrawlBrowserRuntime: CLOAKBROWSER_RUNTIME,
    };
};

export const getCloakBrowserPlaywrightLauncher = async (): Promise<CloakBrowserPlaywrightLauncher> => {
    playwrightLauncherPromise ??= createPlaywrightLauncher();
    return playwrightLauncherPromise;
};

export const getCloakBrowserPuppeteerLauncher = async (): Promise<CloakBrowserLauncher> => {
    puppeteerLauncherPromise ??= createPuppeteerLauncher();
    return puppeteerLauncherPromise;
};
