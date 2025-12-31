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
import { onUnexpectedError } from '../../../base/common/errors.js';
import { Disposable, isDisposable } from '../../../base/common/lifecycle.js';
import { Schemas } from '../../../base/common/network.js';
import Severity from '../../../base/common/severity.js';
import * as nls from '../../../nls.js';
import { IDialogService } from '../../dialogs/common/dialogs.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { INotificationService } from '../../notification/common/notification.js';
import { IUndoRedoService, ResourceEditStackSnapshot, UndoRedoGroup, UndoRedoSource, } from './undoRedo.js';
const DEBUG = false;
function getResourceLabel(resource) {
    return resource.scheme === Schemas.file ? resource.fsPath : resource.path;
}
let stackElementCounter = 0;
class ResourceStackElement {
    constructor(actual, resourceLabel, strResource, groupId, groupOrder, sourceId, sourceOrder) {
        this.id = ++stackElementCounter;
        this.type = 0 /* UndoRedoElementType.Resource */;
        this.actual = actual;
        this.label = actual.label;
        this.confirmBeforeUndo = actual.confirmBeforeUndo || false;
        this.resourceLabel = resourceLabel;
        this.strResource = strResource;
        this.resourceLabels = [this.resourceLabel];
        this.strResources = [this.strResource];
        this.groupId = groupId;
        this.groupOrder = groupOrder;
        this.sourceId = sourceId;
        this.sourceOrder = sourceOrder;
        this.isValid = true;
    }
    setValid(isValid) {
        this.isValid = isValid;
    }
    toString() {
        return `[id:${this.id}] [group:${this.groupId}] [${this.isValid ? '  VALID' : 'INVALID'}] ${this.actual.constructor.name} - ${this.actual}`;
    }
}
var RemovedResourceReason;
(function (RemovedResourceReason) {
    RemovedResourceReason[RemovedResourceReason["ExternalRemoval"] = 0] = "ExternalRemoval";
    RemovedResourceReason[RemovedResourceReason["NoParallelUniverses"] = 1] = "NoParallelUniverses";
})(RemovedResourceReason || (RemovedResourceReason = {}));
class ResourceReasonPair {
    constructor(resourceLabel, reason) {
        this.resourceLabel = resourceLabel;
        this.reason = reason;
    }
}
class RemovedResources {
    constructor() {
        this.elements = new Map();
    }
    createMessage() {
        const externalRemoval = [];
        const noParallelUniverses = [];
        for (const [, element] of this.elements) {
            const dest = element.reason === 0 /* RemovedResourceReason.ExternalRemoval */
                ? externalRemoval
                : noParallelUniverses;
            dest.push(element.resourceLabel);
        }
        const messages = [];
        if (externalRemoval.length > 0) {
            messages.push(nls.localize({ key: 'externalRemoval', comment: ['{0} is a list of filenames'] }, 'The following files have been closed and modified on disk: {0}.', externalRemoval.join(', ')));
        }
        if (noParallelUniverses.length > 0) {
            messages.push(nls.localize({ key: 'noParallelUniverses', comment: ['{0} is a list of filenames'] }, 'The following files have been modified in an incompatible way: {0}.', noParallelUniverses.join(', ')));
        }
        return messages.join('\n');
    }
    get size() {
        return this.elements.size;
    }
    has(strResource) {
        return this.elements.has(strResource);
    }
    set(strResource, value) {
        this.elements.set(strResource, value);
    }
    delete(strResource) {
        return this.elements.delete(strResource);
    }
}
class WorkspaceStackElement {
    constructor(actual, resourceLabels, strResources, groupId, groupOrder, sourceId, sourceOrder) {
        this.id = ++stackElementCounter;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this.actual = actual;
        this.label = actual.label;
        this.confirmBeforeUndo = actual.confirmBeforeUndo || false;
        this.resourceLabels = resourceLabels;
        this.strResources = strResources;
        this.groupId = groupId;
        this.groupOrder = groupOrder;
        this.sourceId = sourceId;
        this.sourceOrder = sourceOrder;
        this.removedResources = null;
        this.invalidatedResources = null;
    }
    canSplit() {
        return typeof this.actual.split === 'function';
    }
    removeResource(resourceLabel, strResource, reason) {
        if (!this.removedResources) {
            this.removedResources = new RemovedResources();
        }
        if (!this.removedResources.has(strResource)) {
            this.removedResources.set(strResource, new ResourceReasonPair(resourceLabel, reason));
        }
    }
    setValid(resourceLabel, strResource, isValid) {
        if (isValid) {
            if (this.invalidatedResources) {
                this.invalidatedResources.delete(strResource);
                if (this.invalidatedResources.size === 0) {
                    this.invalidatedResources = null;
                }
            }
        }
        else {
            if (!this.invalidatedResources) {
                this.invalidatedResources = new RemovedResources();
            }
            if (!this.invalidatedResources.has(strResource)) {
                this.invalidatedResources.set(strResource, new ResourceReasonPair(resourceLabel, 0 /* RemovedResourceReason.ExternalRemoval */));
            }
        }
    }
    toString() {
        return `[id:${this.id}] [group:${this.groupId}] [${this.invalidatedResources ? 'INVALID' : '  VALID'}] ${this.actual.constructor.name} - ${this.actual}`;
    }
}
class ResourceEditStack {
    constructor(resourceLabel, strResource) {
        this.resourceLabel = resourceLabel;
        this.strResource = strResource;
        this._past = [];
        this._future = [];
        this.locked = false;
        this.versionId = 1;
    }
    dispose() {
        for (const element of this._past) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        for (const element of this._future) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        this.versionId++;
    }
    toString() {
        const result = [];
        result.push(`* ${this.strResource}:`);
        for (let i = 0; i < this._past.length; i++) {
            result.push(`   * [UNDO] ${this._past[i]}`);
        }
        for (let i = this._future.length - 1; i >= 0; i--) {
            result.push(`   * [REDO] ${this._future[i]}`);
        }
        return result.join('\n');
    }
    flushAllElements() {
        this._past = [];
        this._future = [];
        this.versionId++;
    }
    setElementsIsValid(isValid) {
        for (const element of this._past) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.setValid(this.resourceLabel, this.strResource, isValid);
            }
            else {
                element.setValid(isValid);
            }
        }
        for (const element of this._future) {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.setValid(this.resourceLabel, this.strResource, isValid);
            }
            else {
                element.setValid(isValid);
            }
        }
    }
    _setElementValidFlag(element, isValid) {
        if (element.type === 1 /* UndoRedoElementType.Workspace */) {
            element.setValid(this.resourceLabel, this.strResource, isValid);
        }
        else {
            element.setValid(isValid);
        }
    }
    setElementsValidFlag(isValid, filter) {
        for (const element of this._past) {
            if (filter(element.actual)) {
                this._setElementValidFlag(element, isValid);
            }
        }
        for (const element of this._future) {
            if (filter(element.actual)) {
                this._setElementValidFlag(element, isValid);
            }
        }
    }
    pushElement(element) {
        // remove the future
        for (const futureElement of this._future) {
            if (futureElement.type === 1 /* UndoRedoElementType.Workspace */) {
                futureElement.removeResource(this.resourceLabel, this.strResource, 1 /* RemovedResourceReason.NoParallelUniverses */);
            }
        }
        this._future = [];
        this._past.push(element);
        this.versionId++;
    }
    createSnapshot(resource) {
        const elements = [];
        for (let i = 0, len = this._past.length; i < len; i++) {
            elements.push(this._past[i].id);
        }
        for (let i = this._future.length - 1; i >= 0; i--) {
            elements.push(this._future[i].id);
        }
        return new ResourceEditStackSnapshot(resource, elements);
    }
    restoreSnapshot(snapshot) {
        const snapshotLength = snapshot.elements.length;
        let isOK = true;
        let snapshotIndex = 0;
        let removePastAfter = -1;
        for (let i = 0, len = this._past.length; i < len; i++, snapshotIndex++) {
            const element = this._past[i];
            if (isOK &&
                (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
                isOK = false;
                removePastAfter = 0;
            }
            if (!isOK && element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        let removeFutureBefore = -1;
        for (let i = this._future.length - 1; i >= 0; i--, snapshotIndex++) {
            const element = this._future[i];
            if (isOK &&
                (snapshotIndex >= snapshotLength || element.id !== snapshot.elements[snapshotIndex])) {
                isOK = false;
                removeFutureBefore = i;
            }
            if (!isOK && element.type === 1 /* UndoRedoElementType.Workspace */) {
                element.removeResource(this.resourceLabel, this.strResource, 0 /* RemovedResourceReason.ExternalRemoval */);
            }
        }
        if (removePastAfter !== -1) {
            this._past = this._past.slice(0, removePastAfter);
        }
        if (removeFutureBefore !== -1) {
            this._future = this._future.slice(removeFutureBefore + 1);
        }
        this.versionId++;
    }
    getElements() {
        const past = [];
        const future = [];
        for (const element of this._past) {
            past.push(element.actual);
        }
        for (const element of this._future) {
            future.push(element.actual);
        }
        return { past, future };
    }
    getClosestPastElement() {
        if (this._past.length === 0) {
            return null;
        }
        return this._past[this._past.length - 1];
    }
    getSecondClosestPastElement() {
        if (this._past.length < 2) {
            return null;
        }
        return this._past[this._past.length - 2];
    }
    getClosestFutureElement() {
        if (this._future.length === 0) {
            return null;
        }
        return this._future[this._future.length - 1];
    }
    hasPastElements() {
        return this._past.length > 0;
    }
    hasFutureElements() {
        return this._future.length > 0;
    }
    splitPastWorkspaceElement(toRemove, individualMap) {
        for (let j = this._past.length - 1; j >= 0; j--) {
            if (this._past[j] === toRemove) {
                if (individualMap.has(this.strResource)) {
                    // gets replaced
                    this._past[j] = individualMap.get(this.strResource);
                }
                else {
                    // gets deleted
                    this._past.splice(j, 1);
                }
                break;
            }
        }
        this.versionId++;
    }
    splitFutureWorkspaceElement(toRemove, individualMap) {
        for (let j = this._future.length - 1; j >= 0; j--) {
            if (this._future[j] === toRemove) {
                if (individualMap.has(this.strResource)) {
                    // gets replaced
                    this._future[j] = individualMap.get(this.strResource);
                }
                else {
                    // gets deleted
                    this._future.splice(j, 1);
                }
                break;
            }
        }
        this.versionId++;
    }
    moveBackward(element) {
        this._past.pop();
        this._future.push(element);
        this.versionId++;
    }
    moveForward(element) {
        this._future.pop();
        this._past.push(element);
        this.versionId++;
    }
}
class EditStackSnapshot {
    constructor(editStacks) {
        this.editStacks = editStacks;
        this._versionIds = [];
        for (let i = 0, len = this.editStacks.length; i < len; i++) {
            this._versionIds[i] = this.editStacks[i].versionId;
        }
    }
    isValid() {
        for (let i = 0, len = this.editStacks.length; i < len; i++) {
            if (this._versionIds[i] !== this.editStacks[i].versionId) {
                return false;
            }
        }
        return true;
    }
}
const missingEditStack = new ResourceEditStack('', '');
missingEditStack.locked = true;
let UndoRedoService = class UndoRedoService {
    constructor(_dialogService, _notificationService) {
        this._dialogService = _dialogService;
        this._notificationService = _notificationService;
        this._editStacks = new Map();
        this._uriComparisonKeyComputers = [];
    }
    registerUriComparisonKeyComputer(scheme, uriComparisonKeyComputer) {
        this._uriComparisonKeyComputers.push([scheme, uriComparisonKeyComputer]);
        return {
            dispose: () => {
                for (let i = 0, len = this._uriComparisonKeyComputers.length; i < len; i++) {
                    if (this._uriComparisonKeyComputers[i][1] === uriComparisonKeyComputer) {
                        this._uriComparisonKeyComputers.splice(i, 1);
                        return;
                    }
                }
            },
        };
    }
    getUriComparisonKey(resource) {
        for (const uriComparisonKeyComputer of this._uriComparisonKeyComputers) {
            if (uriComparisonKeyComputer[0] === resource.scheme) {
                return uriComparisonKeyComputer[1].getComparisonKey(resource);
            }
        }
        return resource.toString();
    }
    _print(label) {
        console.log(`------------------------------------`);
        console.log(`AFTER ${label}: `);
        const str = [];
        for (const element of this._editStacks) {
            str.push(element[1].toString());
        }
        console.log(str.join('\n'));
    }
    pushElement(element, group = UndoRedoGroup.None, source = UndoRedoSource.None) {
        if (element.type === 0 /* UndoRedoElementType.Resource */) {
            const resourceLabel = getResourceLabel(element.resource);
            const strResource = this.getUriComparisonKey(element.resource);
            this._pushElement(new ResourceStackElement(element, resourceLabel, strResource, group.id, group.nextOrder(), source.id, source.nextOrder()));
        }
        else {
            const seen = new Set();
            const resourceLabels = [];
            const strResources = [];
            for (const resource of element.resources) {
                const resourceLabel = getResourceLabel(resource);
                const strResource = this.getUriComparisonKey(resource);
                if (seen.has(strResource)) {
                    continue;
                }
                seen.add(strResource);
                resourceLabels.push(resourceLabel);
                strResources.push(strResource);
            }
            if (resourceLabels.length === 1) {
                this._pushElement(new ResourceStackElement(element, resourceLabels[0], strResources[0], group.id, group.nextOrder(), source.id, source.nextOrder()));
            }
            else {
                this._pushElement(new WorkspaceStackElement(element, resourceLabels, strResources, group.id, group.nextOrder(), source.id, source.nextOrder()));
            }
        }
        if (DEBUG) {
            this._print('pushElement');
        }
    }
    _pushElement(element) {
        for (let i = 0, len = element.strResources.length; i < len; i++) {
            const resourceLabel = element.resourceLabels[i];
            const strResource = element.strResources[i];
            let editStack;
            if (this._editStacks.has(strResource)) {
                editStack = this._editStacks.get(strResource);
            }
            else {
                editStack = new ResourceEditStack(resourceLabel, strResource);
                this._editStacks.set(strResource, editStack);
            }
            editStack.pushElement(element);
        }
    }
    getLastElement(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            if (editStack.hasFutureElements()) {
                return null;
            }
            const closestPastElement = editStack.getClosestPastElement();
            return closestPastElement ? closestPastElement.actual : null;
        }
        return null;
    }
    _splitPastWorkspaceElement(toRemove, ignoreResources) {
        const individualArr = toRemove.actual.split();
        const individualMap = new Map();
        for (const _element of individualArr) {
            const resourceLabel = getResourceLabel(_element.resource);
            const strResource = this.getUriComparisonKey(_element.resource);
            const element = new ResourceStackElement(_element, resourceLabel, strResource, 0, 0, 0, 0);
            individualMap.set(element.strResource, element);
        }
        for (const strResource of toRemove.strResources) {
            if (ignoreResources && ignoreResources.has(strResource)) {
                continue;
            }
            const editStack = this._editStacks.get(strResource);
            editStack.splitPastWorkspaceElement(toRemove, individualMap);
        }
    }
    _splitFutureWorkspaceElement(toRemove, ignoreResources) {
        const individualArr = toRemove.actual.split();
        const individualMap = new Map();
        for (const _element of individualArr) {
            const resourceLabel = getResourceLabel(_element.resource);
            const strResource = this.getUriComparisonKey(_element.resource);
            const element = new ResourceStackElement(_element, resourceLabel, strResource, 0, 0, 0, 0);
            individualMap.set(element.strResource, element);
        }
        for (const strResource of toRemove.strResources) {
            if (ignoreResources && ignoreResources.has(strResource)) {
                continue;
            }
            const editStack = this._editStacks.get(strResource);
            editStack.splitFutureWorkspaceElement(toRemove, individualMap);
        }
    }
    removeElements(resource) {
        const strResource = typeof resource === 'string' ? resource : this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.dispose();
            this._editStacks.delete(strResource);
        }
        if (DEBUG) {
            this._print('removeElements');
        }
    }
    setElementsValidFlag(resource, isValid, filter) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.setElementsValidFlag(isValid, filter);
        }
        if (DEBUG) {
            this._print('setElementsValidFlag');
        }
    }
    hasElements(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.hasPastElements() || editStack.hasFutureElements();
        }
        return false;
    }
    createSnapshot(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.createSnapshot(resource);
        }
        return new ResourceEditStackSnapshot(resource, []);
    }
    restoreSnapshot(snapshot) {
        const strResource = this.getUriComparisonKey(snapshot.resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            editStack.restoreSnapshot(snapshot);
            if (!editStack.hasPastElements() && !editStack.hasFutureElements()) {
                // the edit stack is now empty, just remove it entirely
                editStack.dispose();
                this._editStacks.delete(strResource);
            }
        }
        if (DEBUG) {
            this._print('restoreSnapshot');
        }
    }
    getElements(resource) {
        const strResource = this.getUriComparisonKey(resource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.getElements();
        }
        return { past: [], future: [] };
    }
    _findClosestUndoElementWithSource(sourceId) {
        if (!sourceId) {
            return [null, null];
        }
        // find an element with the sourceId and with the highest sourceOrder ready to be undone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestPastElement();
            if (!candidate) {
                continue;
            }
            if (candidate.sourceId === sourceId) {
                if (!matchedElement || candidate.sourceOrder > matchedElement.sourceOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    canUndo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestUndoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? true : false;
        }
        const strResource = this.getUriComparisonKey(resourceOrSource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.hasPastElements();
        }
        return false;
    }
    _onError(err, element) {
        onUnexpectedError(err);
        // An error occurred while undoing or redoing => drop the undo/redo stack for all affected resources
        for (const strResource of element.strResources) {
            this.removeElements(strResource);
        }
        this._notificationService.error(err);
    }
    _acquireLocks(editStackSnapshot) {
        // first, check if all locks can be acquired
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                throw new Error('Cannot acquire edit stack lock');
            }
        }
        // can acquire all locks
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.locked = true;
        }
        return () => {
            // release all locks
            for (const editStack of editStackSnapshot.editStacks) {
                editStack.locked = false;
            }
        };
    }
    _safeInvokeWithLocks(element, invoke, editStackSnapshot, cleanup, continuation) {
        const releaseLocks = this._acquireLocks(editStackSnapshot);
        let result;
        try {
            result = invoke();
        }
        catch (err) {
            releaseLocks();
            cleanup.dispose();
            return this._onError(err, element);
        }
        if (result) {
            // result is Promise<void>
            return result.then(() => {
                releaseLocks();
                cleanup.dispose();
                return continuation();
            }, (err) => {
                releaseLocks();
                cleanup.dispose();
                return this._onError(err, element);
            });
        }
        else {
            // result is void
            releaseLocks();
            cleanup.dispose();
            return continuation();
        }
    }
    async _invokeWorkspacePrepare(element) {
        if (typeof element.actual.prepareUndoRedo === 'undefined') {
            return Disposable.None;
        }
        const result = element.actual.prepareUndoRedo();
        if (typeof result === 'undefined') {
            return Disposable.None;
        }
        return result;
    }
    _invokeResourcePrepare(element, callback) {
        if (element.actual.type !== 1 /* UndoRedoElementType.Workspace */ ||
            typeof element.actual.prepareUndoRedo === 'undefined') {
            // no preparation needed
            return callback(Disposable.None);
        }
        const r = element.actual.prepareUndoRedo();
        if (!r) {
            // nothing to clean up
            return callback(Disposable.None);
        }
        if (isDisposable(r)) {
            return callback(r);
        }
        return r.then((disposable) => {
            return callback(disposable);
        });
    }
    _getAffectedEditStacks(element) {
        const affectedEditStacks = [];
        for (const strResource of element.strResources) {
            affectedEditStacks.push(this._editStacks.get(strResource) || missingEditStack);
        }
        return new EditStackSnapshot(affectedEditStacks);
    }
    _tryToSplitAndUndo(strResource, element, ignoreResources, message) {
        if (element.canSplit()) {
            this._splitPastWorkspaceElement(element, ignoreResources);
            this._notificationService.warn(message);
            return new WorkspaceVerificationError(this._undo(strResource, 0, true));
        }
        else {
            // Cannot safely split this workspace element => flush all undo/redo stacks
            for (const strResource of element.strResources) {
                this.removeElements(strResource);
            }
            this._notificationService.warn(message);
            return new WorkspaceVerificationError();
        }
    }
    _checkWorkspaceUndo(strResource, element, editStackSnapshot, checkInvalidatedResources) {
        if (element.removedResources) {
            return this._tryToSplitAndUndo(strResource, element, element.removedResources, nls.localize({
                key: 'cannotWorkspaceUndo',
                comment: ['{0} is a label for an operation. {1} is another message.'],
            }, "Could not undo '{0}' across all files. {1}", element.label, element.removedResources.createMessage()));
        }
        if (checkInvalidatedResources && element.invalidatedResources) {
            return this._tryToSplitAndUndo(strResource, element, element.invalidatedResources, nls.localize({
                key: 'cannotWorkspaceUndo',
                comment: ['{0} is a label for an operation. {1} is another message.'],
            }, "Could not undo '{0}' across all files. {1}", element.label, element.invalidatedResources.createMessage()));
        }
        // this must be the last past element in all the impacted resources!
        const cannotUndoDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.getClosestPastElement() !== element) {
                cannotUndoDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotUndoDueToResources.length > 0) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceUndoDueToChanges',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not undo '{0}' across all files because changes were made to {1}", element.label, cannotUndoDueToResources.join(', ')));
        }
        const cannotLockDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                cannotLockDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotLockDueToResources.length > 0) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceUndoDueToInProgressUndoRedo',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not undo '{0}' across all files because there is already an undo or redo operation running on {1}", element.label, cannotLockDueToResources.join(', ')));
        }
        // check if new stack elements were added in the meantime...
        if (!editStackSnapshot.isValid()) {
            return this._tryToSplitAndUndo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceUndoDueToInMeantimeUndoRedo',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not undo '{0}' across all files because an undo or redo operation occurred in the meantime", element.label));
        }
        return null;
    }
    _workspaceUndo(strResource, element, undoConfirmed) {
        const affectedEditStacks = this._getAffectedEditStacks(element);
        const verificationError = this._checkWorkspaceUndo(strResource, element, affectedEditStacks, 
        /*invalidated resources will be checked after the prepare call*/ false);
        if (verificationError) {
            return verificationError.returnValue;
        }
        return this._confirmAndExecuteWorkspaceUndo(strResource, element, affectedEditStacks, undoConfirmed);
    }
    _isPartOfUndoGroup(element) {
        if (!element.groupId) {
            return false;
        }
        // check that there is at least another element with the same groupId ready to be undone
        for (const [, editStack] of this._editStacks) {
            const pastElement = editStack.getClosestPastElement();
            if (!pastElement) {
                continue;
            }
            if (pastElement === element) {
                const secondPastElement = editStack.getSecondClosestPastElement();
                if (secondPastElement && secondPastElement.groupId === element.groupId) {
                    // there is another element with the same group id in the same stack!
                    return true;
                }
            }
            if (pastElement.groupId === element.groupId) {
                // there is another element with the same group id in another stack!
                return true;
            }
        }
        return false;
    }
    async _confirmAndExecuteWorkspaceUndo(strResource, element, editStackSnapshot, undoConfirmed) {
        if (element.canSplit() && !this._isPartOfUndoGroup(element)) {
            // this element can be split
            let UndoChoice;
            (function (UndoChoice) {
                UndoChoice[UndoChoice["All"] = 0] = "All";
                UndoChoice[UndoChoice["This"] = 1] = "This";
                UndoChoice[UndoChoice["Cancel"] = 2] = "Cancel";
            })(UndoChoice || (UndoChoice = {}));
            const { result } = await this._dialogService.prompt({
                type: Severity.Info,
                message: nls.localize('confirmWorkspace', "Would you like to undo '{0}' across all files?", element.label),
                buttons: [
                    {
                        label: nls.localize({ key: 'ok', comment: ['{0} denotes a number that is > 1, && denotes a mnemonic'] }, '&&Undo in {0} Files', editStackSnapshot.editStacks.length),
                        run: () => UndoChoice.All,
                    },
                    {
                        label: nls.localize({ key: 'nok', comment: ['&& denotes a mnemonic'] }, 'Undo this &&File'),
                        run: () => UndoChoice.This,
                    },
                ],
                cancelButton: {
                    run: () => UndoChoice.Cancel,
                },
            });
            if (result === UndoChoice.Cancel) {
                // choice: cancel
                return;
            }
            if (result === UndoChoice.This) {
                // choice: undo this file
                this._splitPastWorkspaceElement(element, null);
                return this._undo(strResource, 0, true);
            }
            // choice: undo in all files
            // At this point, it is possible that the element has been made invalid in the meantime (due to the confirmation await)
            const verificationError1 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, 
            /*invalidated resources will be checked after the prepare call*/ false);
            if (verificationError1) {
                return verificationError1.returnValue;
            }
            undoConfirmed = true;
        }
        // prepare
        let cleanup;
        try {
            cleanup = await this._invokeWorkspacePrepare(element);
        }
        catch (err) {
            return this._onError(err, element);
        }
        // At this point, it is possible that the element has been made invalid in the meantime (due to the prepare await)
        const verificationError2 = this._checkWorkspaceUndo(strResource, element, editStackSnapshot, 
        /*now also check that there are no more invalidated resources*/ true);
        if (verificationError2) {
            cleanup.dispose();
            return verificationError2.returnValue;
        }
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.moveBackward(element);
        }
        return this._safeInvokeWithLocks(element, () => element.actual.undo(), editStackSnapshot, cleanup, () => this._continueUndoInGroup(element.groupId, undoConfirmed));
    }
    _resourceUndo(editStack, element, undoConfirmed) {
        if (!element.isValid) {
            // invalid element => immediately flush edit stack!
            editStack.flushAllElements();
            return;
        }
        if (editStack.locked) {
            const message = nls.localize({
                key: 'cannotResourceUndoDueToInProgressUndoRedo',
                comment: ['{0} is a label for an operation.'],
            }, "Could not undo '{0}' because there is already an undo or redo operation running.", element.label);
            this._notificationService.warn(message);
            return;
        }
        return this._invokeResourcePrepare(element, (cleanup) => {
            editStack.moveBackward(element);
            return this._safeInvokeWithLocks(element, () => element.actual.undo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueUndoInGroup(element.groupId, undoConfirmed));
        });
    }
    _findClosestUndoElementInGroup(groupId) {
        if (!groupId) {
            return [null, null];
        }
        // find another element with the same groupId and with the highest groupOrder ready to be undone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestPastElement();
            if (!candidate) {
                continue;
            }
            if (candidate.groupId === groupId) {
                if (!matchedElement || candidate.groupOrder > matchedElement.groupOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    _continueUndoInGroup(groupId, undoConfirmed) {
        if (!groupId) {
            return;
        }
        const [, matchedStrResource] = this._findClosestUndoElementInGroup(groupId);
        if (matchedStrResource) {
            return this._undo(matchedStrResource, 0, undoConfirmed);
        }
    }
    undo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestUndoElementWithSource(resourceOrSource.id);
            return matchedStrResource
                ? this._undo(matchedStrResource, resourceOrSource.id, false)
                : undefined;
        }
        if (typeof resourceOrSource === 'string') {
            return this._undo(resourceOrSource, 0, false);
        }
        return this._undo(this.getUriComparisonKey(resourceOrSource), 0, false);
    }
    _undo(strResource, sourceId = 0, undoConfirmed) {
        if (!this._editStacks.has(strResource)) {
            return;
        }
        const editStack = this._editStacks.get(strResource);
        const element = editStack.getClosestPastElement();
        if (!element) {
            return;
        }
        if (element.groupId) {
            // this element is a part of a group, we need to make sure undoing in a group is in order
            const [matchedElement, matchedStrResource] = this._findClosestUndoElementInGroup(element.groupId);
            if (element !== matchedElement && matchedStrResource) {
                // there is an element in the same group that should be undone before this one
                return this._undo(matchedStrResource, sourceId, undoConfirmed);
            }
        }
        const shouldPromptForConfirmation = element.sourceId !== sourceId || element.confirmBeforeUndo;
        if (shouldPromptForConfirmation && !undoConfirmed) {
            // Hit a different source or the element asks for prompt before undo, prompt for confirmation
            return this._confirmAndContinueUndo(strResource, sourceId, element);
        }
        try {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                return this._workspaceUndo(strResource, element, undoConfirmed);
            }
            else {
                return this._resourceUndo(editStack, element, undoConfirmed);
            }
        }
        finally {
            if (DEBUG) {
                this._print('undo');
            }
        }
    }
    async _confirmAndContinueUndo(strResource, sourceId, element) {
        const result = await this._dialogService.confirm({
            message: nls.localize('confirmDifferentSource', "Would you like to undo '{0}'?", element.label),
            primaryButton: nls.localize({ key: 'confirmDifferentSource.yes', comment: ['&& denotes a mnemonic'] }, '&&Yes'),
            cancelButton: nls.localize('confirmDifferentSource.no', 'No'),
        });
        if (!result.confirmed) {
            return;
        }
        return this._undo(strResource, sourceId, true);
    }
    _findClosestRedoElementWithSource(sourceId) {
        if (!sourceId) {
            return [null, null];
        }
        // find an element with sourceId and with the lowest sourceOrder ready to be redone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestFutureElement();
            if (!candidate) {
                continue;
            }
            if (candidate.sourceId === sourceId) {
                if (!matchedElement || candidate.sourceOrder < matchedElement.sourceOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    canRedo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestRedoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? true : false;
        }
        const strResource = this.getUriComparisonKey(resourceOrSource);
        if (this._editStacks.has(strResource)) {
            const editStack = this._editStacks.get(strResource);
            return editStack.hasFutureElements();
        }
        return false;
    }
    _tryToSplitAndRedo(strResource, element, ignoreResources, message) {
        if (element.canSplit()) {
            this._splitFutureWorkspaceElement(element, ignoreResources);
            this._notificationService.warn(message);
            return new WorkspaceVerificationError(this._redo(strResource));
        }
        else {
            // Cannot safely split this workspace element => flush all undo/redo stacks
            for (const strResource of element.strResources) {
                this.removeElements(strResource);
            }
            this._notificationService.warn(message);
            return new WorkspaceVerificationError();
        }
    }
    _checkWorkspaceRedo(strResource, element, editStackSnapshot, checkInvalidatedResources) {
        if (element.removedResources) {
            return this._tryToSplitAndRedo(strResource, element, element.removedResources, nls.localize({
                key: 'cannotWorkspaceRedo',
                comment: ['{0} is a label for an operation. {1} is another message.'],
            }, "Could not redo '{0}' across all files. {1}", element.label, element.removedResources.createMessage()));
        }
        if (checkInvalidatedResources && element.invalidatedResources) {
            return this._tryToSplitAndRedo(strResource, element, element.invalidatedResources, nls.localize({
                key: 'cannotWorkspaceRedo',
                comment: ['{0} is a label for an operation. {1} is another message.'],
            }, "Could not redo '{0}' across all files. {1}", element.label, element.invalidatedResources.createMessage()));
        }
        // this must be the last future element in all the impacted resources!
        const cannotRedoDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.getClosestFutureElement() !== element) {
                cannotRedoDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotRedoDueToResources.length > 0) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceRedoDueToChanges',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not redo '{0}' across all files because changes were made to {1}", element.label, cannotRedoDueToResources.join(', ')));
        }
        const cannotLockDueToResources = [];
        for (const editStack of editStackSnapshot.editStacks) {
            if (editStack.locked) {
                cannotLockDueToResources.push(editStack.resourceLabel);
            }
        }
        if (cannotLockDueToResources.length > 0) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceRedoDueToInProgressUndoRedo',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not redo '{0}' across all files because there is already an undo or redo operation running on {1}", element.label, cannotLockDueToResources.join(', ')));
        }
        // check if new stack elements were added in the meantime...
        if (!editStackSnapshot.isValid()) {
            return this._tryToSplitAndRedo(strResource, element, null, nls.localize({
                key: 'cannotWorkspaceRedoDueToInMeantimeUndoRedo',
                comment: ['{0} is a label for an operation. {1} is a list of filenames.'],
            }, "Could not redo '{0}' across all files because an undo or redo operation occurred in the meantime", element.label));
        }
        return null;
    }
    _workspaceRedo(strResource, element) {
        const affectedEditStacks = this._getAffectedEditStacks(element);
        const verificationError = this._checkWorkspaceRedo(strResource, element, affectedEditStacks, 
        /*invalidated resources will be checked after the prepare call*/ false);
        if (verificationError) {
            return verificationError.returnValue;
        }
        return this._executeWorkspaceRedo(strResource, element, affectedEditStacks);
    }
    async _executeWorkspaceRedo(strResource, element, editStackSnapshot) {
        // prepare
        let cleanup;
        try {
            cleanup = await this._invokeWorkspacePrepare(element);
        }
        catch (err) {
            return this._onError(err, element);
        }
        // At this point, it is possible that the element has been made invalid in the meantime (due to the prepare await)
        const verificationError = this._checkWorkspaceRedo(strResource, element, editStackSnapshot, 
        /*now also check that there are no more invalidated resources*/ true);
        if (verificationError) {
            cleanup.dispose();
            return verificationError.returnValue;
        }
        for (const editStack of editStackSnapshot.editStacks) {
            editStack.moveForward(element);
        }
        return this._safeInvokeWithLocks(element, () => element.actual.redo(), editStackSnapshot, cleanup, () => this._continueRedoInGroup(element.groupId));
    }
    _resourceRedo(editStack, element) {
        if (!element.isValid) {
            // invalid element => immediately flush edit stack!
            editStack.flushAllElements();
            return;
        }
        if (editStack.locked) {
            const message = nls.localize({
                key: 'cannotResourceRedoDueToInProgressUndoRedo',
                comment: ['{0} is a label for an operation.'],
            }, "Could not redo '{0}' because there is already an undo or redo operation running.", element.label);
            this._notificationService.warn(message);
            return;
        }
        return this._invokeResourcePrepare(element, (cleanup) => {
            editStack.moveForward(element);
            return this._safeInvokeWithLocks(element, () => element.actual.redo(), new EditStackSnapshot([editStack]), cleanup, () => this._continueRedoInGroup(element.groupId));
        });
    }
    _findClosestRedoElementInGroup(groupId) {
        if (!groupId) {
            return [null, null];
        }
        // find another element with the same groupId and with the lowest groupOrder ready to be redone
        let matchedElement = null;
        let matchedStrResource = null;
        for (const [strResource, editStack] of this._editStacks) {
            const candidate = editStack.getClosestFutureElement();
            if (!candidate) {
                continue;
            }
            if (candidate.groupId === groupId) {
                if (!matchedElement || candidate.groupOrder < matchedElement.groupOrder) {
                    matchedElement = candidate;
                    matchedStrResource = strResource;
                }
            }
        }
        return [matchedElement, matchedStrResource];
    }
    _continueRedoInGroup(groupId) {
        if (!groupId) {
            return;
        }
        const [, matchedStrResource] = this._findClosestRedoElementInGroup(groupId);
        if (matchedStrResource) {
            return this._redo(matchedStrResource);
        }
    }
    redo(resourceOrSource) {
        if (resourceOrSource instanceof UndoRedoSource) {
            const [, matchedStrResource] = this._findClosestRedoElementWithSource(resourceOrSource.id);
            return matchedStrResource ? this._redo(matchedStrResource) : undefined;
        }
        if (typeof resourceOrSource === 'string') {
            return this._redo(resourceOrSource);
        }
        return this._redo(this.getUriComparisonKey(resourceOrSource));
    }
    _redo(strResource) {
        if (!this._editStacks.has(strResource)) {
            return;
        }
        const editStack = this._editStacks.get(strResource);
        const element = editStack.getClosestFutureElement();
        if (!element) {
            return;
        }
        if (element.groupId) {
            // this element is a part of a group, we need to make sure redoing in a group is in order
            const [matchedElement, matchedStrResource] = this._findClosestRedoElementInGroup(element.groupId);
            if (element !== matchedElement && matchedStrResource) {
                // there is an element in the same group that should be redone before this one
                return this._redo(matchedStrResource);
            }
        }
        try {
            if (element.type === 1 /* UndoRedoElementType.Workspace */) {
                return this._workspaceRedo(strResource, element);
            }
            else {
                return this._resourceRedo(editStack, element);
            }
        }
        finally {
            if (DEBUG) {
                this._print('redo');
            }
        }
    }
};
UndoRedoService = __decorate([
    __param(0, IDialogService),
    __param(1, INotificationService)
], UndoRedoService);
export { UndoRedoService };
class WorkspaceVerificationError {
    constructor(returnValue) {
        this.returnValue = returnValue;
    }
}
registerSingleton(IUndoRedoService, UndoRedoService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5kb1JlZG9TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdW5kb1JlZG8vY29tbW9uL3VuZG9SZWRvU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLFFBQVEsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RCxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNoRSxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDaEYsT0FBTyxFQUlOLGdCQUFnQixFQUVoQix5QkFBeUIsRUFFekIsYUFBYSxFQUNiLGNBQWMsR0FFZCxNQUFNLGVBQWUsQ0FBQTtBQUV0QixNQUFNLEtBQUssR0FBRyxLQUFLLENBQUE7QUFFbkIsU0FBUyxnQkFBZ0IsQ0FBQyxRQUFhO0lBQ3RDLE9BQU8sUUFBUSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFBO0FBQzFFLENBQUM7QUFFRCxJQUFJLG1CQUFtQixHQUFHLENBQUMsQ0FBQTtBQUUzQixNQUFNLG9CQUFvQjtJQWlCekIsWUFDQyxNQUF3QixFQUN4QixhQUFxQixFQUNyQixX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