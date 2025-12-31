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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlCYWNrdXBTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weUJhY2t1cFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRSxPQUFPLEVBQ04sWUFBWSxHQUdaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQ04sY0FBYyxFQUNkLHNCQUFzQixFQUN0QixvQkFBb0IsRUFDcEIsZ0JBQWdCLEVBQ2hCLGNBQWMsRUFDZCxRQUFRLEdBR1IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FB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