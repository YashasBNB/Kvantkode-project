/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { strictEqual } from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalInstanceService } from '../../browser/terminal.js';
import { TerminalProcessManager } from '../../browser/terminalProcessManager.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
class TestTerminalChildProcess {
    get capabilities() {
        return [];
    }
    constructor(shouldPersist) {
        this.shouldPersist = shouldPersist;
        this.id = 0;
        this.onDidChangeProperty = Event.None;
        this.onProcessData = Event.None;
        this.onProcessExit = Event.None;
        this.onProcessReady = Event.None;
        this.onProcessTitleChanged = Event.None;
        this.onProcessShellTypeChanged = Event.None;
    }
    updateProperty(property, value) {
        throw new Error('Method not implemented.');
    }
    async start() {
        return undefined;
    }
    shutdown(immediate) { }
    input(data) { }
    resize(cols, rows) { }
    clearBuffer() { }
    acknowledgeDataEvent(charCount) { }
    async setUnicodeVersion(version) { }
    async getInitialCwd() {
        return '';
    }
    async getCwd() {
        return '';
    }
    async processBinary(data) { }
    refreshProperty(property) {
        return Promise.resolve('');
    }
}
class TestTerminalInstanceService {
    getBackend() {
        return {
            onPtyHostExit: Event.None,
            onPtyHostUnresponsive: Event.None,
            onPtyHostResponsive: Event.None,
            onPtyHostRestart: Event.None,
            onDidMoveWindowInstance: Event.None,
            onDidRequestDetach: Event.None,
            createProcess: (shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, windowsEnableConpty, shouldPersist) => new TestTerminalChildProcess(shouldPersist),
            getLatency: () => Promise.resolve([]),
        };
    }
}
suite('Workbench - TerminalProcessManager', () => {
    let manager;
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        const configurationService = instantiationService.get(IConfigurationService);
        await configurationService.setUserConfiguration('editor', { fontFamily: 'foo' });
        await configurationService.setUserConfiguration('terminal', {
            integrated: {
                fontFamily: 'bar',
                enablePersistentSessions: true,
                shellIntegration: {
                    enabled: false,
                },
            },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        instantiationService.stub(ITerminalInstanceService, new TestTerminalInstanceService());
        manager = store.add(instantiationService.createInstance(TerminalProcessManager, 1, undefined, undefined, undefined));
    });
    suite('process persistence', () => {
        suite('local', () => {
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({}, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true,
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
        suite('remote', () => {
            const remoteCwd = URI.from({
                scheme: Schemas.vscodeRemote,
                path: 'test/cwd',
            });
            test('regular terminal should persist', async () => {
                const p = await manager.createProcess({
                    cwd: remoteCwd,
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, true);
            });
            test('task terminal should not persist', async () => {
                const p = await manager.createProcess({
                    isFeatureTerminal: true,
                    cwd: remoteCwd,
                }, 1, 1, false);
                strictEqual(p, undefined);
                strictEqual(manager.shouldPersist, false);
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFHckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFakcsTUFBTSx3QkFBd0I7SUFFN0IsSUFBSSxZQUFZO1FBQ2YsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsWUFBcUIsYUFBc0I7UUFBdEIsa0JBQWEsR0FBYixhQUFhLENBQVM7UUFKM0MsT0FBRSxHQUFXLENBQUMsQ0FBQTtRQWFkLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDaEMsa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzFCLGtCQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FB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