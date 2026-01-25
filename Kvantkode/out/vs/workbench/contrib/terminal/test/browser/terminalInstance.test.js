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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbnN0YW5jZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxJbnN0YW5jZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3JELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFHeEgsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUZBQWlGLENBQUE7QUFPekgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDcEUsT0FBTyxFQUNOLDZCQUE2QixFQUU3Qix3QkFBd0IsR0FDeEIsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RixPQUFPLEVBQ04sZUFBZSxFQUNmLGdCQUFnQixFQUNoQixxQkFBcUIsR0FDckIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsK0JBQStCLEVBQWdCLE1BQU0sMEJBQTBCLENBQUE7QUFDeEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixrQ0FBa0MsRUFDbEMsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsTUFBTSxLQUFLLEdBQUcsWUFBWSxDQUFBO0FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUM3QixNQUFNLEtBQUssR0FBRyxZQUFZLENBQUE7QUFDMUIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBRTdCLE1BQU0sa0NBQW1DLFNBQVEsa0NBQWtDO0lBQ3pFLEtBQUssQ0FBQyxpQkFBaUI7UUFDL0IsT0FBTztZQUNOLFdBQVcsRUFBRSxPQUFPO1lBQ3BCLElBQUksRUFBRSxjQUFjO1lBQ3BCLEdBQUcsRUFBRTtnQkFDSixJQUFJLEVBQUUsTUFBTTthQUNaO1lBQ0QsU0FBUyxFQUFFLElBQUk7WUFDZixZQUFZLEVBQUUsS0FBSztZQUNuQixVQUFVLEVBQUUsSUFBSTtZQUNoQixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLGdCQUFnQjthQUNwQjtZQUNELEtBQUssRUFBRSxxQkFBcUI7U0FDNUIsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sMkJBQTJCLEdBQUc7SUFDbkMsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7SUFDYixLQUFLLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQztJQUNmLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxTQUFTO0NBQ3BCLENBQUE7QUFFRCxNQUFNLHdCQUF5QixTQUFRLFVBQVU7SUFFaEQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsWUFBcUIsYUFBc0I7UUFDMUMsS0FBSyxFQUFFLENBQUE7UUFEYSxrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQUozQyxPQUFFLEdBQVcsQ0FBQyxDQUFBO1FBZWQsd0JBQW1CLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUNoQyxrQkFBYSxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7UUFDMUIsa0JBQWEsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQzFCLG1CQUFjLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUMzQiwwQkFBcUIsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ2xDLDhCQUF5QixHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUE7SUFkdEMsQ0FBQztJQUNELGNBQWMsQ0FBQyxRQUFhLEVBQUUsS0FBVTtRQUN2QyxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQVlELEtBQUssQ0FBQyxLQUFLO1FBQ1YsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELFFBQVEsQ0FBQyxTQUFrQixJQUFTLENBQUM7SUFDckMsS0FBSyxDQUFDLElBQVksSUFBUyxDQUFDO0lBQzVCLE1BQU0sQ0FBQyxJQUFZLEVBQUUsSUFBWSxJQUFTLENBQUM7SUFDM0MsV0FBVyxLQUFVLENBQUM7SUFDdEIsb0JBQW9CLENBQUMsU0FBaUIsSUFBUyxDQUFDO0lBQ2hELEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxPQUFtQixJQUFrQixDQUFDO0lBQzlELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELEtBQUssQ0FBQyxNQUFNO1FBQ1gsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFZLElBQWtCLENBQUM7SUFDbkQsZUFBZSxDQUFDLFFBQWE7UUFDNUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzNCLENBQUM7Q0FDRDtBQUVELE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUNuRCxVQUFVO1FBQ1QsT0FBTztZQUNOLGFBQWEsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUN6QixxQkFBcUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNqQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUMvQixnQkFBZ0IsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUM1Qix1QkFBdUIsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUNuQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsSUFBSTtZQUM5QixhQUFhLEVBQUUsQ0FDZCxpQkFBc0IsRUFDdEIsR0FBVyxFQUNYLElBQVksRUFDWixJQUFZLEVBQ1osY0FBMEIsRUFDMUIsR0FBUSxFQUNSLG1CQUE0QixFQUM1QixhQUFzQixFQUNyQixFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHdCQUF3QixDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQ2hFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztTQUM5QixDQUFBO0lBQ1QsQ0FBQztDQUNEO0FBRUQsS0FBSyxDQUFDLDhCQUE4QixFQUFFLEdBQUcsRUFBRTtJQUMxQyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxHQUFHLEVBQUU7UUFDOUIsSUFBSSxnQkFBbUMsQ0FBQTtRQUN2QyxJQUFJLENBQUMsNkVBQTZFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDOUYsTUFBTSxvQkFBb0IsR0FBRyw2QkFBNkIsQ0FDekQ7Z0JBQ0Msb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQzFCLElBQUksd0JBQXdCLENBQUM7b0JBQzVCLEtBQUssRUFBRSxFQUFFO29CQUNULFFBQVEsRUFBRTt3QkFDVCxVQUFVLEVBQUU7NEJBQ1gsVUFBVSxFQUFFLFdBQVc7NEJBQ3ZCLFVBQVUsRUFBRSxJQUFJOzRCQUNoQixxQkFBcUIsRUFBRSxDQUFDOzRCQUN4QiwyQkFBMkIsRUFBRSxDQUFDOzRCQUM5QixjQUFjLEVBQUUsR0FBRzs0QkFDbkIsZ0JBQWdCLEVBQUU7Z0NBQ2pCLE9BQU8sRUFBRSxJQUFJOzZCQUNiO3lCQUNEO3FCQUNEO2lCQUNELENBQUM7YUFDSCxFQUNELEtBQUssQ0FDTCxDQUFBO1lBQ0Qsb0JBQW9CLENBQUMsR0FBRyxDQUN2QiwrQkFBK0IsRUFDL0IsSUFBSSxrQ0FBa0MsRUFBRSxDQUN4QyxDQUFBO1lBQ0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLElBQUkseUJBQXlCLEVBQUUsQ0FBQyxDQUFBO1lBQ2xGLG9CQUFvQixDQUFDLElBQUksQ0FDeEIsMkJBQTJCLEVBQzNCLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FDMUUsQ0FBQTtZQUNELG9CQUFvQixDQUFDLElBQUksQ0FDeEIsd0JBQXdCLEVBQ3hCLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSwyQkFBMkIsRUFBRSxDQUFDLENBQzVDLENBQUE7WUFDRCxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUMzQixvQkFBb0IsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsMkJBQTJCLEVBQUUsRUFBRSxDQUFDLENBQ3RGLENBQUE7WUFDRCwrREFBK0Q7WUFDL0QsTUFBTSxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3hELGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUMxRSxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0YsS0FBSyxDQUFDLGlCQUFpQixFQUFFLEdBQUcsRUFBRTtRQUM3QixJQUFJLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO1lBQy9ELGVBQWUsQ0FBQyxlQUFlLENBQUMsU0FBUyxFQUFFLEVBQUUsMkNBQW1DLFNBQVMsQ0FBQyxFQUFFO2dCQUMzRixJQUFJLEVBQUUsU0FBUztnQkFDZixPQUFPLEVBQUUsU0FBUzthQUNsQixDQUFDLENBQUE7WUFDRixlQUFlLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxFQUFFLHFDQUE2QixTQUFTLENBQUMsRUFBRTtnQkFDckYsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQyxDQUFBO1lBQ0YsZUFBZSxDQUFDLGVBQWUsQ0FBQyxTQUFTLEVBQUUsRUFBRSx3Q0FBZ0MsU0FBUyxDQUFDLEVBQUU7Z0JBQ3hGLElBQUksRUFBRSxTQUFTO2dCQUNmLE9BQU8sRUFBRSxTQUFTO2FBQ2xCLENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLDRDQUE0QyxFQUFFLEdBQUcsRUFBRTtZQUN2RCxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLDJDQUFtQyxTQUFTLENBQUMsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLFNBQVM7YUFDbEIsQ0FBQyxDQUFBO1lBQ0YsZUFBZSxDQUFDLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxxQ0FBNkIsU0FBUyxDQUFDLEVBQUU7Z0JBQzdFLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSxTQUFTO2FBQ2xCLENBQUMsQ0FBQTtZQUNGLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQyxFQUFFLEVBQUUsMkNBQW1DLFNBQVMsQ0FBQyxFQUFFO2dCQUNuRixJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsU0FBUzthQUNsQixDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxxRkFBcUYsRUFBRSxHQUFHLEVBQUU7WUFDaEcsZUFBZSxDQUNkLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLDJDQUFtQyxTQUFTLENBQUMsRUFDckYsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSw2REFBNkQsRUFBRSxDQUNuRixDQUFBO1lBQ0QsZUFBZSxDQUNkLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLHFDQUE2QixTQUFTLENBQUMsRUFDL0UsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSwwREFBMEQsRUFBRSxDQUNoRixDQUFBO1lBQ0QsZUFBZSxDQUNkLGVBQWUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLHdDQUFnQyxTQUFTLENBQUMsRUFDbEYsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLE9BQU8sRUFBRSwwREFBMEQsRUFBRSxDQUNoRixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsK0ZBQStGLEVBQUUsR0FBRyxFQUFFO1lBQzFHLGVBQWUsQ0FDZCxlQUFlLENBQ2QsQ0FBQyxFQUNELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsMkNBRTNDLFNBQVMsQ0FDVCxFQUNEO2dCQUNDLElBQUksRUFBRSxDQUFDO2dCQUNQLE9BQU8sRUFBRSwwRUFBMEU7YUFDbkYsQ0FDRCxDQUFBO1lBQ0QsZUFBZSxDQUNkLGVBQWUsQ0FDZCxDQUFDLEVBQ0QsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxxQ0FFM0MsU0FBUyxDQUNULEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLHVFQUF1RTthQUNoRixDQUNELENBQUE7WUFDRCxlQUFlLENBQ2QsZUFBZSxDQUNkLENBQUMsRUFDRCxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLHdDQUUzQyxTQUFTLENBQ1QsRUFDRDtnQkFDQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsdUVBQXVFO2FBQ2hGLENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGtHQUFrRyxFQUFFLEdBQUcsRUFBRTtZQUM3RyxlQUFlLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLDJDQUFtQyxTQUFTLENBQUMsRUFBRTtnQkFDbkYsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLHVEQUF1RDthQUNoRSxDQUFDLENBQUE7WUFDRixlQUFlLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLHFDQUE2QixTQUFTLENBQUMsRUFBRTtnQkFDN0UsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLG9EQUFvRDthQUM3RCxDQUFDLENBQUE7WUFDRixlQUFlLENBQUMsZUFBZSxDQUFDLENBQUMsRUFBRSxFQUFFLHdDQUFnQyxTQUFTLENBQUMsRUFBRTtnQkFDaEYsSUFBSSxFQUFFLENBQUM7Z0JBQ1AsT0FBTyxFQUFFLG9EQUFvRDthQUM3RCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx1Q0FBdUMsRUFBRSxHQUFHLEVBQUU7WUFDbEQsZUFBZSxDQUNkLGVBQWUsQ0FDZCxFQUFFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxFQUM1QyxFQUFFLDJDQUVGLFNBQVMsQ0FDVCxFQUNELEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLENBQ3ZDLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxxQ0FBcUMsRUFBRSxHQUFHLEVBQUU7WUFDaEQsZUFBZSxDQUNkLGVBQWUsQ0FDZDtnQkFDQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQ04sa0ZBQWtGO2FBQ25GLEVBQ0QsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLDJDQUVyQixTQUFTLENBQ1QsRUFDRDtnQkFDQyxJQUFJLEVBQUUsQ0FBQztnQkFDUCxPQUFPLEVBQUUsZ0tBQWdLO2FBQ3pLLENBQ0QsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtZQUNsRCxlQUFlLENBQ2QsZUFBZSxDQUNkO2dCQUNDLElBQUksRUFBRSxHQUFHO2dCQUNULE9BQU8sRUFDTixvRkFBb0Y7YUFDckYsRUFDRCxFQUFFLDJDQUVGLE1BQU0sQ0FDTixFQUNEO2dCQUNDLElBQUksRUFBRSxHQUFHO2dCQUNULE9BQU8sRUFBRSx3SEFBd0g7YUFDakksQ0FDRCxDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsd0NBQXdDLEVBQUUsR0FBRyxFQUFFO1lBQ25ELGVBQWUsQ0FDZCxlQUFlLENBQ2Q7Z0JBQ0MsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsT0FBTyxFQUNOLHFGQUFxRjthQUN0RixFQUNELEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSwyQ0FFckIsU0FBUyxDQUNULEVBQ0Q7Z0JBQ0MsSUFBSSxFQUFFLElBQUk7Z0JBQ1YsT0FBTyxFQUFFLHVOQUF1TjthQUNoTyxDQUNELENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxHQUFHLEVBQUU7WUFDM0MsZUFBZSxDQUNkLGVBQWUsQ0FDZDtnQkFDQyxJQUFJLEVBQUUsR0FBRztnQkFDVCxPQUFPLEVBQ04sb0ZBQW9GO2FBQ3JGLEVBQ0QsRUFBRSwyQ0FFRixTQUFTLENBQ1QsRUFDRDtnQkFDQyxJQUFJLEVBQUUsR0FBRztnQkFDVCxPQUFPLEVBQUUsNEhBQTRIO2FBQ3JJLENBQ0QsQ0FBQTtZQUNELGVBQWUsQ0FDZCxlQUFlLENBQ2QsRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsRUFDN0IsRUFBRSwyQ0FFRixTQUFTLENBQ1QsRUFDRCxFQUFFLElBQUksRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLDZDQUE2QyxFQUFFLENBQ3JFLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0YsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtRQUNuQyxJQUFJLG9CQUE4QyxDQUFBO1FBQ2xELElBQUksWUFBcUMsQ0FBQTtRQUV6QyxTQUFTLGNBQWMsQ0FDdEIsT0FBb0M7WUFnQnBDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7WUFDN0QsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixZQUFZLENBQUMsR0FBRywrQ0FBdUMsSUFBSyxDQUFDLENBQUE7WUFDOUQsQ0FBQztZQUNELE9BQU87Z0JBQ04saUJBQWlCLEVBQUUsRUFBRTtnQkFDckIsU0FBUywwQ0FBNkI7Z0JBQ3RDLEdBQUcsRUFBRSxLQUFLO2dCQUNWLFVBQVUsRUFBRSxTQUFTO2dCQUNyQixXQUFXLEVBQUUsRUFBRTtnQkFDZixRQUFRLEVBQUUsU0FBUztnQkFDbkIsZUFBZSxFQUFFLFNBQVM7Z0JBQzFCLFdBQVcsRUFBRSxTQUFTO2dCQUN0QixZQUFZO2dCQUNaLEtBQUssRUFBRSxFQUFFO2dCQUNULFdBQVcsRUFBRSxFQUFFO2dCQUNmLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixHQUFHLE9BQU87YUFDVixDQUFBO1FBQ0YsQ0FBQztRQUVELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtZQUNoQixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdEUsWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7WUFDdkQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoQixZQUFZLENBQUMsR0FBRywrQ0FBdUMsSUFBSyxDQUFDLENBQUE7WUFDOUQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsU0FBUyxtQkFBbUIsQ0FBQyxhQUFrQjtZQUM5QyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMscUJBQXFCLEVBQUUsSUFBSSx3QkFBd0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFBO1lBQzVGLG9CQUFvQixDQUFDLEdBQUcsQ0FDdkIsNkJBQTZCLEVBQzdCLEtBQUssQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsY0FBYyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FDNUUsQ0FBQTtZQUNELE9BQU8sS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzdFLENBQUM7UUFFRCxJQUFJLENBQUMsNERBQTRELEVBQUUsR0FBRyxFQUFFO1lBQ3ZFLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRTthQUNwRixDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDckYsUUFBUTtZQUNSLDhDQUE4QztZQUM5Qyw2QkFBNkI7WUFDN0IsbUNBQW1DO1lBQ25DLE1BQU07WUFDTixXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzVDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDbkQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO1lBQy9CLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsRUFBRSxFQUFFO2lCQUNsRjthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNqRixXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDdkQsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsR0FBRyxFQUFFO1lBQzNDLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFOzRCQUNMLFNBQVMsRUFBRSxLQUFLOzRCQUNoQixLQUFLLEVBQUUsb0JBQW9COzRCQUMzQixXQUFXLEVBQUUsb0JBQW9CO3lCQUNqQztxQkFDRDtpQkFDRDthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO2dCQUNkLFlBQVk7Z0JBQ1osV0FBVyxFQUFFLEtBQUs7Z0JBQ2xCLGVBQWUsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7aUJBQ25DO2FBQ3JCLENBQUMsQ0FDRixDQUFBO1lBQ0QsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUNsRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3pELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEdBQUcsRUFBRTtZQUNqQyxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLFdBQVcsRUFBRSxVQUFVLEVBQUUsRUFBRTtpQkFDdEY7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FDMUYsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDakQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4RCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxHQUFHLEVBQUU7WUFDbkMsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRTtxQkFDMUU7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQUMsY0FBYyxDQUFDLEVBQUUsWUFBWSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDeEYsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUMvQyxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3RELENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEdBQUcsRUFBRTtZQUNwQyxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFDO2dCQUNqRCxRQUFRLEVBQUU7b0JBQ1QsVUFBVSxFQUFFO3dCQUNYLElBQUksRUFBRSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFO3FCQUM1RTtpQkFDRDthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxjQUFjLENBQUMsRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUMxRixXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLFVBQVUsQ0FBQyxDQUFBO1lBQ3BELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDM0QsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO1lBQ2hDLE1BQU0scUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7Z0JBQ2pELFFBQVEsRUFBRTtvQkFDVCxVQUFVLEVBQUU7d0JBQ1gsSUFBSSxFQUFFOzRCQUNMLFNBQVMsRUFBRSxLQUFLOzRCQUNoQixLQUFLLEVBQUUsK0JBQStCOzRCQUN0QyxXQUFXLEVBQUUsU0FBUzt5QkFDdEI7cUJBQ0Q7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FDekYsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsWUFBWSxDQUFDLENBQUE7WUFDdEQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUN2RCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7WUFDckMsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRTtxQkFDOUU7aUJBQ0Q7YUFDRCxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxZQUFZLENBQ2pDLGNBQWMsQ0FBQyxFQUFFLFlBQVksRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLGlCQUFpQixFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FDekYsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDL0MsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNuRCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxHQUFHLEVBQUU7WUFDN0QsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsV0FBVyxFQUFFLG9CQUFvQixFQUFFO3FCQUNsRjtpQkFDRDthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO2dCQUNkLFlBQVk7Z0JBQ1osV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLGVBQWUsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUM7aUJBQ25DO2dCQUNyQixXQUFXLEVBQUUsVUFBVTthQUN2QixDQUFDLENBQ0YsQ0FBQTtZQUNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDcEQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN6RCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQywrREFBK0QsRUFBRSxHQUFHLEVBQUU7WUFDMUUsTUFBTSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDakQsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUU7NEJBQ0wsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLEtBQUssRUFBRSxvQ0FBb0M7NEJBQzNDLFdBQVcsRUFBRSxjQUFjO3lCQUMzQjtxQkFDRDtpQkFDRDthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO2dCQUNkLFlBQVk7Z0JBQ1osV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLGVBQWUsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7aUJBQ2pDO2dCQUNyQixHQUFHLEVBQUUsTUFBTTthQUNYLENBQUMsQ0FDRixDQUFBO1lBQ0QsbUNBQW1DO1lBQ25DLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkQsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUNsRCxhQUFhO1lBQ2IscUJBQXFCLENBQUMsWUFBWSxDQUNqQyxjQUFjLENBQUM7Z0JBQ2QsWUFBWTtnQkFDWixXQUFXLEVBQUUsU0FBUztnQkFDdEIsZUFBZSxFQUFFO29CQUNoQixHQUFHLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztpQkFDakM7Z0JBQ3JCLEdBQUcsRUFBRSxNQUFNO2FBQ1gsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ25ELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDbkQsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtnQkFDM0QsV0FBVyxDQUFDLHFCQUFxQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtZQUN4RCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMseUhBQXlILEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUksSUFBSSxxQkFBcUIsR0FBRyxtQkFBbUIsQ0FBQztnQkFDL0MsUUFBUSxFQUFFO29CQUNULFVBQVUsRUFBRTt3QkFDWCxJQUFJLEVBQUU7NEJBQ0wsU0FBUyxFQUFFLEtBQUs7NEJBQ2hCLEtBQUssRUFBRSxvQ0FBb0M7NEJBQzNDLFdBQVcsRUFBRSxjQUFjO3lCQUMzQjtxQkFDRDtpQkFDRDthQUNELENBQUMsQ0FBQTtZQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO2dCQUNkLFlBQVk7Z0JBQ1osV0FBVyxFQUFFLFNBQVM7Z0JBQ3RCLGVBQWUsRUFBRTtvQkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7aUJBQ2pDO2dCQUNyQixHQUFHLEVBQUUsTUFBTTthQUNYLENBQUMsQ0FDRixDQUFBO1lBQ0QsV0FBVyxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUNuRCxXQUFXLENBQUMscUJBQXFCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ2xELElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEIscUJBQXFCLEdBQUcsbUJBQW1CLENBQUM7b0JBQzNDLFFBQVEsRUFBRTt3QkFDVCxVQUFVLEVBQUU7NEJBQ1gsSUFBSSxFQUFFO2dDQUNMLFNBQVMsRUFBRSxLQUFLO2dDQUNoQixLQUFLLEVBQUUsb0NBQW9DO2dDQUMzQyxXQUFXLEVBQUUsY0FBYzs2QkFDM0I7eUJBQ0Q7cUJBQ0Q7aUJBQ0QsQ0FBQyxDQUFBO2dCQUNGLHFCQUFxQixDQUFDLFlBQVksQ0FDakMsY0FBYyxDQUFDO29CQUNkLFlBQVk7b0JBQ1osV0FBVyxFQUFFLFNBQVM7b0JBQ3RCLGVBQWUsRUFBRTt3QkFDaEIsR0FBRyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUM7cUJBQ2pDO29CQUNyQixHQUFHLEVBQUUsTUFBTTtpQkFDWCxDQUFDLENBQ0YsQ0FBQTtnQkFDRCxXQUFXLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLGlCQUFpQixDQUFDLENBQUE7Z0JBQzNELFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDeEQsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9