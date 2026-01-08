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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5zdXBwb3J0ZWRFeHRlbnNpb25zTWlncmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L2NvbW1vbi91bnN1cHBvcnRlZEV4dGVuc2lvbnNNaWdyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUNOLDhDQUE4QyxHQUs5QyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxjQUFjLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUtoRjs7Ozs7O0dBTUc7QUFDSCxNQUFNLENBQUMsS0FBSyxVQUFVLDRCQUE0QixDQUNqRCwwQkFBdUQsRUFDdkQsY0FBd0MsRUFDeEMsdUJBQWlELEVBQ2pELDBCQUE2RCxFQUM3RCxVQUF1QjtJQUV2QixJQUFJLENBQUM7UUFDSixNQUFNLHlCQUF5QixHQUM5QixNQUFNLDBCQUEwQixDQUFDLDRCQUE0QixFQUFFLENBQUE7UUFDaEUsSUFBSSxDQUFDLHlCQUF5QixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzNDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxTQUFTLEdBQUcsTUFBTSwwQkFBMEIsQ0FBQyxZQUFZLDRCQUFvQixDQUFBO1FBQ25GLEtBQUssTUFBTSxDQUFDLHNCQUFzQixFQUFFLFVBQVUsQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQ2hFLHlCQUF5QixDQUFDLFVBQVUsQ0FDcEMsRUFBRSxDQUFDO1lBQ0gsSUFBSSxDQUFDLFVBQVUsRUFBRSxTQUFTLEVBQUUsQ0FBQztnQkFDNUIsU0FBUTtZQUNULENBQUM7WUFDRCxNQUFNLEVBQUUsRUFBRSxFQUFFLHFCQUFxQixFQUFFLFdBQVcs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