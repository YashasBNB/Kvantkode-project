/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { join, normalize } from '../../../../../base/common/path.js';
import * as platform from '../../../../../base/common/platform.js';
import { Debugger } from '../../common/debugger.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { URI } from '../../../../../base/common/uri.js';
import { ExecutableDebugAdapter } from '../../node/debugAdapter.js';
import { TestTextResourcePropertiesService } from '../../../../../editor/test/common/services/testTextResourcePropertiesService.js';
import { ExtensionIdentifier, } from '../../../../../platform/extensions/common/extensions.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Debug - Debugger', () => {
    let _debugger;
    const extensionFolderPath = '/a/b/c/';
    const debuggerContribution = {
        type: 'mock',
        label: 'Mock Debug',
        program: './out/mock/mockDebug.js',
        args: ['arg1', 'arg2'],
        configurationAttributes: {
            launch: {
                required: ['program'],
                properties: {
                    program: {
                        type: 'string',
                        description: 'Workspace relative path to a text file.',
                        default: 'readme.md',
                    },
                },
            },
        },
        variables: null,
        initialConfigurations: [
            {
                name: 'Mock-Debug',
                type: 'mock',
                request: 'launch',
                program: 'readme.md',
            },
        ],
    };
    const extensionDescriptor0 = {
        id: 'adapter',
        identifier: new ExtensionIdentifier('adapter'),
        name: 'myAdapter',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file(extensionFolderPath),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            debuggers: [debuggerContribution],
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const extensionDescriptor1 = {
        id: 'extension1',
        identifier: new ExtensionIdentifier('extension1'),
        name: 'extension1',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file('/e1/b/c/'),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            debuggers: [
                {
                    type: 'mock',
                    runtime: 'runtime',
                    runtimeArgs: ['rarg'],
                    program: 'mockprogram',
                    args: ['parg'],
                },
            ],
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const extensionDescriptor2 = {
        id: 'extension2',
        identifier: new ExtensionIdentifier('extension2'),
        name: 'extension2',
        version: '1.0.0',
        publisher: 'vscode',
        extensionLocation: URI.file('/e2/b/c/'),
        isBuiltin: false,
        isUserBuiltin: false,
        isUnderDevelopment: false,
        engines: null,
        targetPlatform: "undefined" /* TargetPlatform.UNDEFINED */,
        contributes: {
            debuggers: [
                {
                    type: 'mock',
                    win: {
                        runtime: 'winRuntime',
                        program: 'winProgram',
                    },
                    linux: {
                        runtime: 'linuxRuntime',
                        program: 'linuxProgram',
                    },
                    osx: {
                        runtime: 'osxRuntime',
                        program: 'osxProgram',
                    },
                },
            ],
        },
        enabledApiProposals: undefined,
        preRelease: false,
    };
    const adapterManager = {
        getDebugAdapterDescriptor(session, config) {
            return Promise.resolve(undefined);
        },
    };
    ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    const testResourcePropertiesService = new TestTextResourcePropertiesService(configurationService);
    setup(() => {
        _debugger = new Debugger(adapterManager, debuggerContribution, extensionDescriptor0, configurationService, testResourcePropertiesService, undefined, undefined, undefined, undefined);
    });
    teardown(() => {
        _debugger = null;
    });
    test('attributes', () => {
        assert.strictEqual(_debugger.type, debuggerContribution.type);
        assert.strictEqual(_debugger.label, debuggerContribution.label);
        const ae = ExecutableDebugAdapter.platformAdapterExecutable([extensionDescriptor0], 'mock');
        assert.strictEqual(ae.command, join(extensionFolderPath, debuggerContribution.program));
        assert.deepStrictEqual(ae.args, debuggerContribution.args);
    });
    test('merge platform specific attributes', function () {
        if (!process.versions.electron) {
            this.skip(); //TODO@debug this test fails when run in node.js environments
        }
        const ae = ExecutableDebugAdapter.platformAdapterExecutable([extensionDescriptor1, extensionDescriptor2], 'mock');
        assert.strictEqual(ae.command, platform.isLinux ? 'linuxRuntime' : platform.isMacintosh ? 'osxRuntime' : 'winRuntime');
        const xprogram = platform.isLinux
            ? 'linuxProgram'
            : platform.isMacintosh
                ? 'osxProgram'
                : 'winProgram';
        assert.deepStrictEqual(ae.args, ['rarg', normalize('/e2/b/c/') + xprogram, 'parg']);
    });
    test('initial config file content', () => {
        const expected = [
            '{',
            '	// Use IntelliSense to learn about possible attributes.',
            '	// Hover to view descriptions of existing attributes.',
            '	// For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387',
            '	"version": "0.2.0",',
            '	"configurations": [',
            '		{',
            '			"name": "Mock-Debug",',
            '			"type": "mock",',
            '			"request": "launch",',
            '			"program": "readme.md"',
            '		}',
            '	]',
            '}',
        ].join(testResourcePropertiesService.getEOL(URI.file('somefile')));
        return _debugger.getInitialConfigurationContent().then((content) => {
            assert.strictEqual(content, expected);
        }, (err) => assert.fail(err));
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3Qvbm9kZS9kZWJ1Z2dlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUE7QUFPbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRkFBaUYsQ0FBQTtBQUNuSSxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLGtCQUFrQixFQUFFLEdBQUcsRUFBRTtJQUM5QixJQUFJLFNBQW1CLENBQUE7SUFFdkIsTUFBTSxtQkFBbUIsR0FBRyxTQUFTLENBQUE7SUFDckMsTUFBTSxvQkFBb0IsR0FBRztRQUM1QixJQUFJLEVBQUUsTUFBTTtRQUNaLEtBQUssRUFBRSxZQUFZO1FBQ25CLE9BQU8sRUFBRSx5QkFBeUI7UUFDbEMsSUFBSSxFQUFFLENBQUMsTUFBTSxFQUFFLE1BQU0sQ0FBQztRQUN0Qix1QkFBdUIsRUFBRTtZQUN4QixNQUFNLEVBQUU7Z0JBQ1As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