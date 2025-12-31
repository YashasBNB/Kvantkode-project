/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Promises, RunOnceScheduler, runWhenGlobalIdle } from '../../../base/common/async.js';
import { Emitter, Event, PauseableEmitter } from '../../../base/common/event.js';
import { Disposable, dispose, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { mark } from '../../../base/common/performance.js';
import { isUndefinedOrNull } from '../../../base/common/types.js';
import { InMemoryStorageDatabase, Storage, StorageHint, } from '../../../base/parts/storage/common/storage.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { isUserDataProfile, } from '../../userDataProfile/common/userDataProfile.js';
export const IS_NEW_KEY = '__$__isNewStorageMarker';
export const TARGET_KEY = '__$__targetStorageMarker';
export const IStorageService = createDecorator('storageService');
export var WillSaveStateReason;
(function (WillSaveStateReason) {
    /**
     * No specific reason to save state.
     */
    WillSaveStateReason[WillSaveStateReason["NONE"] = 0] = "NONE";
    /**
     * A hint that the workbench is about to shutdown.
     */
    WillSaveStateReason[WillSaveStateReason["SHUTDOWN"] = 1] = "SHUTDOWN";
})(WillSaveStateReason || (WillSaveStateReason = {}));
export var StorageScope;
(function (StorageScope) {
    /**
     * The stored data will be scoped to all workspaces across all profiles.
     */
    StorageScope[StorageScope["APPLICATION"] = -1] = "APPLICATION";
    /**
     * The stored data will be scoped to all workspaces of the same profile.
     */
    StorageScope[StorageScope["PROFILE"] = 0] = "PROFILE";
    /**
     * The stored data will be scoped to the current workspace.
     */
    StorageScope[StorageScope["WORKSPACE"] = 1] = "WORKSPACE";
})(StorageScope || (StorageScope = {}));
export var StorageTarget;
(function (StorageTarget) {
    /**
     * The stored data is user specific and applies across machines.
     */
    StorageTarget[StorageTarget["USER"] = 0] = "USER";
    /**
     * The stored data is machine specific.
     */
    StorageTarget[StorageTarget["MACHINE"] = 1] = "MACHINE";
})(StorageTarget || (StorageTarget = {}));
export function loadKeyTargets(storage) {
    const keysRaw = storage.get(TARGET_KEY);
    if (keysRaw) {
        try {
            return JSON.parse(keysRaw);
        }
        catch (error) {
            // Fail gracefully
        }
    }
    return Object.create(null);
}
export class AbstractStorageService extends Disposable {
    static { this.DEFAULT_FLUSH_INTERVAL = 60 * 1000; } // every minute
    constructor(options = {
        flushInterval: AbstractStorageService.DEFAULT_FLUSH_INTERVAL,
    }) {
        super();
        this._onDidChangeValue = this._register(new PauseableEmitter());
        this._onDidChangeTarget = this._register(new PauseableEmitter());
        this.onDidChangeTarget = this._onDidChangeTarget.event;
        this._onWillSaveState = this._register(new Emitter());
        this.onWillSaveState = this._onWillSaveState.event;
        this.runFlushWhenIdle = this._register(new MutableDisposable());
        this._workspaceKeyTargets = undefined;
        this._profileKeyTargets = undefined;
        this._applicationKeyTargets = undefined;
        this.flushWhenIdleScheduler = this._register(new RunOnceScheduler(() => this.doFlushWhenIdle(), options.flushInterval));
    }
    onDidChangeValue(scope, key, disposable) {
        return Event.filter(this._onDidChangeValue.event, (e) => e.scope === scope && (key === undefined || e.key === key), disposable);
    }
    doFlushWhenIdle() {
        this.runFlushWhenIdle.value = runWhenGlobalIdle(() => {
            if (this.shouldFlushWhenIdle()) {
                this.flush();
            }
            // repeat
            this.flushWhenIdleScheduler.schedule();
        });
    }
    shouldFlushWhenIdle() {
        return true;
    }
    stopFlushWhenIdle() {
        dispose([this.runFlushWhenIdle, this.flushWhenIdleScheduler]);
    }
    initialize() {
        if (!this.initializationPromise) {
            this.initializationPromise = (async () => {
                // Init all storage locations
                mark('code/willInitStorage');
                try {
                    await this.doInitialize(); // Ask subclasses to initialize storage
                }
                finally {
                    mark('code/didInitStorage');
                }
                // On some OS we do not get enough time to persist state on shutdown (e.g. when
                // Windows restarts after applying updates). In other cases, VSCode might crash,
                // so we periodically save state to reduce the chance of loosing any state.
                // In the browser we do not have support for long running unload sequences. As such,
                // we cannot ask for saving state in that moment, because that would result in a
                // long running operation.
                // Instead, periodically ask customers to save save. The library will be clever enough
                // to only save state that has actually changed.
                this.flushWhenIdleScheduler.schedule();
            })();
        }
        return this.initializationPromise;
    }
    emitDidChangeValue(scope, event) {
        const { key, external } = event;
        // Specially handle `TARGET_KEY`
        if (key === TARGET_KEY) {
            // Clear our cached version which is now out of date
            switch (scope) {
                case -1 /* StorageScope.APPLICATION */:
                    this._applicationKeyTargets = undefined;
                    break;
                case 0 /* StorageScope.PROFILE */:
                    this._profileKeyTargets = undefined;
                    break;
                case 1 /* StorageScope.WORKSPACE */:
                    this._workspaceKeyTargets = undefined;
                    break;
            }
            // Emit as `didChangeTarget` event
            this._onDidChangeTarget.fire({ scope });
        }
        // Emit any other key to outside
        else {
            this._onDidChangeValue.fire({ scope, key, target: this.getKeyTargets(scope)[key], external });
        }
    }
    emitWillSaveState(reason) {
        this._onWillSaveState.fire({ reason });
    }
    get(key, scope, fallbackValue) {
        return this.getStorage(scope)?.get(key, fallbackValue);
    }
    getBoolean(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getBoolean(key, fallbackValue);
    }
    getNumber(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getNumber(key, fallbackValue);
    }
    getObject(key, scope, fallbackValue) {
        return this.getStorage(scope)?.getObject(key, fallbackValue);
    }
    storeAll(entries, external) {
        this.withPausedEmitters(() => {
            for (const entry of entries) {
                this.store(entry.key, entry.value, entry.scope, entry.target, external);
            }
        });
    }
    store(key, value, scope, target, external = false) {
        // We remove the key for undefined/null values
        if (isUndefinedOrNull(value)) {
            this.remove(key, scope, external);
            return;
        }
        // Update our datastructures but send events only after
        this.withPausedEmitters(() => {
            // Update key-target map
            this.updateKeyTarget(key, scope, target);
            // Store actual value
            this.getStorage(scope)?.set(key, value, external);
        });
    }
    remove(key, scope, external = false) {
        // Update our datastructures but send events only after
        this.withPausedEmitters(() => {
            // Update key-target map
            this.updateKeyTarget(key, scope, undefined);
            // Remove actual key
            this.getStorage(scope)?.delete(key, external);
        });
    }
    withPausedEmitters(fn) {
        // Pause emitters
        this._onDidChangeValue.pause();
        this._onDidChangeTarget.pause();
        try {
            fn();
        }
        finally {
            // Resume emitters
            this._onDidChangeValue.resume();
            this._onDidChangeTarget.resume();
        }
    }
    keys(scope, target) {
        const keys = [];
        const keyTargets = this.getKeyTargets(scope);
        for (const key of Object.keys(keyTargets)) {
            const keyTarget = keyTargets[key];
            if (keyTarget === target) {
                keys.push(key);
            }
        }
        return keys;
    }
    updateKeyTarget(key, scope, target, external = false) {
        // Add
        const keyTargets = this.getKeyTargets(scope);
        if (typeof target === 'number') {
            if (keyTargets[key] !== target) {
                keyTargets[key] = target;
                this.getStorage(scope)?.set(TARGET_KEY, JSON.stringify(keyTargets), external);
            }
        }
        // Remove
        else {
            if (typeof keyTargets[key] === 'number') {
                delete keyTargets[key];
                this.getStorage(scope)?.set(TARGET_KEY, JSON.stringify(keyTargets), external);
            }
        }
    }
    get workspaceKeyTargets() {
        if (!this._workspaceKeyTargets) {
            this._workspaceKeyTargets = this.loadKeyTargets(1 /* StorageScope.WORKSPACE */);
        }
        return this._workspaceKeyTargets;
    }
    get profileKeyTargets() {
        if (!this._profileKeyTargets) {
            this._profileKeyTargets = this.loadKeyTargets(0 /* StorageScope.PROFILE */);
        }
        return this._profileKeyTargets;
    }
    get applicationKeyTargets() {
        if (!this._applicationKeyTargets) {
            this._applicationKeyTargets = this.loadKeyTargets(-1 /* StorageScope.APPLICATION */);
        }
        return this._applicationKeyTargets;
    }
    getKeyTargets(scope) {
        switch (scope) {
            case -1 /* StorageScope.APPLICATION */:
                return this.applicationKeyTargets;
            case 0 /* StorageScope.PROFILE */:
                return this.profileKeyTargets;
            default:
                return this.workspaceKeyTargets;
        }
    }
    loadKeyTargets(scope) {
        const storage = this.getStorage(scope);
        return storage ? loadKeyTargets(storage) : Object.create(null);
    }
    isNew(scope) {
        return this.getBoolean(IS_NEW_KEY, scope) === true;
    }
    async flush(reason = WillSaveStateReason.NONE) {
        // Signal event to collect changes
        this._onWillSaveState.fire({ reason });
        const applicationStorage = this.getStorage(-1 /* StorageScope.APPLICATION */);
        const profileStorage = this.getStorage(0 /* StorageScope.PROFILE */);
        const workspaceStorage = this.getStorage(1 /* StorageScope.WORKSPACE */);
        switch (reason) {
            // Unspecific reason: just wait when data is flushed
            case WillSaveStateReason.NONE:
                await Promises.settled([
                    applicationStorage?.whenFlushed() ?? Promise.resolve(),
                    profileStorage?.whenFlushed() ?? Promise.resolve(),
                    workspaceStorage?.whenFlushed() ?? Promise.resolve(),
                ]);
                break;
            // Shutdown: we want to flush as soon as possible
            // and not hit any delays that might be there
            case WillSaveStateReason.SHUTDOWN:
                await Promises.settled([
                    applicationStorage?.flush(0) ?? Promise.resolve(),
                    profileStorage?.flush(0) ?? Promise.resolve(),
                    workspaceStorage?.flush(0) ?? Promise.resolve(),
                ]);
                break;
        }
    }
    async log() {
        const applicationItems = this.getStorage(-1 /* StorageScope.APPLICATION */)?.items ?? new Map();
        const profileItems = this.getStorage(0 /* StorageScope.PROFILE */)?.items ?? new Map();
        const workspaceItems = this.getStorage(1 /* StorageScope.WORKSPACE */)?.items ?? new Map();
        return logStorage(applicationItems, profileItems, workspaceItems, this.getLogDetails(-1 /* StorageScope.APPLICATION */) ?? '', this.getLogDetails(0 /* StorageScope.PROFILE */) ?? '', this.getLogDetails(1 /* StorageScope.WORKSPACE */) ?? '');
    }
    async optimize(scope) {
        // Await pending data to be flushed to the DB
        // before attempting to optimize the DB
        await this.flush();
        return this.getStorage(scope)?.optimize();
    }
    async switch(to, preserveData) {
        // Signal as event so that clients can store data before we switch
        this.emitWillSaveState(WillSaveStateReason.NONE);
        if (isUserDataProfile(to)) {
            return this.switchToProfile(to, preserveData);
        }
        return this.switchToWorkspace(to, preserveData);
    }
    canSwitchProfile(from, to) {
        if (from.id === to.id) {
            return false; // both profiles are same
        }
        if (isProfileUsingDefaultStorage(to) && isProfileUsingDefaultStorage(from)) {
            return false; // both profiles are using default
        }
        return true;
    }
    switchData(oldStorage, newStorage, scope) {
        this.withPausedEmitters(() => {
            // Signal storage keys that have changed
            const handledkeys = new Set();
            for (const [key, oldValue] of oldStorage) {
                handledkeys.add(key);
                const newValue = newStorage.get(key);
                if (newValue !== oldValue) {
                    this.emitDidChangeValue(scope, { key, external: true });
                }
            }
            for (const [key] of newStorage.items) {
                if (!handledkeys.has(key)) {
                    this.emitDidChangeValue(scope, { key, external: true });
                }
            }
        });
    }
}
export function isProfileUsingDefaultStorage(profile) {
    return profile.isDefault || !!profile.useDefaultFlags?.globalState;
}
export class InMemoryStorageService extends AbstractStorageService {
    constructor() {
        super();
        this.applicationStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this.profileStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this.workspaceStorage = this._register(new Storage(new InMemoryStorageDatabase(), { hint: StorageHint.STORAGE_IN_MEMORY }));
        this._register(this.workspaceStorage.onDidChangeStorage((e) => this.emitDidChangeValue(1 /* StorageScope.WORKSPACE */, e)));
        this._register(this.profileStorage.onDidChangeStorage((e) => this.emitDidChangeValue(0 /* StorageScope.PROFILE */, e)));
        this._register(this.applicationStorage.onDidChangeStorage((e) => this.emitDidChangeValue(-1 /* StorageScope.APPLICATION */, e)));
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
                return 'inMemory (application)';
            case 0 /* StorageScope.PROFILE */:
                return 'inMemory (profile)';
            default:
                return 'inMemory (workspace)';
        }
    }
    async doInitialize() { }
    async switchToProfile() {
        // no-op when in-memory
    }
    async switchToWorkspace() {
        // no-op when in-memory
    }
    shouldFlushWhenIdle() {
        return false;
    }
    hasScope(scope) {
        return false;
    }
}
export async function logStorage(application, profile, workspace, applicationPath, profilePath, workspacePath) {
    const safeParse = (value) => {
        try {
            return JSON.parse(value);
        }
        catch (error) {
            return value;
        }
    };
    const applicationItems = new Map();
    const applicationItemsParsed = new Map();
    application.forEach((value, key) => {
        applicationItems.set(key, value);
        applicationItemsParsed.set(key, safeParse(value));
    });
    const profileItems = new Map();
    const profileItemsParsed = new Map();
    profile.forEach((value, key) => {
        profileItems.set(key, value);
        profileItemsParsed.set(key, safeParse(value));
    });
    const workspaceItems = new Map();
    const workspaceItemsParsed = new Map();
    workspace.forEach((value, key) => {
        workspaceItems.set(key, value);
        workspaceItemsParsed.set(key, safeParse(value));
    });
    if (applicationPath !== profilePath) {
        console.group(`Storage: Application (path: ${applicationPath})`);
    }
    else {
        console.group(`Storage: Application & Profile (path: ${applicationPath}, default profile)`);
    }
    const applicationValues = [];
    applicationItems.forEach((value, key) => {
        applicationValues.push({ key, value });
    });
    console.table(applicationValues);
    console.groupEnd();
    console.log(applicationItemsParsed);
    if (applicationPath !== profilePath) {
        console.group(`Storage: Profile (path: ${profilePath}, profile specific)`);
        const profileValues = [];
        profileItems.forEach((value, key) => {
            profileValues.push({ key, value });
        });
        console.table(profileValues);
        console.groupEnd();
        console.log(profileItemsParsed);
    }
    console.group(`Storage: Workspace (path: ${workspacePath})`);
    const workspaceValues = [];
    workspaceItems.forEach((value, key) => {
        workspaceValues.push({ key, value });
    });
    console.table(workspaceValues);
    console.groupEnd();
    console.log(workspaceItemsParsed);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3N0b3JhZ2UvY29tbW9uL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEYsT0FBTyxFQUNOLFVBQVUsRUFFVixPQUFPLEVBQ1AsaUJBQWlCLEdBQ2pCLE1BQU0sbUNBQW1DLENBQUE7QUFDMUMsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFDTix1QkFBdUIsRUFHdkIsT0FBTyxFQUNQLFdBQVcsR0FFWCxNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0saURBQWlELENBQUE7QUFHeEQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLHlCQUF5QixDQUFBO0FBQ25ELE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRywwQkFBMEIsQ0FBQTtBQUVwRCxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFrQixnQkFBZ0IsQ0FBQyxDQUFBO0FBRWpGLE1BQU0sQ0FBTixJQUFZLG1CQVVYO0FBVkQsV0FBWSxtQkFBbUI7SUFDOUI7O09BRUc7SUFDSCw2REFBSSxDQUFBO0lBRUo7O09BRUc7SUFDSCxxRUFBUSxDQUFBO0FBQ1QsQ0FBQyxFQVZXLG1CQUFtQixLQUFuQixtQkFB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