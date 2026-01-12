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
import { bufferToStream, newWriteableBufferStream, VSBuffer, } from '../../../../base/common/buffer.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isDefined } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { StoredValue } from './storedValue.js';
import { HydratedTestResult } from './testResult.js';
export const RETAIN_MAX_RESULTS = 128;
const RETAIN_MIN_RESULTS = 16;
const RETAIN_MAX_BYTES = 1024 * 128;
const CLEANUP_PROBABILITY = 0.2;
export const ITestResultStorage = createDecorator('ITestResultStorage');
/**
 * Data revision this version of VS Code deals with. Should be bumped whenever
 * a breaking change is made to the stored results, which will cause previous
 * revisions to be discarded.
 */
const currentRevision = 1;
let BaseTestResultStorage = class BaseTestResultStorage extends Disposable {
    constructor(uriIdentityService, storageService, logService) {
        super();
        this.uriIdentityService = uriIdentityService;
        this.storageService = storageService;
        this.logService = logService;
        this.stored = this._register(new StoredValue({
            key: 'storedTestResults',
            scope: 1 /* StorageScope.WORKSPACE */,
            target: 1 /* StorageTarget.MACHINE */,
        }, this.storageService));
    }
    /**
     * @override
     */
    async read() {
        const results = await Promise.all(this.stored.get([]).map(async (rec) => {
            if (rec.rev !== currentRevision) {
                return undefined;
            }
            try {
                const contents = await this.readForResultId(rec.id);
                if (!contents) {
                    return undefined;
                }
                return { rec, result: new HydratedTestResult(this.uriIdentityService, contents) };
            }
            catch (e) {
                this.logService.warn(`Error deserializing stored test result ${rec.id}`, e);
                return undefined;
            }
        }));
        const defined = results.filter(isDefined);
        if (defined.length !== results.length) {
            this.stored.store(defined.map(({ rec }) => rec));
        }
        return defined.map(({ result }) => result);
    }
    /**
     * @override
     */
    getResultOutputWriter(resultId) {
        const stream = newWriteableBufferStream();
        this.storeOutputForResultId(resultId, stream);
        return stream;
    }
    /**
     * @override
     */
    async persist(results) {
        const toDelete = new Map(this.stored.get([]).map(({ id, bytes }) => [id, bytes]));
        const toStore = [];
        const todo = [];
        let budget = RETAIN_MAX_BYTES;
        // Run until either:
        // 1. We store all results
        // 2. We store the max results
        // 3. We store the min results, and have no more byte budget
        for (let i = 0; i < results.length &&
            i < RETAIN_MAX_RESULTS &&
            (budget > 0 || toStore.length < RETAIN_MIN_RESULTS); i++) {
            const result = results[i];
            const existingBytes = toDelete.get(result.id);
            if (existingBytes !== undefined) {
                toDelete.delete(result.id);
                toStore.push({ id: result.id, rev: currentRevision, bytes: existingBytes });
                budget -= existingBytes;
                continue;
            }
            const obj = result.toJSON();
            if (!obj) {
                continue;
            }
            const contents = VSBuffer.fromString(JSON.stringify(obj));
            todo.push(this.storeForResultId(result.id, obj));
            toStore.push({ id: result.id, rev: currentRevision, bytes: contents.byteLength });
            budget -= contents.byteLength;
        }
        for (const id of toDelete.keys()) {
            todo.push(this.deleteForResultId(id).catch(() => undefined));
        }
        this.stored.store(toStore);
        await Promise.all(todo);
    }
};
BaseTestResultStorage = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IStorageService),
    __param(2, ILogService)
], BaseTestResultStorage);
export { BaseTestResultStorage };
export class InMemoryResultStorage extends BaseTestResultStorage {
    constructor() {
        super(...arguments);
        this.cache = new Map();
    }
    async readForResultId(id) {
        return Promise.resolve(this.cache.get(id));
    }
    storeForResultId(id, contents) {
        this.cache.set(id, contents);
        return Promise.resolve();
    }
    deleteForResultId(id) {
        this.cache.delete(id);
        return Promise.resolve();
    }
    readOutputForResultId(id) {
        throw new Error('Method not implemented.');
    }
    storeOutputForResultId(id, input) {
        throw new Error('Method not implemented.');
    }
    readOutputRangeForResultId(id, offset, length) {
        throw new Error('Method not implemented.');
    }
}
let TestResultStorage = class TestResultStorage extends BaseTestResultStorage {
    constructor(uriIdentityService, storageService, logService, workspaceContext, fileService, environmentService) {
        super(uriIdentityService, storageService, logService);
        this.fileService = fileService;
        this.directory = URI.joinPath(environmentService.workspaceStorageHome, workspaceContext.getWorkspace().id, 'testResults');
    }
    async readForResultId(id) {
        const contents = await this.fileService.readFile(this.getResultJsonPath(id));
        return JSON.parse(contents.value.toString());
    }
    storeForResultId(id, contents) {
        return this.fileService.writeFile(this.getResultJsonPath(id), VSBuffer.fromString(JSON.stringify(contents)));
    }
    deleteForResultId(id) {
        return this.fileService.del(this.getResultJsonPath(id)).catch(() => undefined);
    }
    async readOutputRangeForResultId(id, offset, length) {
        try {
            const { value } = await this.fileService.readFile(this.getResultOutputPath(id), {
                position: offset,
                length,
            });
            return value;
        }
        catch {
            return VSBuffer.alloc(0);
        }
    }
    async readOutputForResultId(id) {
        try {
            const { value } = await this.fileService.readFileStream(this.getResultOutputPath(id));
            return value;
        }
        catch {
            return bufferToStream(VSBuffer.alloc(0));
        }
    }
    async storeOutputForResultId(id, input) {
        await this.fileService.createFile(this.getResultOutputPath(id), input);
    }
    /**
     * @inheritdoc
     */
    async persist(results) {
        await super.persist(results);
        if (Math.random() < CLEANUP_PROBABILITY) {
            await this.cleanupDereferenced();
        }
    }
    /**
     * Cleans up orphaned files. For instance, output can get orphaned if it's
     * written but the editor is closed before the test run is complete.
     */
    async cleanupDereferenced() {
        const { children } = await this.fileService.resolve(this.directory);
        if (!children) {
            return;
        }
        const stored = new Set(this.stored
            .get([])
            .filter((s) => s.rev === currentRevision)
            .map((s) => s.id));
        await Promise.all(children
            .filter((child) => !stored.has(child.name.replace(/\.[a-z]+$/, '')))
            .map((child) => this.fileService.del(child.resource).catch(() => undefined)));
    }
    getResultJsonPath(id) {
        return URI.joinPath(this.directory, `${id}.json`);
    }
    getResultOutputPath(id) {
        return URI.joinPath(this.directory, `${id}.output`);
    }
};
TestResultStorage = __decorate([
    __param(0, IUriIdentityService),
    __param(1, IStorageService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, IFileService),
    __param(5, IEnvironmentService)
], TestResultStorage);
export { TestResultStorage };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvY29tbW9uL3Rlc3RSZXN1bHRTdG9yYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLFFBQVEsR0FHUixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDOUMsT0FBTyxFQUFFLGtCQUFrQixFQUFlLE1BQU0saUJBQWlCLENBQUE7QUFHakUsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxDQUFBO0FBQ3JDLE1BQU0sa0JBQWtCLEdBQUcsRUFBRSxDQUFBO0FBQzdCLE1B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