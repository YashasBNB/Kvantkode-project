/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { assertNever } from '../../../../base/common/assert.js';
import { FilePermission, FileSystemProviderErrorCode, FileType, createFileSystemProviderError, } from '../../../../platform/files/common/files.js';
import { DEBUG_MEMORY_SCHEME, } from '../common/debug.js';
const rangeRe = /range=([0-9]+):([0-9]+)/;
export class DebugMemoryFileSystemProvider extends Disposable {
    constructor(debugService) {
        super();
        this.debugService = debugService;
        this.memoryFdCounter = 0;
        this.fdMemory = new Map();
        this.changeEmitter = new Emitter();
        /** @inheritdoc */
        this.onDidChangeCapabilities = Event.None;
        /** @inheritdoc */
        this.onDidChangeFile = this.changeEmitter.event;
        /** @inheritdoc */
        this.capabilities = 0 |
            1024 /* FileSystemProviderCapabilities.PathCaseSensitive */ |
            4 /* FileSystemProviderCapabilities.FileOpenReadWriteClose */;
        this._register(debugService.onDidEndSession(({ session }) => {
            for (const [fd, memory] of this.fdMemory) {
                if (memory.session === session) {
                    this.close(fd);
                }
            }
        }));
    }
    watch(resource, opts) {
        if (opts.recursive) {
            return toDisposable(() => { });
        }
        const { session, memoryReference, offset } = this.parseUri(resource);
        const disposable = new DisposableStore();
        disposable.add(session.onDidChangeState(() => {
            if (session.state === 3 /* State.Running */ || session.state === 0 /* State.Inactive */) {
                this.changeEmitter.fire([{ type: 2 /* FileChangeType.DELETED */, resource }]);
            }
        }));
        disposable.add(session.onDidInvalidateMemory((e) => {
            if (e.body.memoryReference !== memoryReference) {
                return;
            }
            if (offset &&
                (e.body.offset >= offset.toOffset || e.body.offset + e.body.count < offset.fromOffset)) {
                return;
            }
            this.changeEmitter.fire([{ resource, type: 0 /* FileChangeType.UPDATED */ }]);
        }));
        return disposable;
    }
    /** @inheritdoc */
    stat(file) {
        const { readOnly } = this.parseUri(file);
        return Promise.resolve({
            type: FileType.File,
            mtime: 0,
            ctime: 0,
            size: 0,
            permissions: readOnly ? FilePermission.Readonly : undefined,
        });
    }
    /** @inheritdoc */
    mkdir() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    readdir() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    delete() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    rename() {
        throw createFileSystemProviderError(`Not allowed`, FileSystemProviderErrorCode.NoPermissions);
    }
    /** @inheritdoc */
    open(resource, _opts) {
        const { session, memoryReference, offset } = this.parseUri(resource);
        const fd = this.memoryFdCounter++;
        let region = session.getMemory(memoryReference);
        if (offset) {
            region = new MemoryRegionView(region, offset);
        }
        this.fdMemory.set(fd, { session, region });
        return Promise.resolve(fd);
    }
    /** @inheritdoc */
    close(fd) {
        this.fdMemory.get(fd)?.region.dispose();
        this.fdMemory.delete(fd);
        return Promise.resolve();
    }
    /** @inheritdoc */
    async writeFile(resource, content) {
        const { offset } = this.parseUri(resource);
        if (!offset) {
            throw createFileSystemProviderError(`Range must be present to read a file`, FileSystemProviderErrorCode.FileNotFound);
        }
        const fd = await this.open(resource, { create: false });
        try {
            await this.write(fd, offset.fromOffset, content, 0, content.length);
        }
        finally {
            this.close(fd);
        }
    }
    /** @inheritdoc */
    async readFile(resource) {
        const { offset } = this.parseUri(resource);
        if (!offset) {
            throw createFileSystemProviderError(`Range must be present to read a file`, FileSystemProviderErrorCode.FileNotFound);
        }
        const data = new Uint8Array(offset.toOffset - offset.fromOffset);
        const fd = await this.open(resource, { create: false });
        try {
            await this.read(fd, offset.fromOffset, data, 0, data.length);
            return data;
        }
        finally {
            this.close(fd);
        }
    }
    /** @inheritdoc */
    async read(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        const ranges = await memory.region.read(pos, length);
        let readSoFar = 0;
        for (const range of ranges) {
            switch (range.type) {
                case 1 /* MemoryRangeType.Unreadable */:
                    return readSoFar;
                case 2 /* MemoryRangeType.Error */:
                    if (readSoFar > 0) {
                        return readSoFar;
                    }
                    else {
                        throw createFileSystemProviderError(range.error, FileSystemProviderErrorCode.Unknown);
                    }
                case 0 /* MemoryRangeType.Valid */: {
                    const start = Math.max(0, pos - range.offset);
                    const toWrite = range.data.slice(start, Math.min(range.data.byteLength, start + (length - readSoFar)));
                    data.set(toWrite.buffer, offset + readSoFar);
                    readSoFar += toWrite.byteLength;
                    break;
                }
                default:
                    assertNever(range);
            }
        }
        return readSoFar;
    }
    /** @inheritdoc */
    write(fd, pos, data, offset, length) {
        const memory = this.fdMemory.get(fd);
        if (!memory) {
            throw createFileSystemProviderError(`No file with that descriptor open`, FileSystemProviderErrorCode.Unavailable);
        }
        return memory.region.write(pos, VSBuffer.wrap(data).slice(offset, offset + length));
    }
    parseUri(uri) {
        if (uri.scheme !== DEBUG_MEMORY_SCHEME) {
            throw createFileSystemProviderError(`Cannot open file with scheme ${uri.scheme}`, FileSystemProviderErrorCode.FileNotFound);
        }
        const session = this.debugService.getModel().getSession(uri.authority);
        if (!session) {
            throw createFileSystemProviderError(`Debug session not found`, FileSystemProviderErrorCode.FileNotFound);
        }
        let offset;
        const rangeMatch = rangeRe.exec(uri.query);
        if (rangeMatch) {
            offset = { fromOffset: Number(rangeMatch[1]), toOffset: Number(rangeMatch[2]) };
        }
        const [, memoryReference] = uri.path.split('/');
        return {
            session,
            offset,
            readOnly: !session.capabilities.supportsWriteMemoryRequest,
            sessionId: uri.authority,
            memoryReference: decodeURIComponent(memoryReference),
        };
    }
}
/** A wrapper for a MemoryRegion that references a subset of data in another region. */
class MemoryRegionView extends Disposable {
    constructor(parent, range) {
        super();
        this.parent = parent;
        this.range = range;
        this.invalidateEmitter = new Emitter();
        this.onDidInvalidate = this.invalidateEmitter.event;
        this.width = this.range.toOffset - this.range.fromOffset;
        this.writable = parent.writable;
        this._register(parent);
        this._register(parent.onDidInvalidate((e) => {
            const fromOffset = clamp(e.fromOffset - range.fromOffset, 0, this.width);
            const toOffset = clamp(e.toOffset - range.fromOffset, 0, this.width);
            if (toOffset > fromOffset) {
                this.invalidateEmitter.fire({ fromOffset, toOffset });
            }
        }));
    }
    read(fromOffset, toOffset) {
        if (fromOffset < 0) {
            throw new RangeError(`Invalid fromOffset: ${fromOffset}`);
        }
        return this.parent.read(this.range.fromOffset + fromOffset, this.range.fromOffset + Math.min(toOffset, this.width));
    }
    write(offset, data) {
        return this.parent.write(this.range.fromOffset + offset, data);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdNZW1vcnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnTWVtb3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFL0QsT0FBTyxFQUdOLGNBQWMsRUFFZCwyQkFBMkIsRUFDM0IsUUFBUSxFQUtSLDZCQUE2QixHQUM3QixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFDTixtQkFBbUIsR0FRbkIsTUFBTSxvQkFBb0IsQ0FBQTtBQUUzQixNQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQTtBQUV6QyxNQUFNLE9BQU8sNkJBQThCLFNBQVEsVUFBVTtJQWlCNUQsWUFBNkIsWUFBMkI7UUFDdkQsS0FBSyxFQUFFLENBQUE7UUFEcUIsaUJBQVksR0FBWixZQUFZLENBQWU7UUFoQmhELG9CQUFlLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsYUFBUSxHQUFHLElBQUksR0FBRyxFQUE2RCxDQUFBO1FBQy9FLGtCQUFhLEdBQUcsSUFBSSxPQUFPLEVBQTBCLENBQUE7UUFFdEUsa0JBQWtCO1FBQ0YsNEJBQXVCLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQTtRQUVwRCxrQkFBa0I7UUFDRixvQkFBZSxHQUFHLElBQUksQ0FBQyxhQUFhLENB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