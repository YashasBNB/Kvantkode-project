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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlTW9kdWxlcy5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9lbnZpcm9ubWVudC90ZXN0L25vZGUvbmF0aXZlTW9kdWxlcy5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXRFLFNBQVMsZ0JBQWdCLENBQUMsTUFBYztJQUN2QyxPQUFPLG1CQUFtQixNQUFNLG9IQUFvSCxDQUFBO0FBQ3JKLENBQUM7QUFFRCxVQUFVLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELENBQUM7SUFBQSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hELDhCQUE4QjtRQUM5QixNQUFNLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxRQUFRLENBQUMsZ0JBQWdCLEtBQUssVUFBVSxFQUFFLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDekYsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsT0FBTyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hCLE1BQU0sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEdBQUcsTUFBTSxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDaEQs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