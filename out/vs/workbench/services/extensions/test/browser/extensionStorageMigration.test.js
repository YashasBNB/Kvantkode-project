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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvdGVzdC9icm93c2VyL2V4dGVuc2lvblN0b3JhZ2VNaWdyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxvRUFBb0UsQ0FBQTtBQUUvRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDakcsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qix1QkFBdUIsR0FDdkIsTUFBTSx3RUFBd0UsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDOUYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkYsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHVCQUF1QixH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