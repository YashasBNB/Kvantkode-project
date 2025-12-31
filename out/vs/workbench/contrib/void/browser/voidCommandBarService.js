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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZENvbW1hbmRCYXJTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRDb21tYW5kQmFyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFFbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFNOUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsMEJBQTBCLEVBQzFCLDZCQUE2QixFQUM3Qiw2QkFBNkIsRUFDN0IsNEJBQTRCLEVB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