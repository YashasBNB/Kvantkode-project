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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUNOLFVBQVUsRUFFVixZQUFZLEVBQ1osZUFBZSxFQUNmLGFBQWEsR0FDYixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU01RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLG9CQUFvQixDQUFDLENBQUE7QUF5SDdGLE1BQU0sb0JBQXFCLFNBQVEsS0FBSztJQUN2QyxZQUFZLE9BQWUsRUFBRSxLQUFhO1FBQ3pDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVkLElBQUksQ0FBQyxJQUFJLEdBQUcsc0JBQXNCLENBQUE7UUFDbEMsSUFBSSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUE7SUFDbkIsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGtCQUFtQixTQUFRLFVBQVU7SUFBbEQ7O1FBR0MsZ0JBQWdCO1FBRUMsbUJBQWMsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFnQixD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