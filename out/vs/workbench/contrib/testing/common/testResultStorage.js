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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdFJlc3VsdFN0b3JhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2NvbW1vbi90ZXN0UmVzdWx0U3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUNkLHdCQUF3QixFQUN4QixRQUFRLEdBR1IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxNQUFNLGlCQUFpQixDQUFBO0FBR2pFLE1BQU0sQ0FBQyxNQUFNLGtCQUFrQixHQUFHLEdBQUcsQ0FBQTtBQUNyQyxNQUFNLGtCQUFrQixHQUFHLEVBQUUsQ0FBQTtBQUM3QixNQUFNLGdC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