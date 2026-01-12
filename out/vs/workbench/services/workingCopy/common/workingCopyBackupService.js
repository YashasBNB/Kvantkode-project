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
var WorkingCopyBackupServiceImpl_1;
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { equals, deepClone } from '../../../../base/common/objects.js';
import { Promises, ResourceQueue } from '../../../../base/common/async.js';
import { IFileService, } from '../../../../platform/files/common/files.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { isReadableStream, peekStream } from '../../../../base/common/stream.js';
import { bufferToStream, prefixedBufferReadable, prefixedBufferStream, readableToBuffer, streamToBuffer, VSBuffer, } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { Schemas } from '../../../../base/common/network.js';
import { hash } from '../../../../base/common/hash.js';
import { isEmptyObject } from '../../../../base/common/types.js';
import { NO_TYPE_ID } from './workingCopy.js';
export class WorkingCopyBackupsModel {
    static async create(backupRoot, fileService) {
        const model = new WorkingCopyBackupsModel(backupRoot, fileService);
        await model.resolve();
        return model;
    }
    constructor(backupRoot, fileService) {
        this.backupRoot = backupRoot;
        this.fileService = fileService;
        this.cache = new ResourceMap();
    }
    async resolve() {
        try {
            const backupRootStat = await this.fileService.resolve(this.backupRoot);
            if (backupRootStat.children) {
                await Promises.settled(backupRootStat.children
                    .filter((child) => child.isDirectory)
                    .map(async (backupSchemaFolder) => {
                    // Read backup directory for backups
                    const backupSchemaFolderStat = await this.fileService.resolve(backupSchemaFolder.resource);
                    // Remember known backups in our caches
                    //
                    // Note: this does NOT account for resolving
                    // associated meta data because that requires
                    // opening the backup and reading the meta
                    // preamble. Instead, when backups are actually
                    // resolved, the meta data will be added via
                    // additional `update` calls.
                    if (backupSchemaFolderStat.children) {
                        for (const backupForSchema of backupSchemaFolderStat.children) {
                            if (!backupForSchema.isDirectory) {
                                this.add(backupForSchema.resource);
                            }
                        }
                    }
                }));
            }
        }
        catch (error) {
            // ignore any errors
        }
    }
    add(resource, versionId = 0, meta) {
        this.cache.set(resource, {
            versionId,
            meta: deepClone(meta),
        });
    }
    update(resource, meta) {
        const entry = this.cache.get(resource);
        if (entry) {
            entry.meta = deepClone(meta);
        }
    }
    count() {
        return this.cache.size;
    }
    has(resource, versionId, meta) {
        const entry = this.cache.get(resource);
        if (!entry) {
            return false; // unknown resource
        }
        if (typeof versionId === 'number' && versionId !== entry.versionId) {
            return false; // different versionId
        }
        if (meta && !equals(meta, entry.meta)) {
            return false; // different metadata
        }
        return true;
    }
    get() {
        return Array.from(this.cache.keys());
    }
    remove(resource) {
        this.cache.delete(resource);
    }
    clear() {
        this.cache.clear();
    }
}
let WorkingCopyBackupService = class WorkingCopyBackupService extends Disposable {
    constructor(backupWorkspaceHome, fileService, logService) {
        super();
        this.fileService = fileService;
        this.logService = logService;
        this.impl = this._register(this.initialize(backupWorkspaceHome));
    }
    initialize(backupWorkspaceHome) {
        if (backupWorkspaceHome) {
            return new WorkingCopyBackupServiceImpl(backupWorkspaceHome, this.fileService, this.logService);
        }
        return new InMemoryWorkingCopyBackupService();
    }
    reinitialize(backupWorkspaceHome) {
        // Re-init implementation (unless we are running in-memory)
        if (this.impl instanceof WorkingCopyBackupServiceImpl) {
            if (backupWorkspaceHome) {
                this.impl.initialize(backupWorkspaceHome);
            }
            else {
                this.impl = new InMemoryWorkingCopyBackupService();
            }
        }
    }
    hasBackups() {
        return this.impl.hasBackups();
    }
    hasBackupSync(identifier, versionId, meta) {
        return this.impl.hasBackupSync(identifier, versionId, meta);
    }
    backup(identifier, content, versionId, meta, token) {
        return this.impl.backup(identifier, content, versionId, meta, token);
    }
    discardBackup(identifier, token) {
        return this.impl.discardBackup(identifier, token);
    }
    discardBackups(filter) {
        return this.impl.discardBackups(filter);
    }
    getBackups() {
        return this.impl.getBackups();
    }
    resolve(identifier) {
        return this.impl.resolve(identifier);
    }
    toBackupResource(identifier) {
        return this.impl.toBackupResource(identifier);
    }
    joinBackups() {
        return this.impl.joinBackups();
    }
};
WorkingCopyBackupService = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], WorkingCopyBackupService);
export { WorkingCopyBackupService };
let WorkingCopyBackupServiceImpl = class WorkingCopyBackupServiceImpl extends Disposable {
    static { WorkingCopyBackupServiceImpl_1 = this; }
    static { this.PREAMBLE_END_MARKER = '\n'; }
    static { this.PREAMBLE_END_MARKER_CHARCODE = '\n'.charCodeAt(0); }
    static { this.PREAMBLE_META_SEPARATOR = ' '; } // using a character that is know to be escaped in a URI as separator
    static { this.PREAMBLE_MAX_LENGTH = 10000; }
    constructor(backupWorkspaceHome, fileService, logService) {
        super();
        this.backupWorkspaceHome = backupWorkspaceHome;
        this.fileService = fileService;
        this.logService = logService;
        this.ioOperationQueues = this._register(new ResourceQueue()); // queue IO operations to ensure write/delete file order
        this.model = undefined;
        this.initialize(backupWorkspaceHome);
    }
    initialize(backupWorkspaceResource) {
        this.backupWorkspaceHome = backupWorkspaceResource;
        this.ready = this.doInitialize();
    }
    async doInitialize() {
        // Create backup model
        this.model = await WorkingCopyBackupsModel.create(this.backupWorkspaceHome, this.fileService);
        return this.model;
    }
    async hasBackups() {
        const model = await this.ready;
        // Ensure to await any pending backup operations
        await this.joinBackups();
        return model.count() > 0;
    }
    hasBackupSync(identifier, versionId, meta) {
        if (!this.model) {
            return false;
        }
        const backupResource = this.toBackupResource(identifier);
        return this.model.has(backupResource, versionId, meta);
    }
    async backup(identifier, content, versionId, meta, token) {
        const model = await this.ready;
        if (token?.isCancellationRequested) {
            return;
        }
        const backupResource = this.toBackupResource(identifier);
        if (model.has(backupResource, versionId, meta)) {
            // return early if backup version id matches requested one
            return;
        }
        return this.ioOperationQueues.queueFor(backupResource, async () => {
            if (token?.isCancellationRequested) {
                return;
            }
            if (model.has(backupResource, versionId, meta)) {
                // return early if backup version id matches requested one
                // this can happen when multiple backup IO operations got
                // scheduled, racing against each other.
                return;
            }
            // Encode as: Resource + META-START + Meta + END
            // and respect max length restrictions in case
            // meta is too large.
            let preamble = this.createPreamble(identifier, meta);
            if (preamble.length >= WorkingCopyBackupServiceImpl_1.PREAMBLE_MAX_LENGTH) {
                preamble = this.createPreamble(identifier);
            }
            // Update backup with value
            const preambleBuffer = VSBuffer.fromString(preamble);
            let backupBuffer;
            if (isReadableStream(content)) {
                backupBuffer = prefixedBufferStream(preambleBuffer, content);
            }
            else if (content) {
                backupBuffer = prefixedBufferReadable(preambleBuffer, content);
            }
            else {
                backupBuffer = VSBuffer.concat([preambleBuffer, VSBuffer.fromString('')]);
            }
            // Write backup via file service
            await this.fileService.writeFile(backupResource, backupBuffer);
            //
            // Update model
            //
            // Note: not checking for cancellation here because a successful
            // write into the backup file should be noted in the model to
            // prevent the model being out of sync with the backup file
            model.add(backupResource, versionId, meta);
        });
    }
    createPreamble(identifier, meta) {
        return `${identifier.resource.toString()}${WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR}${JSON.stringify({ ...meta, typeId: identifier.typeId })}${WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER}`;
    }
    async discardBackups(filter) {
        const model = await this.ready;
        // Discard all but some backups
        const except = filter?.except;
        if (Array.isArray(except) && except.length > 0) {
            const exceptMap = new ResourceMap();
            for (const exceptWorkingCopy of except) {
                exceptMap.set(this.toBackupResource(exceptWorkingCopy), true);
            }
            await Promises.settled(model.get().map(async (backupResource) => {
                if (!exceptMap.has(backupResource)) {
                    await this.doDiscardBackup(backupResource);
                }
            }));
        }
        // Discard all backups
        else {
            await this.deleteIgnoreFileNotFound(this.backupWorkspaceHome);
            model.clear();
        }
    }
    discardBackup(identifier, token) {
        const backupResource = this.toBackupResource(identifier);
        return this.doDiscardBackup(backupResource, token);
    }
    async doDiscardBackup(backupResource, token) {
        const model = await this.ready;
        if (token?.isCancellationRequested) {
            return;
        }
        return this.ioOperationQueues.queueFor(backupResource, async () => {
            if (token?.isCancellationRequested) {
                return;
            }
            // Delete backup file ignoring any file not found errors
            await this.deleteIgnoreFileNotFound(backupResource);
            //
            // Update model
            //
            // Note: not checking for cancellation here because a successful
            // delete of the backup file should be noted in the model to
            // prevent the model being out of sync with the backup file
            model.remove(backupResource);
        });
    }
    async deleteIgnoreFileNotFound(backupResource) {
        try {
            await this.fileService.del(backupResource, { recursive: true });
        }
        catch (error) {
            if (error.fileOperationResult !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                throw error; // re-throw any other error than file not found which is OK
            }
        }
    }
    async getBackups() {
        const model = await this.ready;
        // Ensure to await any pending backup operations
        await this.joinBackups();
        const backups = await Promise.all(model.get().map((backupResource) => this.resolveIdentifier(backupResource, model)));
        return coalesce(backups);
    }
    async resolveIdentifier(backupResource, model) {
        let res = undefined;
        await this.ioOperationQueues.queueFor(backupResource, async () => {
            if (!model.has(backupResource)) {
                return; // require backup to be present
            }
            // Read the entire backup preamble by reading up to
            // `PREAMBLE_MAX_LENGTH` in the backup file until
            // the `PREAMBLE_END_MARKER` is found
            const backupPreamble = await this.readToMatchingString(backupResource, WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER, WorkingCopyBackupServiceImpl_1.PREAMBLE_MAX_LENGTH);
            if (!backupPreamble) {
                return;
            }
            // Figure out the offset in the preamble where meta
            // information possibly starts. This can be `-1` for
            // older backups without meta.
            const metaStartIndex = backupPreamble.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR);
            // Extract the preamble content for resource and meta
            let resourcePreamble;
            let metaPreamble;
            if (metaStartIndex > 0) {
                resourcePreamble = backupPreamble.substring(0, metaStartIndex);
                metaPreamble = backupPreamble.substr(metaStartIndex + 1);
            }
            else {
                resourcePreamble = backupPreamble;
                metaPreamble = undefined;
            }
            // Try to parse the meta preamble for figuring out
            // `typeId` and `meta` if defined.
            const { typeId, meta } = this.parsePreambleMeta(metaPreamble);
            // Update model entry with now resolved meta
            model.update(backupResource, meta);
            res = {
                typeId: typeId ?? NO_TYPE_ID,
                resource: URI.parse(resourcePreamble),
            };
        });
        return res;
    }
    async readToMatchingString(backupResource, matchingString, maximumBytesToRead) {
        const contents = (await this.fileService.readFile(backupResource, { length: maximumBytesToRead })).value.toString();
        const matchingStringIndex = contents.indexOf(matchingString);
        if (matchingStringIndex >= 0) {
            return contents.substr(0, matchingStringIndex);
        }
        // Unable to find matching string in file
        return undefined;
    }
    async resolve(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const model = await this.ready;
        let res = undefined;
        await this.ioOperationQueues.queueFor(backupResource, async () => {
            if (!model.has(backupResource)) {
                return; // require backup to be present
            }
            // Load the backup content and peek into the first chunk
            // to be able to resolve the meta data
            const backupStream = await this.fileService.readFileStream(backupResource);
            const peekedBackupStream = await peekStream(backupStream.value, 1);
            const firstBackupChunk = VSBuffer.concat(peekedBackupStream.buffer);
            // We have seen reports (e.g. https://github.com/microsoft/vscode/issues/78500) where
            // if VSCode goes down while writing the backup file, the file can turn empty because
            // it always first gets truncated and then written to. In this case, we will not find
            // the meta-end marker ('\n') and as such the backup can only be invalid. We bail out
            // here if that is the case.
            const preambleEndIndex = firstBackupChunk.buffer.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_END_MARKER_CHARCODE);
            if (preambleEndIndex === -1) {
                this.logService.trace(`Backup: Could not find meta end marker in ${backupResource}. The file is probably corrupt (filesize: ${backupStream.size}).`);
                return undefined;
            }
            const preambelRaw = firstBackupChunk.slice(0, preambleEndIndex).toString();
            // Extract meta data (if any)
            let meta;
            const metaStartIndex = preambelRaw.indexOf(WorkingCopyBackupServiceImpl_1.PREAMBLE_META_SEPARATOR);
            if (metaStartIndex !== -1) {
                meta = this.parsePreambleMeta(preambelRaw.substr(metaStartIndex + 1)).meta;
            }
            // Update model entry with now resolved meta
            model.update(backupResource, meta);
            // Build a new stream without the preamble
            const firstBackupChunkWithoutPreamble = firstBackupChunk.slice(preambleEndIndex + 1);
            let value;
            if (peekedBackupStream.ended) {
                value = bufferToStream(firstBackupChunkWithoutPreamble);
            }
            else {
                value = prefixedBufferStream(firstBackupChunkWithoutPreamble, peekedBackupStream.stream);
            }
            res = { value, meta };
        });
        return res;
    }
    parsePreambleMeta(preambleMetaRaw) {
        let typeId = undefined;
        let meta = undefined;
        if (preambleMetaRaw) {
            try {
                meta = JSON.parse(preambleMetaRaw);
                typeId = meta?.typeId;
                // `typeId` is a property that we add so we
                // remove it when returning to clients.
                if (typeof meta?.typeId === 'string') {
                    delete meta.typeId;
                    if (isEmptyObject(meta)) {
                        meta = undefined;
                    }
                }
            }
            catch (error) {
                // ignore JSON parse errors
            }
        }
        return { typeId, meta };
    }
    toBackupResource(identifier) {
        return joinPath(this.backupWorkspaceHome, identifier.resource.scheme, hashIdentifier(identifier));
    }
    joinBackups() {
        return this.ioOperationQueues.whenDrained();
    }
};
WorkingCopyBackupServiceImpl = WorkingCopyBackupServiceImpl_1 = __decorate([
    __param(1, IFileService),
    __param(2, ILogService)
], WorkingCopyBackupServiceImpl);
export class InMemoryWorkingCopyBackupService extends Disposable {
    constructor() {
        super();
        this.backups = new ResourceMap();
    }
    async hasBackups() {
        return this.backups.size > 0;
    }
    hasBackupSync(identifier, versionId) {
        const backupResource = this.toBackupResource(identifier);
        return this.backups.has(backupResource);
    }
    async backup(identifier, content, versionId, meta, token) {
        const backupResource = this.toBackupResource(identifier);
        this.backups.set(backupResource, {
            typeId: identifier.typeId,
            content: content instanceof VSBuffer
                ? content
                : content
                    ? isReadableStream(content)
                        ? await streamToBuffer(content)
                        : readableToBuffer(content)
                    : VSBuffer.fromString(''),
            meta,
        });
    }
    async resolve(identifier) {
        const backupResource = this.toBackupResource(identifier);
        const backup = this.backups.get(backupResource);
        if (backup) {
            return { value: bufferToStream(backup.content), meta: backup.meta };
        }
        return undefined;
    }
    async getBackups() {
        return Array.from(this.backups.entries()).map(([resource, backup]) => ({
            typeId: backup.typeId,
            resource,
        }));
    }
    async discardBackup(identifier) {
        this.backups.delete(this.toBackupResource(identifier));
    }
    async discardBackups(filter) {
        const except = filter?.except;
        if (Array.isArray(except) && except.length > 0) {
            const exceptMap = new ResourceMap();
            for (const exceptWorkingCopy of except) {
                exceptMap.set(this.toBackupResource(exceptWorkingCopy), true);
            }
            for (const backup of await this.getBackups()) {
                if (!exceptMap.has(this.toBackupResource(backup))) {
                    await this.discardBackup(backup);
                }
            }
        }
        else {
            this.backups.clear();
        }
    }
    toBackupResource(identifier) {
        return URI.from({ scheme: Schemas.inMemory, path: hashIdentifier(identifier) });
    }
    async joinBackups() {
        return;
    }
}
/*
 * Exported only for testing
 */
export function hashIdentifier(identifier) {
    // IMPORTANT: for backwards compatibility, ensure that
    // we ignore the `typeId` unless a value is provided.
    // To preserve previous backups without type id, we
    // need to just hash the resource. Otherwise we use
    // the type id as a seed to the resource path.
    let resource;
    if (identifier.typeId.length > 0) {
        const typeIdHash = hashString(identifier.typeId);
        if (identifier.resource.path) {
            resource = joinPath(identifier.resource, typeIdHash);
        }
        else {
            resource = identifier.resource.with({ path: typeIdHash });
        }
    }
    else {
        resource = identifier.resource;
    }
    return hashPath(resource);
}
function hashPath(resource) {
    const str = resource.scheme === Schemas.file || resource.scheme === Schemas.untitled
        ? resource.fsPath
        : resource.toString();
    return hashString(str);
}
function hashString(str) {
    return hash(str).toString(16);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5QmFja3VwU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsUUFBUSxFQUFFLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFFLE9BQU8sRUFDTixZQUFZLEdBR1osTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFDTixjQUFjLEVBQ2Qsc0JBQXNCLEVBQ3RCLG9CQUFvQixFQUNwQixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLFFBQVEsR0FHUixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0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