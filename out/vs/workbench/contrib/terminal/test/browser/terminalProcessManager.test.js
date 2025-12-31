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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxQcm9jZXNzTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsUHJvY2Vzc01hbmFnZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBR3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWpHLE1BQU0sd0JBQXdCO0lBRTdCLElBQUksWUFBWTtRQUNmLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFlBQXFCLGFBQXNCO1FBQXRCLGtCQUFhLEdBQWIsYUFBYSxDQUFTO1FBSjNDLE9BQUUsR0FBVyxDQUFDLENBQUE7UUFhZCx3QkFBbUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ2hDLGtCQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUMxQixrQkFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDMUIsbUJBQWMsR0FBRyxLQUFL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