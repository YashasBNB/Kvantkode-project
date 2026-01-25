/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notStrictEqual, strictEqual } from 'assert';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { OPTIONS, parseArgs } from '../../../environment/node/argv.js';
import { NativeEnvironmentService } from '../../../environment/node/environmentService.js';
import { FileService } from '../../../files/common/fileService.js';
import { NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { StateService } from '../../../state/node/stateService.js';
import { IS_NEW_KEY } from '../../common/storage.js';
import { StorageMainService } from '../../electron-main/storageMainService.js';
import { currentSessionDateStorageKey, firstSessionDateStorageKey, } from '../../../telemetry/common/telemetry.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { UserDataProfilesMainService } from '../../../userDataProfile/electron-main/userDataProfile.js';
import { TestLifecycleMainService } from '../../../test/electron-main/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
suite('StorageMainService', function () {
    const disposables = new DisposableStore();
    const productService = { _serviceBrand: undefined, ...product };
    const inMemoryProfileRoot = URI.file('/location').with({ scheme: Schemas.inMemory });
    const inMemoryProfile = {
        id: 'id',
        name: 'inMemory',
        isDefault: false,
        location: inMemoryProfileRoot,
        globalStorageHome: joinPath(inMemoryProfileRoot, 'globalStorageHome'),
        settingsResource: joinPath(inMemoryProfileRoot, 'settingsResource'),
        keybindingsResource: joinPath(inMemoryProfileRoot, 'keybindingsResource'),
        tasksResource: joinPath(inMemoryProfileRoot, 'tasksResource'),
        snippetsHome: joinPath(inMemoryProfileRoot, 'snippetsHome'),
        promptsHome: joinPath(inMemoryProfileRoot, 'promptsHome'),
        extensionsResource: joinPath(inMemoryProfileRoot, 'extensionsResource'),
        cacheHome: joinPath(inMemoryProfileRoot, 'cache'),
    };
    class TestStorageMainService extends StorageMainService {
        getStorageOptions() {
            return {
                useInMemoryStorage: true,
            };
        }
    }
    async function testStorage(storage, scope) {
        strictEqual(storage.isInMemory(), true);
        // Telemetry: added after init unless workspace/profile scoped
        if (scope === -1 /* StorageScope.APPLICATION */) {
            strictEqual(storage.items.size, 0);
            await storage.init();
            strictEqual(typeof storage.get(firstSessionDateStorageKey), 'string');
            strictEqual(typeof storage.get(currentSessionDateStorageKey), 'string');
        }
        else {
            await storage.init();
        }
        let storageChangeEvent = undefined;
        disposables.add(storage.onDidChangeStorage((e) => {
            storageChangeEvent = e;
        }));
        let storageDidClose = false;
        disposables.add(storage.onDidCloseStorage(() => (storageDidClose = true)));
        // Basic store/get/remove
        const size = storage.items.size;
        storage.set('bar', 'foo');
        strictEqual(storageChangeEvent.key, 'bar');
        storage.set('barNumber', 55);
        storage.set('barBoolean', true);
        strictEqual(storage.get('bar'), 'foo');
        strictEqual(storage.get('barNumber'), '55');
        strictEqual(storage.get('barBoolean'), 'true');
        strictEqual(storage.items.size, size + 3);
        storage.delete('bar');
        strictEqual(storage.get('bar'), undefined);
        strictEqual(storage.items.size, size + 2);
        // IS_NEW
        strictEqual(storage.get(IS_NEW_KEY), 'true');
        // Close
        await storage.close();
        strictEqual(storageDidClose, true);
    }
    teardown(() => {
        disposables.clear();
    });
    function createStorageService(lifecycleMainService = new TestLifecycleMainService()) {
        const environmentService = new NativeEnvironmentService(parseArgs(process.argv, OPTIONS), productService);
        const fileService = disposables.add(new FileService(new NullLogService()));
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        const testStorageService = disposables.add(new TestStorageMainService(new NullLogService(), environmentService, disposables.add(new UserDataProfilesMainService(disposables.add(new StateService(1 /* SaveStrategy.DELAYED */, environmentService, new NullLogService(), fileService)), disposables.add(uriIdentityService), environmentService, fileService, new NullLogService())), lifecycleMainService, fileService, uriIdentityService));
        disposables.add(testStorageService.applicationStorage);
        return testStorageService;
    }
    test('basics (application)', function () {
        const storageMainService = createStorageService();
        return testStorage(storageMainService.applicationStorage, -1 /* StorageScope.APPLICATION */);
    });
    test('basics (profile)', function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        return testStorage(storageMainService.profileStorage(profile), 0 /* StorageScope.PROFILE */);
    });
    test('basics (workspace)', function () {
        const workspace = { id: generateUuid() };
        const storageMainService = createStorageService();
        return testStorage(storageMainService.workspaceStorage(workspace), 1 /* StorageScope.WORKSPACE */);
    });
    test('storage closed onWillShutdown', async function () {
        const lifecycleMainService = new TestLifecycleMainService();
        const storageMainService = createStorageService(lifecycleMainService);
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationStorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationStorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        strictEqual(applicationStorage, storageMainService.applicationStorage); // same instance as long as not closed
        strictEqual(profileStorage, storageMainService.profileStorage(profile)); // same instance as long as not closed
        strictEqual(workspaceStorage, storageMainService.workspaceStorage(workspace)); // same instance as long as not closed
        await applicationStorage.init();
        await profileStorage.init();
        await workspaceStorage.init();
        await lifecycleMainService.fireOnWillShutdown();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
        const profileStorage2 = storageMainService.profileStorage(profile);
        notStrictEqual(profileStorage, profileStorage2);
        const workspaceStorage2 = storageMainService.workspaceStorage(workspace);
        notStrictEqual(workspaceStorage, workspaceStorage2);
        await workspaceStorage2.close();
    });
    test('storage closed before init works', async function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationStorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationStorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        await applicationStorage.close();
        await profileStorage.close();
        await workspaceStorage.close();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
    });
    test('storage closed before init awaits works', async function () {
        const storageMainService = createStorageService();
        const profile = inMemoryProfile;
        const workspace = { id: generateUuid() };
        const workspaceStorage = storageMainService.workspaceStorage(workspace);
        let didCloseWorkspaceStorage = false;
        disposables.add(workspaceStorage.onDidCloseStorage(() => {
            didCloseWorkspaceStorage = true;
        }));
        const profileStorage = storageMainService.profileStorage(profile);
        let didCloseProfileStorage = false;
        disposables.add(profileStorage.onDidCloseStorage(() => {
            didCloseProfileStorage = true;
        }));
        const applicationtorage = storageMainService.applicationStorage;
        let didCloseApplicationStorage = false;
        disposables.add(applicationtorage.onDidCloseStorage(() => {
            didCloseApplicationStorage = true;
        }));
        applicationtorage.init();
        profileStorage.init();
        workspaceStorage.init();
        await applicationtorage.close();
        await profileStorage.close();
        await workspaceStorage.close();
        strictEqual(didCloseApplicationStorage, true);
        strictEqual(didCloseProfileStorage, true);
        strictEqual(didCloseWorkspaceStorage, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvdGVzdC9lbGVjdHJvbi1tYWluL3N0b3JhZ2VNYWluU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0QsT0FBTyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsT0FBTyxFQUFnQixZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsVUFBVSxFQUFnQixNQUFNLHlCQUF5QixDQUFBO0FBTWxFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIsMEJBQTBCLEdBQzFCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURB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