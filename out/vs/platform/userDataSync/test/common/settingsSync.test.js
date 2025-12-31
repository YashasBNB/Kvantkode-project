/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Event } from '../../../../base/common/event.js';
import { runWithFakedTimers } from '../../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { Extensions, } from '../../../configuration/common/configurationRegistry.js';
import { IFileService } from '../../../files/common/files.js';
import { Registry } from '../../../registry/common/platform.js';
import { IUserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
import { parseSettingsSyncContent, } from '../../common/settingsSync.js';
import { IUserDataSyncStoreService, UserDataSyncError, } from '../../common/userDataSync.js';
import { UserDataSyncClient, UserDataSyncTestServer } from './userDataSyncClient.js';
suite('SettingsSync - Auto', () => {
    const server = new UserDataSyncTestServer();
    let client;
    let testObject;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        Registry.as(Extensions.Configuration).registerConfiguration({
            id: 'settingsSync',
            type: 'object',
            properties: {
                'settingsSync.machine': {
                    type: 'string',
                    scope: 2 /* ConfigurationScope.MACHINE */,
                },
                'settingsSync.machineOverridable': {
                    type: 'string',
                    scope: 7 /* ConfigurationScope.MACHINE_OVERRIDABLE */,
                },
            },
        });
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp(true);
        testObject = client.getSynchronizer("settings" /* SyncResource.Settings */);
    });
    test('when settings file does not exist', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const fileService = client.instantiationService.get(IFileService);
        const settingResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource;
        assert.deepStrictEqual(await testObject.getLastSyncUserData(), null);
        let manifest = await client.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            {
                type: 'GET',
                url: `${server.url}/v1/resource/${testObject.resource}/latest`,
                headers: {},
            },
        ]);
        assert.ok(!(await fileService.exists(settingResource)));
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(lastSyncUserData.syncData, null);
        manifest = await client.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
        manifest = await client.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, []);
    }));
    test('when settings file is empty and remote has no changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const fileService = client.instantiationService.get(IFileService);
        const settingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource;
        await fileService.writeFile(settingsResource, VSBuffer.fromString(''));
        await testObject.sync(await client.getResourceManifest());
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(parseSettingsSyncContent(lastSyncUserData.syncData.content)?.settings, '{}');
        assert.strictEqual(parseSettingsSyncContent(remoteUserData.syncData.content)?.settings, '{}');
        assert.strictEqual((await fileService.readFile(settingsResource)).value.toString(), '');
    }));
    test('when settings file is empty and remote has changes', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const content = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",
	"workbench.tree.indent": 20,
	"workbench.colorCustomizations": {
		"editorLineNumber.activeForeground": "#ff0000",
		"[GitHub Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.background": "#f3f1f11a"
		}
	},

	"gitBranch.base": "remote-repo/master",

	// Experimental
	"workbench.view.experimental.allowMovingToNewContainer": true,
}`;
        await client2.instantiationService
            .get(IFileService)
            .writeFile(client2.instantiationService.get(IUserDataProfilesService).defaultProfile
            .settingsResource, VSBuffer.fromString(content));
        await client2.sync();
        const fileService = client.instantiationService.get(IFileService);
        const settingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource;
        await fileService.writeFile(settingsResource, VSBuffer.fromString(''));
        await testObject.sync(await client.getResourceManifest());
        const lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.strictEqual(parseSettingsSyncContent(lastSyncUserData.syncData.content)?.settings, content);
        assert.strictEqual(parseSettingsSyncContent(remoteUserData.syncData.content)?.settings, content);
        assert.strictEqual((await fileService.readFile(settingsResource)).value.toString(), content);
    }));
    test('when settings file is created after first sync', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const fileService = client.instantiationService.get(IFileService);
        const settingsResource = client.instantiationService.get(IUserDataProfilesService).defaultProfile.settingsResource;
        await testObject.sync(await client.getResourceManifest());
        await fileService.createFile(settingsResource, VSBuffer.fromString('{}'));
        let lastSyncUserData = await testObject.getLastSyncUserData();
        const manifest = await client.getResourceManifest();
        server.reset();
        await testObject.sync(manifest);
        assert.deepStrictEqual(server.requests, [
            {
                type: 'POST',
                url: `${server.url}/v1/resource/${testObject.resource}`,
                headers: { 'If-Match': lastSyncUserData?.ref },
            },
        ]);
        lastSyncUserData = await testObject.getLastSyncUserData();
        const remoteUserData = await testObject.getRemoteUserData(null);
        assert.deepStrictEqual(lastSyncUserData.ref, remoteUserData.ref);
        assert.deepStrictEqual(lastSyncUserData.syncData, remoteUserData.syncData);
        assert.strictEqual(parseSettingsSyncContent(lastSyncUserData.syncData.content)?.settings, '{}');
    }));
    test('sync for first time to the server', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expected = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",
	"workbench.tree.indent": 20,
	"workbench.colorCustomizations": {
		"editorLineNumber.activeForeground": "#ff0000",
		"[GitHub Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.background": "#f3f1f11a"
		}
	},

	"gitBranch.base": "remote-repo/master",

	// Experimental
	"workbench.view.experimental.allowMovingToNewContainer": true,
}`;
        await updateSettings(expected, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, expected);
    }));
    test('do not sync machine settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridable": "someValue"
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp"
}`);
    }));
    test('do not sync machine settings when spread across file', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"settingsSync.machine": "someValue",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Machine
	"settingsSync.machineOverridable": "someValue"
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp"
}`);
    }));
    test('do not sync machine settings when spread across file - 2', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"settingsSync.machine": "someValue",

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Machine
	"settingsSync.machineOverridable": "someValue",
	"files.simpleDialog.enable": true,
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",
	"files.simpleDialog.enable": true,
}`);
    }));
    test('sync when all settings are machine settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridable": "someValue"
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
}`);
    }));
    test('sync when all settings are machine settings with trailing comma', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Machine
	"settingsSync.machine": "someValue",
	"settingsSync.machineOverridable": "someValue",
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	,
}`);
    }));
    test('local change event is triggered when settings are changed', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const content = `{
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,
}`;
        await updateSettings(content, client);
        await testObject.sync(await client.getResourceManifest());
        const promise = Event.toPromise(testObject.onDidChangeLocal);
        await updateSettings(`{
	"files.autoSave": "off",
	"files.simpleDialog.enable": true,
}`, client);
        await promise;
    }));
    test('do not sync ignored settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`);
    }));
    test('do not sync ignored and machine settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	],

	// Machine
	"settingsSync.machine": "someValue",
}`;
        await updateSettings(settingsContent, client);
        await testObject.sync(await client.getResourceManifest());
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	],
}`);
    }));
    test('sync throws invalid content error', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const expected = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",
	"workbench.tree.indent": 20,
	"workbench.colorCustomizations": {
		"editorLineNumber.activeForeground": "#ff0000",
		"[GitHub Sharp]": {
			"statusBarItem.remoteBackground": "#24292E",
			"editorPane.background": "#f3f1f11a"
		}
	}

	"gitBranch.base": "remote-repo/master",

	// Experimental
	"workbench.view.experimental.allowMovingToNewContainer": true,
}`;
        await updateSettings(expected, client);
        try {
            await testObject.sync(await client.getResourceManifest());
            assert.fail('should fail with invalid content error');
        }
        catch (e) {
            assert.ok(e instanceof UserDataSyncError);
            assert.deepStrictEqual(e.code, "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */);
        }
    }));
    test('sync throws invalid content error - content is an array', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        await updateSettings('[]', client);
        try {
            await testObject.sync(await client.getResourceManifest());
            assert.fail('should fail with invalid content error');
        }
        catch (e) {
            assert.ok(e instanceof UserDataSyncError);
            assert.deepStrictEqual(e.code, "LocalInvalidContent" /* UserDataSyncErrorCode.LocalInvalidContent */);
        }
    }));
    test('sync when there are conflicts', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        await updateSettings(JSON.stringify({
            a: 1,
            b: 2,
            'settingsSync.ignoredSettings': ['a'],
        }), client2);
        await client2.sync();
        await updateSettings(JSON.stringify({
            a: 2,
            b: 1,
            'settingsSync.ignoredSettings': ['a'],
        }), client);
        await testObject.sync(await client.getResourceManifest());
        assert.strictEqual(testObject.status, "hasConflicts" /* SyncStatus.HasConflicts */);
        assert.strictEqual(testObject.conflicts.conflicts[0].localResource.toString(), testObject.localResource.toString());
        const fileService = client.instantiationService.get(IFileService);
        const mergeContent = (await fileService.readFile(testObject.conflicts.conflicts[0].previewResource)).value.toString();
        assert.strictEqual(mergeContent, '');
    }));
    test('sync profile settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const client2 = disposableStore.add(new UserDataSyncClient(server));
        await client2.setUp(true);
        const profile = await client2.instantiationService
            .get(IUserDataProfilesService)
            .createNamedProfile('profile1');
        await updateSettings(JSON.stringify({
            a: 1,
            b: 2,
        }), client2, profile);
        await client2.sync();
        await client.sync();
        assert.strictEqual(testObject.status, "idle" /* SyncStatus.Idle */);
        const syncedProfile = client.instantiationService
            .get(IUserDataProfilesService)
            .profiles.find((p) => p.id === profile.id);
        const content = (await client.instantiationService.get(IFileService).readFile(syncedProfile.settingsResource)).value.toString();
        assert.deepStrictEqual(JSON.parse(content), {
            a: 1,
            b: 2,
        });
    }));
});
suite('SettingsSync - Manual', () => {
    const server = new UserDataSyncTestServer();
    let client;
    let testObject;
    teardown(async () => {
        await client.instantiationService.get(IUserDataSyncStoreService).clear();
    });
    const disposableStore = ensureNoDisposablesAreLeakedInTestSuite();
    setup(async () => {
        client = disposableStore.add(new UserDataSyncClient(server));
        await client.setUp(true);
        testObject = client.getSynchronizer("settings" /* SyncResource.Settings */);
    });
    test('do not sync ignored settings', () => runWithFakedTimers({ useFakeTimers: true }, async () => {
        const settingsContent = `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Editor
	"editor.fontFamily": "Fira Code",

	// Terminal
	"terminal.integrated.shell.osx": "some path",

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`;
        await updateSettings(settingsContent, client);
        let preview = await testObject.sync(await client.getResourceManifest(), true);
        assert.strictEqual(testObject.status, "syncing" /* SyncStatus.Syncing */);
        preview = await testObject.accept(preview.resourcePreviews[0].previewResource);
        preview = await testObject.apply(false);
        const { content } = await client.read(testObject.resource);
        assert.ok(content !== null);
        const actual = parseSettings(content);
        assert.deepStrictEqual(actual, `{
	// Always
	"files.autoSave": "afterDelay",
	"files.simpleDialog.enable": true,

	// Workbench
	"workbench.colorTheme": "GitHub Sharp",

	// Ignored
	"settingsSync.ignoredSettings": [
		"editor.fontFamily",
		"terminal.integrated.shell.osx"
	]
}`);
    }));
});
function parseSettings(content) {
    const syncData = JSON.parse(content);
    const settingsSyncContent = JSON.parse(syncData.content);
    return settingsSyncContent.settings;
}
async function updateSettings(content, client, profile) {
    await client.instantiationService
        .get(IFileService)
        .writeFile((profile ?? client.instantiationService.get(IUserDataProfilesService).defaultProfile)
        .settingsResource, VSBuffer.fromString(content));
    await client.instantiationService.get(IConfigurationService).reloadConfiguration();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V0dGluZ3NTeW5jLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvdGVzdC9jb21tb24vc2V0dGluZ3NTeW5jLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDeEYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUVOLFVBQVUsR0FFVixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFFTix3QkFBd0IsR0FFeEIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBRU4seUJBQXlCLEVBR3pCLGlCQUFpQixHQUVqQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXBGLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsTUFBTSxNQUFNLEdBQUcsSUFBSSxzQkFBc0IsRUFBRSxDQUFBO0lBQzNDLElBQUksTUFBMEIs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