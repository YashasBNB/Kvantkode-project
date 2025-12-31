/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Emitter } from '../../../../base/common/event.js';
import { URI } from '../../../../base/common/uri.js';
import { Disposable, toDisposable, DisposableStore, DisposableMap, } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
export const IWorkingCopyService = createDecorator('workingCopyService');
class WorkingCopyLeakError extends Error {
    constructor(message, stack) {
        super(message);
        this.name = 'WorkingCopyLeakError';
        this.stack = stack;
    }
}
export class WorkingCopyService extends Disposable {
    constructor() {
        super(...arguments);
        //#region Events
        this._onDidRegister = this._register(new Emitter());
        this.onDidRegister = this._onDidRegister.event;
        this._onDidUnregister = this._register(new Emitter());
        this.onDidUnregister = this._onDidUnregister.event;
        this._onDidChangeDirty = this._register(new Emitter());
        this.onDidChangeDirty = this._onDidChangeDirty.event;
        this._onDidChangeContent = this._register(new Emitter());
        this.onDidChangeContent = this._onDidChangeContent.event;
        this._onDidSave = this._register(new Emitter());
        this.onDidSave = this._onDidSave.event;
        this._workingCopies = new Set();
        this.mapResourceToWorkingCopies = new ResourceMap();
        this.mapWorkingCopyToListeners = this._register(new DisposableMap());
        this.mapLeakToCounter = new Map();
        //#endregion
    }
    //#endregion
    //#region Registry
    get workingCopies() {
        return Array.from(this._workingCopies.values());
    }
    registerWorkingCopy(workingCopy) {
        let workingCopiesForResource = this.mapResourceToWorkingCopies.get(workingCopy.resource);
        if (workingCopiesForResource?.has(workingCopy.typeId)) {
            throw new Error(`Cannot register more than one working copy with the same resource ${workingCopy.resource.toString()} and type ${workingCopy.typeId}.`);
        }
        // Registry (all)
        this._workingCopies.add(workingCopy);
        // Registry (type based)
        if (!workingCopiesForResource) {
            workingCopiesForResource = new Map();
            this.mapResourceToWorkingCopies.set(workingCopy.resource, workingCopiesForResource);
        }
        workingCopiesForResource.set(workingCopy.typeId, workingCopy);
        // Wire in Events
        const disposables = new DisposableStore();
        disposables.add(workingCopy.onDidChangeContent(() => this._onDidChangeContent.fire(workingCopy)));
        disposables.add(workingCopy.onDidChangeDirty(() => this._onDidChangeDirty.fire(workingCopy)));
        disposables.add(workingCopy.onDidSave((e) => this._onDidSave.fire({ workingCopy, ...e })));
        this.mapWorkingCopyToListeners.set(workingCopy, disposables);
        // Send some initial events
        this._onDidRegister.fire(workingCopy);
        if (workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
        // Track Leaks
        const leakId = this.trackLeaks(workingCopy);
        return toDisposable(() => {
            // Untrack Leaks
            if (leakId) {
                this.untrackLeaks(leakId);
            }
            // Unregister working copy
            this.unregisterWorkingCopy(workingCopy);
            // Signal as event
            this._onDidUnregister.fire(workingCopy);
        });
    }
    unregisterWorkingCopy(workingCopy) {
        // Registry (all)
        this._workingCopies.delete(workingCopy);
        // Registry (type based)
        const workingCopiesForResource = this.mapResourceToWorkingCopies.get(workingCopy.resource);
        if (workingCopiesForResource?.delete(workingCopy.typeId) &&
            workingCopiesForResource.size === 0) {
            this.mapResourceToWorkingCopies.delete(workingCopy.resource);
        }
        // If copy is dirty, ensure to fire an event to signal the dirty change
        // (a disposed working copy cannot account for being dirty in our model)
        if (workingCopy.isDirty()) {
            this._onDidChangeDirty.fire(workingCopy);
        }
        // Remove all listeners associated to working copy
        this.mapWorkingCopyToListeners.deleteAndDispose(workingCopy);
    }
    has(resourceOrIdentifier) {
        if (URI.isUri(resourceOrIdentifier)) {
            return this.mapResourceToWorkingCopies.has(resourceOrIdentifier);
        }
        return (this.mapResourceToWorkingCopies
            .get(resourceOrIdentifier.resource)
            ?.has(resourceOrIdentifier.typeId) ?? false);
    }
    get(identifier) {
        return this.mapResourceToWorkingCopies.get(identifier.resource)?.get(identifier.typeId);
    }
    getAll(resource) {
        const workingCopies = this.mapResourceToWorkingCopies.get(resource);
        if (!workingCopies) {
            return undefined;
        }
        return Array.from(workingCopies.values());
    }
    //#endregion
    //#region Leak Monitoring
    static { this.LEAK_TRACKING_THRESHOLD = 256; }
    static { this.LEAK_REPORTING_THRESHOLD = 2 * WorkingCopyService.LEAK_TRACKING_THRESHOLD; }
    static { this.LEAK_REPORTED = false; }
    trackLeaks(workingCopy) {
        if (WorkingCopyService.LEAK_REPORTED ||
            this._workingCopies.size < WorkingCopyService.LEAK_TRACKING_THRESHOLD) {
            return undefined;
        }
        const leakId = `${workingCopy.resource.scheme}#${workingCopy.typeId || '<no typeId>'}\n${new Error().stack?.split('\n').slice(2).join('\n') ?? ''}`;
        const leakCounter = (this.mapLeakToCounter.get(leakId) ?? 0) + 1;
        this.mapLeakToCounter.set(leakId, leakCounter);
        if (this._workingCopies.size > WorkingCopyService.LEAK_REPORTING_THRESHOLD) {
            WorkingCopyService.LEAK_REPORTED = true;
            const [topLeak, topCount] = Array.from(this.mapLeakToCounter.entries()).reduce(([topLeak, topCount], [key, val]) => (val > topCount ? [key, val] : [topLeak, topCount]));
            const message = `Potential working copy LEAK detected, having ${this._workingCopies.size} working copies already. Most frequent owner (${topCount})`;
            onUnexpectedError(new WorkingCopyLeakError(message, topLeak));
        }
        return leakId;
    }
    untrackLeaks(leakId) {
        const stackCounter = (this.mapLeakToCounter.get(leakId) ?? 1) - 1;
        this.mapLeakToCounter.set(leakId, stackCounter);
        if (stackCounter === 0) {
            this.mapLeakToCounter.delete(leakId);
        }
    }
    //#endregion
    //#region Dirty Tracking
    get hasDirty() {
        for (const workingCopy of this._workingCopies) {
            if (workingCopy.isDirty()) {
                return true;
            }
        }
        return false;
    }
    get dirtyCount() {
        let totalDirtyCount = 0;
        for (const workingCopy of this._workingCopies) {
            if (workingCopy.isDirty()) {
                totalDirtyCount++;
            }
        }
        return totalDirtyCount;
    }
    get dirtyWorkingCopies() {
        return this.workingCopies.filter((workingCopy) => workingCopy.isDirty());
    }
    get modifiedCount() {
        let totalModifiedCount = 0;
        for (const workingCopy of this._workingCopies) {
            if (workingCopy.isModified()) {
                totalModifiedCount++;
            }
        }
        return totalModifiedCount;
    }
    get modifiedWorkingCopies() {
        return this.workingCopies.filter((workingCopy) => workingCopy.isModified());
    }
    isDirty(resource, typeId) {
        const workingCopies = this.mapResourceToWorkingCopies.get(resource);
        if (workingCopies) {
            // For a specific type
            if (typeof typeId === 'string') {
                return workingCopies.get(typeId)?.isDirty() ?? false;
            }
            // Across all working copies
            else {
                for (const [, workingCopy] of workingCopies) {
                    if (workingCopy.isDirty()) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
registerSingleton(IWorkingCopyService, WorkingCopyService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3dvcmtpbmdDb3B5L2NvbW1vbi93b3JraW5nQ29weVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQVMsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFDTixVQUFVLEVBRVYsWUFBWSxFQUNaLGVBQWUsRUFDZixhQUFhLEdBQ2IsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFNNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsZUFBZSxDQUFzQixvQkFBb0IsQ0FBQyxDQUFBO0FBeUg3RixNQUFNLG9CQUFxQixTQUFRLEtBQUs7SUFDdkMsWUFBWSxPQUFlLEVBQUUsS0FBYTtRQUN6QyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFZCxJQUFJLENBQUMsSUFBSSxHQUFHLHNCQUFzQixDQUFBO1FBQ2xDLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO0lBQ25CLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxrQkFBbUIsU0FBUSxVQUFVO0lBQWxEOztRQUdDLGdCQUFnQjtRQUVDLG1CQUFjLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQyxD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