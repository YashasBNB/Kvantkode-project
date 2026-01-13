/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { flakySuite } from '../../../../base/test/common/testUtils.js';
function testErrorMessage(module) {
    return `Unable to load "${module}" dependency. It was probably not compiled for the right operating system architecture or had missing build tools.`;
}
flakySuite('Native Modules (all platforms)', () => {
    ;
    (isMacintosh ? test.skip : test)('kerberos', async () => {
        // Somehow fails on macOS ARM?
        const { default: kerberos } = await import('kerberos');
        assert.ok(typeof kerberos.initializeClient === 'function', testErrorMessage('kerberos'));
    });
    test('yauzl', async () => {
        const { default: yauzl } = await import('yauzl');
        assert.ok(typeof yauzl.ZipFile === 'function', testErrorMessage('yauzl'));
    });
    test('yazl', async () => {
        const { default: yazl } = await import('yazl');
        assert.ok(typeof yazl.ZipFile === 'function', testErrorMessage('yazl'));
    });
    test('v8-inspect-profiler', async () => {
        const { default: profiler } = await import('v8-inspect-profiler');
        assert.ok(typeof profiler.startProfiling === 'function', testErrorMessage('v8-inspect-profiler'));
    });
    test('native-is-elevated', async () => {
        const { default: isElevated } = await import('native-is-elevated');
        assert.ok(typeof isElevated === 'function', testErrorMessage('native-is-elevated '));
        const result = isElevated();
        assert.ok(typeof result === 'boolean', testErrorMessage('native-is-elevated'));
    });
    test('native-keymap', async () => {
        const keyMap = await import('native-keymap');
        assert.ok(typeof keyMap.onDidChangeKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        assert.ok(typeof keyMap.getCurrentKeyboardLayout === 'function', testErrorMessage('native-keymap'));
        const result = keyMap.getCurrentKeyboardLayout();
        assert.ok(result, testErrorMessage('native-keymap'));
    });
    test('native-watchdog', async () => {
        const watchDog = await import('native-watchdog');
        assert.ok(typeof watchDog.start === 'function', testErrorMessage('native-watchdog'));
    });
    test('@vscode/sudo-prompt', async () => {
        const prompt = await import('@vscode/sudo-prompt');
        assert.ok(typeof prompt.exec === 'function', testErrorMessage('@vscode/sudo-prompt'));
    });
    test('@vscode/policy-watcher', async () => {
        const watcher = await import('@vscode/policy-watcher');
        assert.ok(typeof watcher.createWatcher === 'function', testErrorMessage('@vscode/policy-watcher'));
    });
    test('node-pty', async () => {
        const nodePty = await import('node-pty');
        assert.ok(typeof nodePty.spawn === 'function', testErrorMessage('node-pty'));
    });
    test('open', async () => {
        const { default: open } = await import('open');
        assert.ok(typeof open === 'function', testErrorMessage('open'));
    });
    test('@vscode/spdlog', async () => {
        const spdlog = await import('@vscode/spdlog');
        assert.ok(typeof spdlog.createRotatingLogger === 'function', testErrorMessage('@vscode/spdlog'));
        assert.ok(typeof spdlog.version === 'number', testErrorMessage('@vscode/spdlog'));
    });
    test('@parcel/watcher', async () => {
        const parcelWatcher = await import('@parcel/watcher');
        assert.ok(typeof parcelWatcher.subscribe === 'function', testErrorMessage('@parcel/watcher'));
    });
    test('@vscode/deviceid', async () => {
        const deviceIdPackage = await import('@vscode/deviceid');
        assert.ok(typeof deviceIdPackage.getDeviceId === 'function', testErrorMessage('@vscode/deviceid'));
    });
    test('@vscode/ripgrep', async () => {
        const ripgrep = await import('@vscode/ripgrep');
        assert.ok(typeof ripgrep.rgPath === 'string', testErrorMessage('@vscode/ripgrep'));
    });
    test('vscode-regexpp', async () => {
        const regexpp = await import('vscode-regexpp');
        assert.ok(typeof regexpp.RegExpParser === 'function', testErrorMessage('vscode-regexpp'));
    });
    test('@vscode/sqlite3', async () => {
        const { default: sqlite3 } = await import('@vscode/sqlite3');
        assert.ok(typeof sqlite3.Database === 'function', testErrorMessage('@vscode/sqlite3'));
    });
    test('http-proxy-agent', async () => {
        const { default: mod } = await import('http-proxy-agent');
        assert.ok(typeof mod.HttpProxyAgent === 'function', testErrorMessage('http-proxy-agent'));
    });
    test('https-proxy-agent', async () => {
        const { default: mod } = await import('https-proxy-agent');
        assert.ok(typeof mod.HttpsProxyAgent === 'function', testErrorMessage('https-proxy-agent'));
    });
    test('@vscode/proxy-agent', async () => {
        const proxyAgent = await import('@vscode/proxy-agent');
        // This call will load `@vscode/proxy-agent` which is a native module that we want to test on Windows
        const windowsCerts = await proxyAgent.loadSystemCertificates({
            log: {
                trace: () => { },
                debug: () => { },
                info: () => { },
                warn: () => { },
                error: () => { },
            },
        });
        assert.ok(windowsCerts.length > 0, testErrorMessage('@vscode/proxy-agent'));
    });
});
(!isWindows ? suite.skip : suite)('Native Modules (Windows)', () => {
    test('@vscode/windows-mutex', async () => {
        const mutex = await import('@vscode/windows-mutex');
        assert.ok(mutex && typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.isActive === 'function', testErrorMessage('@vscode/windows-mutex'));
        assert.ok(typeof mutex.Mutex === 'function', testErrorMessage('@vscode/windows-mutex'));
    });
    test('windows-foreground-love', async () => {
        const foregroundLove = await import('windows-foreground-love');
        assert.ok(typeof foregroundLove.allowSetForegroundWindow === 'function', testErrorMessage('windows-foreground-love'));
        const result = foregroundLove.allowSetForegroundWindow(process.pid);
        assert.ok(typeof result === 'boolean', testErrorMessage('windows-foreground-love'));
    });
    test('@vscode/windows-process-tree', async () => {
        const processTree = await import('@vscode/windows-process-tree');
        assert.ok(typeof processTree.getProcessTree === 'function', testErrorMessage('@vscode/windows-process-tree'));
        return new Promise((resolve, reject) => {
            processTree.getProcessTree(process.pid, (tree) => {
                if (tree) {
                    resolve();
                }
                else {
                    reject(new Error(testErrorMessage('@vscode/windows-process-tree')));
                }
            });
        });
    });
    test('@vscode/windows-registry', async () => {
        const windowsRegistry = await import('@vscode/windows-registry');
        assert.ok(typeof windowsRegistry.GetStringRegKey === 'function', testErrorMessage('@vscode/windows-registry'));
        const result = windowsRegistry.GetStringRegKey('HKEY_LOCAL_MACHINE', 'SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion', 'EditionID');
        assert.ok(typeof result === 'string' || typeof result === 'undefined', testErrorMessage('@vscode/windows-registry'));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTW9kdWxlcy5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Vudmlyb25tZW50L3Rlc3Qvbm9kZS9uYXRpdmVNb2R1bGVzLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFdEUsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFjO0lBQ3ZDLE9BQU8sbUJBQW1CLE1BQU0sb0hBQW9ILENBQUE7QUFDckosQ0FBQztBQUVELFVBQVUsQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7SUFDakQsQ0FBQztJQUFBLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEQsOEJBQThCO1FBQzlCLE1BQU0sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLFFBQVEsQ0FBQyxnQkFBZ0IsS0FBSyxVQUFVLEVBQUUsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUN6RixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDeEIsTUFBTSxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FB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