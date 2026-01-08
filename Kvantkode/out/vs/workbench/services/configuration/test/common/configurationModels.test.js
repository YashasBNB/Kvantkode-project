/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { StandaloneConfigurationModelParser, Configuration, } from '../../common/configurationModels.js';
import { ConfigurationModelParser, ConfigurationModel, } from '../../../../../platform/configuration/common/configurationModels.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { WorkspaceFolder } from '../../../../../platform/workspace/common/workspace.js';
import { URI } from '../../../../../base/common/uri.js';
import { Workspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
suite('FolderSettingsModelParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    suiteSetup(() => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: 'FolderSettingsModelParser_1',
            type: 'object',
            properties: {
                'FolderSettingsModelParser.window': {
                    type: 'string',
                    default: 'isSet',
                },
                'FolderSettingsModelParser.resource': {
                    type: 'string',
                    default: 'isSet',
                    scope: 5 /* ConfigurationScope.RESOURCE */,
                },
                'FolderSettingsModelParser.resourceLanguage': {
                    type: 'string',
                    default: 'isSet',
                    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
                },
                'FolderSettingsModelParser.application': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'FolderSettingsModelParser.machine': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
    });
    test('parse all folder settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({
            'FolderSettingsModelParser.window': 'window',
            'FolderSettingsModelParser.resource': 'resource',
            'FolderSettingsModelParser.application': 'application',
            'FolderSettingsModelParser.machine': 'executable',
        }), { scopes: [5 /* ConfigurationScope.RESOURCE */, 4 /* ConfigurationScope.WINDOW */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['window'] = 'window';
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
    test('parse resource folder settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({
            'FolderSettingsModelParser.window': 'window',
            'FolderSettingsModelParser.resource': 'resource',
            'FolderSettingsModelParser.application': 'application',
            'FolderSettingsModelParser.machine': 'executable',
        }), { scopes: [5 /* ConfigurationScope.RESOURCE */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
    test('parse resource and resource language settings', () => {
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({
            '[json]': {
                'FolderSettingsModelParser.window': 'window',
                'FolderSettingsModelParser.resource': 'resource',
                'FolderSettingsModelParser.resourceLanguage': 'resourceLanguage',
                'FolderSettingsModelParser.application': 'application',
                'FolderSettingsModelParser.machine': 'executable',
            },
        }), { scopes: [5 /* ConfigurationScope.RESOURCE */, 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */] });
        const expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        expected['FolderSettingsModelParser']['resourceLanguage'] = 'resourceLanguage';
        assert.deepStrictEqual(testObject.configurationModel.overrides, [
            {
                contents: expected,
                identifiers: ['json'],
                keys: ['FolderSettingsModelParser.resource', 'FolderSettingsModelParser.resourceLanguage'],
            },
        ]);
    });
    test('reparse folder settings excludes application and machine setting', () => {
        const parseOptions = {
            scopes: [5 /* ConfigurationScope.RESOURCE */, 4 /* ConfigurationScope.WINDOW */],
        };
        const testObject = new ConfigurationModelParser('settings', new NullLogService());
        testObject.parse(JSON.stringify({
            'FolderSettingsModelParser.resource': 'resource',
            'FolderSettingsModelParser.anotherApplicationSetting': 'executable',
        }), parseOptions);
        let expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        expected['FolderSettingsModelParser']['anotherApplicationSetting'] = 'executable';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: 'FolderSettingsModelParser_2',
            type: 'object',
            properties: {
                'FolderSettingsModelParser.anotherApplicationSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 1 /* ConfigurationScope.APPLICATION */,
                },
                'FolderSettingsModelParser.anotherMachineSetting': {
                    type: 'string',
                    default: 'isSet',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
            },
        });
        testObject.reparse(parseOptions);
        expected = Object.create(null);
        expected['FolderSettingsModelParser'] = Object.create(null);
        expected['FolderSettingsModelParser']['resource'] = 'resource';
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
});
suite('StandaloneConfigurationModelParser', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('parse tasks stand alone configuration model', () => {
        const testObject = new StandaloneConfigurationModelParser('tasks', 'tasks', new NullLogService());
        testObject.parse(JSON.stringify({ version: '1.1.1', tasks: [] }));
        const expected = Object.create(null);
        expected['tasks'] = Object.create(null);
        expected['tasks']['version'] = '1.1.1';
        expected['tasks']['tasks'] = [];
        assert.deepStrictEqual(testObject.configurationModel.contents, expected);
    });
});
suite('Workspace Configuration', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    const defaultConfigurationModel = toConfigurationModel({
        'editor.lineNumbers': 'on',
        'editor.fontSize': 12,
        'window.zoomLevel': 1,
        '[markdown]': {
            'editor.wordWrap': 'off',
        },
        'window.title': 'custom',
        'workbench.enableTabs': false,
        'editor.insertSpaces': true,
    });
    test('Test compare same configurations', () => {
        const workspace = new Workspace('a', [
            new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }),
            new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('folder2') }),
            new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') }),
        ]);
        const configuration1 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration1.updateDefaultConfiguration(defaultConfigurationModel);
        configuration1.updateLocalUserConfiguration(toConfigurationModel({
            'window.title': 'native',
            '[typescript]': { 'editor.insertSpaces': false },
        }));
        configuration1.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration1.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration1.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const configuration2 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration2.updateDefaultConfiguration(defaultConfigurationModel);
        configuration2.updateLocalUserConfiguration(toConfigurationModel({
            'window.title': 'native',
            '[typescript]': { 'editor.insertSpaces': false },
        }));
        configuration2.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration2.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration2.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const actual = configuration2.compare(configuration1);
        assert.deepStrictEqual(actual, { keys: [], overrides: [] });
    });
    test('Test compare different configurations', () => {
        const workspace = new Workspace('a', [
            new WorkspaceFolder({ index: 0, name: 'a', uri: URI.file('folder1') }),
            new WorkspaceFolder({ index: 1, name: 'b', uri: URI.file('folder2') }),
            new WorkspaceFolder({ index: 2, name: 'c', uri: URI.file('folder3') }),
        ]);
        const configuration1 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration1.updateDefaultConfiguration(defaultConfigurationModel);
        configuration1.updateLocalUserConfiguration(toConfigurationModel({
            'window.title': 'native',
            '[typescript]': { 'editor.insertSpaces': false },
        }));
        configuration1.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.lineNumbers': 'on' }));
        configuration1.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.fontSize': 14 }));
        configuration1.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({ 'editor.wordWrap': 'on' }));
        const configuration2 = new Configuration(ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), ConfigurationModel.createEmptyModel(new NullLogService()), new ResourceMap(), workspace, new NullLogService());
        configuration2.updateDefaultConfiguration(defaultConfigurationModel);
        configuration2.updateLocalUserConfiguration(toConfigurationModel({
            'workbench.enableTabs': true,
            '[typescript]': { 'editor.insertSpaces': true },
        }));
        configuration2.updateWorkspaceConfiguration(toConfigurationModel({ 'editor.fontSize': 11 }));
        configuration2.updateFolderConfiguration(URI.file('folder1'), toConfigurationModel({ 'editor.insertSpaces': true }));
        configuration2.updateFolderConfiguration(URI.file('folder2'), toConfigurationModel({
            '[markdown]': {
                'editor.wordWrap': 'on',
                'editor.lineNumbers': 'relative',
            },
        }));
        const actual = configuration2.compare(configuration1);
        assert.deepStrictEqual(actual, {
            keys: [
                'editor.wordWrap',
                'editor.fontSize',
                '[markdown]',
                'window.title',
                'workbench.enableTabs',
                '[typescript]',
            ],
            overrides: [
                ['markdown', ['editor.lineNumbers', 'editor.wordWrap']],
                ['typescript', ['editor.insertSpaces']],
            ],
        });
    });
});
function toConfigurationModel(obj) {
    const parser = new ConfigurationModelParser('test', new NullLogService());
    parser.parse(JSON.stringify(obj));
    return parser.configurationModel;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi90ZXN0L2NvbW1vbi9jb25maWd1cmF0aW9uTW9kZWxzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGFBQWEsR0FDYixNQUFNLHFDQUFxQyxDQUFBO0FBQzVDLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsa0JBQWtCLEdBRWxCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUVOLFVBQVUsSUFBSSx1QkFBdUIsR0FFckMsTUFBTSx1RUFBdUUsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDMUYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRTFFLEtBQUssQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7SUFDdkMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxVQUFVLENBQUMsR0FBRyxFQUFFO1FBQ2YsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUN4Qyx1QkFBdUIsQ0FBQyxhQUFhLENBQ3JD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