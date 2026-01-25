/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { top } from '../../../base/common/arrays.js';
import { DeferredPromise } from '../../../base/common/async.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { join } from '../../../base/common/path.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { URI } from '../../../base/common/uri.js';
import { Promises } from '../../../base/node/pfs.js';
import { InMemoryStorageDatabase, Storage, StorageHint, StorageState, } from '../../../base/parts/storage/common/storage.js';
import { SQLiteStorageDatabase, } from '../../../base/parts/storage/node/storage.js';
import { LogLevel } from '../../log/common/log.js';
import { IS_NEW_KEY } from '../common/storage.js';
import { currentSessionDateStorageKey, firstSessionDateStorageKey, lastSessionDateStorageKey, } from '../../telemetry/common/telemetry.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../workspace/common/workspace.js';
import { Schemas } from '../../../base/common/network.js';
class BaseStorageMain extends Disposable {
    static { this.LOG_SLOW_CLOSE_THRESHOLD = 2000; }
    get storage() {
        return this._storage;
    }
    constructor(logService, fileService) {
        super();
        this.logService = logService;
        this.fileService = fileService;
        this._onDidChangeStorage = this._register(new Emitter());
        this.onDidChangeStorage = this._onDidChangeStorage.event;
        this._onDidCloseStorage = this._register(new Emitter());
        this.onDidCloseStorage = this._onDidCloseStorage.event;
        this._storage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY })); // storage is in-memory until initialized
        this.initializePromise = undefined;
        this.whenInitPromise = new DeferredPromise();
        this.whenInit = this.whenInitPromise.p;
        this.state = StorageState.None;
    }
    isInMemory() {
        return this._storage.isInMemory();
    }
    init() {
        if (!this.initializePromise) {
            this.initializePromise = (async () => {
                if (this.state !== StorageState.None) {
                    return; // either closed or already initialized
                }
                try {
                    // Create storage via subclasses
                    const storage = this._register(await this.doCreate());
                    // Replace our in-memory storage with the real
                    // once as soon as possible without awaiting
                    // the init call.
                    this._storage.dispose();
                    this._storage = storage;
                    // Re-emit storage changes via event
                    this._register(storage.onDidChangeStorage((e) => this._onDidChangeStorage.fire(e)));
                    // Await storage init
                    await this.doInit(storage);
                    // Ensure we track whether storage is new or not
                    const isNewStorage = storage.getBoolean(IS_NEW_KEY);
                    if (isNewStorage === undefined) {
                        storage.set(IS_NEW_KEY, true);
                    }
                    else if (isNewStorage) {
                        storage.set(IS_NEW_KEY, false);
                    }
                }
                catch (error) {
                    this.logService.error(`[storage main] initialize(): Unable to init storage due to ${error}`);
                }
                finally {
                    // Update state
                    this.state = StorageState.Initialized;
                    // Mark init promise as completed
                    this.whenInitPromise.complete();
                }
            })();
        }
        return this.initializePromise;
    }
    createLoggingOptions() {
        return {
            logTrace: this.logService.getLevel() === LogLevel.Trace
                ? (msg) => this.logService.trace(msg)
                : undefined,
            logError: (error) => this.logService.error(error),
        };
    }
    doInit(storage) {
        return storage.init();
    }
    get items() {
        return this._storage.items;
    }
    get(key, fallbackValue) {
        return this._storage.get(key, fallbackValue);
    }
    set(key, value) {
        return this._storage.set(key, value);
    }
    delete(key) {
        return this._storage.delete(key);
    }
    optimize() {
        return this._storage.optimize();
    }
    async close() {
        // Measure how long it takes to close storage
        const watch = new StopWatch(false);
        await this.doClose();
        watch.stop();
        // If close() is taking a long time, there is
        // a chance that the underlying DB is large
        // either on disk or in general. In that case
        // log some additional info to further diagnose
        if (watch.elapsed() > BaseStorageMain.LOG_SLOW_CLOSE_THRESHOLD) {
            await this.logSlowClose(watch);
        }
        // Signal as event
        this._onDidCloseStorage.fire();
    }
    async logSlowClose(watch) {
        if (!this.path) {
            return;
        }
        try {
            const largestEntries = top(Array.from(this._storage.items.entries()).map(([key, value]) => ({
                key,
                length: value.length,
            })), (entryA, entryB) => entryB.length - entryA.length, 5)
                .map((entry) => `${entry.key}:${entry.length}`)
                .join(', ');
            const dbSize = (await this.fileService.stat(URI.file(this.path))).size;
            this.logService.warn(`[storage main] detected slow close() operation: Time: ${watch.elapsed()}ms, DB size: ${dbSize}b, Large Keys: ${largestEntries}`);
        }
        catch (error) {
            this.logService.error('[storage main] figuring out stats for slow DB on close() resulted in an error', error);
        }
    }
    async doClose() {
        // Ensure we are not accidentally leaving
        // a pending initialized storage behind in
        // case `close()` was called before `init()`
        // finishes.
        if (this.initializePromise) {
            await this.initializePromise;
        }
        // Update state
        this.state = StorageState.Closed;
        // Propagate to storage lib
        await this._storage.close();
    }
}
class BaseProfileAwareStorageMain extends BaseStorageMain {
    static { this.STORAGE_NAME = 'state.vscdb'; }
    get path() {
        if (!this.options.useInMemoryStorage) {
            return join(this.profile.globalStorageHome.with({ scheme: Schemas.file }).fsPath, BaseProfileAwareStorageMain.STORAGE_NAME);
        }
        return undefined;
    }
    constructor(profile, options, logService, fileService) {
        super(logService, fileService);
        this.profile = profile;
        this.options = options;
    }
    async doCreate() {
        return new Storage(new SQLiteStorageDatabase(this.path ?? SQLiteStorageDatabase.IN_MEMORY_PATH, {
            logging: this.createLoggingOptions(),
        }), !this.path ? { hint: StorageHint.STORAGE_IN_MEMORY } : undefined);
    }
}
export class ProfileStorageMain extends BaseProfileAwareStorageMain {
    constructor(profile, options, logService, fileService) {
        super(profile, options, logService, fileService);
    }
}
export class ApplicationStorageMain extends BaseProfileAwareStorageMain {
    constructor(options, userDataProfileService, logService, fileService) {
        super(userDataProfileService.defaultProfile, options, logService, fileService);
    }
    async doInit(storage) {
        await super.doInit(storage);
        // Apply telemetry values as part of the application storage initialization
        this.updateTelemetryState(storage);
    }
    updateTelemetryState(storage) {
        // First session date (once)
        const firstSessionDate = storage.get(firstSessionDateStorageKey, undefined);
        if (firstSessionDate === undefined) {
            storage.set(firstSessionDateStorageKey, new Date().toUTCString());
        }
        // Last / current session (always)
        // previous session date was the "current" one at that time
        // current session date is "now"
        const lastSessionDate = storage.get(currentSessionDateStorageKey, undefined);
        const currentSessionDate = new Date().toUTCString();
        storage.set(lastSessionDateStorageKey, typeof lastSessionDate === 'undefined' ? null : lastSessionDate);
        storage.set(currentSessionDateStorageKey, currentSessionDate);
    }
}
export class WorkspaceStorageMain extends BaseStorageMain {
    static { this.WORKSPACE_STORAGE_NAME = 'state.vscdb'; }
    static { this.WORKSPACE_META_NAME = 'workspace.json'; }
    get path() {
        if (!this.options.useInMemoryStorage) {
            return join(this.environmentService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath, this.workspace.id, WorkspaceStorageMain.WORKSPACE_STORAGE_NAME);
        }
        return undefined;
    }
    constructor(workspace, options, logService, environmentService, fileService) {
        super(logService, fileService);
        this.workspace = workspace;
        this.options = options;
        this.environmentService = environmentService;
    }
    async doCreate() {
        const { storageFilePath, wasCreated } = await this.prepareWorkspaceStorageFolder();
        return new Storage(new SQLiteStorageDatabase(storageFilePath, {
            logging: this.createLoggingOptions(),
        }), {
            hint: this.options.useInMemoryStorage
                ? StorageHint.STORAGE_IN_MEMORY
                : wasCreated
                    ? StorageHint.STORAGE_DOES_NOT_EXIST
                    : undefined,
        });
    }
    async prepareWorkspaceStorageFolder() {
        // Return early if using inMemory storage
        if (this.options.useInMemoryStorage) {
            return { storageFilePath: SQLiteStorageDatabase.IN_MEMORY_PATH, wasCreated: true };
        }
        // Otherwise, ensure the storage folder exists on disk
        const workspaceStorageFolderPath = join(this.environmentService.workspaceStorageHome.with({ scheme: Schemas.file }).fsPath, this.workspace.id);
        const workspaceStorageDatabasePath = join(workspaceStorageFolderPath, WorkspaceStorageMain.WORKSPACE_STORAGE_NAME);
        const storageExists = await Promises.exists(workspaceStorageFolderPath);
        if (storageExists) {
            return { storageFilePath: workspaceStorageDatabasePath, wasCreated: false };
        }
        // Ensure storage folder exists
        await fs.promises.mkdir(workspaceStorageFolderPath, { recursive: true });
        // Write metadata into folder (but do not await)
        this.ensureWorkspaceStorageFolderMeta(workspaceStorageFolderPath);
        return { storageFilePath: workspaceStorageDatabasePath, wasCreated: true };
    }
    async ensureWorkspaceStorageFolderMeta(workspaceStorageFolderPath) {
        let meta = undefined;
        if (isSingleFolderWorkspaceIdentifier(this.workspace)) {
            meta = { folder: this.workspace.uri.toString() };
        }
        else if (isWorkspaceIdentifier(this.workspace)) {
            meta = { workspace: this.workspace.configPath.toString() };
        }
        if (meta) {
            try {
                const workspaceStorageMetaPath = join(workspaceStorageFolderPath, WorkspaceStorageMain.WORKSPACE_META_NAME);
                const storageExists = await Promises.exists(workspaceStorageMetaPath);
                if (!storageExists) {
                    await Promises.writeFile(workspaceStorageMetaPath, JSON.stringify(meta, undefined, 2));
                }
            }
            catch (error) {
                this.logService.error(`[storage main] ensureWorkspaceStorageFolderMeta(): Unable to create workspace storage metadata due to ${error}`);
            }
        }
    }
}
export class InMemoryStorageMain extends BaseStorageMain {
    get path() {
        return undefined; // in-memory has no path
    }
    async doCreate() {
        return new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvZWxlY3Ryb24tbWFpbi9zdG9yYWdlTWFpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQTtBQUN4QixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDM0UsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BELE9BQU8sRUFDTix1QkFBdUIsRUFFdkIsT0FBTyxFQUNQLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSwrQ0FBK0MsQ0FBQTtBQUN0RCxPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sNkNBQTZDLENBQUE7QUFHcEQsT0FBTyxFQUFlLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUtqRCxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQix5QkFBeUIsR0FDekIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLHFCQUFxQixH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