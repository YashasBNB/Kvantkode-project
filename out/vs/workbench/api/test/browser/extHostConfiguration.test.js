/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../base/common/uri.js';
import { ExtHostWorkspace } from '../../common/extHostWorkspace.js';
import { ExtHostConfigProvider } from '../../common/extHostConfiguration.js';
import { ConfigurationModel, ConfigurationModelParser, } from '../../../../platform/configuration/common/configurationModels.js';
import { TestRPCProtocol } from '../common/testRPCProtocol.js';
import { mock } from '../../../../base/test/common/mock.js';
import { WorkspaceFolder, } from '../../../../platform/workspace/common/workspace.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { isLinux } from '../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('ExtHostConfiguration', function () {
    class RecordingShape extends mock() {
        $updateConfigurationOption(target, key, value) {
            this.lastArgs = [target, key, value];
            return Promise.resolve(undefined);
        }
    }
    function createExtHostWorkspace() {
        return new ExtHostWorkspace(new TestRPCProtocol(), new (class extends mock() {
        })(), new (class extends mock() {
            getCapabilities() {
                return isLinux ? 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ : undefined;
            }
        })(), new NullLogService(), new (class extends mock() {
        })());
    }
    function createExtHostConfiguration(contents = Object.create(null), shape) {
        if (!shape) {
            shape = new (class extends mock() {
            })();
        }
        return new ExtHostConfigProvider(shape, createExtHostWorkspace(), createConfigurationData(contents), new NullLogService());
    }
    function createConfigurationData(contents) {
        return {
            defaults: new ConfigurationModel(contents, [], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel(contents, [], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: ConfigurationModel.createEmptyModel(new NullLogService()),
            folders: [],
            configurationScopes: [],
        };
    }
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('getConfiguration fails regression test 1.7.1 -> 1.8 #15552', function () {
        const extHostConfig = createExtHostConfiguration({
            search: {
                exclude: {
                    '**/node_modules': true,
                },
            },
        });
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude')['**/node_modules'], true);
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude').get('**/node_modules'), true);
        assert.strictEqual(extHostConfig.getConfiguration('search').get('exclude')['**/node_modules'], true);
        assert.strictEqual(extHostConfig.getConfiguration('search.exclude').has('**/node_modules'), true);
        assert.strictEqual(extHostConfig.getConfiguration('search').has('exclude.**/node_modules'), true);
    });
    test('has/get', () => {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                nested: {
                    config1: 42,
                    config2: 'Das Pferd frisst kein Reis.',
                },
                config4: '',
            },
        });
        const config = all.getConfiguration('farboo');
        assert.ok(config.has('config0'));
        assert.strictEqual(config.get('config0'), true);
        assert.strictEqual(config.get('config4'), '');
        assert.strictEqual(config['config0'], true);
        assert.strictEqual(config['config4'], '');
        assert.ok(config.has('nested.config1'));
        assert.strictEqual(config.get('nested.config1'), 42);
        assert.ok(config.has('nested.config2'));
        assert.strictEqual(config.get('nested.config2'), 'Das Pferd frisst kein Reis.');
        assert.ok(config.has('nested'));
        assert.deepStrictEqual(config.get('nested'), {
            config1: 42,
            config2: 'Das Pferd frisst kein Reis.',
        });
    });
    test('get nested config', () => {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                nested: {
                    config1: 42,
                    config2: 'Das Pferd frisst kein Reis.',
                },
                config4: '',
            },
        });
        assert.deepStrictEqual(all.getConfiguration('farboo.nested').get('config1'), 42);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested').get('config2'), 'Das Pferd frisst kein Reis.');
        assert.deepStrictEqual(all.getConfiguration('farboo.nested')['config1'], 42);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested')['config2'], 'Das Pferd frisst kein Reis.');
        assert.deepStrictEqual(all.getConfiguration('farboo.nested1').get('config1'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.nested1').get('config2'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.config0.config1').get('a'), undefined);
        assert.deepStrictEqual(all.getConfiguration('farboo.config0.config1')['a'], undefined);
    });
    test('can modify the returned configuration', function () {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                nested: {
                    config1: 42,
                    config2: 'Das Pferd frisst kein Reis.',
                },
                config4: '',
            },
            workbench: {
                colorCustomizations: {
                    'statusBar.foreground': 'somevalue',
                },
            },
        });
        let testObject = all.getConfiguration();
        let actual = testObject.get('farboo');
        actual['nested']['config1'] = 41;
        assert.strictEqual(41, actual['nested']['config1']);
        actual['farboo1'] = 'newValue';
        assert.strictEqual('newValue', actual['farboo1']);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['nested']['config1'], 42);
        assert.strictEqual(actual['farboo1'], undefined);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['config0'], true);
        actual['config0'] = false;
        assert.strictEqual(actual['config0'], false);
        testObject = all.getConfiguration();
        actual = testObject.get('farboo');
        assert.strictEqual(actual['config0'], true);
        testObject = all.getConfiguration();
        actual = testObject.inspect('farboo');
        actual['value'] = 'effectiveValue';
        assert.strictEqual('effectiveValue', actual['value']);
        testObject = all.getConfiguration('workbench');
        actual = testObject.get('colorCustomizations');
        actual['statusBar.foreground'] = undefined;
        assert.strictEqual(actual['statusBar.foreground'], undefined);
        testObject = all.getConfiguration('workbench');
        actual = testObject.get('colorCustomizations');
        assert.strictEqual(actual['statusBar.foreground'], 'somevalue');
    });
    test('Stringify returned configuration', function () {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                nested: {
                    config1: 42,
                    config2: 'Das Pferd frisst kein Reis.',
                },
                config4: '',
            },
            workbench: {
                colorCustomizations: {
                    'statusBar.foreground': 'somevalue',
                },
                emptyobjectkey: {},
            },
        });
        const testObject = all.getConfiguration();
        let actual = testObject.get('farboo');
        assert.deepStrictEqual(JSON.stringify({
            config0: true,
            nested: {
                config1: 42,
                config2: 'Das Pferd frisst kein Reis.',
            },
            config4: '',
        }), JSON.stringify(actual));
        assert.deepStrictEqual(undefined, JSON.stringify(testObject.get('unknownkey')));
        actual = testObject.get('farboo');
        actual['config0'] = false;
        assert.deepStrictEqual(JSON.stringify({
            config0: false,
            nested: {
                config1: 42,
                config2: 'Das Pferd frisst kein Reis.',
            },
            config4: '',
        }), JSON.stringify(actual));
        actual = testObject.get('workbench')['colorCustomizations'];
        actual['statusBar.background'] = 'anothervalue';
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.foreground': 'somevalue',
            'statusBar.background': 'anothervalue',
        }), JSON.stringify(actual));
        actual = testObject.get('workbench');
        actual['unknownkey'] = 'somevalue';
        assert.deepStrictEqual(JSON.stringify({
            colorCustomizations: {
                'statusBar.foreground': 'somevalue',
            },
            emptyobjectkey: {},
            unknownkey: 'somevalue',
        }), JSON.stringify(actual));
        actual = all.getConfiguration('workbench').get('emptyobjectkey');
        actual = {
            ...(actual || {}),
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        };
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        }), JSON.stringify(actual));
        actual = all.getConfiguration('workbench').get('unknownkey');
        actual = {
            ...(actual || {}),
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        };
        assert.deepStrictEqual(JSON.stringify({
            'statusBar.background': `#0ff`,
            'statusBar.foreground': `#ff0`,
        }), JSON.stringify(actual));
    });
    test('cannot modify returned configuration', function () {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                nested: {
                    config1: 42,
                    config2: 'Das Pferd frisst kein Reis.',
                },
                config4: '',
            },
        });
        const testObject = all.getConfiguration();
        try {
            testObject['get'] = null;
            assert.fail('This should be readonly');
        }
        catch (e) { }
        try {
            testObject['farboo']['config0'] = false;
            assert.fail('This should be readonly');
        }
        catch (e) { }
        try {
            testObject['farboo']['farboo1'] = 'hello';
            assert.fail('This should be readonly');
        }
        catch (e) { }
    });
    test('inspect in no workspace context', function () {
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), createExtHostWorkspace(), {
            defaults: new ConfigurationModel({
                editor: {
                    wordWrap: 'off',
                    lineNumbers: 'on',
                    fontSize: '12px',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                editor: {
                    wordWrap: 'on',
                    lineNumbers: 'off',
                },
            }, ['editor.wordWrap', 'editor.lineNumbers'], [], undefined, new NullLogService()),
            userRemote: new ConfigurationModel({
                editor: {
                    lineNumbers: 'relative',
                },
            }, ['editor.lineNumbers'], [], {
                editor: {
                    lineNumbers: 'relative',
                    fontSize: '14px',
                },
            }, new NullLogService()),
            workspace: new ConfigurationModel({}, [], [], undefined, new NullLogService()),
            folders: [],
            configurationScopes: [],
        }, new NullLogService());
        let actual = testObject
            .getConfiguration()
            .inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'on');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, 'on');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        actual = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'on');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, 'on');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        actual = testObject.getConfiguration('editor').inspect('lineNumbers');
        assert.strictEqual(actual.defaultValue, 'on');
        assert.strictEqual(actual.globalLocalValue, 'off');
        assert.strictEqual(actual.globalRemoteValue, 'relative');
        assert.strictEqual(actual.globalValue, 'relative');
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration('editor').get('fontSize'), '12px');
        actual = testObject.getConfiguration('editor').inspect('fontSize');
        assert.strictEqual(actual.defaultValue, '12px');
        assert.strictEqual(actual.globalLocalValue, undefined);
        assert.strictEqual(actual.globalRemoteValue, '14px');
        assert.strictEqual(actual.globalValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
    });
    test('inspect in single root context', function () {
        const workspaceUri = URI.file('foo');
        const folders = [];
        const workspace = new ConfigurationModel({
            editor: {
                wordWrap: 'bounded',
            },
        }, ['editor.wordWrap'], [], undefined, new NullLogService());
        folders.push([workspaceUri, workspace]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            id: 'foo',
            folders: [aWorkspaceFolder(URI.file('foo'), 0)],
            name: 'foo',
        }, true);
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), extHostWorkspace, {
            defaults: new ConfigurationModel({
                editor: {
                    wordWrap: 'off',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                editor: {
                    wordWrap: 'on',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace,
            folders,
            configurationScopes: [],
        }, new NullLogService());
        let actual1 = testObject
            .getConfiguration()
            .inspect('editor.wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        let actual2 = testObject
            .getConfiguration(undefined, workspaceUri)
            .inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'bounded');
        actual2 = testObject.getConfiguration('editor', workspaceUri).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'bounded');
    });
    test('inspect in multi root context', function () {
        const workspace = new ConfigurationModel({
            editor: {
                wordWrap: 'bounded',
            },
        }, ['editor.wordWrap'], [], undefined, new NullLogService());
        const firstRoot = URI.file('foo1');
        const secondRoot = URI.file('foo2');
        const thirdRoot = URI.file('foo3');
        const folders = [];
        folders.push([
            firstRoot,
            new ConfigurationModel({
                editor: {
                    wordWrap: 'off',
                    lineNumbers: 'relative',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
        ]);
        folders.push([
            secondRoot,
            new ConfigurationModel({
                editor: {
                    wordWrap: 'on',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
        ]);
        folders.push([thirdRoot, new ConfigurationModel({}, [], [], undefined, new NullLogService())]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            id: 'foo',
            folders: [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
            name: 'foo',
        }, true);
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), extHostWorkspace, {
            defaults: new ConfigurationModel({
                editor: {
                    wordWrap: 'off',
                    lineNumbers: 'on',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: new ConfigurationModel({
                editor: {
                    wordWrap: 'on',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace,
            folders,
            configurationScopes: [],
        }, new NullLogService());
        let actual1 = testObject
            .getConfiguration()
            .inspect('editor.wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('wordWrap');
        assert.strictEqual(actual1.defaultValue, 'off');
        assert.strictEqual(actual1.globalValue, 'on');
        assert.strictEqual(actual1.globalLocalValue, 'on');
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, 'bounded');
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        actual1 = testObject.getConfiguration('editor').inspect('lineNumbers');
        assert.strictEqual(actual1.defaultValue, 'on');
        assert.strictEqual(actual1.globalValue, undefined);
        assert.strictEqual(actual1.globalLocalValue, undefined);
        assert.strictEqual(actual1.globalRemoteValue, undefined);
        assert.strictEqual(actual1.workspaceValue, undefined);
        assert.strictEqual(actual1.workspaceFolderValue, undefined);
        let actual2 = testObject
            .getConfiguration(undefined, firstRoot)
            .inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'off');
        actual2 = testObject.getConfiguration('editor', firstRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'off');
        actual2 = testObject.getConfiguration('editor', firstRoot).inspect('lineNumbers');
        assert.strictEqual(actual2.defaultValue, 'on');
        assert.strictEqual(actual2.globalValue, undefined);
        assert.strictEqual(actual2.globalLocalValue, undefined);
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, undefined);
        assert.strictEqual(actual2.workspaceFolderValue, 'relative');
        actual2 = testObject.getConfiguration(undefined, secondRoot).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'on');
        actual2 = testObject.getConfiguration('editor', secondRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.strictEqual(actual2.workspaceFolderValue, 'on');
        actual2 = testObject.getConfiguration(undefined, thirdRoot).inspect('editor.wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.ok(Object.keys(actual2).indexOf('workspaceFolderValue') !== -1);
        assert.strictEqual(actual2.workspaceFolderValue, undefined);
        actual2 = testObject.getConfiguration('editor', thirdRoot).inspect('wordWrap');
        assert.strictEqual(actual2.defaultValue, 'off');
        assert.strictEqual(actual2.globalValue, 'on');
        assert.strictEqual(actual2.globalLocalValue, 'on');
        assert.strictEqual(actual2.globalRemoteValue, undefined);
        assert.strictEqual(actual2.workspaceValue, 'bounded');
        assert.ok(Object.keys(actual2).indexOf('workspaceFolderValue') !== -1);
        assert.strictEqual(actual2.workspaceFolderValue, undefined);
    });
    test('inspect with language overrides', function () {
        const firstRoot = URI.file('foo1');
        const secondRoot = URI.file('foo2');
        const folders = [];
        folders.push([
            firstRoot,
            toConfigurationModel({
                'editor.wordWrap': 'bounded',
                '[typescript]': {
                    'editor.wordWrap': 'unbounded',
                },
            }),
        ]);
        folders.push([secondRoot, toConfigurationModel({})]);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            id: 'foo',
            folders: [aWorkspaceFolder(firstRoot, 0), aWorkspaceFolder(secondRoot, 1)],
            name: 'foo',
        }, true);
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), extHostWorkspace, {
            defaults: toConfigurationModel({
                'editor.wordWrap': 'off',
                '[markdown]': {
                    'editor.wordWrap': 'bounded',
                },
            }),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: ConfigurationModel.createEmptyModel(new NullLogService()),
            userLocal: toConfigurationModel({
                'editor.wordWrap': 'bounded',
                '[typescript]': {
                    'editor.lineNumbers': 'off',
                },
            }),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: toConfigurationModel({
                '[typescript]': {
                    'editor.wordWrap': 'unbounded',
                    'editor.lineNumbers': 'off',
                },
            }),
            folders,
            configurationScopes: [],
        }, new NullLogService());
        let actual = testObject
            .getConfiguration(undefined, { uri: firstRoot, languageId: 'typescript' })
            .inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'bounded');
        assert.strictEqual(actual.globalLocalValue, 'bounded');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, 'bounded');
        assert.strictEqual(actual.defaultLanguageValue, undefined);
        assert.strictEqual(actual.globalLanguageValue, undefined);
        assert.strictEqual(actual.workspaceLanguageValue, 'unbounded');
        assert.strictEqual(actual.workspaceFolderLanguageValue, 'unbounded');
        assert.deepStrictEqual(actual.languageIds, ['markdown', 'typescript']);
        actual = testObject
            .getConfiguration(undefined, { uri: secondRoot, languageId: 'typescript' })
            .inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'bounded');
        assert.strictEqual(actual.globalLocalValue, 'bounded');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(actual.defaultLanguageValue, undefined);
        assert.strictEqual(actual.globalLanguageValue, undefined);
        assert.strictEqual(actual.workspaceLanguageValue, 'unbounded');
        assert.strictEqual(actual.workspaceFolderLanguageValue, undefined);
        assert.deepStrictEqual(actual.languageIds, ['markdown', 'typescript']);
    });
    test('application is not set in inspect', () => {
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), createExtHostWorkspace(), {
            defaults: new ConfigurationModel({
                editor: {
                    wordWrap: 'off',
                    lineNumbers: 'on',
                    fontSize: '12px',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            policy: ConfigurationModel.createEmptyModel(new NullLogService()),
            application: new ConfigurationModel({
                editor: {
                    wordWrap: 'on',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userLocal: new ConfigurationModel({
                editor: {
                    wordWrap: 'auto',
                    lineNumbers: 'off',
                },
            }, ['editor.wordWrap'], [], undefined, new NullLogService()),
            userRemote: ConfigurationModel.createEmptyModel(new NullLogService()),
            workspace: new ConfigurationModel({}, [], [], undefined, new NullLogService()),
            folders: [],
            configurationScopes: [],
        }, new NullLogService());
        let actual = testObject
            .getConfiguration()
            .inspect('editor.wordWrap');
        assert.strictEqual(actual.defaultValue, 'off');
        assert.strictEqual(actual.globalValue, 'auto');
        assert.strictEqual(actual.globalLocalValue, 'auto');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.wordWrap'), 'auto');
        actual = testObject.getConfiguration().inspect('editor.lineNumbers');
        assert.strictEqual(actual.defaultValue, 'on');
        assert.strictEqual(actual.globalValue, 'off');
        assert.strictEqual(actual.globalLocalValue, 'off');
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.lineNumbers'), 'off');
        actual = testObject.getConfiguration().inspect('editor.fontSize');
        assert.strictEqual(actual.defaultValue, '12px');
        assert.strictEqual(actual.globalLocalValue, undefined);
        assert.strictEqual(actual.globalRemoteValue, undefined);
        assert.strictEqual(actual.globalValue, undefined);
        assert.strictEqual(actual.workspaceValue, undefined);
        assert.strictEqual(actual.workspaceFolderValue, undefined);
        assert.strictEqual(testObject.getConfiguration().get('editor.fontSize'), '12px');
    });
    test('getConfiguration vs get', function () {
        const all = createExtHostConfiguration({
            farboo: {
                config0: true,
                config4: 38,
            },
        });
        let config = all.getConfiguration('farboo.config0');
        assert.strictEqual(config.get(''), undefined);
        assert.strictEqual(config.has(''), false);
        config = all.getConfiguration('farboo');
        assert.strictEqual(config.get('config0'), true);
        assert.strictEqual(config.has('config0'), true);
    });
    test('name vs property', function () {
        const all = createExtHostConfiguration({
            farboo: {
                get: 'get-prop',
            },
        });
        const config = all.getConfiguration('farboo');
        assert.ok(config.has('get'));
        assert.strictEqual(config.get('get'), 'get-prop');
        assert.deepStrictEqual(config['get'], config.get);
        assert.throws(() => (config['get'] = 'get-prop'));
    });
    test('update: no target passes null', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            foo: {
                bar: 1,
                far: 1,
            },
        }, shape);
        const config = allConfig.getConfiguration('foo');
        config.update('bar', 42);
        assert.strictEqual(shape.lastArgs[0], null);
    });
    test('update/section to key', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            foo: {
                bar: 1,
                far: 1,
            },
        }, shape);
        let config = allConfig.getConfiguration('foo');
        config.update('bar', 42, true);
        assert.strictEqual(shape.lastArgs[0], 2 /* ConfigurationTarget.USER */);
        assert.strictEqual(shape.lastArgs[1], 'foo.bar');
        assert.strictEqual(shape.lastArgs[2], 42);
        config = allConfig.getConfiguration('');
        config.update('bar', 42, true);
        assert.strictEqual(shape.lastArgs[1], 'bar');
        config.update('foo.bar', 42, true);
        assert.strictEqual(shape.lastArgs[1], 'foo.bar');
    });
    test('update, what is #15834', function () {
        const shape = new RecordingShape();
        const allConfig = createExtHostConfiguration({
            editor: {
                formatOnSave: true,
            },
        }, shape);
        allConfig.getConfiguration('editor').update('formatOnSave', { extensions: ['ts'] });
        assert.strictEqual(shape.lastArgs[1], 'editor.formatOnSave');
        assert.deepStrictEqual(shape.lastArgs[2], { extensions: ['ts'] });
    });
    test('update/error-state not OK', function () {
        const shape = new (class extends mock() {
            $updateConfigurationOption(target, key, value) {
                return Promise.reject(new Error('Unknown Key')); // something !== OK
            }
        })();
        return createExtHostConfiguration({}, shape)
            .getConfiguration('')
            .update('', true, false)
            .then(() => assert.ok(false), (err) => {
            /* expecting rejection */
        });
    });
    test('configuration change event', (done) => {
        const workspaceFolder = aWorkspaceFolder(URI.file('folder1'), 0);
        const extHostWorkspace = createExtHostWorkspace();
        extHostWorkspace.$initializeWorkspace({
            id: 'foo',
            folders: [workspaceFolder],
            name: 'foo',
        }, true);
        const testObject = new ExtHostConfigProvider(new (class extends mock() {
        })(), extHostWorkspace, createConfigurationData({
            farboo: {
                config: false,
                updatedConfig: false,
            },
        }), new NullLogService());
        const newConfigData = createConfigurationData({
            farboo: {
                config: false,
                updatedConfig: true,
                newConfig: true,
            },
        });
        const configEventData = {
            keys: ['farboo.updatedConfig', 'farboo.newConfig'],
            overrides: [],
        };
        store.add(testObject.onDidChangeConfiguration((e) => {
            assert.deepStrictEqual(testObject.getConfiguration().get('farboo'), {
                config: false,
                updatedConfig: true,
                newConfig: true,
            });
            assert.ok(e.affectsConfiguration('farboo'));
            assert.ok(e.affectsConfiguration('farboo', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo', URI.file('any')));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig'));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo.updatedConfig', URI.file('any')));
            assert.ok(e.affectsConfiguration('farboo.newConfig'));
            assert.ok(e.affectsConfiguration('farboo.newConfig', workspaceFolder.uri));
            assert.ok(e.affectsConfiguration('farboo.newConfig', URI.file('any')));
            assert.ok(!e.affectsConfiguration('farboo.config'));
            assert.ok(!e.affectsConfiguration('farboo.config', workspaceFolder.uri));
            assert.ok(!e.affectsConfiguration('farboo.config', URI.file('any')));
            done();
        }));
        testObject.$acceptConfigurationChanged(newConfigData, configEventData);
    });
    test('get return instance of array value', function () {
        const testObject = createExtHostConfiguration({ far: { boo: [] } });
        const value = testObject.getConfiguration().get('far.boo', []);
        value.push('a');
        const actual = testObject.getConfiguration().get('far.boo', []);
        assert.deepStrictEqual(actual, []);
    });
    function aWorkspaceFolder(uri, index, name = '') {
        return new WorkspaceFolder({ uri, name, index });
    }
    function toConfigurationModel(obj) {
        const parser = new ConfigurationModelParser('test', new NullLogService());
        parser.parse(JSON.stringify(obj));
        return parser.configurationModel;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvZXh0SG9zdENvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQXdCLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLbEcsT0FBTyxFQUNOLGtCQUFrQixFQUNsQix3QkFBd0IsR0FDeEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFFTixlQUFlLEdBQ2YsTUFBTSxvREFBb0QsQ0FBQTtBQU0zRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFJdkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQyxzQkFBc0IsRUFBRTtJQUM3QixNQUFNLGNBQWUsU0FBUSxJQUFJLEVBQWdDO1FBRXZELDBCQUEwQixDQUNsQyxNQUEyQixFQUMzQixHQUFXLEVBQ1gsS0FBVTtZQUVWLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxNQUFNLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BDLE9BQU8sT0FBTyxD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