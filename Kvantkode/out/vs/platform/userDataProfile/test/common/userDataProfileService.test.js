/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import { joinPath } from '../../../../base/common/resources.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { AbstractNativeEnvironmentService } from '../../../environment/common/environmentService.js';
import product from '../../../product/common/product.js';
import { InMemoryUserDataProfilesService, } from '../../common/userDataProfile.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { Event } from '../../../../base/common/event.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestEnvironmentService extends AbstractNativeEnvironmentService {
    constructor(_appSettingsHome) {
        super(Object.create(null), Object.create(null), { _serviceBrand: undefined, ...product });
        this._appSettingsHome = _appSettingsHome;
    }
    get userRoamingDataHome() {
        return this._appSettingsHome.with({ scheme: Schemas.vscodeUserData });
    }
    get cacheHome() {
        return this.userRoamingDataHome;
    }
}
suite('UserDataProfileService (Common)', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let testObject;
    let environmentService;
    setup(async () => {
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        disposables.add(fileService.registerProvider(Schemas.vscodeUserData, fileSystemProvider));
        environmentService = new TestEnvironmentService(joinPath(ROOT, 'User'));
        testObject = disposables.add(new InMemoryUserDataProfilesService(environmentService, fileService, disposables.add(new UriIdentityService(fileService)), logService));
    });
    test('default profile', () => {
        assert.strictEqual(testObject.defaultProfile.isDefault, true);
        assert.strictEqual(testObject.defaultProfile.useDefaultFlags, undefined);
        assert.strictEqual(testObject.defaultProfile.location.toString(), environmentService.userRoamingDataHome.toString());
        assert.strictEqual(testObject.defaultProfile.globalStorageHome.toString(), joinPath(environmentService.userRoamingDataHome, 'globalStorage').toString());
        assert.strictEqual(testObject.defaultProfile.keybindingsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'keybindings.json').toString());
        assert.strictEqual(testObject.defaultProfile.settingsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'settings.json').toString());
        assert.strictEqual(testObject.defaultProfile.snippetsHome.toString(), joinPath(environmentService.userRoamingDataHome, 'snippets').toString());
        assert.strictEqual(testObject.defaultProfile.tasksResource.toString(), joinPath(environmentService.userRoamingDataHome, 'tasks.json').toString());
        assert.strictEqual(testObject.defaultProfile.extensionsResource.toString(), joinPath(environmentService.userRoamingDataHome, 'extensions.json').toString());
    });
    test('profiles always include default profile', () => {
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('create profile with id', async () => {
        const profile = await testObject.createProfile('id', 'name');
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(profile.id, 'id');
        assert.deepStrictEqual(profile.name, 'name');
        assert.deepStrictEqual(!!profile.isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
        assert.deepStrictEqual(testObject.profiles[1].name, profile.name);
    });
    test('create profile with id, name and transient', async () => {
        const profile = await testObject.createProfile('id', 'name', { transient: true });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(profile.id, 'id');
        assert.deepStrictEqual(profile.name, 'name');
        assert.deepStrictEqual(!!profile.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('create transient profiles', async () => {
        const profile1 = await testObject.createTransientProfile();
        const profile2 = await testObject.createTransientProfile();
        const profile3 = await testObject.createTransientProfile();
        const profile4 = await testObject.createProfile('id', 'name', { transient: true });
        assert.deepStrictEqual(testObject.profiles.length, 5);
        assert.deepStrictEqual(profile1.name, 'Temp 1');
        assert.deepStrictEqual(profile1.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile1.id);
        assert.deepStrictEqual(profile2.name, 'Temp 2');
        assert.deepStrictEqual(profile2.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[2].id, profile2.id);
        assert.deepStrictEqual(profile3.name, 'Temp 3');
        assert.deepStrictEqual(profile3.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[3].id, profile3.id);
        assert.deepStrictEqual(profile4.name, 'name');
        assert.deepStrictEqual(profile4.isTransient, true);
        assert.deepStrictEqual(testObject.profiles[4].id, profile4.id);
    });
    test('create transient profile when a normal profile with Temp is already created', async () => {
        await testObject.createNamedProfile('Temp 1');
        const profile1 = await testObject.createTransientProfile();
        assert.deepStrictEqual(profile1.name, 'Temp 2');
        assert.deepStrictEqual(profile1.isTransient, true);
    });
    test('profiles include default profile with extension resource defined when transiet prrofile is created', async () => {
        await testObject.createTransientProfile();
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('profiles include default profile with extension resource undefined when transiet prrofile is removed', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.removeProfile(profile);
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0].isDefault, true);
    });
    test('update named profile', async () => {
        const profile = await testObject.createNamedProfile('name');
        await testObject.updateProfile(profile, { name: 'name changed' });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'name changed');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('persist transient profile', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.updateProfile(profile, { name: 'saved', transient: false });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('persist transient profile (2)', async () => {
        const profile = await testObject.createProfile('id', 'name', { transient: true });
        await testObject.updateProfile(profile, { name: 'saved', transient: false });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, false);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('save transient profile', async () => {
        const profile = await testObject.createTransientProfile();
        await testObject.updateProfile(profile, { name: 'saved' });
        assert.deepStrictEqual(testObject.profiles.length, 2);
        assert.deepStrictEqual(testObject.profiles[1].name, 'saved');
        assert.deepStrictEqual(!!testObject.profiles[1].isTransient, true);
        assert.deepStrictEqual(testObject.profiles[1].id, profile.id);
    });
    test('profile using default profile for settings', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { settings: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { settings: true });
        assert.strictEqual(profile.settingsResource.toString(), testObject.defaultProfile.settingsResource.toString());
    });
    test('profile using default profile for keybindings', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { keybindings: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { keybindings: true });
        assert.strictEqual(profile.keybindingsResource.toString(), testObject.defaultProfile.keybindingsResource.toString());
    });
    test('profile using default profile for snippets', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { snippets: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { snippets: true });
        assert.strictEqual(profile.snippetsHome.toString(), testObject.defaultProfile.snippetsHome.toString());
    });
    test('profile using default profile for tasks', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { tasks: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { tasks: true });
        assert.strictEqual(profile.tasksResource.toString(), testObject.defaultProfile.tasksResource.toString());
    });
    test('profile using default profile for global state', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { globalState: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { globalState: true });
        assert.strictEqual(profile.globalStorageHome.toString(), testObject.defaultProfile.globalStorageHome.toString());
    });
    test('profile using default profile for extensions', async () => {
        const profile = await testObject.createNamedProfile('name', {
            useDefaultFlags: { extensions: true },
        });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { extensions: true });
        assert.strictEqual(profile.extensionsResource.toString(), testObject.defaultProfile.extensionsResource.toString());
    });
    test('update profile using default profile for keybindings', async () => {
        let profile = await testObject.createNamedProfile('name');
        profile = await testObject.updateProfile(profile, { useDefaultFlags: { keybindings: true } });
        assert.strictEqual(profile.isDefault, false);
        assert.deepStrictEqual(profile.useDefaultFlags, { keybindings: true });
        assert.strictEqual(profile.keybindingsResource.toString(), testObject.defaultProfile.keybindingsResource.toString());
    });
    test('create profile with a workspace associates it to the profile', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces?.[0].toString(), workspace.toString());
    });
    test('associate workspace to a profile should update workspaces', async () => {
        const profile = await testObject.createProfile('id', 'name', {});
        const workspace = URI.file('/workspace1');
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile);
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 1);
        assert.deepStrictEqual(actual.updated[0].id, profile.id);
        assert.deepStrictEqual(actual.updated[0].workspaces?.length, 1);
        assert.deepStrictEqual(actual.updated[0].workspaces[0].toString(), workspace.toString());
    });
    test('associate same workspace to a profile should not duplicate', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', { workspaces: [workspace] });
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile);
        assert.deepStrictEqual(testObject.profiles[1].workspaces?.length, 1);
        assert.deepStrictEqual(testObject.profiles[1].workspaces[0].toString(), workspace.toString());
    });
    test('associate workspace to another profile should update workspaces', async () => {
        const workspace = URI.file('/workspace1');
        const profile1 = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        const profile2 = await testObject.createProfile('id1', 'name1');
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        await testObject.setProfileForWorkspace({ id: workspace.path, uri: workspace }, profile2);
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 2);
        assert.deepStrictEqual(actual.updated[0].id, profile1.id);
        assert.deepStrictEqual(actual.updated[0].workspaces, undefined);
        assert.deepStrictEqual(actual.updated[1].id, profile2.id);
        assert.deepStrictEqual(actual.updated[1].workspaces?.length, 1);
        assert.deepStrictEqual(actual.updated[1].workspaces[0].toString(), workspace.toString());
    });
    test('unassociate workspace to a profile should update workspaces', async () => {
        const workspace = URI.file('/workspace1');
        const profile = await testObject.createProfile('id', 'name', {}, { id: workspace.path, uri: workspace });
        const promise = Event.toPromise(testObject.onDidChangeProfiles);
        testObject.unsetWorkspace({ id: workspace.path, uri: workspace });
        const actual = await promise;
        assert.deepStrictEqual(actual.added.length, 0);
        assert.deepStrictEqual(actual.removed.length, 0);
        assert.deepStrictEqual(actual.updated.length, 1);
        assert.deepStrictEqual(actual.updated[0].id, profile.id);
        assert.deepStrictEqual(actual.updated[0].workspaces, undefined);
    });
    test('update profile workspaces - add workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        const workspace = URI.file('/workspace1');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces[0].toString(), workspace.toString());
    });
    test('update profile workspaces - remove workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        const workspace = URI.file('/workspace1');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        profile = await testObject.updateProfile(profile, { workspaces: [] });
        assert.deepStrictEqual(profile.workspaces, undefined);
    });
    test('update profile workspaces - replace workspace', async () => {
        let profile = await testObject.createNamedProfile('name');
        profile = await testObject.updateProfile(profile, { workspaces: [URI.file('/workspace1')] });
        const workspace = URI.file('/workspace2');
        profile = await testObject.updateProfile(profile, { workspaces: [workspace] });
        assert.deepStrictEqual(profile.workspaces?.length, 1);
        assert.deepStrictEqual(profile.workspaces[0].toString(), workspace.toString());
    });
    test('update default profile workspaces - add workspace', async () => {
        const workspace = URI.file('/workspace1');
        await testObject.updateProfile(testObject.defaultProfile, { workspaces: [workspace] });
        assert.deepStrictEqual(testObject.profiles.length, 1);
        assert.deepStrictEqual(testObject.profiles[0], testObject.defaultProfile);
        assert.deepStrictEqual(testObject.defaultProfile.isDefault, true);
        assert.deepStrictEqual(testObject.defaultProfile.workspaces?.length, 1);
        assert.deepStrictEqual(testObject.defaultProfile.workspaces[0].toString(), workspace.toString());
    });
    test('can create transient and persistent profiles with same name', async () => {
        const profile1 = await testObject.createNamedProfile('name', { transient: true });
        const profile2 = await testObject.createNamedProfile('name', { transient: true });
        const profile3 = await testObject.createNamedProfile('name');
        assert.deepStrictEqual(profile1.name, 'name');
        assert.deepStrictEqual(!!profile1.isTransient, true);
        assert.deepStrictEqual(profile2.name, 'name');
        assert.deepStrictEqual(!!profile2.isTransient, true);
        assert.deepStrictEqual(profile3.name, 'name');
        assert.deepStrictEqual(!!profile3.isTransient, false);
        assert.deepStrictEqual(testObject.profiles.length, 4);
        assert.deepStrictEqual(testObject.profiles[1].id, profile3.id);
        assert.deepStrictEqual(testObject.profiles[2].id, profile1.id);
        assert.deepStrictEqual(testObject.profiles[3].id, profile2.id);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFQcm9maWxlU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVByb2ZpbGUvdGVzdC9jb21tb24vdXNlckRhdGFQcm9maWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BHLE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3hELE9BQU8sRUFDTiwrQkFBK0IsR0FFL0IsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQTtBQUUvRCxNQUFN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Q0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzlELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDJCQUEyQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVDLE1BQU0sUUFBUSxHQUFHLE1BQU0sVUFBVSxDQUFDLHNCQUFzQixFQUFFLENBQUE7UUFDMUQsTUFBTSxRQUFRLEdBQUcsTUFBTSxVQUFVLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUMxRCxNQUFNLFFBQVEsR0FBRyxNQUFNLFVBQVUsQ0FBQyxzQkFBc0IsRUFBRSxDQUFBO1FBQzFELE1BQU0sUUFBUSxHQUFHLE1BQU0sVUFBVSxDQUFDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFFbEYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyRCxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFD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