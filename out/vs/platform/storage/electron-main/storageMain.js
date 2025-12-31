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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZU1haW4uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zdG9yYWdlL2VsZWN0cm9uLW1haW4vc3RvcmFnZU1haW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRCxPQUFPLEVBQ04sdUJBQXVCLEVBRXZCLE9BQU8sRUFDUCxXQUFXLEVBQ1gsWUFBWSxHQUNaLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLDZDQUE2QyxDQUFBO0FBR3BELE9BQU8sRUFBZSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFLakQsT0FBTyxFQUNOLDRCQUE0QixFQUM1QiwwQkFBMEIsRUFDMUIseUJBQXlCLEdBQ3pCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUNOLGlDQUFpQyxFQUNqQyxxQkFBcUIsR0FFckIs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