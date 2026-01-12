/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { stub } from 'sinon';
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { normalize } from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { isLinux, isMacintosh, isWindows } from '../../../../../base/common/platform.js';
import { isObject } from '../../../../../base/common/types.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Selection } from '../../../../../editor/common/core/selection.js';
import { EditorType } from '../../../../../editor/common/editorCommon.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { testWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { TestEditorService, TestQuickInputService, } from '../../../../test/browser/workbenchTestServices.js';
import { TestContextService, TestExtensionService, TestStorageService, } from '../../../../test/common/workbenchTestServices.js';
import { BaseConfigurationResolverService } from '../../browser/baseConfigurationResolverService.js';
import { ConfigurationResolverExpression } from '../../common/configurationResolverExpression.js';
const mockLineNumber = 10;
class TestEditorServiceWithActiveEditor extends TestEditorService {
    get activeTextEditorControl() {
        return {
            getEditorType() {
                return EditorType.ICodeEditor;
            },
            getSelection() {
                return new Selection(mockLineNumber, 1, mockLineNumber, 10);
            },
        };
    }
    get activeEditor() {
        return {
            get resource() {
                return URI.parse('file:///VSCode/workspaceLocation/file');
            },
        };
    }
}
class TestConfigurationResolverService extends BaseConfigurationResolverService {
}
const nullContext = {
    getAppRoot: () => undefined,
    getExecPath: () => undefined,
};
suite('Configuration Resolver Service', () => {
    let configurationResolverService;
    const envVariables = { key1: 'Value for key1', key2: 'Value for key2' };
    // let environmentService: MockWorkbenchEnvironmentService;
    let mockCommandService;
    let editorService;
    let containingWorkspace;
    let workspace;
    let quickInputService;
    let labelService;
    let pathService;
    let extensionService;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        mockCommandService = new MockCommandService();
        editorService = disposables.add(new TestEditorServiceWithActiveEditor());
        quickInputService = new TestQuickInputService();
        // environmentService = new MockWorkbenchEnvironmentService(envVariables);
        labelService = new MockLabelService();
        pathService = new MockPathService();
        extensionService = new TestExtensionService();
        containingWorkspace = testWorkspace(URI.parse('file:///VSCode/workspaceLocation'));
        workspace = containingWorkspace.folders[0];
        configurationResolverService = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), editorService, new MockInputsConfigurationService(), mockCommandService, new TestContextService(containingWorkspace), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
    });
    teardown(() => {
        configurationResolverService = null;
    });
    test('substitute one', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('apples platform specific config', async () => {
        const expected = isWindows
            ? 'windows.exe'
            : isMacintosh
                ? 'osx.sh'
                : isLinux
                    ? 'linux.sh'
                    : undefined;
        const obj = {
            windows: {
                program: 'windows.exe',
            },
            osx: {
                program: 'osx.sh',
            },
            linux: {
                program: 'linux.sh',
            },
        };
        const originalObj = JSON.stringify(obj);
        const config = await configurationResolverService.resolveAsync(workspace, obj);
        assert.strictEqual(config.program, expected);
        assert.strictEqual(config.windows, undefined);
        assert.strictEqual(config.osx, undefined);
        assert.strictEqual(config.linux, undefined);
        assert.strictEqual(JSON.stringify(obj), originalObj); // did not mutate original
    });
    test('workspace folder with argument', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('workspace folder with invalid argument', async () => {
        await assert.rejects(async () => await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder:invalidLocation} xyz'));
    });
    test('workspace folder with undefined workspace folder', async () => {
        await assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder} xyz'));
    });
    test('workspace folder with argument and undefined workspace folder', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc \\VSCode\\workspaceLocation xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:workspaceLocation} xyz'), 'abc /VSCode/workspaceLocation xyz');
        }
    });
    test('workspace folder with invalid argument and undefined workspace folder', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${workspaceFolder:invalidLocation} xyz'));
    });
    test('workspace root folder name', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceRootFolderName} xyz'), 'abc workspaceLocation xyz');
    });
    test('current selected line number', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${lineNumber} xyz'), `abc ${mockLineNumber} xyz`);
    });
    test('relative file', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile} xyz'), 'abc file xyz');
    });
    test('relative file with argument', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile:workspaceLocation} xyz'), 'abc file xyz');
    });
    test('relative file with invalid argument', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(workspace, 'abc ${relativeFile:invalidLocation} xyz'));
    });
    test('relative file with undefined workspace folder', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile} xyz'), 'abc \\VSCode\\workspaceLocation\\file xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile} xyz'), 'abc /VSCode/workspaceLocation/file xyz');
        }
    });
    test('relative file with argument and undefined workspace folder', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile:workspaceLocation} xyz'), 'abc file xyz');
    });
    test('relative file with invalid argument and undefined workspace folder', () => {
        assert.rejects(async () => await configurationResolverService.resolveAsync(undefined, 'abc ${relativeFile:invalidLocation} xyz'));
    });
    test('substitute many', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder}'), '\\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder}'), '/VSCode/workspaceLocation - /VSCode/workspaceLocation');
        }
    });
    test('substitute one env variable', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} ${env:key1} xyz'), 'abc \\VSCode\\workspaceLocation Value for key1 xyz');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, 'abc ${workspaceFolder} ${env:key1} xyz'), 'abc /VSCode/workspaceLocation Value for key1 xyz');
        }
    });
    test('substitute many env variable', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), '\\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation Value for key1 - Value for key2');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), '/VSCode/workspaceLocation - /VSCode/workspaceLocation Value for key1 - Value for key2');
        }
    });
    test('disallows nested keys (#77289)', async () => {
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} ${env:key1${env:key2}}'), 'Value for key1 ');
    });
    test('supports extensionDir', async () => {
        const getExtension = stub(extensionService, 'getExtension');
        getExtension
            .withArgs('publisher.extId')
            .returns(Promise.resolve({ extensionLocation: URI.file('/some/path') }));
        assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${extensionInstallFolder:publisher.extId}'), URI.file('/some/path').fsPath);
    });
    // test('substitute keys and values in object', () => {
    // 	const myObject = {
    // 		'${workspaceRootFolderName}': '${lineNumber}',
    // 		'hey ${env:key1} ': '${workspaceRootFolderName}'
    // 	};
    // 	assert.deepStrictEqual(configurationResolverService!.resolveAsync(workspace, myObject), {
    // 		'workspaceLocation': `${editorService.mockLineNumber}`,
    // 		'hey Value for key1 ': 'workspaceLocation'
    // 	});
    // });
    test('substitute one env variable using platform case sensitivity', async () => {
        if (platform.isWindows) {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} - ${env:Key1}'), 'Value for key1 - Value for key1');
        }
        else {
            assert.strictEqual(await configurationResolverService.resolveAsync(workspace, '${env:key1} - ${env:Key1}'), 'Value for key1 - ');
        }
    });
    test('substitute one configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar',
                },
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} xyz'), 'abc foo xyz');
    });
    test('substitute configuration variable with undefined workspace folder', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(undefined, 'abc ${config:editor.fontFamily} xyz'), 'abc foo xyz');
    });
    test('substitute many configuration variables', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar',
                },
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} xyz'), 'abc foo bar xyz');
    });
    test('substitute one env variable and a configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar',
                },
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        if (platform.isWindows) {
            assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${workspaceFolder} ${env:key1} xyz'), 'abc foo \\VSCode\\workspaceLocation Value for key1 xyz');
        }
        else {
            assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${workspaceFolder} ${env:key1} xyz'), 'abc foo /VSCode/workspaceLocation Value for key1 xyz');
        }
    });
    test('substitute many env variable and a configuration variable', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar',
                },
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        if (platform.isWindows) {
            assert.strictEqual(await service.resolveAsync(workspace, '${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} ${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), 'foo bar \\VSCode\\workspaceLocation - \\VSCode\\workspaceLocation Value for key1 - Value for key2');
        }
        else {
            assert.strictEqual(await service.resolveAsync(workspace, '${config:editor.fontFamily} ${config:terminal.integrated.fontFamily} ${workspaceFolder} - ${workspaceFolder} ${env:key1} - ${env:key2}'), 'foo bar /VSCode/workspaceLocation - /VSCode/workspaceLocation Value for key1 - Value for key2');
        }
    });
    test('mixed types of configuration variables', async () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
                lineNumbers: 123,
                insertSpaces: false,
            },
            terminal: {
                integrated: {
                    fontFamily: 'bar',
                },
            },
            json: {
                schemas: [
                    {
                        fileMatch: ['/myfile', '/myOtherfile'],
                        url: 'schemaURL',
                    },
                ],
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${config:editor.fontFamily} ${config:editor.lineNumbers} ${config:editor.insertSpaces} xyz'), 'abc foo 123 false xyz');
    });
    test('uses original variable as fallback', async () => {
        const configurationService = new TestConfigurationService({
            editor: {},
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${unknownVariable} xyz'), 'abc ${unknownVariable} xyz');
        assert.strictEqual(await service.resolveAsync(workspace, 'abc ${env:unknownVariable} xyz'), 'abc  xyz');
    });
    test('configuration variables with invalid accessor', () => {
        const configurationService = new TestConfigurationService({
            editor: {
                fontFamily: 'foo',
            },
        });
        const service = new TestConfigurationResolverService(nullContext, Promise.resolve(envVariables), disposables.add(new TestEditorServiceWithActiveEditor()), configurationService, mockCommandService, new TestContextService(), quickInputService, labelService, pathService, extensionService, disposables.add(new TestStorageService()));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${env} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${env:} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor..fontFamily} xyz'));
        assert.rejects(async () => await service.resolveAsync(workspace, 'abc ${config:editor.none.none2} xyz'));
    });
    test('a single command variable', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${command:command1}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(undefined, configuration)
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'command1-result',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('an old style command variable', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${command:commandVariable1}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService
            .resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables)
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'command1-result',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('multiple new and old-style command variables', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${command:commandVariable1}',
            pid: '${command:command2}',
            sourceMaps: false,
            outDir: 'src/${command:command2}',
            env: {
                processId: '__${command:command2}__',
            },
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService
            .resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables)
            .then((result) => {
            const expected = {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'command1-result',
                pid: 'command2-result',
                sourceMaps: false,
                outDir: 'src/command2-result',
                env: {
                    processId: '__command2-result__',
                },
            };
            assert.deepStrictEqual(Object.keys(result), Object.keys(expected));
            Object.keys(result).forEach((property) => {
                const expectedProperty = expected[property];
                if (isObject(result[property])) {
                    assert.deepStrictEqual({ ...result[property] }, expectedProperty);
                }
                else {
                    assert.deepStrictEqual(result[property], expectedProperty);
                }
            });
            assert.strictEqual(2, mockCommandService.callCount);
        });
    });
    test('a command variable that relies on resolved env vars', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${command:commandVariable1}',
            value: '${env:key1}',
        };
        const commandVariables = Object.create(null);
        commandVariables['commandVariable1'] = 'command1';
        return configurationResolverService
            .resolveWithInteractionReplace(undefined, configuration, undefined, commandVariables)
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'Value for key1',
                value: 'Value for key1',
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('a single prompt input variable', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${input:input1}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(workspace, configuration, 'tasks')
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'resolvedEnterinput1',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('a single pick input variable', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${input:input2}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(workspace, configuration, 'tasks')
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'selectedPick',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('a single command input variable', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${input:input4}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(workspace, configuration, 'tasks')
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'arg for command',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(1, mockCommandService.callCount);
        });
    });
    test('several input variables and command', () => {
        const configuration = {
            name: '${input:input3}',
            type: '${command:command1}',
            request: '${input:input1}',
            processId: '${input:input2}',
            command: '${input:input4}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(workspace, configuration, 'tasks')
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'resolvedEnterinput3',
                type: 'command1-result',
                request: 'resolvedEnterinput1',
                processId: 'selectedPick',
                command: 'arg for command',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(2, mockCommandService.callCount);
        });
    });
    test('input variable with undefined workspace folder', () => {
        const configuration = {
            name: 'Attach to Process',
            type: 'node',
            request: 'attach',
            processId: '${input:input1}',
            port: 5858,
            sourceMaps: false,
            outDir: null,
        };
        return configurationResolverService
            .resolveWithInteractionReplace(undefined, configuration, 'tasks')
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: 'Attach to Process',
                type: 'node',
                request: 'attach',
                processId: 'resolvedEnterinput1',
                port: 5858,
                sourceMaps: false,
                outDir: null,
            });
            assert.strictEqual(0, mockCommandService.callCount);
        });
    });
    test('contributed variable', () => {
        const buildTask = 'npm: compile';
        const variable = 'defaultBuildTask';
        const configuration = {
            name: '${' + variable + '}',
        };
        configurationResolverService.contributeVariable(variable, async () => {
            return buildTask;
        });
        return configurationResolverService
            .resolveWithInteractionReplace(workspace, configuration)
            .then((result) => {
            assert.deepStrictEqual({ ...result }, {
                name: `${buildTask}`,
            });
        });
    });
    test('resolveWithEnvironment', async () => {
        const env = {
            VAR_1: 'VAL_1',
            VAR_2: 'VAL_2',
        };
        const configuration = 'echo ${env:VAR_1}${env:VAR_2}';
        const resolvedResult = await configurationResolverService.resolveWithEnvironment({ ...env }, undefined, configuration);
        assert.deepStrictEqual(resolvedResult, 'echo VAL_1VAL_2');
    });
});
class MockCommandService {
    constructor() {
        this.callCount = 0;
        this.onWillExecuteCommand = () => Disposable.None;
        this.onDidExecuteCommand = () => Disposable.None;
    }
    executeCommand(commandId, ...args) {
        this.callCount++;
        let result = `${commandId}-result`;
        if (args.length >= 1) {
            if (args[0] && args[0].value) {
                result = args[0].value;
            }
        }
        return Promise.resolve(result);
    }
}
class MockLabelService {
    constructor() {
        this.onDidChangeFormatters = new Emitter().event;
    }
    getUriLabel(resource, options) {
        return normalize(resource.fsPath);
    }
    getUriBasenameLabel(resource) {
        throw new Error('Method not implemented.');
    }
    getWorkspaceLabel(workspace, options) {
        throw new Error('Method not implemented.');
    }
    getHostLabel(scheme, authority) {
        throw new Error('Method not implemented.');
    }
    getHostTooltip() {
        throw new Error('Method not implemented.');
    }
    getSeparator(scheme, authority) {
        throw new Error('Method not implemented.');
    }
    registerFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
    registerCachedFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
}
class MockPathService {
    constructor() {
        this.defaultUriScheme = Schemas.file;
    }
    get path() {
        throw new Error('Property not implemented');
    }
    fileURI(path) {
        throw new Error('Method not implemented.');
    }
    userHome(options) {
        const uri = URI.file('c:\\users\\username');
        return options?.preferLocal ? uri : Promise.resolve(uri);
    }
    hasValidBasename(resource, arg2, name) {
        throw new Error('Method not implemented.');
    }
}
class MockInputsConfigurationService extends TestConfigurationService {
    getValue(arg1, arg2) {
        let configuration;
        if (arg1 === 'tasks') {
            configuration = {
                inputs: [
                    {
                        id: 'input1',
                        type: 'promptString',
                        description: 'Enterinput1',
                        default: 'default input1',
                    },
                    {
                        id: 'input2',
                        type: 'pickString',
                        description: 'Enterinput1',
                        default: 'option2',
                        options: ['option1', 'option2', 'option3'],
                    },
                    {
                        id: 'input3',
                        type: 'promptString',
                        description: 'Enterinput3',
                        default: 'default input3',
                        provide: true,
                        password: true,
                    },
                    {
                        id: 'input4',
                        type: 'command',
                        command: 'command1',
                        args: {
                            value: 'arg for command',
                        },
                    },
                ],
            };
        }
        return configuration;
    }
    inspect(key, overrides) {
        return {
            value: undefined,
            defaultValue: undefined,
            userValue: undefined,
            overrideIdentifiers: [],
        };
    }
}
suite('ConfigurationResolverExpression', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse empty object', () => {
        const expr = ConfigurationResolverExpression.parse({});
        assert.strictEqual(Array.from(expr.unresolved()).length, 0);
        assert.deepStrictEqual(expr.toObject(), {});
    });
    test('parse simple string', () => {
        const expr = ConfigurationResolverExpression.parse({ value: '${env:HOME}' });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
    });
    test('parse string with argument and colon', () => {
        const expr = ConfigurationResolverExpression.parse({ value: '${config:path:to:value}' });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'config');
        assert.strictEqual(unresolved[0].arg, 'path:to:value');
    });
    test('parse object with nested variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}',
            path: '${env:HOME}/folder',
            settings: {
                value: '${config:path}',
            },
            array: ['${env:TERM}', { key: '${env:KEY}' }],
        });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 5);
        assert.deepStrictEqual(unresolved.map((r) => r.name).sort(), [
            'config',
            'env',
            'env',
            'env',
            'env',
        ]);
    });
    test('resolve and get result', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}',
            path: '${env:HOME}/folder',
        });
        expr.resolve({ inner: 'env:USERNAME', id: '${env:USERNAME}', name: 'env', arg: 'USERNAME' }, 'testuser');
        expr.resolve({ inner: 'env:HOME', id: '${env:HOME}', name: 'env', arg: 'HOME' }, '/home/testuser');
        assert.deepStrictEqual(expr.toObject(), {
            name: 'testuser',
            path: '/home/testuser/folder',
        });
    });
    test('keeps unresolved variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            name: '${env:USERNAME}',
        });
        assert.deepStrictEqual(expr.toObject(), {
            name: '${env:USERNAME}',
        });
    });
    test('deduplicates identical variables', () => {
        const expr = ConfigurationResolverExpression.parse({
            first: '${env:HOME}',
            second: '${env:HOME}',
        });
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
        expr.resolve(unresolved[0], '/home/user');
        assert.deepStrictEqual(expr.toObject(), {
            first: '/home/user',
            second: '/home/user',
        });
    });
    test('handles root string value', () => {
        const expr = ConfigurationResolverExpression.parse('abc ${env:HOME} xyz');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME');
        expr.resolve(unresolved[0], '/home/user');
        assert.strictEqual(expr.toObject(), 'abc /home/user xyz');
    });
    test('handles root string value with multiple variables', () => {
        const expr = ConfigurationResolverExpression.parse('${env:HOME}/folder${env:SHELL}');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 2);
        expr.resolve({ id: '${env:HOME}', inner: 'env:HOME', name: 'env', arg: 'HOME' }, '/home/user');
        expr.resolve({ id: '${env:SHELL}', inner: 'env:SHELL', name: 'env', arg: 'SHELL' }, '/bin/bash');
        assert.strictEqual(expr.toObject(), '/home/user/folder/bin/bash');
    });
    test('handles root string with escaped variables', () => {
        const expr = ConfigurationResolverExpression.parse('abc ${env:HOME${env:USER}} xyz');
        const unresolved = Array.from(expr.unresolved());
        assert.strictEqual(unresolved.length, 1);
        assert.strictEqual(unresolved[0].name, 'env');
        assert.strictEqual(unresolved[0].arg, 'HOME${env:USER}');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvblJlc29sdmVyL3Rlc3QvZWxlY3Ryb24tc2FuZGJveC9jb25maWd1cmF0aW9uUmVzb2x2ZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDNUIsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFTLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBT3pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBY3hILE9BQU8sRUFB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