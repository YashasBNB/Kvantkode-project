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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbkVkaXRpbmcudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9jb25maWd1cmF0aW9uL3Rlc3QvYnJvd3Nlci9jb25maWd1cmF0aW9uRWRpdGluZy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssSUFBSSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDaEcsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixtQkFBbUIsRUFDbkIsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixvQkFBb0IsR0FHcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sbUNBQW1DLEVBQ25DLG9CQUFvQixFQUNwQiw4QkFBOEIsR0FFOUIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVy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