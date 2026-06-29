import { jest } from '@jest/globals';

describe('CloakBrowserLauncher', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });

    test('loads the Playwright-compatible CloakBrowser launcher', async () => {
        const launch = jest.fn();
        const launchPersistentContext = jest.fn(async () => ({ context: true }));
        const ensureBinary = jest.fn(async () => undefined);

        jest.unstable_mockModule('cloakbrowser', () => ({
            ensureBinary,
            launch,
            launchPersistentContext,
        }));

        const { getCloakBrowserPlaywrightLauncher } = await import('../../core/CloakBrowserLauncher.js');
        const launcher = await getCloakBrowserPlaywrightLauncher();

        expect(ensureBinary).toHaveBeenCalledTimes(1);
        expect(launcher.launch).toBe(launch);
        expect(launcher.name()).toBe('chromium');
        await launcher.launchPersistentContext('/tmp/cloak-profile', { headless: true });
        expect(launchPersistentContext).toHaveBeenCalledWith({
            headless: true,
            userDataDir: '/tmp/cloak-profile',
        });
        expect(launcher.__anycrawlBrowserRuntime).toBe('cloakbrowser');
    });

    test('loads the Puppeteer-compatible CloakBrowser launcher', async () => {
        const launch = jest.fn();
        const ensureBinary = jest.fn(async () => undefined);

        jest.unstable_mockModule('cloakbrowser', () => ({
            ensureBinary,
            launch: jest.fn(),
            launchPersistentContext: jest.fn(),
        }));
        jest.unstable_mockModule('cloakbrowser/puppeteer', () => ({
            launch,
        }));

        const { getCloakBrowserPuppeteerLauncher } = await import('../../core/CloakBrowserLauncher.js');
        const launcher = await getCloakBrowserPuppeteerLauncher();

        expect(ensureBinary).toHaveBeenCalledTimes(1);
        expect(launcher.launch).toBe(launch);
        expect(launcher.__anycrawlBrowserRuntime).toBe('cloakbrowser');
    });
});
