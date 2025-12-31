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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vdGVzdC9jb21tb24vY29uZmlndXJhdGlvbk1vZGVscy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxhQUFhLEdBQ2IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLGtCQUFrQixHQUVsQixNQUFNLHFFQUFxRSxDQUFBO0FBQzVFLE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBRXJDLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUxRSxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsVUFBVSxDQUFDLEdBQUcsRUFBRTtRQUNmLE1BQU0scUJBQXFCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDeEMsdUJBQXVCLENBQUMsYUFBYSxDQUNyQyxDQUFB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