/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TestConfigurationService } from '../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { TextResourceConfigurationService } from '../../../common/services/textResourceConfigurationService.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
suite('TextResourceConfigurationService - Update', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationValue = {};
    let updateArgs;
    const configurationService = new (class extends TestConfigurationService {
        inspect() {
            return configurationValue;
        }
        updateValue() {
            updateArgs = [...arguments];
            return Promise.resolve();
        }
    })();
    let language = null;
    let testObject;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        instantiationService.stub(IModelService, {
            getModel() {
                return null;
            },
        });
        instantiationService.stub(ILanguageService, {
            guessLanguageIdByFilepathOrFirstLine() {
                return language;
            },
        });
        instantiationService.stub(IConfigurationService, configurationService);
        testObject = disposables.add(instantiationService.createInstance(TextResourceConfigurationService));
    });
    test('updateValue writes without target and overrides when no language is defined', async () => {
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes with target and without overrides when no language is defined', async () => {
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 3 /* ConfigurationTarget.USER_LOCAL */);
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into given memory target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '1' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 8 /* ConfigurationTarget.MEMORY */);
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            8 /* ConfigurationTarget.MEMORY */,
        ]);
    });
    test('updateValue writes into given workspace target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 5 /* ConfigurationTarget.WORKSPACE */);
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            5 /* ConfigurationTarget.WORKSPACE */,
        ]);
    });
    test('updateValue writes into given user target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 2 /* ConfigurationTarget.USER */);
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            2 /* ConfigurationTarget.USER */,
        ]);
    });
    test('updateValue writes into given workspace folder target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2', override: '1' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b', 6 /* ConfigurationTarget.WORKSPACE_FOLDER */);
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
        ]);
    });
    test('updateValue writes into derived workspace folder target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspaceFolder: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
        ]);
    });
    test('updateValue writes into derived workspace folder target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '1' },
            workspaceFolder: { value: '2', override: '2' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            6 /* ConfigurationTarget.WORKSPACE_FOLDER */,
        ]);
    });
    test('updateValue writes into derived workspace target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            5 /* ConfigurationTarget.WORKSPACE */,
        ]);
    });
    test('updateValue writes into derived workspace target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '2' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            5 /* ConfigurationTarget.WORKSPACE */,
        ]);
    });
    test('updateValue writes into derived workspace target with overrides and value defined in folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2' },
            workspace: { value: '2', override: '2' },
            workspaceFolder: { value: '2' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            5 /* ConfigurationTarget.WORKSPACE */,
        ]);
    });
    test('updateValue writes into derived user remote target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            4 /* ConfigurationTarget.USER_REMOTE */,
        ]);
    });
    test('updateValue writes into derived user remote target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2', override: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            4 /* ConfigurationTarget.USER_REMOTE */,
        ]);
    });
    test('updateValue writes into derived user remote target with overrides and value defined in workspace', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
            userRemote: { value: '2', override: '3' },
            workspace: { value: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            4 /* ConfigurationTarget.USER_REMOTE */,
        ]);
    });
    test('updateValue writes into derived user remote target with overrides and value defined in workspace folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '1' },
            userRemote: { value: '2', override: '3' },
            workspace: { value: '3' },
            workspaceFolder: { value: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: language },
            4 /* ConfigurationTarget.USER_REMOTE */,
        ]);
    });
    test('updateValue writes into derived user target without overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into derived user target with overrides', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, [
            'a',
            '2',
            { resource, overrideIdentifier: language },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in remote', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            userRemote: { value: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, [
            'a',
            '2',
            { resource, overrideIdentifier: language },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in workspace', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
            userLocal: { value: '2', override: '3' },
            workspaceValue: { value: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, [
            'a',
            '2',
            { resource, overrideIdentifier: language },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into derived user target with overrides and value is defined in workspace folder', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2', override: '3' },
            userRemote: { value: '3' },
            workspaceFolderValue: { value: '3' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, [
            'a',
            '2',
            { resource, overrideIdentifier: language },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue writes into derived user target when overridden in default and not in user', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1', override: '3' },
            userLocal: { value: '2' },
            overrideIdentifiers: [language],
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', '2');
        assert.deepStrictEqual(updateArgs, [
            'a',
            '2',
            { resource, overrideIdentifier: language },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
    test('updateValue when not changed', async () => {
        language = 'a';
        configurationValue = {
            default: { value: '1' },
        };
        const resource = URI.file('someFile');
        await testObject.updateValue(resource, 'a', 'b');
        assert.deepStrictEqual(updateArgs, [
            'a',
            'b',
            { resource, overrideIdentifier: undefined },
            3 /* ConfigurationTarget.USER_LOCAL */,
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL3NlcnZpY2VzL3RleHRSZXNvdXJjZUNvbmZpZ3VyYXRpb25TZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDRFQUE0RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sOERBQThELENBQUE7QUFDL0csT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLEtBQUssQ0FBQywyQ0FBMkMsRUFBRSxHQUFHLEVBQUU7SUFDdkQsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksa0JBQWtCLEdBQTZCLEVBQUUsQ0FBQTtJQUNyRCxJQUFJLFVBQWlCLENBQUE7SUFDckIsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLENBQUMsS0FBTSxTQUFRLHdCQUF3QjtRQUM5RCxPQUFPO1lBQ2YsT0FBTyxrQkFBa0IsQ0FBQTtRQUMx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