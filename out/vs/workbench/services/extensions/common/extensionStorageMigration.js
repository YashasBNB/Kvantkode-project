/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getErrorMessage } from '../../../../base/common/errors.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IExtensionStorageService } from '../../../../platform/extensionManagement/common/extensionStorage.js';
import { FileSystemProviderErrorCode, IFileService, } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
/**
 * An extension storage has following
 * 	- State: Stored using storage service with extension id as key and state as value.
 *  - Resources: Stored under a location scoped to the extension.
 */
export async function migrateExtensionStorage(fromExtensionId, toExtensionId, global, instantionService) {
    return instantionService.invokeFunction(async (serviceAccessor) => {
        const environmentService = serviceAccessor.get(IEnvironmentService);
        const userDataProfilesService = serviceAccessor.get(IUserDataProfilesService);
        const extensionStorageService = serviceAccessor.get(IExtensionStorageService);
        const storageService = serviceAccessor.get(IStorageService);
        const uriIdentityService = serviceAccessor.get(IUriIdentityService);
        const fileService = serviceAccessor.get(IFileService);
        const workspaceContextService = serviceAccessor.get(IWorkspaceContextService);
        const logService = serviceAccessor.get(ILogService);
        const storageMigratedKey = `extensionStorage.migrate.${fromExtensionId}-${toExtensionId}`;
        const migrateLowerCaseStorageKey = fromExtensionId.toLowerCase() === toExtensionId.toLowerCase()
            ? `extension.storage.migrateFromLowerCaseKey.${fromExtensionId.toLowerCase()}`
            : undefined;
        if (fromExtensionId === toExtensionId) {
            return;
        }
        const getExtensionStorageLocation = (extensionId, global) => {
            if (global) {
                return uriIdentityService.extUri.joinPath(userDataProfilesService.defaultProfile.globalStorageHome, extensionId.toLowerCase() /* Extension id is lower cased for global storage */);
            }
            return uriIdentityService.extUri.joinPath(environmentService.workspaceStorageHome, workspaceContextService.getWorkspace().id, extensionId);
        };
        const storageScope = global ? 0 /* StorageScope.PROFILE */ : 1 /* StorageScope.WORKSPACE */;
        if (!storageService.getBoolean(storageMigratedKey, storageScope, false) &&
            !(migrateLowerCaseStorageKey &&
                storageService.getBoolean(migrateLowerCaseStorageKey, storageScope, false))) {
            logService.info(`Migrating ${global ? 'global' : 'workspace'} extension storage from ${fromExtensionId} to ${toExtensionId}...`);
            // Migrate state
            const value = extensionStorageService.getExtensionState(fromExtensionId, global);
            if (value) {
                extensionStorageService.setExtensionState(toExtensionId, value, global);
                extensionStorageService.setExtensionState(fromExtensionId, undefined, global);
            }
            // Migrate stored files
            const fromPath = getExtensionStorageLocation(fromExtensionId, global);
            const toPath = getExtensionStorageLocation(toExtensionId, global);
            if (!uriIdentityService.extUri.isEqual(fromPath, toPath)) {
                try {
                    await fileService.move(fromPath, toPath, true);
                }
                catch (error) {
                    if (error.code !== FileSystemProviderErrorCode.FileNotFound) {
                        logService.info(`Error while migrating ${global ? 'global' : 'workspace'} file storage from '${fromExtensionId}' to '${toExtensionId}'`, getErrorMessage(error));
                    }
                }
            }
            logService.info(`Migrated ${global ? 'global' : 'workspace'} extension storage from ${fromExtensionId} to ${toExtensionId}`);
            storageService.store(storageMigratedKey, true, storageScope, 1 /* StorageTarget.MACHINE */);
        }
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9leHRlbnNpb25zL2NvbW1vbi9leHRlbnNpb25TdG9yYWdlTWlncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUM5RyxPQUFPLEVBRU4sMkJBQTJCLEVBQzNCLFlBQVksR0FDWixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFN0Y7Ozs7R0FJRztBQUNILE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQzVDLGVBQXVCLEVBQ3ZCLGFBQXFCLEVBQ3JCLE1BQWUsRUFDZixpQkFBd0M7SUFFeEMsT0FBTyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsS0FBSyxFQUFFLGVBQWUsRUFBRSxFQUFFO1FBQ2pFLE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sdUJBQXVCLEdBQUcsZUFBZSxDQUFDLEdBQUcsQ0FBQyx3QkFB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