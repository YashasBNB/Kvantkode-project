/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { workbenchInstantiationService } from '../../../../test/browser/workbenchTestServices.js';
import { IExtensionStorageService, ExtensionStorageService, } from '../../../../../platform/extensionManagement/common/extensionStorage.js';
import { URI } from '../../../../../base/common/uri.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { TestWorkspace } from '../../../../../platform/workspace/test/common/testWorkspace.js';
import { migrateExtensionStorage } from '../../common/extensionStorageMigration.js';
import { IStorageService } from '../../../../../platform/storage/common/storage.js';
import { IUserDataProfilesService, UserDataProfilesService, } from '../../../../../platform/userDataProfile/common/userDataProfile.js';
import { UserDataProfileService } from '../../../userDataProfile/common/userDataProfileService.js';
import { IUserDataProfileService } from '../../../userDataProfile/common/userDataProfile.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('ExtensionStorageMigration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
    const workspaceStorageHome = joinPath(ROOT, 'workspaceStorageHome');
    let instantiationService;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        const fileService = disposables.add(new FileService(new NullLogService()));
        disposables.add(fileService.registerProvider(ROOT.scheme, disposables.add(new InMemoryFileSystemProvider())));
        instantiationService.stub(IFileService, fileService);
        const environmentService = instantiationService.stub(IEnvironmentService, {
            userRoamingDataHome: ROOT,
            workspaceStorageHome,
            cacheHome: ROOT,
        });
        const userDataProfilesService = instantiationService.stub(IUserDataProfilesService, disposables.add(new UserDataProfilesService(environmentService, fileService, disposables.add(new UriIdentityService(fileService)), new NullLogService())));
        instantiationService.stub(IUserDataProfileService, disposables.add(new UserDataProfileService(userDataProfilesService.defaultProfile)));
        instantiationService.stub(IExtensionStorageService, disposables.add(instantiationService.createInstance(ExtensionStorageService)));
    });
    test('migrate extension storage', async () => {
        const fromExtensionId = 'pub.from', toExtensionId = 'pub.to', storageMigratedKey = `extensionStorage.migrate.${fromExtensionId}-${toExtensionId}`;
        const extensionStorageService = instantiationService.get(IExtensionStorageService), fileService = instantiationService.get(IFileService), storageService = instantiationService.get(IStorageService), userDataProfilesService = instantiationService.get(IUserDataProfilesService);
        extensionStorageService.setExtensionState(fromExtensionId, { globalKey: 'hello global state' }, true);
        extensionStorageService.setExtensionState(fromExtensionId, { workspaceKey: 'hello workspace state' }, false);
        await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.globalStorageHome, fromExtensionId), VSBuffer.fromString('hello global storage'));
        await fileService.writeFile(joinPath(workspaceStorageHome, TestWorkspace.id, fromExtensionId), VSBuffer.fromString('hello workspace storage'));
        await migrateExtensionStorage(fromExtensionId, toExtensionId, true, instantiationService);
        await migrateExtensionStorage(fromExtensionId, toExtensionId, false, instantiationService);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(fromExtensionId, true), undefined);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(fromExtensionId, false), undefined);
        assert.deepStrictEqual(await fileService.exists(joinPath(userDataProfilesService.defaultProfile.globalStorageHome, fromExtensionId)), false);
        assert.deepStrictEqual(await fileService.exists(joinPath(workspaceStorageHome, TestWorkspace.id, fromExtensionId)), false);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(toExtensionId, true), {
            globalKey: 'hello global state',
        });
        assert.deepStrictEqual(extensionStorageService.getExtensionState(toExtensionId, false), {
            workspaceKey: 'hello workspace state',
        });
        assert.deepStrictEqual((await fileService.readFile(joinPath(userDataProfilesService.defaultProfile.globalStorageHome, toExtensionId))).value.toString(), 'hello global storage');
        assert.deepStrictEqual((await fileService.readFile(joinPath(workspaceStorageHome, TestWorkspace.id, toExtensionId))).value.toString(), 'hello workspace storage');
        assert.deepStrictEqual(storageService.get(storageMigratedKey, 0 /* StorageScope.PROFILE */), 'true');
        assert.deepStrictEqual(storageService.get(storageMigratedKey, 1 /* StorageScope.WORKSPACE */), 'true');
    });
    test('migrate extension storage when does not exist', async () => {
        const fromExtensionId = 'pub.from', toExtensionId = 'pub.to', storageMigratedKey = `extensionStorage.migrate.${fromExtensionId}-${toExtensionId}`;
        const extensionStorageService = instantiationService.get(IExtensionStorageService), fileService = instantiationService.get(IFileService), storageService = instantiationService.get(IStorageService), userDataProfilesService = instantiationService.get(IUserDataProfilesService);
        await migrateExtensionStorage(fromExtensionId, toExtensionId, true, instantiationService);
        await migrateExtensionStorage(fromExtensionId, toExtensionId, false, instantiationService);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(fromExtensionId, true), undefined);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(fromExtensionId, false), undefined);
        assert.deepStrictEqual(await fileService.exists(joinPath(userDataProfilesService.defaultProfile.globalStorageHome, fromExtensionId)), false);
        assert.deepStrictEqual(await fileService.exists(joinPath(workspaceStorageHome, TestWorkspace.id, fromExtensionId)), false);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(toExtensionId, true), undefined);
        assert.deepStrictEqual(extensionStorageService.getExtensionState(toExtensionId, false), undefined);
        assert.deepStrictEqual(await fileService.exists(joinPath(userDataProfilesService.defaultProfile.globalStorageHome, toExtensionId)), false);
        assert.deepStrictEqual(await fileService.exists(joinPath(workspaceStorageHome, TestWorkspace.id, toExtensionId)), false);
        assert.deepStrictEqual(storageService.get(storageMigratedKey, 0 /* StorageScope.PROFILE */), 'true');
        assert.deepStrictEqual(storageService.get(storageMigratedKey, 1 /* StorageScope.WORKSPACE */), 'true');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy90ZXN0L2Jyb3dzZXIvZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBRS9HLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHVCQUF1QixHQUN2QixNQUFNLHdFQUF3RSxDQUFBO0FBQy9FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUM5RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsZUFBZSxFQUFnQixNQUFNLG1EQUFtRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsdUJB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