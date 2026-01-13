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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdnZXIudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvdGVzdC9ub2RlL2RlYnVnZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQU9sRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDbkQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlGQUFpRixDQUFBO0FBQ25JLE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsa0JBQWtCLEVBQUUsR0FBRyxFQUFFO0lBQzlCLElBQUksU0FBbUIsQ0FBQTtJQUV2QixNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQTtJQUNyQyxNQUFNLG9CQUFvQixHQUFHO1FBQzVCLElBQUksRUFBRSxNQUFNO1FBQ1osS0FBSyxFQUFFLFlBQVk7UUFDbkIsT0FBTyxFQUFFLHlCQUF5QjtRQUNsQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDO1FBQ3RCLHVCQUF1QixFQUFF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