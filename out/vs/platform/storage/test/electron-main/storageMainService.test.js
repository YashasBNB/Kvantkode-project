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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW5TZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL3Rlc3QvZWxlY3Ryb24tbWFpbi9zdG9yYWdlTWFpblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQzNELE9BQU8sT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRXhELE9BQU8sRUFBZ0IsWUFBWSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFVBQVUsRUFBZ0IsTUFBTSx5QkFBeUIsQ0FBQTtBQU1sRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDBCQUEwQixHQUMxQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxD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