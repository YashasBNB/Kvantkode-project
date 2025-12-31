/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TerminalCapabilityStore } from '../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { ITerminalConfigurationService, ITerminalInstanceService, } from '../../browser/terminal.js';
import { TerminalConfigurationService } from '../../browser/terminalConfigurationService.js';
import { parseExitResult, TerminalInstance, TerminalLabelComputer, } from '../../browser/terminalInstance.js';
import { IEnvironmentVariableService } from '../../common/environmentVariable.js';
import { EnvironmentVariableService } from '../../common/environmentVariableService.js';
import { ITerminalProfileResolverService } from '../../common/terminal.js';
import { TestViewDescriptorService } from './xterm/xtermTerminal.test.js';
import { fixPath } from '../../../../services/search/test/browser/queryBuilder.test.js';
import { TestTerminalProfileResolverService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
const root1 = '/foo/root1';
const ROOT_1 = fixPath(root1);
const root2 = '/foo/root2';
const ROOT_2 = fixPath(root2);
class MockTerminalProfileResolverService extends TestTerminalProfileResolverService {
    async getDefaultProfile() {
        return {
            profileName: 'my-sh',
            path: '/usr/bin/zsh',
            env: {
                TEST: 'TEST',
            },
            isDefault: true,
            isUnsafePath: false,
            isFromPath: true,
            icon: {
                id: 'terminal-linux',
            },
            color: 'terminal.ansiYellow',
        };
    }
}
const terminalShellTypeContextKey = {
    set: () => { },
    reset: () => { },
    get: () => undefined,
};
class TestTerminalChildProcess extends Disposable {
    get capabilities() {
        return [];
    }
    constructor(shouldPersist) {
        super();
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
class TestTerminalInstanceService extends Disposable {
    getBackend() {
        return {
            onPtyHostExit: Event.None,
            onPtyHostUnresponsive: Event.None,
            onPtyHostResponsive: Event.None,
            onPtyHostRestart: Event.None,
            onDidMoveWindowInstance: Event.None,
            onDidRequestDetach: Event.None,
            createProcess: (shellLaunchConfig, cwd, cols, rows, unicodeVersion, env, windowsEnableConpty, shouldPersist) => this._register(new TestTerminalChildProcess(shouldPersist)),
            getLatency: () => Promise.resolve([]),
        };
    }
}
suite('Workbench - TerminalInstance', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    suite('TerminalInstance', () => {
        let terminalInstance;
        test('should create an instance of TerminalInstance with env from default profile', async () => {
            const instantiationService = workbenchInstantiationService({
                configurationService: () => new TestConfigurationService({
                    files: {},
                    terminal: {
                        integrated: {
                            fontFamily: 'monospace',
                            scrollback: 1000,
                            fastScrollSensitivity: 2,
                            mouseWheelScrollSensitivity: 1,
                            unicodeVersion: '6',
                            shellIntegration: {
                                enabled: true,
                            },
                        },
                    },
                }),
            }, store);
            instantiationService.set(ITerminalProfileResolverService, new MockTerminalProfileResolverService());
            instantiationService.stub(IViewDescriptorService, new TestViewDescriptorService());
            instantiationService.stub(IEnvironmentVariableService, store.add(instantiationService.createInstance(EnvironmentVariableService)));
            instantiationService.stub(ITerminalInstanceService, store.add(new TestTerminalInstanceService()));
            terminalInstance = store.add(instantiationService.createInstance(TerminalInstance, terminalShellTypeContextKey, {}));
            // //Wait for the teminalInstance._xtermReadyPromise to resolve
            await new Promise((resolve) => setTimeout(resolve, 100));
            deepStrictEqual(terminalInstance.shellLaunchConfig.env, { TEST: 'TEST' });
        });
    });
    suite('parseExitResult', () => {
        test('should return no message for exit code = undefined', () => {
            deepStrictEqual(parseExitResult(undefined, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: undefined,
                message: undefined,
            });
            deepStrictEqual(parseExitResult(undefined, {}, 5 /* ProcessState.KilledByUser */, undefined), {
                code: undefined,
                message: undefined,
            });
            deepStrictEqual(parseExitResult(undefined, {}, 6 /* ProcessState.KilledByProcess */, undefined), {
                code: undefined,
                message: undefined,
            });
        });
        test('should return no message for exit code = 0', () => {
            deepStrictEqual(parseExitResult(0, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 0,
                message: undefined,
            });
            deepStrictEqual(parseExitResult(0, {}, 5 /* ProcessState.KilledByUser */, undefined), {
                code: 0,
                message: undefined,
            });
            deepStrictEqual(parseExitResult(0, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 0,
                message: undefined,
            });
        });
        test('should return friendly message when executable is specified for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 1, message: 'The terminal process "foo" failed to launch (exit code: 1).' });
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 5 /* ProcessState.KilledByUser */, undefined), { code: 1, message: 'The terminal process "foo" terminated with exit code: 1.' });
            deepStrictEqual(parseExitResult(1, { executable: 'foo' }, 6 /* ProcessState.KilledByProcess */, undefined), { code: 1, message: 'The terminal process "foo" terminated with exit code: 1.' });
        });
        test('should return friendly message when executable and args are specified for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 1,
                message: `The terminal process "foo 'bar', 'baz'" failed to launch (exit code: 1).`,
            });
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 5 /* ProcessState.KilledByUser */, undefined), {
                code: 1,
                message: `The terminal process "foo 'bar', 'baz'" terminated with exit code: 1.`,
            });
            deepStrictEqual(parseExitResult(1, { executable: 'foo', args: ['bar', 'baz'] }, 6 /* ProcessState.KilledByProcess */, undefined), {
                code: 1,
                message: `The terminal process "foo 'bar', 'baz'" terminated with exit code: 1.`,
            });
        });
        test('should return friendly message when executable and arguments are omitted for non-zero exit codes', () => {
            deepStrictEqual(parseExitResult(1, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 1,
                message: `The terminal process failed to launch (exit code: 1).`,
            });
            deepStrictEqual(parseExitResult(1, {}, 5 /* ProcessState.KilledByUser */, undefined), {
                code: 1,
                message: `The terminal process terminated with exit code: 1.`,
            });
            deepStrictEqual(parseExitResult(1, {}, 6 /* ProcessState.KilledByProcess */, undefined), {
                code: 1,
                message: `The terminal process terminated with exit code: 1.`,
            });
        });
        test('should ignore pty host-related errors', () => {
            deepStrictEqual(parseExitResult({ message: 'Could not find pty with id 16' }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: undefined, message: undefined });
        });
        test('should format conpty failure code 5', () => {
            deepStrictEqual(parseExitResult({
                code: 5,
                message: 'A native exception occurred during launch (Cannot create process, error code: 5)',
            }, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 5,
                message: `The terminal process failed to launch: Access was denied to the path containing your executable "foo". Manage and change your permissions to get this to work.`,
            });
        });
        test('should format conpty failure code 267', () => {
            deepStrictEqual(parseExitResult({
                code: 267,
                message: 'A native exception occurred during launch (Cannot create process, error code: 267)',
            }, {}, 4 /* ProcessState.KilledDuringLaunch */, '/foo'), {
                code: 267,
                message: `The terminal process failed to launch: Invalid starting directory "/foo", review your terminal.integrated.cwd setting.`,
            });
        });
        test('should format conpty failure code 1260', () => {
            deepStrictEqual(parseExitResult({
                code: 1260,
                message: 'A native exception occurred during launch (Cannot create process, error code: 1260)',
            }, { executable: 'foo' }, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 1260,
                message: `The terminal process failed to launch: Windows cannot open this program because it has been prevented by a software restriction policy. For more information, open Event Viewer or contact your system Administrator.`,
            });
        });
        test('should format generic failures', () => {
            deepStrictEqual(parseExitResult({
                code: 123,
                message: 'A native exception occurred during launch (Cannot create process, error code: 123)',
            }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), {
                code: 123,
                message: `The terminal process failed to launch: A native exception occurred during launch (Cannot create process, error code: 123).`,
            });
            deepStrictEqual(parseExitResult({ code: 123, message: 'foo' }, {}, 4 /* ProcessState.KilledDuringLaunch */, undefined), { code: 123, message: `The terminal process failed to launch: foo.` });
        });
    });
    suite('TerminalLabelComputer', () => {
        let instantiationService;
        let capabilities;
        function createInstance(partial) {
            const capabilities = store.add(new TerminalCapabilityStore());
            if (!isWindows) {
                capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
            }
            return {
                shellLaunchConfig: {},
                shellType: "pwsh" /* GeneralShellType.PowerShell */,
                cwd: 'cwd',
                initialCwd: undefined,
                processName: '',
                sequence: undefined,
                workspaceFolder: undefined,
                staticTitle: undefined,
                capabilities,
                title: '',
                description: '',
                userHome: undefined,
                ...partial,
            };
        }
        setup(async () => {
            instantiationService = workbenchInstantiationService(undefined, store);
            capabilities = store.add(new TerminalCapabilityStore());
            if (!isWindows) {
                capabilities.add(1 /* TerminalCapability.NaiveCwdDetection */, null);
            }
        });
        function createLabelComputer(configuration) {
            instantiationService.set(IConfigurationService, new TestConfigurationService(configuration));
            instantiationService.set(ITerminalConfigurationService, store.add(instantiationService.createInstance(TerminalConfigurationService)));
            return store.add(instantiationService.createInstance(TerminalLabelComputer));
        }
        test('should resolve to "" when the template variables are empty', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: { integrated: { tabs: { separator: ' - ', title: '', description: '' } } },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: '' }));
            // TODO:
            // terminalLabelComputer.onLabelChanged(e => {
            // 	strictEqual(e.title, '');
            // 	strictEqual(e.description, '');
            // });
            strictEqual(terminalLabelComputer.title, '');
            strictEqual(terminalLabelComputer.description, '');
        });
        test('should resolve cwd', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: { tabs: { separator: ' - ', title: '${cwd}', description: '${cwd}' } },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, cwd: ROOT_1 }));
            strictEqual(terminalLabelComputer.title, ROOT_1);
            strictEqual(terminalLabelComputer.description, ROOT_1);
        });
        test('should resolve workspaceFolder', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: {
                            separator: ' - ',
                            title: '${workspaceFolder}',
                            description: '${workspaceFolder}',
                        },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({
                capabilities,
                processName: 'zsh',
                workspaceFolder: {
                    uri: URI.from({ scheme: Schemas.file, path: 'folder' }),
                },
            }));
            strictEqual(terminalLabelComputer.title, 'folder');
            strictEqual(terminalLabelComputer.description, 'folder');
        });
        test('should resolve local', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: { tabs: { separator: ' - ', title: '${local}', description: '${local}' } },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Local' } }));
            strictEqual(terminalLabelComputer.title, 'Local');
            strictEqual(terminalLabelComputer.description, 'Local');
        });
        test('should resolve process', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: { separator: ' - ', title: '${process}', description: '${process}' },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh' }));
            strictEqual(terminalLabelComputer.title, 'zsh');
            strictEqual(terminalLabelComputer.description, 'zsh');
        });
        test('should resolve sequence', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: { separator: ' - ', title: '${sequence}', description: '${sequence}' },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, sequence: 'sequence' }));
            strictEqual(terminalLabelComputer.title, 'sequence');
            strictEqual(terminalLabelComputer.description, 'sequence');
        });
        test('should resolve task', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: {
                            separator: ' ~ ',
                            title: '${process}${separator}${task}',
                            description: '${task}',
                        },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Task' } }));
            strictEqual(terminalLabelComputer.title, 'zsh ~ Task');
            strictEqual(terminalLabelComputer.description, 'Task');
        });
        test('should resolve separator', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: { separator: ' ~ ', title: '${separator}', description: '${separator}' },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({ capabilities, processName: 'zsh', shellLaunchConfig: { type: 'Task' } }));
            strictEqual(terminalLabelComputer.title, 'zsh');
            strictEqual(terminalLabelComputer.description, '');
        });
        test('should always return static title when specified', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: { separator: ' ~ ', title: '${process}', description: '${workspaceFolder}' },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({
                capabilities,
                processName: 'process',
                workspaceFolder: {
                    uri: URI.from({ scheme: Schemas.file, path: 'folder' }),
                },
                staticTitle: 'my-title',
            }));
            strictEqual(terminalLabelComputer.title, 'my-title');
            strictEqual(terminalLabelComputer.description, 'folder');
        });
        test('should provide cwdFolder for all cwds only when in multi-root', () => {
            const terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: {
                            separator: ' ~ ',
                            title: '${process}${separator}${cwdFolder}',
                            description: '${cwdFolder}',
                        },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({
                capabilities,
                processName: 'process',
                workspaceFolder: {
                    uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }),
                },
                cwd: ROOT_1,
            }));
            // single-root, cwd is same as root
            strictEqual(terminalLabelComputer.title, 'process');
            strictEqual(terminalLabelComputer.description, '');
            // multi-root
            terminalLabelComputer.refreshLabel(createInstance({
                capabilities,
                processName: 'process',
                workspaceFolder: {
                    uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }),
                },
                cwd: ROOT_2,
            }));
            if (isWindows) {
                strictEqual(terminalLabelComputer.title, 'process');
                strictEqual(terminalLabelComputer.description, '');
            }
            else {
                strictEqual(terminalLabelComputer.title, 'process ~ root2');
                strictEqual(terminalLabelComputer.description, 'root2');
            }
        });
        test("should hide cwdFolder in single folder workspaces when cwd matches the workspace's default cwd even when slashes differ", async () => {
            let terminalLabelComputer = createLabelComputer({
                terminal: {
                    integrated: {
                        tabs: {
                            separator: ' ~ ',
                            title: '${process}${separator}${cwdFolder}',
                            description: '${cwdFolder}',
                        },
                    },
                },
            });
            terminalLabelComputer.refreshLabel(createInstance({
                capabilities,
                processName: 'process',
                workspaceFolder: {
                    uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }),
                },
                cwd: ROOT_1,
            }));
            strictEqual(terminalLabelComputer.title, 'process');
            strictEqual(terminalLabelComputer.description, '');
            if (!isWindows) {
                terminalLabelComputer = createLabelComputer({
                    terminal: {
                        integrated: {
                            tabs: {
                                separator: ' ~ ',
                                title: '${process}${separator}${cwdFolder}',
                                description: '${cwdFolder}',
                            },
                        },
                    },
                });
                terminalLabelComputer.refreshLabel(createInstance({
                    capabilities,
                    processName: 'process',
                    workspaceFolder: {
                        uri: URI.from({ scheme: Schemas.file, path: ROOT_1 }),
                    },
                    cwd: ROOT_2,
                }));
                strictEqual(terminalLabelComputer.title, 'process ~ root2');
                strictEqual(terminalLabelComputer.description, 'root2');
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsSW5zdGFuY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBR3hILE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBT3pILE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3BFLE9BQU8sRUFDTiw2QkFBNkIsRUFFN0Isd0JBQXdCLEdBQ3hCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIscUJBQXFCLEdBQ3JCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkYsT0FBTyxFQUFFLCtCQUErQixFQUFnQixNQUFNLDBCQUEwQixDQUFBO0FBQ3hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUN2RixPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLDZCQUE2QixHQUM3QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQTtBQUMxQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDN0IsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFBO0FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUU3QixNQUFNLGtDQUFtQyxTQUFRLGtDQUFrQztJQUN6RSxLQUFLLENBQUMsaUJBQWlCO1FBQy9CLE9BQU87WUFDTixXQUFXLEVBQUUsT0FBTztZQUNwQixJQUFJLEVBQUUsY0FBYztZQUNwQixHQUFHLEVBQUU7Z0JBQ0osSUFBSSxFQUFFLE1BQU07YUFDWjtZQUNELFNBQVMsRUFBRSxJQUFJO1lBQ2YsWUFBWSxFQUFFLEtBQUs7WUFDbkIsVUFBVSxFQUFFLElBQUk7WUFDaEIsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxnQkFBZ0I7YUFDcEI7WUFDRCxLQUFLLEVBQUUscUJBQXFCO1NBQzVCLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRCxNQUFNLDJCQUEyQixHQUFHO0lBQ25DLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRSxDQUFDO0lBQ2IsS0FBSyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7SUFDZixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsU0FBUztDQUNwQixDQUFBO0FBRUQsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO0lBRWhELElBQUksWUFBWTtRQUNmLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFlBQXFCLGFBQXNCO1FBQzFDLEtBQUssRUFBRSxDQUFBO1FBRGEsa0JBQWEsR0FBYixhQUFhLENBQVM7UUFKM0MsT0FBRSxHQUFXLENBQUMsQ0FBQTtRQWVkLHdCQUFtQixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDaEMsa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzFCLGtCQUFhLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUMxQixtQkFBYyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDM0IsMEJBQXFCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNsQyw4QkFBeUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBZHRDLENBQUM7SUFDRCxjQUFjLENBQUMsUUFBYSxFQUFFLEtBQVU7UUFDdkMsTUFBTSxJQUFJLEtBQUssQ0FBQyx5QkFBeUIsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFZRCxLQUFLLENBQUMsS0FBSztRQUNWLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxRQUFRLENBQUMsU0FBa0IsSUFBUyxDQUFDO0lBQ3JDLEtBQUssQ0FBQyxJQUFZLElBQVMsQ0FBQztJQUM1QixNQUFNLENBQUMsSUFBWSxFQUFFLElBQVksSUFBUyxDQUFDO0lBQzNDLFdBQVcsS0FBVSxDQUFDO0lBQ3RCLG9CQUFvQixDQUFDLFNBQWlCLElBQVMsQ0FBQztJQUNoRCxLQUFLLENBQUMsaUJBQWlCLENBQUMsT0FBbUIsSUFBa0IsQ0FBQztJQUM5RCxLQUFLLENBQUMsYUFBYTtRQUNsQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxLQUFLLENBQUMsTUFBTTtRQUNYLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBWSxJQUFrQixDQUFDO0lBQ25ELGVBQWUsQ0FBQyxRQUFhO1FBQzVCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzQixDQUFDO0NBQ0Q7QUFFRCxNQUFNLDJCQUE0QixTQUFRLFVBQVU7SUFDbkQsVUFBVTtRQUNULE9BQU87WUFDTixhQUFhLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDekIscUJBQXFCLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDakMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDL0IsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDNUIsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDbkMsa0JBQWtCLEVBQUUsS0FBSyxDQUFDLElBQUk7WUFDOUIsYUFBYSxFQUFFLENBQ2QsaUJBQXNCLEVBQ3RCLEdBQVcsRUFDWCxJQUFZLEVBQ1osSUFBWSxFQUNaLGNBQTBCLEVBQzFCLEdBQVEsRUFDUixtQkFBNEIsRUFDNUIsYUFBc0IsRUFDckIsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNoRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7U0FDOUIsQ0FBQTtJQUNULENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxHQUFHLEVBQUU7SUFDMUMsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO1FBQzlCLElBQUksZ0JBQW1DLENBQUE7UUFDdkMsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzlGLE1BQU0sb0JBQW9CLEdBQUcsNkJBQTZCLENBQ3pEO2dCQUNDLG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUMxQixJQUFJLHdCQUF3QixDQUFDO29CQUM1QixLQUFLLEVBQUUsRUFBRTtvQkFDVCxRQUFRLEVBQUU7d0JBQ1QsVUFBVSxFQUFFOzRCQUNYLFVBQVUsRUFBRSxXQUFXOzRCQUN2QixVQUFVLEVBQUUsSUFBSTs0QkFDaEIscUJBQXFCLEVBQUUsQ0FBQzs0QkFDeEIsMkJBQTJCLEVBQUUsQ0FBQzs0QkFDOUIsY0FBYyxFQUFFLEdBQUc7NEJBQ25CLGdCQUFnQixFQUFFO2dDQUNqQixPQUFPLEVBQUUsSUFBSTs2QkFDYjt5QkFDRDtxQkFDRDtpQkFDRCxDQUFDO2FBQ0gsRUFDRCxLQUFLLENBQ0wsQ0FBQTtZQUNELG9CQUFvQixDQUFDLEdBQUcsQ0FDdkIsK0JBQStCLEVBQy9CLElBQUksa0NBQWtDLEVBQUUsQ0FDeEMsQ0FBQTtZQUNELG9CQUFvQixDQUFDLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxJQUFJLHlCQUF5QixFQUFFLENBQUMsQ0FBQTtZQUNsRixvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLDJCQUEyQixFQUMzQixLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQyxDQUFDLENBQzFFLENBQUE7WUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLHdCQUF3QixFQUN4QixLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksMkJBQTJCLEVBQUUsQ0FBQyxDQUM1QyxDQUFBO1lBQ0QsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FDM0Isb0JBQW9CLENBQUMsY0FBYyxDQUFDLGdCQUFnQixFQUFFLDJCQUEyQixFQUFFLEVBQUUsQ0FBQyxDQUN0RixDQUFBO1lBQ0QsK0RBQStEO1lBQy9ELE1BQU0sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUN4RCxlQUFlLENBQUMsZ0JBQWdCLENBQUMsaUJBQWlCLENBQUMsR0FBRyxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7UUFDMUUsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNGLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7UUFDN0IsSUFBSSxDQUFDLG9EQUFvRCxFQUFFLEdBQUcsRUFBRTtZQUMvRCxlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxFQUFFLDJDQUFtQyxTQUFTLENBQUMsRUFBRTtnQkFDM0YsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQyxDQUFBO1lBQ0YsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsRUFBRSxxQ0FBNkIsU0FBUyxDQUFDLEVBQUU7Z0JBQ3JGLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxTQUFTO2FBQ2xCLENBQUMsQ0FBQTtZQUNGLGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEVBQUUsd0NBQWdDLFNBQVMsQ0FBQyxFQUFFO2dCQUN4RixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsU0FBUzthQUNsQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyw0Q0FBNEMsRUFBRSxHQUFHLEVBQUU7WUFDdkQsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSwyQ0FBbUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ25GLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxTQUFTO2FBQ2xCLENBQUMsQ0FBQTtZQUNGLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUscUNBQTZCLFNBQVMsQ0FBQyxFQUFFO2dCQUM3RSxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsU0FBUzthQUNsQixDQUFDLENBQUE7WUFDRixlQUFlLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLDJDQUFtQyxTQUFTLENBQUMsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscUZBQXFGLEVBQUUsR0FBRyxFQUFFO1lBQ2hHLGVBQWUsQ0FDZCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSwyQ0FBbUMsU0FBUyxDQUFDLEVBQ3JGLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsNkRBQTZELEVBQUUsQ0FDbkYsQ0FBQTtZQUNELGVBQWUsQ0FDZCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxxQ0FBNkIsU0FBUyxDQUFDLEVBQy9FLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsMERBQTBELEVBQUUsQ0FDaEYsQ0FBQTtZQUNELGVBQWUsQ0FDZCxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSx3Q0FBZ0MsU0FBUyxDQUFDLEVBQ2xGLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxPQUFPLEVBQUUsMERBQTBELEVBQUUsQ0FDaEYsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLCtGQUErRixFQUFFLEdBQUcsRUFBRTtZQUMxRyxlQUFlLENBQ2QsZUFBZSxDQUNkLENBQUMsRUFDRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLDJDQUUzQyxTQUFTLENBQ1QsRUFDRDtnQkFDQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsMEVBQTBFO2FBQ25GLENBQ0QsQ0FBQTtZQUNELGVBQWUsQ0FDZCxlQUFlLENBQ2QsQ0FBQyxFQUNELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUscUNBRTNDLFNBQVMsQ0FDVCxFQUNEO2dCQUNDLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSx1RUFBdUU7YUFDaEYsQ0FDRCxDQUFBO1lBQ0QsZUFBZSxDQUNkLGVBQWUsQ0FDZCxDQUFDLEVBQ0QsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSx3Q0FFM0MsU0FBUyxDQUNULEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLHVFQUF1RTthQUNoRixDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxrR0FBa0csRUFBRSxHQUFHLEVBQUU7WUFDN0csZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSwyQ0FBbUMsU0FBUyxDQUFDLEVBQUU7Z0JBQ25GLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSx1REFBdUQ7YUFDaEUsQ0FBQyxDQUFBO1lBQ0YsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxxQ0FBNkIsU0FBUyxDQUFDLEVBQUU7Z0JBQzdFLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxvREFBb0Q7YUFDN0QsQ0FBQyxDQUFBO1lBQ0YsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSx3Q0FBZ0MsU0FBUyxDQUFDLEVBQUU7Z0JBQ2hGLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxvREFBb0Q7YUFDN0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsdUNBQXVDLEVBQUUsR0FBRyxFQUFFO1lBQ2xELGVBQWUsQ0FDZCxlQUFlLENBQ2QsRUFBRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsRUFDNUMsRUFBRSwyQ0FFRixTQUFTLENBQ1QsRUFDRCxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxDQUN2QyxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO1lBQ2hELGVBQWUsQ0FDZCxlQUFlLENBQ2Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUNOLGtGQUFrRjthQUNuRixFQUNELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSwyQ0FFckIsU0FBUyxDQUNULEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLGdLQUFnSzthQUN6SyxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7WUFDbEQsZUFBZSxDQUNkLGVBQWUsQ0FDZDtnQkFDQyxJQUFJLEVBQUUsR0FBRztnQkFDVCxPQUFPLEVBQ04sb0ZBQW9GO2FBQ3JGLEVBQ0QsRUFBRSwyQ0FFRixNQUFNLENBQ04sRUFDRDtnQkFDQyxJQUFJLEVBQUUsR0FBRztnQkFDVCxPQUFPLEVBQUUsd0hBQXdIO2FBQ2pJLENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEdBQUcsRUFBRTtZQUNuRCxlQUFlLENBQ2QsZUFBZSxDQUNkO2dCQUNDLElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFDTixxRkFBcUY7YUFDdEYsRUFDRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsMkNBRXJCLFNBQVMsQ0FDVCxFQUNEO2dCQUNDLElBQUksRUFBRSxJQUFJO2dCQUNWLE9BQU8sRUFBRSx1TkFBdU47YUFDaE8sQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1lBQzNDLGVBQWUsQ0FDZCxlQUFlLENBQ2Q7Z0JBQ0MsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsT0FBTyxFQUNOLG9GQUFvRjthQUNyRixFQUNELEVBQUUsMkNBRUYsU0FBUyxDQUNULEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLEdBQUc7Z0JBQ1QsT0FBTyxFQUFFLDRIQUE0SDthQUNySSxDQUNELENBQUE7WUFDRCxlQUFlLENBQ2QsZUFBZSxDQUNkLEVBQUUsSUFBSSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQzdCLEVBQUUsMkNBRUYsU0FBUyxDQUNULEVBQ0QsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSw2Q0FBNkMsRUFBRSxDQUNyRSxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNGLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxHQUFHLEVBQUU7UUFDbkMsSUFBSSxvQkFBOEMsQ0FBQTtRQUNsRCxJQUFJLFlBQXFDLENBQUE7UUFFekMsU0FBUyxjQUFjLENBQ3RCLE9BQW9DO1lBZ0JwQyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1lBQzdELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsWUFBWSxDQUFDLEdBQUcsK0NBQXVDLElBQUssQ0FBQyxDQUFBO1lBQzlELENBQUM7WUFDRCxPQUFPO2dCQUNOLGlCQUFpQixFQUFFLEVBQUU7Z0JBQ3JCLFNBQVMsMENBQTZCO2dCQUN0QyxHQUFHLEVBQUUsS0FBSztnQkFDVixVQUFVLEVBQUUsU0FBUztnQkFDckIsV0FBVyxFQUFFLEVBQUU7Z0JBQ2YsUUFBUSxFQUFFLFNBQVM7Z0JBQ25CLGVBQWUsRUFBRSxTQUFTO2dCQUMxQixXQUFXLEVBQUUsU0FBUztnQkFDdEIsWUFBWTtnQkFDWixLQUFLLEVBQUUsRUFBRTtnQkFDVCxXQUFXLEVBQUUsRUFBRTtnQkFDZixRQUFRLEVBQUUsU0FBUztnQkFDbkIsR0FBRyxPQUFPO2FBQ1YsQ0FBQTtRQUNGLENBQUM7UUFFRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7WUFDaEIsb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3RFLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLEVBQUUsQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIsWUFBWSxDQUFDLEdBQUcsK0NBQXVDLElBQUssQ0FBQyxDQUFBO1lBQzlELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVGLFNBQVMsbUJBQW1CLENBQUMsYUFBa0I7WUFDOUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHFCQUFxQixFQUFFLElBQUksd0JBQXdCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQTtZQUM1RixvQkFBb0IsQ0FBQyxHQUFHLENBQ3ZCLDZCQUE2QixFQUM3QixLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQzVFLENBQUE7WUFDRCxPQUFPLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUM3RSxDQUFDO1FBRUQsSUFBSSxDQUFDLDREQUE0RCxFQUFFLEdBQUcsRUFBRTtZQUN2RSxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUUsRUFBRSxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUU7YUFDcEYsQ0FBQyxDQUFBO1lBQ0YscUJBQXFCLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLFFBQVE7WUFDUiw4Q0FBOEM7WUFDOUMsNkJBQTZCO1lBQzdCLG1DQUFtQztZQUNuQyxNQUFNO1lBQ04sV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUM1QyxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ25ELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtZQUMvQixNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsRUFBRTtpQkFDbEY7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDakYsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNoRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1FBQ3ZELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEdBQUcsRUFBRTtZQUMzQyxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFO3dCQUNYLElBQUksRUFBRTs0QkFDTCxTQUFTLEVBQUUsS0FBSzs0QkFDaEIsS0FBSyxFQUFFLG9CQUFvQjs0QkFDM0IsV0FBVyxFQUFFLG9CQUFvQjt5QkFDakM7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQztnQkFDZCxZQUFZO2dCQUNaLFdBQVcsRUFBRSxLQUFLO2dCQUNsQixlQUFlLEVBQUU7b0JBQ2hCLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO2lCQUNuQzthQUNyQixDQUFDLENBQ0YsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxDQUFDLENBQUE7WUFDbEQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN6RCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7WUFDakMsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxXQUFXLEVBQUUsVUFBVSxFQUFFLEVBQUU7aUJBQ3RGO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YscUJBQXFCLENBQUMsWUFBWSxDQUNqQyxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQzFGLENBQUE7WUFDRCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2pELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsd0JBQXdCLEVBQUUsR0FBRyxFQUFFO1lBQ25DLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUU7cUJBQzFFO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YscUJBQXFCLENBQUMsWUFBWSxDQUFDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDL0MsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN0RCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxHQUFHLEVBQUU7WUFDcEMsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxhQUFhLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRTtxQkFDNUU7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDMUYsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUNwRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1FBQzNELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtZQUNoQyxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFO3dCQUNYLElBQUksRUFBRTs0QkFDTCxTQUFTLEVBQUUsS0FBSzs0QkFDaEIsS0FBSyxFQUFFLCtCQUErQjs0QkFDdEMsV0FBVyxFQUFFLFNBQVM7eUJBQ3RCO3FCQUNEO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YscUJBQXFCLENBQUMsWUFBWSxDQUNqQyxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQ3pGLENBQUE7WUFDRCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ3RELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdkQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1lBQ3JDLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUU7cUJBQzlFO2lCQUNEO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YscUJBQXFCLENBQUMsWUFBWSxDQUNqQyxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLEtBQUssRUFBRSxpQkFBaUIsRUFBRSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQ3pGLENBQUE7WUFDRCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQy9DLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsa0RBQWtELEVBQUUsR0FBRyxFQUFFO1lBQzdELE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxvQkFBb0IsRUFBRTtxQkFDbEY7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQztnQkFDZCxZQUFZO2dCQUNaLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixlQUFlLEVBQUU7b0JBQ2hCLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDO2lCQUNuQztnQkFDckIsV0FBVyxFQUFFLFVBQVU7YUFDdkIsQ0FBQyxDQUNGLENBQUE7WUFDRCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDekQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsK0RBQStELEVBQUUsR0FBRyxFQUFFO1lBQzFFLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFOzRCQUNMLFNBQVMsRUFBRSxLQUFLOzRCQUNoQixLQUFLLEVBQUUsb0NBQW9DOzRCQUMzQyxXQUFXLEVBQUUsY0FBYzt5QkFDM0I7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQztnQkFDZCxZQUFZO2dCQUNaLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixlQUFlLEVBQUU7b0JBQ2hCLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO2lCQUNqQztnQkFDckIsR0FBRyxFQUFFLE1BQU07YUFDWCxDQUFDLENBQ0YsQ0FBQTtZQUNELG1DQUFtQztZQUNuQyxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQ25ELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDbEQsYUFBYTtZQUNiLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO2dCQUNkLFlBQVk7Z0JBQ1osV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLGVBQWUsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7aUJBQ2pDO2dCQUNyQixHQUFHLEVBQUUsTUFBTTthQUNYLENBQUMsQ0FDRixDQUFBO1lBQ0QsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO2dCQUNuRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ25ELENBQUM7aUJBQU0sQ0FBQztnQkFDUCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUE7Z0JBQzNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHlIQUF5SCxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFJLElBQUkscUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQy9DLFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFOzRCQUNMLFNBQVMsRUFBRSxLQUFLOzRCQUNoQixLQUFLLEVBQUUsb0NBQW9DOzRCQUMzQyxXQUFXLEVBQUUsY0FBYzt5QkFDM0I7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQztnQkFDZCxZQUFZO2dCQUNaLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixlQUFlLEVBQUU7b0JBQ2hCLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO2lCQUNqQztnQkFDckIsR0FBRyxFQUFFLE1BQU07YUFDWCxDQUFDLENBQ0YsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNsRCxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7Z0JBQ2hCLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO29CQUMzQyxRQUFRLEVBQUU7d0JBQ1QsVUFBVSxFQUFFOzRCQUNYLElBQUksRUFBRTtnQ0FDTCxTQUFTLEVBQUUsS0FBSztnQ0FDaEIsS0FBSyxFQUFFLG9DQUFvQztnQ0FDM0MsV0FBVyxFQUFFLGNBQWM7NkJBQzNCO3lCQUNEO3FCQUNEO2lCQUNELENBQUMsQ0FBQTtnQkFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQztvQkFDZCxZQUFZO29CQUNaLFdBQVcsRUFBRSxTQUFTO29CQUN0QixlQUFlLEVBQUU7d0JBQ2hCLEdBQUcsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDO3FCQUNqQztvQkFDckIsR0FBRyxFQUFFLE1BQU07aUJBQ1gsQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO2dCQUMzRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3hELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==