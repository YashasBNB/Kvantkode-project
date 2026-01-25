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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vc3RvcmFnZS9jb21tb24vc3RvcmFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDN0YsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRixPQUFPLEVBQ04sVUFBVSxFQUVWLE9BQU8sRUFDUCxpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakUsT0FBTyxFQUNOLHVCQUF1QixFQUd2QixPQUFPLEVBQ1AsV0FBVyxHQUVYLE1BQU0sK0NBQStDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSxpREFBaUQsQ0FBQTtBQUd4RCxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcseUJBQXlCLENBQUE7QUFDbkQsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDBCQUEwQixDQUFBO0FBRXBELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUE7QUFFakYsTUFBTSxDQUFOLElBQVksbUJBVVg7QUFWRCxXQUFZLG1CQUFtQjtJQUM5Qjs7T0FFRztJQUNILDZEQUFJLENBQUE7SUFFSjs7T0FFRztJQUNILHFFQUFRLENBQUE7QUFDVCxDQUFDLEVBVlcsbUJBQW1CLEtBQW5C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