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
var BrowserStorageService_1;
import { BroadcastDataChannel } from '../../../../base/browser/broadcast.js';
import { isSafari } from '../../../../base/browser/browser.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
import { IndexedDB } from '../../../../base/browser/indexedDB.js';
import { DeferredPromise, Promises } from '../../../../base/common/async.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { InMemoryStorageDatabase, isStorageItemsChangeEvent, Storage, } from '../../../../base/parts/storage/common/storage.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { AbstractStorageService, isProfileUsingDefaultStorage, IS_NEW_KEY, } from '../../../../platform/storage/common/storage.js';
import { isUserDataProfile, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
let BrowserStorageService = class BrowserStorageService extends AbstractStorageService {
    static { BrowserStorageService_1 = this; }
    static { this.BROWSER_DEFAULT_FLUSH_INTERVAL = 5 * 1000; } // every 5s because async operations are not permitted on shutdown
    get hasPendingUpdate() {
        return Boolean(this.applicationStorageDatabase?.hasPendingUpdate ||
            this.profileStorageDatabase?.hasPendingUpdate ||
            this.workspaceStorageDatabase?.hasPendingUpdate);
    }
    constructor(workspace, userDataProfileService, logService) {
        super({ flushInterval: BrowserStorageService_1.BROWSER_DEFAULT_FLUSH_INTERVAL });
        this.workspace = workspace;
        this.userDataProfileService = userDataProfileService;
        this.logService = logService;
        this.applicationStoragePromise = new DeferredPromise();
        this.profileStorageDisposables = this._register(new DisposableStore());
        this.profileStorageProfile = this.userDataProfileService.currentProfile;
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.userDataProfileService.onDidChangeCurrentProfile((e) => e.join(this.switchToProfile(e.profile))));
    }
    async doInitialize() {
        // Init storages
        await Promises.settled([
            this.createApplicationStorage(),
            this.createProfileStorage(this.profileStorageProfile),
            this.createWorkspaceStorage(),
        ]);
    }
    async createApplicationStorage() {
        const applicationStorageIndexedDB = await IndexedDBStorageDatabase.createApplicationStorage(this.logService);
        this.applicationStorageDatabase = this._register(applicationStorageIndexedDB);
        this.applicationStorage = this._register(new Storage(this.applicationStorageDatabase));
        this._register(this.applicationStorage.onDidChangeStorage((e) => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
        await this.applicationStorage.init();
        this.updateIsNew(this.applicationStorage);
        this.applicationStoragePromise.complete({
            indexedDb: applicationStorageIndexedDB,
            storage: this.applicationStorage,
        });
    }
    async createProfileStorage(profile) {
        // First clear any previously associated disposables
        this.profileStorageDisposables.clear();
        // Remember profile associated to profile storage
        this.profileStorageProfile = profile;
        if (isProfileUsingDefaultStorage(this.profileStorageProfile)) {
            // If we are using default profile storage, the profile storage is
            // actually the same as application storage. As such we
            // avoid creating the storage library a second time on
            // the same DB.
            const { indexedDb: applicationStorageIndexedDB, storage: applicationStorage } = await this.applicationStoragePromise.p;
            this.profileStorageDatabase = applicationStorageIndexedDB;
            this.profileStorage = applicationStorage;
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage((e) => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        }
        else {
            const profileStorageIndexedDB = await IndexedDBStorageDatabase.createProfileStorage(this.profileStorageProfile, this.logService);
            this.profileStorageDatabase = this.profileStorageDisposables.add(profileStorageIndexedDB);
            this.profileStorage = this.profileStorageDisposables.add(new Storage(this.profileStorageDatabase));
            this.profileStorageDisposables.add(this.profileStorage.onDidChangeStorage((e) => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
            await this.profileStorage.init();
            this.updateIsNew(this.profileStorage);
        }
    }
    async createWorkspaceStorage() {
        const workspaceStorageIndexedDB = await IndexedDBStorageDatabase.createWorkspaceStorage(this.workspace.id, this.logService);
        this.workspaceStorageDatabase = this._register(workspaceStorageIndexedDB);
        this.workspaceStorage = this._register(new Storage(this.workspaceStorageDatabase));
        this._register(this.workspaceStorage.onDidChangeStorage((e) => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        await this.workspaceStorage.init();
        this.updateIsNew(this.workspaceStorage);
    }
    updateIsNew(storage) {
        const firstOpen = storage.getBoolean(IS_NEW_KEY);
        if (firstOpen === undefined) {
            storage.set(IS_NEW_KEY, true);
        }
        else if (firstOpen) {
            storage.set(IS_NEW_KEY, false);
        }
    }
    getStorage(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorage;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorage;
            default:
                return this.workspaceStorage;
        }
    }
    getLogDetails(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationStorageDatabase?.name;
            case 0 /* StorageScope.PROFILE */:
                return this.profileStorageDatabase?.name;
            default:
                return this.workspaceStorageDatabase?.name;
        }
    }
    async switchToProfile(toProfile) {
        if (!this.canSwitchProfile(this.profileStorageProfile, toProfile)) {
            return;
        }
        const oldProfileStorage = assertIsDefined(this.profileStorage);
        const oldItems = oldProfileStorage.items;
        // Close old profile storage but only if this is
        // different from application storage!
        if (oldProfileStorage !== this.applicationStorage) {
            await oldProfileStorage.close();
        }
        // Create new profile storage & init
        await this.createProfileStorage(toProfile);
        // Handle data switch and eventing
        this.switchData(oldItems, assertIsDefined(this.profileStorage), 0 /* StorageScope.PROFILE */);
    }
    async switchToWorkspace(toWorkspace, preserveData) {
        throw new Error('Migrating storage is currently unsupported in Web');
    }
    shouldFlushWhenIdle() {
        // this flush() will potentially cause new state to be stored
        // since new state will only be created while the document
        // has focus, one optimization is to not run this when the
        // document has no focus, assuming that state has not changed
        //
        // another optimization is to not collect more state if we
        // have a pending update already running which indicates
        // that the connection is either slow or disconnected and
        // thus unhealthy.
        return getActiveWindow().document.hasFocus() && !this.hasPendingUpdate;
    }
    close() {
        // Safari: there is an issue where the page can hang on load when
        // a previous session has kept IndexedDB transactions running.
        // The only fix seems to be to cancel any pending transactions
        // (https://github.com/microsoft/vscode/issues/136295)
        //
        // On all other browsers, we keep the databases opened because
        // we expect data to be written when the unload happens.
        if (isSafari) {
            this.applicationStorage?.close();
            this.profileStorageDatabase?.close();
            this.workspaceStorageDatabase?.close();
        }
        // Always dispose to ensure that no timeouts or callbacks
        // get triggered in this phase.
        this.dispose();
    }
    async clear() {
        // Clear key/values
        for (const scope of [-1 /* StorageScope.APPLICATION */, 0 /* StorageScope.PROFILE */, 1 /* StorageScope.WORKSPACE */]) {
            for (const target of [0 /* StorageTarget.USER */, 1 /* StorageTarget.MACHINE */]) {
                for (const key of this.keys(scope, target)) {
                    this.remove(key, scope);
                }
            }
            await this.getStorage(scope)?.whenFlushed();
        }
        // Clear databases
        await Promises.settled([
            this.applicationStorageDatabase?.clear() ?? Promise.resolve(),
            this.profileStorageDatabase?.clear() ?? Promise.resolve(),
            this.workspaceStorageDatabase?.clear() ?? Promise.resolve(),
        ]);
    }
    hasScope(scope) {
        if (isUserDataProfile(scope)) {
            return this.profileStorageProfile.id === scope.id;
        }
        return this.workspace.id === scope.id;
    }
};
BrowserStorageService = BrowserStorageService_1 = __decorate([
    __param(2, ILogService)
], BrowserStorageService);
export { BrowserStorageService };
class InMemoryIndexedDBStorageDatabase extends InMemoryStorageDatabase {
    constructor() {
        super(...arguments);
        this.hasPendingUpdate = false;
        this.name = 'in-memory-indexedb-storage';
    }
    async clear() {
        ;
        (await this.getItems()).clear();
    }
    dispose() {
        // No-op
    }
}
export class IndexedDBStorageDatabase extends Disposable {
    static async createApplicationStorage(logService) {
        return IndexedDBStorageDatabase.create({ id: 'global', broadcastChanges: true }, logService);
    }
    static async createProfileStorage(profile, logService) {
        return IndexedDBStorageDatabase.create({ id: `global-${profile.id}`, broadcastChanges: true }, logService);
    }
    static async createWorkspaceStorage(workspaceId, logService) {
        return IndexedDBStorageDatabase.create({ id: workspaceId }, logService);
    }
    static async create(options, logService) {
        try {
            const database = new IndexedDBStorageDatabase(options, logService);
            await database.whenConnected;
            return database;
        }
        catch (error) {
            logService.error(`[IndexedDB Storage ${options.id}] create(): ${toErrorMessage(error, true)}`);
            return new InMemoryIndexedDBStorageDatabase();
        }
    }
    static { this.STORAGE_DATABASE_PREFIX = 'vscode-web-state-db-'; }
    static { this.STORAGE_OBJECT_STORE = 'ItemTable'; }
    get hasPendingUpdate() {
        return !!this.pendingUpdate;
    }
    constructor(options, logService) {
        super();
        this.logService = logService;
        this._onDidChangeItemsExternal = this._register(new Emitter());
        this.onDidChangeItemsExternal = this._onDidChangeItemsExternal.event;
        this.pendingUpdate = undefined;
        this.name = `${IndexedDBStorageDatabase.STORAGE_DATABASE_PREFIX}${options.id}`;
        this.broadcastChannel = options.broadcastChanges
            ? this._register(new BroadcastDataChannel(this.name))
            : undefined;
        this.whenConnected = this.connect();
        this.registerListeners();
    }
    registerListeners() {
        // Check for storage change events from other
        // windows/tabs via `BroadcastChannel` mechanisms.
        if (this.broadcastChannel) {
            this._register(this.broadcastChannel.onDidReceiveData((data) => {
                if (isStorageItemsChangeEvent(data)) {
                    this._onDidChangeItemsExternal.fire(data);
                }
            }));
        }
    }
    async connect() {
        try {
            return await IndexedDB.create(this.name, undefined, [
                IndexedDBStorageDatabase.STORAGE_OBJECT_STORE,
            ]);
        }
        catch (error) {
            this.logService.error(`[IndexedDB Storage ${this.name}] connect() error: ${toErrorMessage(error)}`);
            throw error;
        }
    }
    async getItems() {
        const db = await this.whenConnected;
        function isValid(value) {
            return typeof value === 'string';
        }
        return db.getKeyValues(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, isValid);
    }
    async updateItems(request) {
        // Run the update
        let didUpdate = false;
        this.pendingUpdate = this.doUpdateItems(request);
        try {
            didUpdate = await this.pendingUpdate;
        }
        finally {
            this.pendingUpdate = undefined;
        }
        // Broadcast changes to other windows/tabs if enabled
        // and only if we actually did update storage items.
        if (this.broadcastChannel && didUpdate) {
            const event = {
                changed: request.insert,
                deleted: request.delete,
            };
            this.broadcastChannel.postData(event);
        }
    }
    async doUpdateItems(request) {
        // Return early if the request is empty
        const toInsert = request.insert;
        const toDelete = request.delete;
        if ((!toInsert && !toDelete) || (toInsert?.size === 0 && toDelete?.size === 0)) {
            return false;
        }
        const db = await this.whenConnected;
        // Update `ItemTable` with inserts and/or deletes
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', (objectStore) => {
            const requests = [];
            // Inserts
            if (toInsert) {
                for (const [key, value] of toInsert) {
                    requests.push(objectStore.put(value, key));
                }
            }
            // Deletes
            if (toDelete) {
                for (const key of toDelete) {
                    requests.push(objectStore.delete(key));
                }
            }
            return requests;
        });
        return true;
    }
    async optimize() {
        // not suported in IndexedDB
    }
    async close() {
        const db = await this.whenConnected;
        // Wait for pending updates to having finished
        await this.pendingUpdate;
        // Finally, close IndexedDB
        return db.close();
    }
    async clear() {
        const db = await this.whenConnected;
        await db.runInTransaction(IndexedDBStorageDatabase.STORAGE_OBJECT_STORE, 'readwrite', (objectStore) => objectStore.clear());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc3RvcmFnZS9icm93c2VyL3N0b3JhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUNOLHVCQUF1QixFQUN2Qix5QkFBeUIsRUFLekIsT0FBTyxHQUNQLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsNEJBQTRCLEVBQzVCLFVBQVUsR0FHVixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUloRSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLHNCQUFz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