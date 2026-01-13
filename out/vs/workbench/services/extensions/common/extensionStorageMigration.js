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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uU3RvcmFnZU1pZ3JhdGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvblN0b3JhZ2VNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRW5FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzlHLE9BQU8sRUFFTiwyQkFBMkIsRUFDM0IsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3Rjs7OztHQUlHO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSx1QkFBdUIsQ0FDNUMsZUFBdUIsRUFDdkIsYUFBcUIsRUFDckIsTUFBZSxFQUNmLGlCQUF3QztJQUV4QyxPQUFPLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsZUFBZSxFQUFFLEVBQUU7UUFDakUsTUFBTSxrQkFBa0IsR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFDbkUsTUFBTSx1QkFBdUIsR0FBRyxl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