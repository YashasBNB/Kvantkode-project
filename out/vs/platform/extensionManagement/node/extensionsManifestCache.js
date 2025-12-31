/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../base/common/lifecycle.js';
import { USER_MANIFEST_CACHE_FILE } from '../../extensions/common/extensions.js';
import { toFileOperationResult, } from '../../files/common/files.js';
export class ExtensionsManifestCache extends Disposable {
    constructor(userDataProfilesService, fileService, uriIdentityService, extensionsManagementService, logService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        this.fileService = fileService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this._register(extensionsManagementService.onDidInstallExtensions((e) => this.onDidInstallExtensions(e)));
        this._register(extensionsManagementService.onDidUninstallExtension((e) => this.onDidUnInstallExtension(e)));
    }
    onDidInstallExtensions(results) {
        for (const r of results) {
            if (r.local) {
                this.invalidate(r.profileLocation);
            }
        }
    }
    onDidUnInstallExtension(e) {
        if (!e.error) {
            this.invalidate(e.profileLocation);
        }
    }
    async invalidate(extensionsManifestLocation) {
        if (extensionsManifestLocation) {
            for (const profile of this.userDataProfilesService.profiles) {
                if (this.uriIdentityService.extUri.isEqual(profile.extensionsResource, extensionsManifestLocation)) {
                    await this.deleteUserCacheFile(profile);
                }
            }
        }
        else {
            await this.deleteUserCacheFile(this.userDataProfilesService.defaultProfile);
        }
    }
    async deleteUserCacheFile(profile) {
        try {
            await this.fileService.del(this.uriIdentityService.extUri.joinPath(profile.cacheHome, USER_MANIFEST_CACHE_FILE));
        }
        catch (error) {
            if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.logService.error(error);
            }
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc01hbmlmZXN0Q2FjaGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L25vZGUvZXh0ZW5zaW9uc01hbmlmZXN0Q2FjaGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBTzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFHTixxQkFBcUIsR0FDckIsTUFBTSw2QkFBNkIsQ0FBQTtBQVFwQyxNQUFNLE9BQU8sdUJBQXdCLFNBQVEsVUFBVTtJQUN0RCxZQUNrQix1QkFBaUQsRUFDakQsV0FBeUIsRUFDekIsa0JBQXVDLEVBQ3hELDJCQUF3RCxFQUN2QyxVQUF1QjtRQUV4QyxLQUFLLEVBQUUsQ0FBQTtRQU5VLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBMEI7UUFDakQsZ0JBQVcsR0FBWCxXQUFXLENBQWM7UUFDekIsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUV2QyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBR3hDLElBQUksQ0FBQyxTQUFTLENBQ2IsMkJBQTJCLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUN6RixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYiwyQkFBMkIsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzNGLENBQUE7SUFDRixDQUFDO0lBRU8sc0JBQXNCLENBQUMsT0FBMEM7UUFDeEUsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDYixJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxDQUE2QjtRQUM1RCxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsVUFBVSxDQUFDLDBCQUEyQztRQUMzRCxJQUFJLDBCQUEwQixFQUFFLENBQUM7WUFDaEMsS0FBSyxNQUFNLE9BQU8sSUFBSSxJQUFJLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQzdELElBQ0MsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ3JDLE9BQU8sQ0FBQyxrQkFBa0IsRUFDMUIsMEJBQTBCLENBQzFCLEVBQ0EsQ0FBQztvQkFDRixNQUFNLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUM1RSxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxPQUF5QjtRQUMxRCxJQUFJLENBQUM7WUFDSixNQUFNLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUN6QixJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLHdCQUF3QixDQUFDLENBQ3BGLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixJQUFJLHFCQUFxQixDQUFDLEtBQUssQ0FBQywrQ0FBdUMsRUFBRSxDQUFDO2dCQUN6RSxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7Q0FDRCJ9