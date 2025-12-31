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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbmZpZ3VyYXRpb24udGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL2V4dEhvc3RDb25maWd1cmF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUF3QixxQkFBcUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBS2xHLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsd0JBQXdCLEdBQ3hCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBRU4sZUFBZSxHQUNmLE1BQU0sb0RBQW9ELENBQUE7QUFNM0QsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBSXZFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsc0JBQXNCLEVBQUU7SUFDN0IsTUFBTSxjQUFlLFNBQVEsSUFBSSxFQUFnQztRQUV2RCwwQkFBMEIsQ0FDbEMsTUFBMkIsRUFDM0IsR0FBVyxFQUNYLEtBQVU7WUFFVixJQUFJLENBQUMsUUFBUSxHQUFHLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUNwQyxPQUFPLE9BQU8sQ0FBQyxP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