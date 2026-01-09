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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC9ub2RlL2V4dGVuc2lvbkRvd25sb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxLQUFLLE1BQU0sTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsSUFBSSxVQUFVLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDckUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkYsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDNUYsT0FBTyxFQUNOLHdCQUF3QixFQUV4QixrQ0FBa0MsRUFDbEMsd0JBQXdCLEdBR3hCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFlBQVksRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxN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