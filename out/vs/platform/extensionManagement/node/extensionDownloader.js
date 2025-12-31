/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExtensionsDownloader_1;
import { Promises } from '../../../base/common/async.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import { joinPath } from '../../../base/common/resources.js';
import * as semver from '../../../base/common/semver/semver.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { Promises as FSPromises } from '../../../base/node/pfs.js';
import { buffer, CorruptZipMessage } from '../../../base/node/zip.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { toExtensionManagementError } from '../common/abstractExtensionManagementService.js';
import { ExtensionManagementError, ExtensionSignatureVerificationCode, IExtensionGalleryService, } from '../common/extensionManagement.js';
import { ExtensionKey, groupByExtension } from '../common/extensionManagementUtil.js';
import { fromExtractError } from './extensionManagementUtil.js';
import { IExtensionSignatureVerificationService } from './extensionSignatureVerificationService.js';
import { IFileService, toFileOperationResult, } from '../../files/common/files.js';
import { ILogService } from '../../log/common/log.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { IUriIdentityService } from '../../uriIdentity/common/uriIdentity.js';
let ExtensionsDownloader = class ExtensionsDownloader extends Disposable {
    static { ExtensionsDownloader_1 = this; }
    static { this.SignatureArchiveExtension = '.sigzip'; }
    constructor(environmentService, fileService, extensionGalleryService, extensionSignatureVerificationService, telemetryService, uriIdentityService, logService) {
        super();
        this.fileService = fileService;
        this.extensionGalleryService = extensionGalleryService;
        this.extensionSignatureVerificationService = extensionSignatureVerificationService;
        this.telemetryService = telemetryService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.extensionsDownloadDir = environmentService.extensionsDownloadLocation;
        this.extensionsTrashDir = uriIdentityService.extUri.joinPath(environmentService.extensionsDownloadLocation, `.trash`);
        this.cache = 20; // Cache 20 downloaded VSIX files
        this.cleanUpPromise = this.cleanUp();
    }
    async download(extension, operation, verifySignature, clientTargetPlatform) {
        await this.cleanUpPromise;
        const location = await this.downloadVSIX(extension, operation);
        if (!verifySignature) {
            return { location, verificationStatus: undefined };
        }
        if (!extension.isSigned) {
            return { location, verificationStatus: ExtensionSignatureVerificationCode.NotSigned };
        }
        let signatureArchiveLocation;
        try {
            signatureArchiveLocation = await this.downloadSignatureArchive(extension);
            const verificationStatus = (await this.extensionSignatureVerificationService.verify(extension.identifier.id, extension.version, location.fsPath, signatureArchiveLocation.fsPath, clientTargetPlatform))?.code;
            if (verificationStatus === ExtensionSignatureVerificationCode.PackageIsInvalidZip ||
                verificationStatus === ExtensionSignatureVerificationCode.SignatureArchiveIsInvalidZip) {
                try {
                    // Delete the downloaded vsix if VSIX or signature archive is invalid
                    await this.delete(location);
                }
                catch (error) {
                    this.logService.error(error);
                }
                throw new ExtensionManagementError(CorruptZipMessage, "CorruptZip" /* ExtensionManagementErrorCode.CorruptZip */);
            }
            return { location, verificationStatus };
        }
        catch (error) {
            try {
                // Delete the downloaded VSIX if signature archive download fails
                await this.delete(location);
            }
            catch (error) {
                this.logService.error(error);
            }
            throw error;
        }
        finally {
            if (signatureArchiveLocation) {
                try {
                    // Delete signature archive always
                    await this.delete(signatureArchiveLocation);
                }
                catch (error) {
                    this.logService.error(error);
                }
            }
        }
    }
    async downloadVSIX(extension, operation) {
        try {
            const location = joinPath(this.extensionsDownloadDir, this.getName(extension));
            const attempts = await this.doDownload(extension, 'vsix', async () => {
                await this.downloadFile(extension, location, (location) => this.extensionGalleryService.download(extension, location, operation));
                try {
                    await this.validate(location.fsPath, 'extension/package.json');
                }
                catch (error) {
                    try {
                        await this.fileService.del(location);
                    }
                    catch (e) {
                        this.logService.warn(`Error while deleting: ${location.path}`, getErrorMessage(e));
                    }
                    throw error;
                }
            }, 2);
            if (attempts > 1) {
                this.telemetryService.publicLog2('extensiongallery:downloadvsix:retry', {
                    extensionId: extension.identifier.id,
                    attempts,
                });
            }
            return location;
        }
        catch (e) {
            throw toExtensionManagementError(e, "Download" /* ExtensionManagementErrorCode.Download */);
        }
    }
    async downloadSignatureArchive(extension) {
        try {
            const location = joinPath(this.extensionsDownloadDir, `${this.getName(extension)}${ExtensionsDownloader_1.SignatureArchiveExtension}`);
            const attempts = await this.doDownload(extension, 'sigzip', async () => {
                await this.extensionGalleryService.downloadSignatureArchive(extension, location);
                try {
                    await this.validate(location.fsPath, '.signature.p7s');
                }
                catch (error) {
                    try {
                        await this.fileService.del(location);
                    }
                    catch (e) {
                        this.logService.warn(`Error while deleting: ${location.path}`, getErrorMessage(e));
                    }
                    throw error;
                }
            }, 2);
            if (attempts > 1) {
                this.telemetryService.publicLog2('extensiongallery:downloadsigzip:retry', {
                    extensionId: extension.identifier.id,
                    attempts,
                });
            }
            return location;
        }
        catch (e) {
            throw toExtensionManagementError(e, "DownloadSignature" /* ExtensionManagementErrorCode.DownloadSignature */);
        }
    }
    async downloadFile(extension, location, downloadFn) {
        // Do not download if exists
        if (await this.fileService.exists(location)) {
            return;
        }
        // Download directly if locaiton is not file scheme
        if (location.scheme !== Schemas.file) {
            await downloadFn(location);
            return;
        }
        // Download to temporary location first only if file does not exist
        const tempLocation = joinPath(this.extensionsDownloadDir, `.${generateUuid()}`);
        try {
            await downloadFn(tempLocation);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation);
            }
            catch (e) {
                /* ignore */
            }
            throw error;
        }
        try {
            // Rename temp location to original
            await FSPromises.rename(tempLocation.fsPath, location.fsPath, 2 * 60 * 1000 /* Retry for 2 minutes */);
        }
        catch (error) {
            try {
                await this.fileService.del(tempLocation);
            }
            catch (e) {
                /* ignore */
            }
            let exists = false;
            try {
                exists = await this.fileService.exists(location);
            }
            catch (e) {
                /* ignore */
            }
            if (exists) {
                this.logService.info(`Rename failed because the file was downloaded by another source. So ignoring renaming.`, extension.identifier.id, location.path);
            }
            else {
                this.logService.info(`Rename failed because of ${getErrorMessage(error)}. Deleted the file from downloaded location`, tempLocation.path);
                throw error;
            }
        }
    }
    async doDownload(extension, name, downloadFn, retries) {
        let attempts = 1;
        while (true) {
            try {
                await downloadFn();
                return attempts;
            }
            catch (e) {
                if (attempts++ > retries) {
                    throw e;
                }
                this.logService.warn(`Failed downloading ${name}. ${getErrorMessage(e)}. Retry again...`, extension.identifier.id);
            }
        }
    }
    async validate(zipPath, filePath) {
        try {
            await buffer(zipPath, filePath);
        }
        catch (e) {
            throw fromExtractError(e);
        }
    }
    async delete(location) {
        await this.cleanUpPromise;
        const trashRelativePath = this.uriIdentityService.extUri.relativePath(this.extensionsDownloadDir, location);
        if (trashRelativePath) {
            await this.fileService.move(location, this.uriIdentityService.extUri.joinPath(this.extensionsTrashDir, trashRelativePath), true);
        }
        else {
            await this.fileService.del(location);
        }
    }
    async cleanUp() {
        try {
            if (!(await this.fileService.exists(this.extensionsDownloadDir))) {
                this.logService.trace('Extension VSIX downloads cache dir does not exist');
                return;
            }
            try {
                await this.fileService.del(this.extensionsTrashDir, { recursive: true });
            }
            catch (error) {
                if (toFileOperationResult(error) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                    this.logService.error(error);
                }
            }
            const folderStat = await this.fileService.resolve(this.extensionsDownloadDir, {
                resolveMetadata: true,
            });
            if (folderStat.children) {
                const toDelete = [];
                const vsixs = [];
                const signatureArchives = [];
                for (const stat of folderStat.children) {
                    if (stat.name.endsWith(ExtensionsDownloader_1.SignatureArchiveExtension)) {
                        signatureArchives.push(stat.resource);
                    }
                    else {
                        const extension = ExtensionKey.parse(stat.name);
                        if (extension) {
                            vsixs.push([extension, stat]);
                        }
                    }
                }
                const byExtension = groupByExtension(vsixs, ([extension]) => extension);
                const distinct = [];
                for (const p of byExtension) {
                    p.sort((a, b) => semver.rcompare(a[0].version, b[0].version));
                    toDelete.push(...p.slice(1).map((e) => e[1].resource)); // Delete outdated extensions
                    distinct.push(p[0][1]);
                }
                distinct.sort((a, b) => a.mtime - b.mtime); // sort by modified time
                toDelete.push(...distinct.slice(0, Math.max(0, distinct.length - this.cache)).map((s) => s.resource)); // Retain minimum cacheSize and delete the rest
                toDelete.push(...signatureArchives); // Delete all signature archives
                await Promises.settled(toDelete.map((resource) => {
                    this.logService.trace('Deleting from cache', resource.path);
                    return this.fileService.del(resource);
                }));
            }
        }
        catch (e) {
            this.logService.error(e);
        }
    }
    getName(extension) {
        return ExtensionKey.create(extension).toString().toLowerCase();
    }
};
ExtensionsDownloader = ExtensionsDownloader_1 = __decorate([
    __param(0, INativeEnvironmentService),
    __param(1, IFileService),
    __param(2, IExtensionGalleryService),
    __param(3, IExtensionSignatureVerificationService),
    __param(4, ITelemetryService),
    __param(5, IUriIdentityService),
    __param(6, ILogService)
], ExtensionsDownloader);
export { ExtensionsDownloader };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvbm9kZS9leHRlbnNpb25Eb3dubG9hZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sS0FBSyxNQUFNLE1BQU0sdUNBQXVDLENBQUE7QUFFL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLElBQUksVUFBVSxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3JFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFDTix3QkFBd0IsRUFFeEIsa0NBQWtDLEVBQ2xDLHdCQUF3QixHQUd4QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMvRCxP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