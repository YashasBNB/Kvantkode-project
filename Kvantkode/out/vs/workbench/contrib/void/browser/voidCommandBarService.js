/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import * as dom from '../../../../base/browser/dom.js';
import { Widget } from '../../../../base/browser/ui/widget.js';
import { Emitter } from '../../../../base/common/event.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { mountVoidCommandBar } from './react/out/void-editor-widgets-tsx/index.js';
import { deepClone } from '../../../../base/common/objects.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IEditCodeService } from './editCodeServiceInterface.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { VOID_ACCEPT_DIFF_ACTION_ID, VOID_REJECT_DIFF_ACTION_ID, VOID_GOTO_NEXT_DIFF_ACTION_ID, VOID_GOTO_PREV_DIFF_ACTION_ID, VOID_GOTO_NEXT_URI_ACTION_ID, VOID_GOTO_PREV_URI_ACTION_ID, VOID_ACCEPT_FILE_ACTION_ID, VOID_REJECT_FILE_ACTION_ID, VOID_ACCEPT_ALL_DIFFS_ACTION_ID, VOID_REJECT_ALL_DIFFS_ACTION_ID, } from './actionIDs.js';
import { localize2 } from '../../../../nls.js';
import { IMetricsService } from '../common/metricsService.js';
import { KeyMod } from '../../../../editor/common/services/editorBaseApi.js';
import { IVoidModelService } from '../common/voidModelService.js';
export const IVoidCommandBarService = createDecorator('VoidCommandBarService');
const defaultState = {
    sortedDiffZoneIds: [],
    sortedDiffIds: [],
    isStreaming: false,
    diffIdx: null,
};
let VoidCommandBarService = class VoidCommandBarService extends Disposable {
    constructor(_instantiationService, _codeEditorService, _modelService, _editCodeService, _voidModelService) {
        super();
        this._instantiationService = _instantiationService;
        this._codeEditorService = _codeEditorService;
        this._modelService = _modelService;
        this._editCodeService = _editCodeService;
        this._voidModelService = _voidModelService;
        // depends on uri -> diffZone -> {streaming, diffs}
        this.stateOfURI = {};
        this.sortedURIs = []; // keys of state (depends on diffZones in the uri)
        this._listenToTheseURIs = new Set(); // uriFsPaths
        // Emits when a URI's stream state changes between idle, streaming, and acceptRejectAll
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        // active URI
        this.activeURI = null;
        this._onDidChangeActiveURI = new Emitter();
        this.onDidChangeActiveURI = this._onDidChangeActiveURI.event;
        const registeredModelURIs = new Set();
        const initializeModel = async (model) => {
            // do not add listeners to the same model twice - important, or will see duplicates
            if (registeredModelURIs.has(model.uri.fsPath))
                return;
            registeredModelURIs.add(model.uri.fsPath);
            this._listenToTheseURIs.add(model.uri);
        };
        // initialize all existing models + initialize when a new model mounts
        this._modelService.getModels().forEach((model) => {
            initializeModel(model);
        });
        this._register(this._modelService.onModelAdded((model) => {
            initializeModel(model);
        }));
        // for every new editor, add the floating widget and update active URI
        const disposablesOfEditorId = {};
        const onCodeEditorAdd = (editor) => {
            const id = editor.getId();
            disposablesOfEditorId[id] = [];
            // mount the command bar
            const d1 = this._instantiationService.createInstance(AcceptRejectAllFloatingWidget, {
                editor,
            });
            disposablesOfEditorId[id].push(d1);
            const d2 = editor.onDidChangeModel((e) => {
                if (e.newModelUrl?.scheme !== 'file')
                    return;
                this.activeURI = e.newModelUrl;
                this._onDidChangeActiveURI.fire({ uri: e.newModelUrl });
            });
            disposablesOfEditorId[id].push(d2);
        };
        const onCodeEditorRemove = (editor) => {
            const id = editor.getId();
            if (disposablesOfEditorId[id]) {
                disposablesOfEditorId[id].forEach((d) => d.dispose());
                delete disposablesOfEditorId[id];
            }
        };
        this._register(this._codeEditorService.onCodeEditorAdd((editor) => {
            onCodeEditorAdd(editor);
        }));
        this._register(this._codeEditorService.onCodeEditorRemove((editor) => {
            onCodeEditorRemove(editor);
        }));
        this._codeEditorService.listCodeEditors().forEach((editor) => {
            onCodeEditorAdd(editor);
        });
        // state updaters
        this._register(this._editCodeService.onDidAddOrDeleteDiffZones((e) => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: delete if empty, add if not in state yet
                const diffZones = this._getDiffZonesOnURI(uri);
                if (diffZones.length === 0) {
                    this._deleteURIEntryFromState(uri);
                    this._onDidChangeState.fire({ uri });
                    continue; // deleted, so done
                }
                if (!this.sortedURIs.find((uri2) => uri2.fsPath === uri.fsPath)) {
                    this._addURIEntryToState(uri);
                }
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                // update state of the diffZones on this URI
                const oldDiffZones = currState.sortedDiffZoneIds;
                const currentDiffZones = this._editCodeService.diffAreasOfURI[uri.fsPath] || []; // a Set
                const { addedDiffZones, deletedDiffZones } = this._getDiffZoneChanges(oldDiffZones, currentDiffZones || []);
                const diffZonesWithoutDeleted = oldDiffZones.filter((olddiffareaid) => !deletedDiffZones.has(olddiffareaid));
                // --- new state:
                const newSortedDiffZoneIds = [...diffZonesWithoutDeleted, ...addedDiffZones];
                const newSortedDiffIds = this._computeSortedDiffs(newSortedDiffZoneIds);
                const isStreaming = this._isAnyDiffZoneStreaming(currentDiffZones);
                // When diffZones are added/removed, reset the diffIdx to 0 if we have diffs
                const newDiffIdx = newSortedDiffIds.length > 0 ? 0 : null;
                this._setState(uri, {
                    sortedDiffZoneIds: newSortedDiffZoneIds,
                    sortedDiffIds: newSortedDiffIds,
                    isStreaming: isStreaming,
                    diffIdx: newDiffIdx,
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
        this._register(this._editCodeService.onDidChangeDiffsInDiffZoneNotStreaming((e) => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: no change
                // --- state:
                // sortedDiffIds gets a change to it, so gets recomputed
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                const { sortedDiffZoneIds } = currState;
                const oldSortedDiffIds = currState.sortedDiffIds;
                const newSortedDiffIds = this._computeSortedDiffs(sortedDiffZoneIds);
                // Handle diffIdx adjustment when diffs change
                let newDiffIdx = currState.diffIdx;
                // Check if diffs were removed
                if (oldSortedDiffIds.length > newSortedDiffIds.length && currState.diffIdx !== null) {
                    // If currently selected diff was removed or we have fewer diffs than the current index
                    if (currState.diffIdx >= newSortedDiffIds.length) {
                        // Select the last diff if available, otherwise null
                        newDiffIdx = newSortedDiffIds.length > 0 ? newSortedDiffIds.length - 1 : null;
                    }
                }
                this._setState(uri, {
                    sortedDiffIds: newSortedDiffIds,
                    diffIdx: newDiffIdx,
                    // sortedDiffZoneIds, // no change
                    // isStreaming, // no change
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
        this._register(this._editCodeService.onDidChangeStreamingInDiffZone((e) => {
            for (const uri of this._listenToTheseURIs) {
                if (e.uri.fsPath !== uri.fsPath)
                    continue;
                // --- sortedURIs: no change
                // --- state:
                const currState = this.stateOfURI[uri.fsPath];
                if (!currState)
                    continue; // should never happen
                const { sortedDiffZoneIds } = currState;
                this._setState(uri, {
                    isStreaming: this._isAnyDiffZoneStreaming(sortedDiffZoneIds),
                    // sortedDiffIds, // no change
                    // sortedDiffZoneIds, // no change
                });
                this._onDidChangeState.fire({ uri });
            }
        }));
    }
    setDiffIdx(uri, newIdx) {
        this._setState(uri, { diffIdx: newIdx });
        this._onDidChangeState.fire({ uri });
    }
    getStreamState(uri) {
        const { isStreaming, sortedDiffZoneIds } = this.stateOfURI[uri.fsPath] ?? {};
        if (isStreaming) {
            return 'streaming';
        }
        if ((sortedDiffZoneIds?.length ?? 0) > 0) {
            return 'idle-has-changes';
        }
        return 'idle-no-changes';
    }
    _computeSortedDiffs(diffareaids) {
        const sortedDiffIds = [];
        for (const diffareaid of diffareaids) {
            const diffZone = this._editCodeService.diffAreaOfId[diffareaid];
            if (!diffZone || diffZone.type !== 'DiffZone') {
                continue;
            }
            // Add all diff ids from this diffzone
            const diffIds = Object.keys(diffZone._diffOfId);
            sortedDiffIds.push(...diffIds);
        }
        return sortedDiffIds;
    }
    _getDiffZoneChanges(oldDiffZones, currentDiffZones) {
        // Find the added or deleted diffZones by comparing diffareaids
        const addedDiffZoneIds = new Set();
        const deletedDiffZoneIds = new Set();
        // Convert the current diffZones to a set of ids for easy lookup
        const currentDiffZoneIdSet = new Set(currentDiffZones);
        // Find deleted diffZones (in old but not in current)
        for (const oldDiffZoneId of oldDiffZones) {
            if (!currentDiffZoneIdSet.has(oldDiffZoneId)) {
                const diffZone = this._editCodeService.diffAreaOfId[oldDiffZoneId];
                if (diffZone && diffZone.type === 'DiffZone') {
                    deletedDiffZoneIds.add(oldDiffZoneId);
                }
            }
        }
        // Find added diffZones (in current but not in old)
        const oldDiffZoneIdSet = new Set(oldDiffZones);
        for (const currentDiffZoneId of currentDiffZones) {
            if (!oldDiffZoneIdSet.has(currentDiffZoneId)) {
                const diffZone = this._editCodeService.diffAreaOfId[currentDiffZoneId];
                if (diffZone && diffZone.type === 'DiffZone') {
                    addedDiffZoneIds.add(currentDiffZoneId);
                }
            }
        }
        return { addedDiffZones: addedDiffZoneIds, deletedDiffZones: deletedDiffZoneIds };
    }
    _isAnyDiffZoneStreaming(diffareaids) {
        for (const diffareaid of diffareaids) {
            const diffZone = this._editCodeService.diffAreaOfId[diffareaid];
            if (!diffZone || diffZone.type !== 'DiffZone') {
                continue;
            }
            if (diffZone._streamState.isStreaming) {
                return true;
            }
        }
        return false;
    }
    _setState(uri, opts) {
        const newState = {
            ...(this.stateOfURI[uri.fsPath] ?? deepClone(defaultState)),
            ...opts,
        };
        // make sure diffIdx is always correct
        if (newState.diffIdx !== null && newState.diffIdx > newState.sortedDiffIds.length) {
            newState.diffIdx = newState.sortedDiffIds.length;
            if (newState.diffIdx <= 0)
                newState.diffIdx = null;
        }
        this.stateOfURI = {
            ...this.stateOfURI,
            [uri.fsPath]: newState,
        };
    }
    _addURIEntryToState(uri) {
        // add to sortedURIs
        this.sortedURIs = [...this.sortedURIs, uri];
        // add to state
        this.stateOfURI[uri.fsPath] = deepClone(defaultState);
    }
    _deleteURIEntryFromState(uri) {
        // delete this from sortedURIs
        const i = this.sortedURIs.findIndex((uri2) => uri2.fsPath === uri.fsPath);
        if (i === -1)
            return;
        this.sortedURIs = [...this.sortedURIs.slice(0, i), ...this.sortedURIs.slice(i + 1, Infinity)];
        // delete from state
        delete this.stateOfURI[uri.fsPath];
    }
    _getDiffZonesOnURI(uri) {
        const diffZones = [...(this._editCodeService.diffAreasOfURI[uri.fsPath]?.values() ?? [])]
            .map((diffareaid) => this._editCodeService.diffAreaOfId[diffareaid])
            .filter((diffArea) => !!diffArea && diffArea.type === 'DiffZone');
        return diffZones;
    }
    anyFileIsStreaming() {
        return this.sortedURIs.some((uri) => this.getStreamState(uri) === 'streaming');
    }
    getNextDiffIdx(step) {
        // If no active URI, return null
        if (!this.activeURI)
            return null;
        const state = this.stateOfURI[this.activeURI.fsPath];
        if (!state)
            return null;
        const { diffIdx, sortedDiffIds } = state;
        // If no diffs, return null
        if (sortedDiffIds.length === 0)
            return null;
        // Calculate next index with wrapping
        const nextIdx = ((diffIdx ?? 0) + step + sortedDiffIds.length) % sortedDiffIds.length;
        return nextIdx;
    }
    getNextUriIdx(step) {
        // If no URIs with changes, return null
        if (this.sortedURIs.length === 0)
            return null;
        // If no active URI, return first or last based on step
        if (!this.activeURI) {
            return step === 1 ? 0 : this.sortedURIs.length - 1;
        }
        // Find current index
        const currentIdx = this.sortedURIs.findIndex((uri) => uri.fsPath === this.activeURI?.fsPath);
        // If not found, return first or last based on step
        if (currentIdx === -1) {
            return step === 1 ? 0 : this.sortedURIs.length - 1;
        }
        // Calculate next index with wrapping
        const nextIdx = (currentIdx + step + this.sortedURIs.length) % this.sortedURIs.length;
        return nextIdx;
    }
    goToDiffIdx(idx) {
        // If null or no active URI, return
        if (idx === null || !this.activeURI)
            return;
        // Get state for the current URI
        const state = this.stateOfURI[this.activeURI.fsPath];
        if (!state)
            return;
        const { sortedDiffIds } = state;
        // Find the diff at the specified index
        const diffid = sortedDiffIds[idx];
        if (diffid === undefined)
            return;
        // Get the diff object
        const diff = this._editCodeService.diffOfId[diffid];
        if (!diff)
            return;
        // Find an active editor to focus
        const editor = this._codeEditorService.getFocusedCodeEditor() ||
            this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return;
        // Reveal the line in the editor
        editor.revealLineNearTop(diff.startLine - 1, 1 /* ScrollType.Immediate */);
        // Update the current diff index
        this.setDiffIdx(this.activeURI, idx);
    }
    async goToURIIdx(idx) {
        // If null or no URIs, return
        if (idx === null || this.sortedURIs.length === 0)
            return;
        // Get the URI at the specified index
        const nextURI = this.sortedURIs[idx];
        if (!nextURI)
            return;
        // Get the model for this URI
        const { model } = await this._voidModelService.getModelSafe(nextURI);
        if (!model)
            return;
        // Find an editor to use
        const editor = this._codeEditorService.getFocusedCodeEditor() ||
            this._codeEditorService.getActiveCodeEditor();
        if (!editor)
            return;
        // Open the URI in the editor
        await this._codeEditorService.openCodeEditor({ resource: model.uri, options: { revealIfVisible: true } }, editor);
    }
    acceptOrRejectAllFiles(opts) {
        const { behavior } = opts;
        // if anything is streaming, do nothing
        const anyIsStreaming = this.anyFileIsStreaming();
        if (anyIsStreaming)
            return;
        for (const uri of this.sortedURIs) {
            this._editCodeService.acceptOrRejectAllDiffAreas({ uri, behavior, removeCtrlKs: false });
        }
    }
};
VoidCommandBarService = __decorate([
    __param(0, IInstantiationService),
    __param(1, ICodeEditorService),
    __param(2, IModelService),
    __param(3, IEditCodeService),
    __param(4, IVoidModelService)
], VoidCommandBarService);
export { VoidCommandBarService };
registerSingleton(IVoidCommandBarService, VoidCommandBarService, 1 /* InstantiationType.Delayed */); // delayed is needed here :(
let AcceptRejectAllFloatingWidget = class AcceptRejectAllFloatingWidget extends Widget {
    constructor({ editor }, instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this._height = 0;
        this.ID = generateUuid();
        this.editor = editor;
        // Create container div
        const { root } = dom.h('div@root');
        // Style the container
        // root.style.backgroundColor = 'rgb(248 113 113)';
        root.style.height = '256px'; // make a fixed size, and all contents go on the bottom right. this fixes annoying VS Code mounting issues
        root.style.width = '100%';
        root.style.flexDirection = 'column';
        root.style.justifyContent = 'flex-end';
        root.style.alignItems = 'flex-end';
        root.style.zIndex = '2';
        root.style.padding = '4px';
        root.style.pointerEvents = 'none';
        root.style.display = 'flex';
        root.style.overflow = 'hidden';
        this._domNode = root;
        editor.addOverlayWidget(this);
        this.instantiationService.invokeFunction((accessor) => {
            const uri = editor.getModel()?.uri || null;
            const res = mountVoidCommandBar(root, accessor, { uri, editor });
            if (!res)
                return;
            this._register(toDisposable(() => res.dispose?.()));
            this._register(editor.onWillChangeModel((model) => {
                const uri = model.newModelUrl;
                res.rerender({ uri, editor });
            }));
        });
    }
    getId() {
        return this.ID;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            preference: 1 /* OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER */,
        };
    }
    dispose() {
        this.editor.removeOverlayWidget(this);
        super.dispose();
    }
};
AcceptRejectAllFloatingWidget = __decorate([
    __param(1, IInstantiationService)
], AcceptRejectAllFloatingWidget);
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptDiffAction', 'KvantKode: Accept Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 3 /* KeyCode.Enter */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 3 /* KeyCode.Enter */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const editCodeService = accessor.get(IEditCodeService);
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        const commandBarState = commandBarService.stateOfURI[activeURI.fsPath];
        if (!commandBarState)
            return;
        const diffIdx = commandBarState.diffIdx ?? 0;
        const diffid = commandBarState.sortedDiffIds[diffIdx];
        if (!diffid)
            return;
        metricsService.capture('Accept Diff', { diffid, keyboard: true });
        editCodeService.acceptDiff({ diffid: parseInt(diffid) });
        // After accepting the diff, navigate to the next diff
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx !== null) {
            commandBarService.goToDiffIdx(nextDiffIdx);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidRejectDiffAction', 'KvantKode: Reject Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 1 /* KeyCode.Backspace */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const editCodeService = accessor.get(IEditCodeService);
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        const commandBarState = commandBarService.stateOfURI[activeURI.fsPath];
        if (!commandBarState)
            return;
        const diffIdx = commandBarState.diffIdx ?? 0;
        const diffid = commandBarState.sortedDiffIds[diffIdx];
        if (!diffid)
            return;
        metricsService.capture('Reject Diff', { diffid, keyboard: true });
        editCodeService.rejectDiff({ diffid: parseInt(diffid) });
        // After rejecting the diff, navigate to the next diff
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx !== null) {
            commandBarService.goToDiffIdx(nextDiffIdx);
        }
    }
});
// Go to next diff action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_NEXT_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidGoToNextDiffAction', 'KvantKode: Go to Next Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 18 /* KeyCode.DownArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 18 /* KeyCode.DownArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const nextDiffIdx = commandBarService.getNextDiffIdx(1);
        if (nextDiffIdx === null)
            return;
        metricsService.capture('Navigate Diff', { direction: 'next', keyboard: true });
        commandBarService.goToDiffIdx(nextDiffIdx);
    }
});
// Go to previous diff action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_PREV_DIFF_ACTION_ID,
            f1: true,
            title: localize2('voidGoToPrevDiffAction', 'KvantKode: Go to Previous Diff'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 16 /* KeyCode.UpArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 16 /* KeyCode.UpArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const prevDiffIdx = commandBarService.getNextDiffIdx(-1);
        if (prevDiffIdx === null)
            return;
        metricsService.capture('Navigate Diff', { direction: 'previous', keyboard: true });
        commandBarService.goToDiffIdx(prevDiffIdx);
    }
});
// Go to next URI action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_NEXT_URI_ACTION_ID,
            f1: true,
            title: localize2('voidGoToNextUriAction', 'KvantKode: Go to Next File with Diffs'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 17 /* KeyCode.RightArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 17 /* KeyCode.RightArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const nextUriIdx = commandBarService.getNextUriIdx(1);
        if (nextUriIdx === null)
            return;
        metricsService.capture('Navigate URI', { direction: 'next', keyboard: true });
        await commandBarService.goToURIIdx(nextUriIdx);
    }
});
// Go to previous URI action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_GOTO_PREV_URI_ACTION_ID,
            f1: true,
            title: localize2('voidGoToPrevUriAction', 'KvantKode: Go to Previous File with Diffs'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Alt | KeyMod.Shift | 15 /* KeyCode.LeftArrow */,
                mac: { primary: KeyMod.WinCtrl | KeyMod.Alt | 15 /* KeyCode.LeftArrow */ },
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        const prevUriIdx = commandBarService.getNextUriIdx(-1);
        if (prevUriIdx === null)
            return;
        metricsService.capture('Navigate URI', { direction: 'previous', keyboard: true });
        await commandBarService.goToURIIdx(prevUriIdx);
    }
});
// Accept current file action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_FILE_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptFileAction', 'KvantKode: Accept All Diffs in Current File'),
            keybinding: {
                primary: KeyMod.Alt | KeyMod.Shift | 3 /* KeyCode.Enter */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const editCodeService = accessor.get(IEditCodeService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        metricsService.capture('Accept File', { keyboard: true });
        editCodeService.acceptOrRejectAllDiffAreas({
            uri: activeURI,
            behavior: 'accept',
            removeCtrlKs: true,
        });
    }
});
// Reject current file action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_FILE_ACTION_ID,
            f1: true,
            title: localize2('voidRejectFileAction', 'KvantKode: Reject All Diffs in Current File'),
            keybinding: {
                primary: KeyMod.Alt | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const editCodeService = accessor.get(IEditCodeService);
        const metricsService = accessor.get(IMetricsService);
        const activeURI = commandBarService.activeURI;
        if (!activeURI)
            return;
        metricsService.capture('Reject File', { keyboard: true });
        editCodeService.acceptOrRejectAllDiffAreas({
            uri: activeURI,
            behavior: 'reject',
            removeCtrlKs: true,
        });
    }
});
// Accept all diffs in all files action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_ACCEPT_ALL_DIFFS_ACTION_ID,
            f1: true,
            title: localize2('voidAcceptAllDiffsAction', 'KvantKode: Accept All Diffs in All Files'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Shift | 3 /* KeyCode.Enter */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        if (commandBarService.anyFileIsStreaming())
            return;
        metricsService.capture('Accept All Files', { keyboard: true });
        commandBarService.acceptOrRejectAllFiles({ behavior: 'accept' });
    }
});
// Reject all diffs in all files action
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: VOID_REJECT_ALL_DIFFS_ACTION_ID,
            f1: true,
            title: localize2('voidRejectAllDiffsAction', 'KvantKode: Reject All Diffs in All Files'),
            keybinding: {
                primary: KeyMod.CtrlCmd | KeyMod.Shift | 1 /* KeyCode.Backspace */,
                weight: 605 /* KeybindingWeight.VoidExtension */,
            },
        });
    }
    async run(accessor) {
        const commandBarService = accessor.get(IVoidCommandBarService);
        const metricsService = accessor.get(IMetricsService);
        if (commandBarService.anyFileIsStreaming())
            return;
        metricsService.capture('Reject All Files', { keyboard: true });
        commandBarService.acceptOrRejectAllFiles({ behavior: 'reject' });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZENvbW1hbmRCYXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdm9pZENvbW1hbmRCYXJTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUVuRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQU05RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsNkJBQTZCLEVBQzdCLDZCQUE2QixFQUM3Qiw0QkFBNEIsRUFDNUIsNEJBQTRCLEVBQzVCLDBCQUEwQixFQUMxQiwwQkFBMEIsRUFDMUIsK0JBQStCLEVBQy9CLCtCQUErQixHQUMvQixNQUFNLGdCQUFnQixDQUFBO0FBQ3ZCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUc5QyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBdUJqRSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBWWpFLE1BQU0sWUFBWSxHQUFxQztJQUN0RCxpQkFBaUIsRUFBRSxFQUFFO0lBQ3JCLGFBQWEsRUFBRSxFQUFFO0lBQ2pCLFdBQVcsRUFBRSxLQUFLO0lBQ2xCLE9BQU8sRUFBRSxJQUFJO0NBQ2IsQ0FBQTtBQUVNLElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQW1CcEQsWUFDd0IscUJBQTZELEVBQ2hFLGtCQUF1RCxFQUM1RCxhQUE2QyxFQUMxQyxnQkFBbUQsRUFDbEQsaUJBQXFEO1FBRXhFLEtBQUssRUFBRSxDQUFBO1FBTmlDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDL0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUMzQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUN6QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ2pDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFuQnpFLG1EQUFtRDtRQUM1QyxlQUFVLEdBQTJDLEVBQUUsQ0FBQTtRQUN2RCxlQUFVLEdBQVUsRUFBRSxDQUFBLENBQUMsa0RBQWtEO1FBQy9ELHVCQUFrQixHQUFHLElBQUksR0FBRyxFQUFPLENBQUEsQ0FBQyxhQUFhO1FBRWxFLHVGQUF1RjtRQUN0RSxzQkFBaUIsR0FBRyxJQUFJLE9BQU8sRUFBZ0IsQ0FBQTtRQUN2RCxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFBO1FBRXhELGFBQWE7UUFDYixjQUFTLEdBQWUsSUFBSSxDQUFBO1FBQ1gsMEJBQXFCLEdBQUcsSUFBSSxPQUFPLEVBQXVCLENBQUE7UUFDbEUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQVcvRCxNQUFNLG1CQUFtQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDN0MsTUFBTSxlQUFlLEdBQUcsS0FBSyxFQUFFLEtBQWlCLEVBQUUsRUFBRTtZQUNuRCxtRkFBbUY7WUFDbkYsSUFBSSxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7Z0JBQUUsT0FBTTtZQUNyRCxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN6QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN2QyxDQUFDLENBQUE7UUFDRCxzRUFBc0U7UUFDdEUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNoRCxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkIsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDekMsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxzRUFBc0U7UUFDdEUsTUFBTSxxQkFBcUIsR0FBMEMsRUFBRSxDQUFBO1FBQ3ZFLE1BQU0sZUFBZSxHQUFHLENBQUMsTUFBbUIsRUFBRSxFQUFFO1lBQy9DLE1BQU0sRUFBRSxHQUFHLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUN6QixxQkFBcUIsQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUE7WUFFOUIsd0JBQXdCO1lBQ3hCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsNkJBQTZCLEVBQUU7Z0JBQ25GLE1BQU07YUFDTixDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7WUFDbEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3hDLElBQUksQ0FBQyxDQUFDLFdBQVcsRUFBRSxNQUFNLEtBQUssTUFBTTtvQkFBRSxPQUFNO2dCQUM1QyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUE7Z0JBQzlCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7WUFDeEQsQ0FBQyxDQUFDLENBQUE7WUFDRixxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFBO1FBQ0QsTUFBTSxrQkFBa0IsR0FBRyxDQUFDLE1BQW1CLEVBQUUsRUFBRTtZQUNsRCxNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7WUFDekIsSUFBSSxxQkFBcUIsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUMvQixxQkFBcUIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO2dCQUNyRCxPQUFPLHFCQUFxQixDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQ2pDLENBQUM7UUFDRixDQUFDLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsRCxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDckQsa0JBQWtCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUM1RCxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDeEIsQ0FBQyxDQUFDLENBQUE7UUFFRixpQkFBaUI7UUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZ0JBQWdCLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNyRCxLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNO29CQUFFLFNBQVE7Z0JBQ3pDLDJEQUEyRDtnQkFDM0QsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUM5QyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzVCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDbEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7b0JBQ3BDLFNBQVEsQ0FBQyxtQkFBbUI7Z0JBQzdCLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxLQUFLLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUNqRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLENBQUE7Z0JBQzlCLENBQUM7Z0JBRUQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzdDLElBQUksQ0FBQyxTQUFTO29CQUFFLFNBQVEsQ0FBQyxzQkFBc0I7Z0JBQy9DLDRDQUE0QztnQkFDNUMsTUFBTSxZQUFZLEdBQUcsU0FBUyxDQUFDLGlCQUFpQixDQUFBO2dCQUNoRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLFFBQVE7Z0JBQ3hGLE1BQU0sRUFBRSxjQUFjLEVBQUUsZ0JBQWdCLEVBQUUsR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQ3BFLFlBQVksRUFDWixnQkFBZ0IsSUFBSSxFQUFFLENBQ3RCLENBQUE7Z0JBRUQsTUFBTSx1QkFBdUIsR0FBRyxZQUFZLENBQUMsTUFBTSxDQUNsRCxDQUFDLGFBQWEsRUFBRSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQ3ZELENBQUE7Z0JBRUQsaUJBQWlCO2dCQUNqQixNQUFNLG9CQUFvQixHQUFHLENBQUMsR0FBRyx1QkFBdUIsRUFBRSxHQUFHLGNBQWMsQ0FBQyxDQUFBO2dCQUM1RSxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO2dCQUN2RSxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsdUJBQXVCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtnQkFFbEUsNEVBQTRFO2dCQUM1RSxNQUFNLFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQTtnQkFFekQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUU7b0JBQ25CLGlCQUFpQixFQUFFLG9CQUFvQjtvQkFDdkMsYUFBYSxFQUFFLGdCQUFnQjtvQkFDL0IsV0FBVyxFQUFFLFdBQVc7b0JBQ3hCLE9BQU8sRUFBRSxVQUFVO2lCQUNuQixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xFLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU07b0JBQUUsU0FBUTtnQkFDekMsNEJBQTRCO2dCQUM1QixhQUFhO2dCQUNiLHdEQUF3RDtnQkFDeEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQzdDLElBQUksQ0FBQyxTQUFTO29CQUFFLFNBQVEsQ0FBQyxzQkFBc0I7Z0JBQy9DLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxHQUFHLFNBQVMsQ0FBQTtnQkFDdkMsTUFBTSxnQkFBZ0IsR0FBRyxTQUFTLENBQUMsYUFBYSxDQUFBO2dCQUNoRCxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUVwRSw4Q0FBOEM7Z0JBQzlDLElBQUksVUFBVSxHQUFHLFNBQVMsQ0FBQyxPQUFPLENBQUE7Z0JBRWxDLDhCQUE4QjtnQkFDOUIsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxJQUFJLFNBQVMsQ0FBQyxPQUFPLEtBQUssSUFBSSxFQUFFLENBQUM7b0JBQ3JGLHVGQUF1RjtvQkFDdkYsSUFBSSxTQUFTLENBQUMsT0FBTyxJQUFJLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxDQUFDO3dCQUNsRCxvREFBb0Q7d0JBQ3BELFVBQVUsR0FBRyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7b0JBQzlFLENBQUM7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRTtvQkFDbkIsYUFBYSxFQUFFLGdCQUFnQjtvQkFDL0IsT0FBTyxFQUFFLFVBQVU7b0JBQ25CLGtDQUFrQztvQkFDbEMsNEJBQTRCO2lCQUM1QixDQUFDLENBQUE7Z0JBQ0YsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFELEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLEtBQUssR0FBRyxDQUFDLE1BQU07b0JBQUUsU0FBUTtnQkFDekMsNEJBQTRCO2dCQUM1QixhQUFhO2dCQUNiLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUM3QyxJQUFJLENBQUMsU0FBUztvQkFBRSxTQUFRLENBQUMsc0JBQXNCO2dCQUMvQyxNQUFNLEVBQUUsaUJBQWlCLEVBQUUsR0FBRyxTQUFTLENBQUE7Z0JBQ3ZDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFO29CQUNuQixXQUFXLEVBQUUsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGlCQUFpQixDQUFDO29CQUM1RCw4QkFBOEI7b0JBQzlCLGtDQUFrQztpQkFDbEMsQ0FBQyxDQUFBO2dCQUNGLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELFVBQVUsQ0FBQyxHQUFRLEVBQUUsTUFBcUI7UUFDekMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQTtRQUN4QyxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsY0FBYyxDQUFDLEdBQVE7UUFDdEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxpQkFBaUIsRUFBRSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM1RSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE9BQU8sV0FBVyxDQUFBO1FBQ25CLENBQUM7UUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsTUFBTSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzFDLE9BQU8sa0JBQWtCLENBQUE7UUFDMUIsQ0FBQztRQUNELE9BQU8saUJBQWlCLENBQUE7SUFDekIsQ0FBQztJQUVELG1CQUFtQixDQUFDLFdBQXFCO1FBQ3hDLE1BQU0sYUFBYSxHQUFHLEVBQUUsQ0FBQTtRQUN4QixLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0QsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUMvQyxTQUFRO1lBQ1QsQ0FBQztZQUVELHNDQUFzQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUMvQyxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUVELE9BQU8sYUFBYSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxtQkFBbUIsQ0FBQyxZQUE4QixFQUFFLGdCQUFrQztRQUNyRiwrREFBK0Q7UUFDL0QsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO1FBQzFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQTtRQUU1QyxnRUFBZ0U7UUFDaEUsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXRELHFEQUFxRDtRQUNyRCxLQUFLLE1BQU0sYUFBYSxJQUFJLFlBQVksRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsQ0FBQTtnQkFDbEUsSUFBSSxRQUFRLElBQUksUUFBUSxDQUFDLElBQUksS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDOUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFBO2dCQUN0QyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxtREFBbUQ7UUFDbkQsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUM5QyxLQUFLLE1BQU0saUJBQWlCLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztZQUNsRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEVBQUUsQ0FBQztnQkFDOUMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO2dCQUN0RSxJQUFJLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO29CQUM5QyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtnQkFDeEMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxnQkFBZ0IsRUFBRSxnQkFBZ0IsRUFBRSxrQkFBa0IsRUFBRSxDQUFBO0lBQ2xGLENBQUM7SUFFRCx1QkFBdUIsQ0FBQyxXQUE2QjtRQUNwRCxLQUFLLE1BQU0sVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDL0QsSUFBSSxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsRUFBRSxDQUFDO2dCQUMvQyxTQUFRO1lBQ1QsQ0FBQztZQUNELElBQUksUUFBUSxDQUFDLFlBQVksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdkMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELFNBQVMsQ0FBQyxHQUFRLEVBQUUsSUFBa0M7UUFDckQsTUFBTSxRQUFRLEdBQUc7WUFDaEIsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzRCxHQUFHLElBQUk7U0FDUCxDQUFBO1FBRUQsc0NBQXNDO1FBQ3RDLElBQUksUUFBUSxDQUFDLE9BQU8sS0FBSyxJQUFJLElBQUksUUFBUSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25GLFFBQVEsQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUE7WUFDaEQsSUFBSSxRQUFRLENBQUMsT0FBTyxJQUFJLENBQUM7Z0JBQUUsUUFBUSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDbkQsQ0FBQztRQUVELElBQUksQ0FBQyxVQUFVLEdBQUc7WUFDakIsR0FBRyxJQUFJLENBQUMsVUFBVTtZQUNsQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxRQUFRO1NBQ3RCLENBQUE7SUFDRixDQUFDO0lBRUQsbUJBQW1CLENBQUMsR0FBUTtRQUMzQixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUUzQyxlQUFlO1FBQ2YsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsU0FBUyxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3RELENBQUM7SUFFRCx3QkFBd0IsQ0FBQyxHQUFRO1FBQ2hDLDhCQUE4QjtRQUM5QixNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sS0FBSyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQUUsT0FBTTtRQUNwQixJQUFJLENBQUMsVUFBVSxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFDN0Ysb0JBQW9CO1FBQ3BCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVPLGtCQUFrQixDQUFDLEdBQVE7UUFDbEMsTUFBTSxTQUFTLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7YUFDdkYsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO2FBQ25FLE1BQU0sQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsSUFBSSxRQUFRLENBQUMsSUFBSSxLQUFLLFVBQVUsQ0FBQyxDQUFBO1FBQ2xFLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxrQkFBa0I7UUFDakIsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsS0FBSyxXQUFXLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsY0FBYyxDQUFDLElBQVk7UUFDMUIsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU8sSUFBSSxDQUFBO1FBRWhDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU8sSUFBSSxDQUFBO1FBRXZCLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBRXhDLDJCQUEyQjtRQUMzQixJQUFJLGFBQWEsQ0FBQyxNQUFNLEtBQUssQ0FBQztZQUFFLE9BQU8sSUFBSSxDQUFBO1FBRTNDLHFDQUFxQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLEdBQUcsYUFBYSxDQUFDLE1BQU0sQ0FBQTtRQUNyRixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCxhQUFhLENBQUMsSUFBWTtRQUN6Qix1Q0FBdUM7UUFDdkMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxJQUFJLENBQUE7UUFFN0MsdURBQXVEO1FBQ3ZELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDckIsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQscUJBQXFCO1FBQ3JCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFFNUYsbURBQW1EO1FBQ25ELElBQUksVUFBVSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNuRCxDQUFDO1FBRUQscUNBQXFDO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLENBQUMsVUFBVSxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFBO1FBQ3JGLE9BQU8sT0FBTyxDQUFBO0lBQ2YsQ0FBQztJQUVELFdBQVcsQ0FBQyxHQUFrQjtRQUM3QixtQ0FBbUM7UUFDbkMsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7WUFBRSxPQUFNO1FBRTNDLGdDQUFnQztRQUNoQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLEtBQUs7WUFBRSxPQUFNO1FBRWxCLE1BQU0sRUFBRSxhQUFhLEVBQUUsR0FBRyxLQUFLLENBQUE7UUFFL0IsdUNBQXVDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNqQyxJQUFJLE1BQU0sS0FBSyxTQUFTO1lBQUUsT0FBTTtRQUVoQyxzQkFBc0I7UUFDdEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuRCxJQUFJLENBQUMsSUFBSTtZQUFFLE9BQU07UUFFakIsaUNBQWlDO1FBQ2pDLE1BQU0sTUFBTSxHQUNYLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU07UUFFbkIsZ0NBQWdDO1FBQ2hDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLENBQUMsK0JBQXVCLENBQUE7UUFFbEUsZ0NBQWdDO1FBQ2hDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBRUQsS0FBSyxDQUFDLFVBQVUsQ0FBQyxHQUFrQjtRQUNsQyw2QkFBNkI7UUFDN0IsSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFNO1FBRXhELHFDQUFxQztRQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxPQUFPO1lBQUUsT0FBTTtRQUVwQiw2QkFBNkI7UUFDN0IsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNwRSxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU07UUFFbEIsd0JBQXdCO1FBQ3hCLE1BQU0sTUFBTSxHQUNYLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRTtZQUM5QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU07UUFFbkIsNkJBQTZCO1FBQzdCLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FDM0MsRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLEdBQUcsRUFBRSxPQUFPLEVBQUUsRUFBRSxlQUFlLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFDM0QsTUFBTSxDQUNOLENBQUE7SUFDRixDQUFDO0lBRUQsc0JBQXNCLENBQUMsSUFBdUM7UUFDN0QsTUFBTSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUN6Qix1Q0FBdUM7UUFDdkMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDaEQsSUFBSSxjQUFjO1lBQUUsT0FBTTtRQUMxQixLQUFLLE1BQU0sR0FBRyxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNuQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsMEJBQTBCLENBQUMsRUFBRSxHQUFHLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQ3pGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQTlaWSxxQkFBcUI7SUFvQi9CLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsZ0JBQWdCLENBQUE7SUFDaEIsV0FBQSxpQkFBaUIsQ0FBQTtHQXhCUCxxQkFBcUIsQ0E4WmpDOztBQUVELGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixvQ0FBNEIsQ0FBQSxDQUFDLDRCQUE0QjtBQU94SCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLE1BQU07SUFPakQsWUFDQyxFQUFFLE1BQU0sRUFBMkIsRUFDWixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFGaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUpwRixZQUFPLEdBQUcsQ0FBQyxDQUFBO1FBUVYsSUFBSSxDQUFDLEVBQUUsR0FBRyxZQUFZLEVBQUUsQ0FBQTtRQUN4QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQix1QkFBdUI7UUFDdkIsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFbEMsc0JBQXNCO1FBQ3RCLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUEsQ0FBQywwR0FBMEc7UUFDdEksSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxHQUFHLFFBQVEsQ0FBQTtRQUNuQyxJQUFJLENBQUMsS0FBSyxDQUFDLGNBQWMsR0FBRyxVQUFVLENBQUE7UUFDdEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQTtRQUN2QixJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDMUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFBO1FBQ2pDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUMzQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxRQUFRLENBQUE7UUFFOUIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7UUFDcEIsTUFBTSxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBRTdCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNyRCxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsR0FBRyxJQUFJLElBQUksQ0FBQTtZQUMxQyxNQUFNLEdBQUcsR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsUUFBUSxFQUFFLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBZ0MsQ0FBQyxDQUFBO1lBQzlGLElBQUksQ0FBQyxHQUFHO2dCQUFFLE9BQU07WUFDaEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ25ELElBQUksQ0FBQyxTQUFTLENBQ2IsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUE7Z0JBQzdCLEdBQUcsQ0FBQyxRQUFRLENBQUMsRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFnQyxDQUFDLENBQUE7WUFDNUQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVNLEtBQUs7UUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDZixDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDckIsQ0FBQztJQUVNLFdBQVc7UUFDakIsT0FBTztZQUNOLFVBQVUsNkRBQXFEO1NBQy9ELENBQUE7SUFDRixDQUFDO0lBRWUsT0FBTztRQUN0QixJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JDLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0NBQ0QsQ0FBQTtBQWxFSyw2QkFBNkI7SUFTaEMsV0FBQSxxQkFBcUIsQ0FBQTtHQVRsQiw2QkFBNkIsQ0FrRWxDO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBCQUEwQjtZQUM5QixFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsc0JBQXNCLEVBQUUsd0JBQXdCLENBQUM7WUFDbEUsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssd0JBQWdCO2dCQUNuRSxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyx3QkFBZ0IsRUFBRTtnQkFDN0QsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDOUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVwRCxNQUFNLFNBQVMsR0FBRyxpQkFBaUIsQ0FBQyxTQUFTLENBQUE7UUFDN0MsSUFBSSxDQUFDLFNBQVM7WUFBRSxPQUFNO1FBRXRCLE1BQU0sZUFBZSxHQUFHLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEUsSUFBSSxDQUFDLGVBQWU7WUFBRSxPQUFNO1FBQzVCLE1BQU0sT0FBTyxHQUFHLGVBQWUsQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFBO1FBRTVDLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDckQsSUFBSSxDQUFDLE1BQU07WUFBRSxPQUFNO1FBRW5CLGNBQWMsQ0FBQyxPQUFPLENBQUMsYUFBYSxFQUFFLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLGVBQWUsQ0FBQyxVQUFVLENBQUMsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUV4RCxzREFBc0Q7UUFDdEQsTUFBTSxXQUFXLEdBQUcsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELElBQUksV0FBVyxLQUFLLElBQUksRUFBRSxDQUFDO1lBQzFCLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMzQyxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLHdCQUF3QixDQUFDO1lBQ2xFLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLDRCQUFvQjtnQkFDdkUsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsNEJBQW9CLEVBQUU7Z0JBQ2pFLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTTtRQUV0QixNQUFNLGVBQWUsR0FBRyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RFLElBQUksQ0FBQyxlQUFlO1lBQUUsT0FBTTtRQUM1QixNQUFNLE9BQU8sR0FBRyxlQUFlLENBQUMsT0FBTyxJQUFJLENBQUMsQ0FBQTtRQUU1QyxNQUFNLE1BQU0sR0FBRyxlQUFlLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JELElBQUksQ0FBQyxNQUFNO1lBQUUsT0FBTTtRQUVuQixjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNqRSxlQUFlLENBQUMsVUFBVSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFeEQsc0RBQXNEO1FBQ3RELE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxJQUFJLFdBQVcsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUMxQixpQkFBaUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCx5QkFBeUI7QUFDekIsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsNEJBQTRCLENBQUM7WUFDeEUsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssNkJBQW9CO2dCQUN2RSxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyw2QkFBb0IsRUFBRTtnQkFDakUsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxJQUFJLFdBQVcsS0FBSyxJQUFJO1lBQUUsT0FBTTtRQUVoQyxjQUFjLENBQUMsT0FBTyxDQUFDLGVBQWUsRUFBRSxFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDOUUsaUJBQWlCLENBQUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQzNDLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCw2QkFBNkI7QUFDN0IsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDZCQUE2QjtZQUNqQyxFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsd0JBQXdCLEVBQUUsZ0NBQWdDLENBQUM7WUFDNUUsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssMkJBQWtCO2dCQUNyRSxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRywyQkFBa0IsRUFBRTtnQkFDL0QsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sV0FBVyxHQUFHLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hELElBQUksV0FBVyxLQUFLLElBQUk7WUFBRSxPQUFNO1FBRWhDLGNBQWMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUNsRixpQkFBaUIsQ0FBQyxXQUFXLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDM0MsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELHdCQUF3QjtBQUN4QixlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsNEJBQTRCO1lBQ2hDLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLFNBQVMsQ0FBQyx1QkFBdUIsRUFBRSx1Q0FBdUMsQ0FBQztZQUNsRixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyw4QkFBcUI7Z0JBQ3hFLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxHQUFHLDhCQUFxQixFQUFFO2dCQUNsRSxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsTUFBTSxVQUFVLEdBQUcsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELElBQUksVUFBVSxLQUFLLElBQUk7WUFBRSxPQUFNO1FBRS9CLGNBQWMsQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM3RSxNQUFNLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsNEJBQTRCO0FBQzVCLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSw0QkFBNEI7WUFDaEMsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLHVCQUF1QixFQUFFLDJDQUEyQyxDQUFDO1lBQ3RGLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxLQUFLLDZCQUFvQjtnQkFDdkUsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDLEdBQUcsNkJBQW9CLEVBQUU7Z0JBQ2pFLE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDOUQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVwRCxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUN0RCxJQUFJLFVBQVUsS0FBSyxJQUFJO1lBQUUsT0FBTTtRQUUvQixjQUFjLENBQUMsT0FBTyxDQUFDLGNBQWMsRUFBRSxFQUFFLFNBQVMsRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7SUFDL0MsQ0FBQztDQUNELENBQ0QsQ0FBQTtBQUVELDZCQUE2QjtBQUM3QixlQUFlLENBQ2QsS0FBTSxTQUFRLE9BQU87SUFDcEI7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsMEJBQTBCO1lBQzlCLEVBQUUsRUFBRSxJQUFJO1lBQ1IsS0FBSyxFQUFFLFNBQVMsQ0FBQyxzQkFBc0IsRUFBRSw2Q0FBNkMsQ0FBQztZQUN2RixVQUFVLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEdBQUcsTUFBTSxDQUFDLEtBQUssd0JBQWdCO2dCQUNsRCxNQUFNLDBDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlELE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELE1BQU0sU0FBUyxHQUFHLGlCQUFpQixDQUFDLFNBQVMsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUztZQUFFLE9BQU07UUFFdEIsY0FBYyxDQUFDLE9BQU8sQ0FBQyxhQUFhLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN6RCxlQUFlLENBQUMsMEJBQTBCLENBQUM7WUFDMUMsR0FBRyxFQUFFLFNBQVM7WUFDZCxRQUFRLEVBQUUsUUFBUTtZQUNsQixZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsNkJBQTZCO0FBQzdCLGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwwQkFBMEI7WUFDOUIsRUFBRSxFQUFFLElBQUk7WUFDUixLQUFLLEVBQUUsU0FBUyxDQUFDLHNCQUFzQixFQUFFLDZDQUE2QyxDQUFDO1lBQ3ZGLFVBQVUsRUFBRTtnQkFDWCxPQUFPLEVBQUUsTUFBTSxDQUFDLEdBQUcsR0FBRyxNQUFNLENBQUMsS0FBSyw0QkFBb0I7Z0JBQ3RELE1BQU0sMENBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDOUQsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsTUFBTSxTQUFTLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTO1lBQUUsT0FBTTtRQUV0QixjQUFjLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELGVBQWUsQ0FBQywwQkFBMEIsQ0FBQztZQUMxQyxHQUFHLEVBQUUsU0FBUztZQUNkLFFBQVEsRUFBRSxRQUFRO1lBQ2xCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCx1Q0FBdUM7QUFDdkMsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsMEJBQTBCLEVBQUUsMENBQTBDLENBQUM7WUFDeEYsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLHdCQUFnQjtnQkFDdEQsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELElBQUksaUJBQWlCLENBQUMsa0JBQWtCLEVBQUU7WUFBRSxPQUFNO1FBRWxELGNBQWMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7Q0FDRCxDQUNELENBQUE7QUFFRCx1Q0FBdUM7QUFDdkMsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLCtCQUErQjtZQUNuQyxFQUFFLEVBQUUsSUFBSTtZQUNSLEtBQUssRUFBRSxTQUFTLENBQUMsMEJBQTBCLEVBQUUsMENBQTBDLENBQUM7WUFDeEYsVUFBVSxFQUFFO2dCQUNYLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQyxLQUFLLDRCQUFvQjtnQkFDMUQsTUFBTSwwQ0FBZ0M7YUFDdEM7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUM5RCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXBELElBQUksaUJBQWlCLENBQUMsa0JBQWtCLEVBQUU7WUFBRSxPQUFNO1FBRWxELGNBQWMsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxpQkFBaUIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ2pFLENBQUM7Q0FDRCxDQUNELENBQUEifQ==