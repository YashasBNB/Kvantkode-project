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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb25SZXNvbHZlci90ZXN0L2VsZWN0cm9uLXNhbmRib3gvY29uZmlndXJhdGlvblJlc29sdmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sT0FBTyxDQUFBO0FBQzVCLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBUyxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEtBQUssUUFBUSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQU96RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQWN4SCxPQUFPLEVBQUUsYUFB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