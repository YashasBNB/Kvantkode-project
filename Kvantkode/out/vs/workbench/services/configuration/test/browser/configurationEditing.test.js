/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as sinon from 'sinon';
import assert from 'assert';
import * as json from '../../../../../base/common/json.js';
import { Event } from '../../../../../base/common/event.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { TestEnvironmentService, TestTextFileService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
import * as uuid from '../../../../../base/common/uuid.js';
import { Extensions as ConfigurationExtensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { WorkspaceService } from '../../browser/configurationService.js';
import { ConfigurationEditing, } from '../../common/configurationEditing.js';
import { WORKSPACE_STANDALONE_CONFIGURATIONS, FOLDER_SETTINGS_PATH, USER_STANDALONE_CONFIGURATIONS, } from '../../common/configuration.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITextFileService } from '../../../textfile/common/textfiles.js';
import { ITextModelService } from '../../../../../editor/common/services/resolverService.js';
import { TextModelResolverService } from '../../../textmodelResolver/common/textModelResolverService.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { CommandService } from '../../../commands/common/commandService.js';
import { URI } from '../../../../../base/common/uri.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Schemas } from '../../../../../base/common/network.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { KeybindingsEditingService, IKeybindingEditingService, } from '../../../keybinding/common/keybindingEditing.js';
import { FileUserDataProvider } from '../../../../../platform/userData/common/fileUserDataProvider.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { toDisposable } from '../../../../../base/common/lifecycle.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { RemoteAgentService } from '../../../remote/browser/remoteAgentService.js';
import { getSingleFolderWorkspaceIdentifier } from '../../../workspaces/browser/workspaces.js';
import { IUserDataProfilesService, UserDataProfilesService, } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { hash } from '../../../../../base/common/hash.js';
import { FilePolicyService } from '../../../../../platform/policy/common/filePolicyService.js';
import { runWithFakedTimers } from '../../../../../base/test/common/timeTravelScheduler.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class ConfigurationCache {
    needsCaching(resource) {
        return false;
    }
    async read() {
        return '';
    }
    async write() { }
    async remove() { }
}
suite('ConfigurationEditing', () => {
    let instantiationService;
    let userDataProfileService;
    let environmentService;
    let fileService;
    let workspaceService;
    let testObject;
    suiteSetup(() => {
        const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
        configurationRegistry.registerConfiguration({
            id: '_test',
            type: 'object',
            properties: {
                'configurationEditing.service.testSetting': {
                    type: 'string',
                    default: 'isSet',
                },
                'configurationEditing.service.testSettingTwo': {
                    type: 'string',
                    default: 'isSet',
                },
                'configurationEditing.service.testSettingThree': {
                    type: 'string',
                    default: 'isSet',
                },
                'configurationEditing.service.policySetting': {
                    type: 'string',
                    default: 'isSet',
                    policy: {
                        name: 'configurationEditing.service.policySetting',
                        minimumVersion: '1.0.0',
                    },
                },
            },
        });
    });
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        disposables.add(toDisposable(() => sinon.restore()));
        const logService = new NullLogService();
        fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        const workspaceFolder = joinPath(ROOT, uuid.generateUuid());
        await fileService.createFolder(workspaceFolder);
        instantiationService = workbenchInstantiationService(undefined, disposables);
        environmentService = TestEnvironmentService;
        environmentService.policyFile = joinPath(workspaceFolder, 'policies.json');
        instantiationService.stub(IEnvironmentService, environmentService);
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService)));
        userDataProfileService = disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile));
        const remoteAgentService = disposables.add(instantiationService.createInstance(RemoteAgentService));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, disposables.add(new FileUserDataProvider(ROOT.scheme, fileSystemProvider, Schemas.vscodeUserData, userDataProfilesService, uriIdentityService, logService))));
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(IRemoteAgentService, remoteAgentService);
        workspaceService = disposables.add(new WorkspaceService({ configurationCache: new ConfigurationCache() }, environmentService, userDataProfileService, userDataProfilesService, fileService, remoteAgentService, uriIdentityService, new NullLogService(), disposables.add(new FilePolicyService(environmentService.policyFile, fileService, logService))));
        await workspaceService.initialize({
            id: hash(workspaceFolder.toString()).toString(16),
            uri: workspaceFolder,
        });
        instantiationService.stub(IWorkspaceContextService, workspaceService);
        await workspaceService.initialize(getSingleFolderWorkspaceIdentifier(workspaceFolder));
        instantiationService.stub(IConfigurationService, workspaceService);
        instantiationService.stub(IKeybindingEditingService, disposables.add(instantiationService.createInstance(KeybindingsEditingService)));
        instantiationService.stub(ITextFileService, disposables.add(instantiationService.createInstance(TestTextFileService)));
        instantiationService.stub(ITextModelService, (disposables.add(instantiationService.createInstance(TextModelResolverService))));
        instantiationService.stub(ICommandService, CommandService);
        testObject = instantiationService.createInstance(ConfigurationEditing, null);
    });
    test('errors cases - invalid key', async () => {
        try {
            await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'unknown.key', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 0 /* ConfigurationEditingErrorCode.ERROR_UNKNOWN_KEY */);
            return;
        }
        assert.fail('Should fail with ERROR_UNKNOWN_KEY');
    });
    test('errors cases - no workspace', async () => {
        await workspaceService.initialize({ id: uuid.generateUuid() });
        try {
            await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 8 /* ConfigurationEditingErrorCode.ERROR_NO_WORKSPACE_OPENED */);
            return;
        }
        assert.fail('Should fail with ERROR_NO_WORKSPACE_OPENED');
    });
    test('errors cases - invalid configuration', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_INVALID_CONFIGURATION');
    });
    test('errors cases - invalid global tasks configuration', async () => {
        const resource = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(resource, VSBuffer.fromString(',,,,,,,,,,,,,,'));
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'tasks.configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 11 /* ConfigurationEditingErrorCode.ERROR_INVALID_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_INVALID_CONFIGURATION');
    });
    test('errors cases - dirty', async () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */);
            return;
        }
        assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.');
    });
    test('do not notify error', async () => {
        instantiationService.stub(ITextFileService, 'isDirty', true);
        const target = sinon.stub();
        instantiationService.stub(INotificationService, {
            prompt: target,
            _serviceBrand: undefined,
            filter: false,
            onDidAddNotification: undefined,
            onDidRemoveNotification: undefined,
            onDidChangeFilter: undefined,
            notify: null,
            error: null,
            info: null,
            warn: null,
            status: null,
            setFilter: null,
            getFilter: null,
            getFilters: null,
            removeFilter: null,
        });
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.testSetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(false, target.calledOnce);
            assert.strictEqual(error.code, 9 /* ConfigurationEditingErrorCode.ERROR_CONFIGURATION_FILE_DIRTY */);
            return;
        }
        assert.fail('Should fail with ERROR_CONFIGURATION_FILE_DIRTY error.');
    });
    test('errors cases - ERROR_POLICY_CONFIGURATION', async () => {
        await runWithFakedTimers({ useFakeTimers: true }, async () => {
            const promise = Event.toPromise(instantiationService.get(IConfigurationService).onDidChangeConfiguration);
            await fileService.writeFile(environmentService.policyFile, VSBuffer.fromString('{ "configurationEditing.service.policySetting": "policyValue" }'));
            await promise;
        });
        try {
            await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.policySetting', value: 'value' }, { donotNotifyError: true });
        }
        catch (error) {
            assert.strictEqual(error.code, 12 /* ConfigurationEditingErrorCode.ERROR_POLICY_CONFIGURATION */);
            return;
        }
        assert.fail('Should fail with ERROR_POLICY_CONFIGURATION');
    });
    test('write policy setting - when not set', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key: 'configurationEditing.service.policySetting', value: 'value' }, { donotNotifyError: true });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.policySetting'], 'value');
    });
    test('write one setting - empty file', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'configurationEditing.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.testSetting'], 'value');
    });
    test('write one setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'configurationEditing.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['configurationEditing.service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('remove an existing setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value", "configurationEditing.service.testSetting": "value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'configurationEditing.service.testSetting',
            value: undefined,
        });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(Object.keys(parsed), ['my.super.setting']);
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('remove non existing setting - existing file', async () => {
        await fileService.writeFile(userDataProfileService.currentProfile.settingsResource, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'configurationEditing.service.testSetting',
            value: undefined,
        });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(Object.keys(parsed), ['my.super.setting']);
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write overridable settings to user settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, { key, value });
        const contents = await fileService.readFile(userDataProfileService.currentProfile.settingsResource);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write overridable settings to workspace settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, { key, value });
        const contents = await fileService.readFile(joinPath(workspaceService.getWorkspace().folders[0].uri, FOLDER_SETTINGS_PATH));
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write overridable settings to workspace folder settings', async () => {
        const key = '[language]';
        const value = { 'configurationEditing.service.testSetting': 'overridden value' };
        const folderSettingsFile = joinPath(workspaceService.getWorkspace().folders[0].uri, FOLDER_SETTINGS_PATH);
        await testObject.writeConfiguration(4 /* EditableConfigurationTarget.WORKSPACE_FOLDER */, { key, value }, { scopes: { resource: folderSettingsFile } });
        const contents = await fileService.readFile(folderSettingsFile);
        const parsed = json.parse(contents.value.toString());
        assert.deepStrictEqual(parsed[key], value);
    });
    test('write workspace standalone setting - empty file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
    });
    test('write user standalone setting - empty file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
    });
    test('write workspace standalone setting - existing file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write user standalone setting - existing file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks.service.testSetting',
            value: 'value',
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['service.testSetting'], 'value');
        assert.strictEqual(parsed['my.super.setting'], 'my.super.value');
    });
    test('write workspace standalone setting - empty file - full JSON', async () => {
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - empty file - full JSON', async () => {
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting - existing file - full JSON', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - existing file - full JSON', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": "my.super.value" }'));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting - existing file with JSON errors - full JSON', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": ')); // invalid JSON
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write user standalone setting - existing file with JSON errors - full JSON', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString('{ "my.super.setting": ')); // invalid JSON
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask' }] },
        });
        const contents = await fileService.readFile(target);
        const parsed = json.parse(contents.value.toString());
        assert.strictEqual(parsed['version'], '1.0.0');
        assert.strictEqual(parsed['tasks'][0]['taskName'], 'myTask');
    });
    test('write workspace standalone setting should replace complete file', async () => {
        const target = joinPath(workspaceService.getWorkspace().folders[0].uri, WORKSPACE_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString(`{
			"version": "1.0.0",
			"tasks": [
				{
					"taskName": "myTask1"
				},
				{
					"taskName": "myTask2"
				}
			]
		}`));
        await testObject.writeConfiguration(3 /* EditableConfigurationTarget.WORKSPACE */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask1' }] },
        });
        const actual = await fileService.readFile(target);
        const expected = JSON.stringify({ version: '1.0.0', tasks: [{ taskName: 'myTask1' }] }, null, '\t');
        assert.strictEqual(actual.value.toString(), expected);
    });
    test('write user standalone setting should replace complete file', async () => {
        const target = joinPath(environmentService.userRoamingDataHome, USER_STANDALONE_CONFIGURATIONS['tasks']);
        await fileService.writeFile(target, VSBuffer.fromString(`{
			"version": "1.0.0",
			"tasks": [
				{
					"taskName": "myTask1"
				},
				{
					"taskName": "myTask2"
				}
			]
		}`));
        await testObject.writeConfiguration(1 /* EditableConfigurationTarget.USER_LOCAL */, {
            key: 'tasks',
            value: { version: '1.0.0', tasks: [{ taskName: 'myTask1' }] },
        });
        const actual = await fileService.readFile(target);
        const expected = JSON.stringify({ version: '1.0.0', tasks: [{ taskName: 'myTask1' }] }, null, '\t');
        assert.strictEqual(actual.value.toString(), expected);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vdGVzdC9icm93c2VyL2NvbmZpZ3VyYXRpb25FZGl0aW5nLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNoRyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFFTixVQUFVLElBQUksdUJBQXVCLEdBQ3JDLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUNOLG9CQUFvQixHQUdwQixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsb0JBQW9CLEVBQ3BCLDhCQUE4QixHQUU5QixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxxQkFBcUIsRUFB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