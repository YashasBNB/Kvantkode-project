/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../base/common/cancellation.js';
import { EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT, } from './extensionManagement.js';
import { areSameExtensions, getExtensionId } from './extensionManagementUtil.js';
/**
 * Migrates the installed unsupported nightly extension to a supported pre-release extension. It includes following:
 * 	- Uninstall the Unsupported extension
 * 	- Install (with optional storage migration) the Pre-release extension only if
 * 		- the extension is not installed
 * 		- or it is a release version and the unsupported extension is enabled.
 */
export async function migrateUnsupportedExtensions(extensionManagementService, galleryService, extensionStorageService, extensionEnablementService, logService) {
    try {
        const extensionsControlManifest = await extensionManagementService.getExtensionsControlManifest();
        if (!extensionsControlManifest.deprecated) {
            return;
        }
        const installed = await extensionManagementService.getInstalled(1 /* ExtensionType.User */);
        for (const [unsupportedExtensionId, deprecated] of Object.entries(extensionsControlManifest.deprecated)) {
            if (!deprecated?.extension) {
                continue;
            }
            const { id: preReleaseExtensionId, autoMigrate, preRelease } = deprecated.extension;
            if (!autoMigrate) {
                continue;
            }
            const unsupportedExtension = installed.find((i) => areSameExtensions(i.identifier, { id: unsupportedExtensionId }));
            // Unsupported Extension is not installed
            if (!unsupportedExtension) {
                continue;
            }
            const gallery = (await galleryService.getExtensions([{ id: preReleaseExtensionId, preRelease }], {
                targetPlatform: await extensionManagementService.getTargetPlatform(),
                compatible: true,
            }, CancellationToken.None))[0];
            if (!gallery) {
                logService.info(`Skipping migrating '${unsupportedExtension.identifier.id}' extension because, the comaptible target '${preReleaseExtensionId}' extension is not found`);
                continue;
            }
            try {
                logService.info(`Migrating '${unsupportedExtension.identifier.id}' extension to '${preReleaseExtensionId}' extension...`);
                const isUnsupportedExtensionEnabled = !extensionEnablementService
                    .getDisabledExtensions()
                    .some((e) => areSameExtensions(e, unsupportedExtension.identifier));
                await extensionManagementService.uninstall(unsupportedExtension);
                logService.info(`Uninstalled the unsupported extension '${unsupportedExtension.identifier.id}'`);
                let preReleaseExtension = installed.find((i) => areSameExtensions(i.identifier, { id: preReleaseExtensionId }));
                if (!preReleaseExtension ||
                    (!preReleaseExtension.isPreReleaseVersion && isUnsupportedExtensionEnabled)) {
                    preReleaseExtension = await extensionManagementService.installFromGallery(gallery, {
                        installPreReleaseVersion: true,
                        isMachineScoped: unsupportedExtension.isMachineScoped,
                        operation: 4 /* InstallOperation.Migrate */,
                        context: { [EXTENSION_INSTALL_SKIP_PUBLISHER_TRUST_CONTEXT]: true },
                    });
                    logService.info(`Installed the pre-release extension '${preReleaseExtension.identifier.id}'`);
                    if (!isUnsupportedExtensionEnabled) {
                        await extensionEnablementService.disableExtension(preReleaseExtension.identifier);
                        logService.info(`Disabled the pre-release extension '${preReleaseExtension.identifier.id}' because the unsupported extension '${unsupportedExtension.identifier.id}' is disabled`);
                    }
                    if (autoMigrate.storage) {
                        extensionStorageService.addToMigrationList(getExtensionId(unsupportedExtension.manifest.publisher, unsupportedExtension.manifest.name), getExtensionId(preReleaseExtension.manifest.publisher, preReleaseExtension.manifest.name));
                        logService.info(`Added pre-release extension to the storage migration list`);
                    }
                }
                logService.info(`Migrated '${unsupportedExtension.identifier.id}' extension to '${preReleaseExtensionId}' extension.`);
            }
            catch (error) {
                logService.error(error);
            }
        }
    }
    catch (error) {
        logService.error(error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9jb21tb24vdW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTiw4Q0FBOEMsR0FLOUMsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFLaEY7Ozs7OztHQU1HO0FBQ0gsTUFBTSxDQUFDLEtBQUssVUFBVSw0QkFBNEIsQ0FDakQsMEJBQXVELEVBQ3ZELGNBQXdDLEVBQ3hDLHVCQUFpRCxFQUNqRCwwQkFBNkQsRUFDN0QsVUFBdUI7SUFFdkIsSUFBSSxDQUFDO1FBQ0osTUFBTSx5QkFBeUIsR0FDOUIsTUFBTSwwQkFBMEIsQ0FBQyw0QkFBNEIsRUFBRSxDQUFBO1FBQ2hFLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUMzQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLE1BQU0sMEJBQTBCLENBQUMsWUFBWSw0QkFBb0IsQ0FBQTtRQUNuRixLQUFLLE1BQU0sQ0FBQyxzQkFBc0IsRUFBRSxVQUFVLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUNoRSx5QkFBeUIsQ0FBQyxVQUFVLENBQ3BDLEVBQUUsQ0FBQztZQUNILElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLENBQUM7Z0JBQzVCLFNBQVE7WUFDVCxDQUFDO1lBQ0QsTUFBTSxFQUFFLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxXQUFXLEVBQUUs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