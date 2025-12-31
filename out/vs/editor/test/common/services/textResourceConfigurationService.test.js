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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFJlc291cmNlQ29uZmlndXJhdGlvblNlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci90ZXN0L2NvbW1vbi9zZXJ2aWNlcy90ZXh0UmVzb3VyY2VDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQUNySCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUVOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQy9HLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixLQUFLLENBQUMsMkNBQTJDLEVBQUUsR0FBRyxFQUFFO0lBQ3ZELE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLGtCQUFrQixHQUE2QixFQUFFLENBQUE7SUFDckQsSUFBSSxVQUFpQixDQUFBO0lBQ3JCLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLEtBQU0sU0FBUSx3QkFBd0I7UUFDOUQsT0FBTztZQUNmLE9BQU8sa0JBQWtCLENBQUE7UUFDMUIsQ0FBQztRQUNRLFdBQVc7WUFDbkIs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