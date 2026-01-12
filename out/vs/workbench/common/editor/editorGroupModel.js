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
var EditorGroupModel_1;
import { Event, Emitter } from '../../../base/common/event.js';
import { EditorExtensions, SideBySideEditor, EditorCloseContext, } from '../editor.js';
import { EditorInput } from './editorInput.js';
import { SideBySideEditorInput } from './sideBySideEditorInput.js';
import { IInstantiationService } from '../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService, } from '../../../platform/configuration/common/configuration.js';
import { dispose, Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { coalesce } from '../../../base/common/arrays.js';
const EditorOpenPositioning = {
    LEFT: 'left',
    RIGHT: 'right',
    FIRST: 'first',
    LAST: 'last',
};
export function isSerializedEditorGroupModel(group) {
    const candidate = group;
    return !!(candidate &&
        typeof candidate === 'object' &&
        Array.isArray(candidate.editors) &&
        Array.isArray(candidate.mru));
}
export function isGroupEditorChangeEvent(e) {
    const candidate = e;
    return candidate.editor && candidate.editorIndex !== undefined;
}
export function isGroupEditorOpenEvent(e) {
    const candidate = e;
    return candidate.kind === 5 /* GroupModelChangeKind.EDITOR_OPEN */ && candidate.editorIndex !== undefined;
}
export function isGroupEditorMoveEvent(e) {
    const candidate = e;
    return (candidate.kind === 7 /* GroupModelChangeKind.EDITOR_MOVE */ &&
        candidate.editorIndex !== undefined &&
        candidate.oldEditorIndex !== undefined);
}
export function isGroupEditorCloseEvent(e) {
    const candidate = e;
    return (candidate.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ &&
        candidate.editorIndex !== undefined &&
        candidate.context !== undefined &&
        candidate.sticky !== undefined);
}
let EditorGroupModel = class EditorGroupModel extends Disposable {
    static { EditorGroupModel_1 = this; }
    static { this.IDS = 0; }
    get id() {
        return this._id;
    }
    get active() {
        return this.selection[0] ?? null;
    }
    constructor(labelOrSerializedGroup, instantiationService, configurationService) {
        super();
        this.instantiationService = instantiationService;
        this.configurationService = configurationService;
        //#region events
        this._onDidModelChange = this._register(new Emitter({
            leakWarningThreshold: 500 /* increased for users with hundreds of inputs opened */,
        }));
        this.onDidModelChange = this._onDidModelChange.event;
        this.editors = [];
        this.mru = [];
        this.editorListeners = new Set();
        this.locked = false;
        this.selection = []; // editors in selected state, first one is active
        this.preview = null; // editor in preview state
        this.sticky = -1; // index of first editor in sticky state
        this.transient = new Set(); // editors in transient state
        if (isSerializedEditorGroupModel(labelOrSerializedGroup)) {
            this._id = this.deserialize(labelOrSerializedGroup);
        }
        else {
            this._id = EditorGroupModel_1.IDS++;
        }
        this.onConfigurationUpdated();
        this.registerListeners();
    }
    registerListeners() {
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationUpdated(e)));
    }
    onConfigurationUpdated(e) {
        if (e &&
            !e.affectsConfiguration('workbench.editor.openPositioning') &&
            !e.affectsConfiguration('workbench.editor.focusRecentEditorAfterClose')) {
            return;
        }
        this.editorOpenPositioning = this.configurationService.getValue('workbench.editor.openPositioning');
        this.focusRecentEditorAfterClose = this.configurationService.getValue('workbench.editor.focusRecentEditorAfterClose');
    }
    get count() {
        return this.editors.length;
    }
    get stickyCount() {
        return this.sticky + 1;
    }
    getEditors(order, options) {
        const editors = order === 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */ ? this.mru.slice(0) : this.editors.slice(0);
        if (options?.excludeSticky) {
            // MRU: need to check for index on each
            if (order === 0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */) {
                return editors.filter((editor) => !this.isSticky(editor));
            }
            // Sequential: simply start after sticky index
            return editors.slice(this.sticky + 1);
        }
        return editors;
    }
    getEditorByIndex(index) {
        return this.editors[index];
    }
    get activeEditor() {
        return this.active;
    }
    isActive(candidate) {
        return this.matches(this.active, candidate);
    }
    get previewEditor() {
        return this.preview;
    }
    openEditor(candidate, options) {
        const makeSticky = options?.sticky || (typeof options?.index === 'number' && this.isSticky(options.index));
        const makePinned = options?.pinned || options?.sticky;
        const makeTransient = !!options?.transient;
        const makeActive = options?.active || !this.activeEditor || (!makePinned && this.preview === this.activeEditor);
        const existingEditorAndIndex = this.findEditor(candidate, options);
        // New editor
        if (!existingEditorAndIndex) {
            const newEditor = candidate;
            const indexOfActive = this.indexOf(this.active);
            // Insert into specific position
            let targetIndex;
            if (options && typeof options.index === 'number') {
                targetIndex = options.index;
            }
            // Insert to the BEGINNING
            else if (this.editorOpenPositioning === EditorOpenPositioning.FIRST) {
                targetIndex = 0;
                // Always make sure targetIndex is after sticky editors
                // unless we are explicitly told to make the editor sticky
                if (!makeSticky && this.isSticky(targetIndex)) {
                    targetIndex = this.sticky + 1;
                }
            }
            // Insert to the END
            else if (this.editorOpenPositioning === EditorOpenPositioning.LAST) {
                targetIndex = this.editors.length;
            }
            // Insert to LEFT or RIGHT of active editor
            else {
                // Insert to the LEFT of active editor
                if (this.editorOpenPositioning === EditorOpenPositioning.LEFT) {
                    if (indexOfActive === 0 || !this.editors.length) {
                        targetIndex = 0; // to the left becoming first editor in list
                    }
                    else {
                        targetIndex = indexOfActive; // to the left of active editor
                    }
                }
                // Insert to the RIGHT of active editor
                else {
                    targetIndex = indexOfActive + 1;
                }
                // Always make sure targetIndex is after sticky editors
                // unless we are explicitly told to make the editor sticky
                if (!makeSticky && this.isSticky(targetIndex)) {
                    targetIndex = this.sticky + 1;
                }
            }
            // If the editor becomes sticky, increment the sticky index and adjust
            // the targetIndex to be at the end of sticky editors unless already.
            if (makeSticky) {
                this.sticky++;
                if (!this.isSticky(targetIndex)) {
                    targetIndex = this.sticky;
                }
            }
            // Insert into our list of editors if pinned or we have no preview editor
            if (makePinned || !this.preview) {
                this.splice(targetIndex, false, newEditor);
            }
            // Handle transient
            if (makeTransient) {
                this.doSetTransient(newEditor, targetIndex, true);
            }
            // Handle preview
            if (!makePinned) {
                // Replace existing preview with this editor if we have a preview
                if (this.preview) {
                    const indexOfPreview = this.indexOf(this.preview);
                    if (targetIndex > indexOfPreview) {
                        targetIndex--; // accomodate for the fact that the preview editor closes
                    }
                    this.replaceEditor(this.preview, newEditor, targetIndex, !makeActive);
                }
                this.preview = newEditor;
            }
            // Listeners
            this.registerEditorListeners(newEditor);
            // Event
            const event = {
                kind: 5 /* GroupModelChangeKind.EDITOR_OPEN */,
                editor: newEditor,
                editorIndex: targetIndex,
            };
            this._onDidModelChange.fire(event);
            // Handle active editor / selected editors
            this.setSelection(makeActive ? newEditor : this.activeEditor, options?.inactiveSelection ?? []);
            return {
                editor: newEditor,
                isNew: true,
            };
        }
        // Existing editor
        else {
            const [existingEditor, existingEditorIndex] = existingEditorAndIndex;
            // Update transient (existing editors do not turn transient if they were not before)
            this.doSetTransient(existingEditor, existingEditorIndex, makeTransient === false ? false : this.isTransient(existingEditor));
            // Pin it
            if (makePinned) {
                this.doPin(existingEditor, existingEditorIndex);
            }
            // Handle active editor / selected editors
            this.setSelection(makeActive ? existingEditor : this.activeEditor, options?.inactiveSelection ?? []);
            // Respect index
            if (options && typeof options.index === 'number') {
                this.moveEditor(existingEditor, options.index);
            }
            // Stick it (intentionally after the moveEditor call in case
            // the editor was already moved into the sticky range)
            if (makeSticky) {
                this.doStick(existingEditor, this.indexOf(existingEditor));
            }
            return {
                editor: existingEditor,
                isNew: false,
            };
        }
    }
    registerEditorListeners(editor) {
        const listeners = new DisposableStore();
        this.editorListeners.add(listeners);
        // Re-emit disposal of editor input as our own event
        listeners.add(Event.once(editor.onWillDispose)(() => {
            const editorIndex = this.editors.indexOf(editor);
            if (editorIndex >= 0) {
                const event = {
                    kind: 15 /* GroupModelChangeKind.EDITOR_WILL_DISPOSE */,
                    editor,
                    editorIndex,
                };
                this._onDidModelChange.fire(event);
            }
        }));
        // Re-Emit dirty state changes
        listeners.add(editor.onDidChangeDirty(() => {
            const event = {
                kind: 14 /* GroupModelChangeKind.EDITOR_DIRTY */,
                editor,
                editorIndex: this.editors.indexOf(editor),
            };
            this._onDidModelChange.fire(event);
        }));
        // Re-Emit label changes
        listeners.add(editor.onDidChangeLabel(() => {
            const event = {
                kind: 9 /* GroupModelChangeKind.EDITOR_LABEL */,
                editor,
                editorIndex: this.editors.indexOf(editor),
            };
            this._onDidModelChange.fire(event);
        }));
        // Re-Emit capability changes
        listeners.add(editor.onDidChangeCapabilities(() => {
            const event = {
                kind: 10 /* GroupModelChangeKind.EDITOR_CAPABILITIES */,
                editor,
                editorIndex: this.editors.indexOf(editor),
            };
            this._onDidModelChange.fire(event);
        }));
        // Clean up dispose listeners once the editor gets closed
        listeners.add(this.onDidModelChange((event) => {
            if (event.kind === 6 /* GroupModelChangeKind.EDITOR_CLOSE */ && event.editor?.matches(editor)) {
                dispose(listeners);
                this.editorListeners.delete(listeners);
            }
        }));
    }
    replaceEditor(toReplace, replaceWith, replaceIndex, openNext = true) {
        const closeResult = this.doCloseEditor(toReplace, EditorCloseContext.REPLACE, openNext); // optimization to prevent multiple setActive() in one call
        // We want to first add the new editor into our model before emitting the close event because
        // firing the close event can trigger a dispose on the same editor that is now being added.
        // This can lead into opening a disposed editor which is not what we want.
        this.splice(replaceIndex, false, replaceWith);
        if (closeResult) {
            const event = {
                kind: 6 /* GroupModelChangeKind.EDITOR_CLOSE */,
                ...closeResult,
            };
            this._onDidModelChange.fire(event);
        }
    }
    closeEditor(candidate, context = EditorCloseContext.UNKNOWN, openNext = true) {
        const closeResult = this.doCloseEditor(candidate, context, openNext);
        if (closeResult) {
            const event = {
                kind: 6 /* GroupModelChangeKind.EDITOR_CLOSE */,
                ...closeResult,
            };
            this._onDidModelChange.fire(event);
            return closeResult;
        }
        return undefined;
    }
    doCloseEditor(candidate, context, openNext) {
        const index = this.indexOf(candidate);
        if (index === -1) {
            return undefined; // not found
        }
        const editor = this.editors[index];
        const sticky = this.isSticky(index);
        // Active editor closed
        const isActiveEditor = this.active === editor;
        if (openNext && isActiveEditor) {
            // More than one editor
            if (this.mru.length > 1) {
                let newActive;
                if (this.focusRecentEditorAfterClose) {
                    newActive = this.mru[1]; // active editor is always first in MRU, so pick second editor after as new active
                }
                else {
                    if (index === this.editors.length - 1) {
                        newActive = this.editors[index - 1]; // last editor is closed, pick previous as new active
                    }
                    else {
                        newActive = this.editors[index + 1]; // pick next editor as new active
                    }
                }
                // Select editor as active
                const newInactiveSelectedEditors = this.selection.filter((selected) => selected !== editor && selected !== newActive);
                this.doSetSelection(newActive, this.editors.indexOf(newActive), newInactiveSelectedEditors);
            }
            // Last editor closed: clear selection
            else {
                this.doSetSelection(null, undefined, []);
            }
        }
        // Inactive editor closed
        else if (!isActiveEditor) {
            // Remove editor from inactive selection
            if (this.doIsSelected(editor)) {
                const newInactiveSelectedEditors = this.selection.filter((selected) => selected !== editor && selected !== this.activeEditor);
                this.doSetSelection(this.activeEditor, this.indexOf(this.activeEditor), newInactiveSelectedEditors);
            }
        }
        // Preview Editor closed
        if (this.preview === editor) {
            this.preview = null;
        }
        // Remove from transient
        this.transient.delete(editor);
        // Remove from arrays
        this.splice(index, true);
        // Event
        return { editor, sticky, editorIndex: index, context };
    }
    moveEditor(candidate, toIndex) {
        // Ensure toIndex is in bounds of our model
        if (toIndex >= this.editors.length) {
            toIndex = this.editors.length - 1;
        }
        else if (toIndex < 0) {
            toIndex = 0;
        }
        const index = this.indexOf(candidate);
        if (index < 0 || toIndex === index) {
            return;
        }
        const editor = this.editors[index];
        const sticky = this.sticky;
        // Adjust sticky index: editor moved out of sticky state into unsticky state
        if (this.isSticky(index) && toIndex > this.sticky) {
            this.sticky--;
        }
        // ...or editor moved into sticky state from unsticky state
        else if (!this.isSticky(index) && toIndex <= this.sticky) {
            this.sticky++;
        }
        // Move
        this.editors.splice(index, 1);
        this.editors.splice(toIndex, 0, editor);
        // Move Event
        const event = {
            kind: 7 /* GroupModelChangeKind.EDITOR_MOVE */,
            editor,
            oldEditorIndex: index,
            editorIndex: toIndex,
        };
        this._onDidModelChange.fire(event);
        // Sticky Event (if sticky changed as part of the move)
        if (sticky !== this.sticky) {
            const event = {
                kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
                editor,
                editorIndex: toIndex,
            };
            this._onDidModelChange.fire(event);
        }
        return editor;
    }
    setActive(candidate) {
        let result = undefined;
        if (!candidate) {
            this.setGroupActive();
        }
        else {
            result = this.setEditorActive(candidate);
        }
        return result;
    }
    setGroupActive() {
        // We do not really keep the `active` state in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 0 /* GroupModelChangeKind.GROUP_ACTIVE */ });
    }
    setEditorActive(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doSetSelection(editor, editorIndex, []);
        return editor;
    }
    get selectedEditors() {
        return this.editors.filter((editor) => this.doIsSelected(editor)); // return in sequential order
    }
    isSelected(editorCandidateOrIndex) {
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = this.findEditor(editorCandidateOrIndex)?.[0];
        }
        return !!editor && this.doIsSelected(editor);
    }
    doIsSelected(editor) {
        return this.selection.includes(editor);
    }
    setSelection(activeSelectedEditorCandidate, inactiveSelectedEditorCandidates) {
        const res = this.findEditor(activeSelectedEditorCandidate);
        if (!res) {
            return; // not found
        }
        const [activeSelectedEditor, activeSelectedEditorIndex] = res;
        const inactiveSelectedEditors = new Set();
        for (const inactiveSelectedEditorCandidate of inactiveSelectedEditorCandidates) {
            const res = this.findEditor(inactiveSelectedEditorCandidate);
            if (!res) {
                return; // not found
            }
            const [inactiveSelectedEditor] = res;
            if (inactiveSelectedEditor === activeSelectedEditor) {
                continue; // already selected
            }
            inactiveSelectedEditors.add(inactiveSelectedEditor);
        }
        this.doSetSelection(activeSelectedEditor, activeSelectedEditorIndex, Array.from(inactiveSelectedEditors));
    }
    doSetSelection(activeSelectedEditor, activeSelectedEditorIndex, inactiveSelectedEditors) {
        const previousActiveEditor = this.activeEditor;
        const previousSelection = this.selection;
        let newSelection;
        if (activeSelectedEditor) {
            newSelection = [activeSelectedEditor, ...inactiveSelectedEditors];
        }
        else {
            newSelection = [];
        }
        // Update selection
        this.selection = newSelection;
        // Update active editor if it has changed
        const activeEditorChanged = activeSelectedEditor &&
            typeof activeSelectedEditorIndex === 'number' &&
            previousActiveEditor !== activeSelectedEditor;
        if (activeEditorChanged) {
            // Bring to front in MRU list
            const mruIndex = this.indexOf(activeSelectedEditor, this.mru);
            this.mru.splice(mruIndex, 1);
            this.mru.unshift(activeSelectedEditor);
            // Event
            const event = {
                kind: 8 /* GroupModelChangeKind.EDITOR_ACTIVE */,
                editor: activeSelectedEditor,
                editorIndex: activeSelectedEditorIndex,
            };
            this._onDidModelChange.fire(event);
        }
        // Fire event if the selection has changed
        if (activeEditorChanged ||
            previousSelection.length !== newSelection.length ||
            previousSelection.some((editor) => !newSelection.includes(editor))) {
            const event = {
                kind: 4 /* GroupModelChangeKind.EDITORS_SELECTION */,
            };
            this._onDidModelChange.fire(event);
        }
    }
    setIndex(index) {
        // We do not really keep the `index` in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 1 /* GroupModelChangeKind.GROUP_INDEX */ });
    }
    setLabel(label) {
        // We do not really keep the `label` in our model because
        // it has no special meaning to us here. But for consistency
        // we emit a `onDidModelChange` event so that components can
        // react.
        this._onDidModelChange.fire({ kind: 2 /* GroupModelChangeKind.GROUP_LABEL */ });
    }
    pin(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doPin(editor, editorIndex);
        return editor;
    }
    doPin(editor, editorIndex) {
        if (this.isPinned(editor)) {
            return; // can only pin a preview editor
        }
        // Clear Transient
        this.setTransient(editor, false);
        // Convert the preview editor to be a pinned editor
        this.preview = null;
        // Event
        const event = {
            kind: 11 /* GroupModelChangeKind.EDITOR_PIN */,
            editor,
            editorIndex,
        };
        this._onDidModelChange.fire(event);
    }
    unpin(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doUnpin(editor, editorIndex);
        return editor;
    }
    doUnpin(editor, editorIndex) {
        if (!this.isPinned(editor)) {
            return; // can only unpin a pinned editor
        }
        // Set new
        const oldPreview = this.preview;
        this.preview = editor;
        // Event
        const event = {
            kind: 11 /* GroupModelChangeKind.EDITOR_PIN */,
            editor,
            editorIndex,
        };
        this._onDidModelChange.fire(event);
        // Close old preview editor if any
        if (oldPreview) {
            this.closeEditor(oldPreview, EditorCloseContext.UNPIN);
        }
    }
    isPinned(editorCandidateOrIndex) {
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = editorCandidateOrIndex;
        }
        return !this.matches(this.preview, editor);
    }
    stick(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doStick(editor, editorIndex);
        return editor;
    }
    doStick(editor, editorIndex) {
        if (this.isSticky(editorIndex)) {
            return; // can only stick a non-sticky editor
        }
        // Pin editor
        this.pin(editor);
        // Move editor to be the last sticky editor
        const newEditorIndex = this.sticky + 1;
        this.moveEditor(editor, newEditorIndex);
        // Adjust sticky index
        this.sticky++;
        // Event
        const event = {
            kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
            editor,
            editorIndex: newEditorIndex,
        };
        this._onDidModelChange.fire(event);
    }
    unstick(candidate) {
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doUnstick(editor, editorIndex);
        return editor;
    }
    doUnstick(editor, editorIndex) {
        if (!this.isSticky(editorIndex)) {
            return; // can only unstick a sticky editor
        }
        // Move editor to be the first non-sticky editor
        const newEditorIndex = this.sticky;
        this.moveEditor(editor, newEditorIndex);
        // Adjust sticky index
        this.sticky--;
        // Event
        const event = {
            kind: 13 /* GroupModelChangeKind.EDITOR_STICKY */,
            editor,
            editorIndex: newEditorIndex,
        };
        this._onDidModelChange.fire(event);
    }
    isSticky(candidateOrIndex) {
        if (this.sticky < 0) {
            return false; // no sticky editor
        }
        let index;
        if (typeof candidateOrIndex === 'number') {
            index = candidateOrIndex;
        }
        else {
            index = this.indexOf(candidateOrIndex);
        }
        if (index < 0) {
            return false;
        }
        return index <= this.sticky;
    }
    setTransient(candidate, transient) {
        if (!transient && this.transient.size === 0) {
            return; // no transient editor
        }
        const res = this.findEditor(candidate);
        if (!res) {
            return; // not found
        }
        const [editor, editorIndex] = res;
        this.doSetTransient(editor, editorIndex, transient);
        return editor;
    }
    doSetTransient(editor, editorIndex, transient) {
        if (transient) {
            if (this.transient.has(editor)) {
                return;
            }
            this.transient.add(editor);
        }
        else {
            if (!this.transient.has(editor)) {
                return;
            }
            this.transient.delete(editor);
        }
        // Event
        const event = {
            kind: 12 /* GroupModelChangeKind.EDITOR_TRANSIENT */,
            editor,
            editorIndex,
        };
        this._onDidModelChange.fire(event);
    }
    isTransient(editorCandidateOrIndex) {
        if (this.transient.size === 0) {
            return false; // no transient editor
        }
        let editor;
        if (typeof editorCandidateOrIndex === 'number') {
            editor = this.editors[editorCandidateOrIndex];
        }
        else {
            editor = this.findEditor(editorCandidateOrIndex)?.[0];
        }
        return !!editor && this.transient.has(editor);
    }
    splice(index, del, editor) {
        const editorToDeleteOrReplace = this.editors[index];
        // Perform on sticky index
        if (del && this.isSticky(index)) {
            this.sticky--;
        }
        // Perform on editors array
        if (editor) {
            this.editors.splice(index, del ? 1 : 0, editor);
        }
        else {
            this.editors.splice(index, del ? 1 : 0);
        }
        // Perform on MRU
        {
            // Add
            if (!del && editor) {
                if (this.mru.length === 0) {
                    // the list of most recent editors is empty
                    // so this editor can only be the most recent
                    this.mru.push(editor);
                }
                else {
                    // we have most recent editors. as such we
                    // put this newly opened editor right after
                    // the current most recent one because it cannot
                    // be the most recently active one unless
                    // it becomes active. but it is still more
                    // active then any other editor in the list.
                    this.mru.splice(1, 0, editor);
                }
            }
            // Remove / Replace
            else {
                const indexInMRU = this.indexOf(editorToDeleteOrReplace, this.mru);
                // Remove
                if (del && !editor) {
                    this.mru.splice(indexInMRU, 1); // remove from MRU
                }
                // Replace
                else if (del && editor) {
                    this.mru.splice(indexInMRU, 1, editor); // replace MRU at location
                }
            }
        }
    }
    indexOf(candidate, editors = this.editors, options) {
        let index = -1;
        if (!candidate) {
            return index;
        }
        for (let i = 0; i < editors.length; i++) {
            const editor = editors[i];
            if (this.matches(editor, candidate, options)) {
                // If we are to support side by side matching, it is possible that
                // a better direct match is found later. As such, we continue finding
                // a matching editor and prefer that match over the side by side one.
                if (options?.supportSideBySide &&
                    editor instanceof SideBySideEditorInput &&
                    !(candidate instanceof SideBySideEditorInput)) {
                    index = i;
                }
                else {
                    index = i;
                    break;
                }
            }
        }
        return index;
    }
    findEditor(candidate, options) {
        const index = this.indexOf(candidate, this.editors, options);
        if (index === -1) {
            return undefined;
        }
        return [this.editors[index], index];
    }
    isFirst(candidate, editors = this.editors) {
        return this.matches(editors[0], candidate);
    }
    isLast(candidate, editors = this.editors) {
        return this.matches(editors[editors.length - 1], candidate);
    }
    contains(candidate, options) {
        return this.indexOf(candidate, this.editors, options) !== -1;
    }
    matches(editor, candidate, options) {
        if (!editor || !candidate) {
            return false;
        }
        if (options?.supportSideBySide &&
            editor instanceof SideBySideEditorInput &&
            !(candidate instanceof SideBySideEditorInput)) {
            switch (options.supportSideBySide) {
                case SideBySideEditor.ANY:
                    if (this.matches(editor.primary, candidate, options) ||
                        this.matches(editor.secondary, candidate, options)) {
                        return true;
                    }
                    break;
                case SideBySideEditor.BOTH:
                    if (this.matches(editor.primary, candidate, options) &&
                        this.matches(editor.secondary, candidate, options)) {
                        return true;
                    }
                    break;
            }
        }
        const strictEquals = editor === candidate;
        if (options?.strictEquals) {
            return strictEquals;
        }
        return strictEquals || editor.matches(candidate);
    }
    get isLocked() {
        return this.locked;
    }
    lock(locked) {
        if (this.isLocked !== locked) {
            this.locked = locked;
            this._onDidModelChange.fire({ kind: 3 /* GroupModelChangeKind.GROUP_LOCKED */ });
        }
    }
    clone() {
        const clone = this.instantiationService.createInstance(EditorGroupModel_1, undefined);
        // Copy over group properties
        clone.editors = this.editors.slice(0);
        clone.mru = this.mru.slice(0);
        clone.preview = this.preview;
        clone.selection = this.selection.slice(0);
        clone.sticky = this.sticky;
        // Ensure to register listeners for each editor
        for (const editor of clone.editors) {
            clone.registerEditorListeners(editor);
        }
        return clone;
    }
    serialize() {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        // Serialize all editor inputs so that we can store them.
        // Editors that cannot be serialized need to be ignored
        // from mru, active, preview and sticky if any.
        const serializableEditors = [];
        const serializedEditors = [];
        let serializablePreviewIndex;
        let serializableSticky = this.sticky;
        for (let i = 0; i < this.editors.length; i++) {
            const editor = this.editors[i];
            let canSerializeEditor = false;
            const editorSerializer = registry.getEditorSerializer(editor);
            if (editorSerializer) {
                const value = editorSerializer.canSerialize(editor)
                    ? editorSerializer.serialize(editor)
                    : undefined;
                // Editor can be serialized
                if (typeof value === 'string') {
                    canSerializeEditor = true;
                    serializedEditors.push({ id: editor.typeId, value });
                    serializableEditors.push(editor);
                    if (this.preview === editor) {
                        serializablePreviewIndex = serializableEditors.length - 1;
                    }
                }
                // Editor cannot be serialized
                else {
                    canSerializeEditor = false;
                }
            }
            // Adjust index of sticky editors if the editor cannot be serialized and is pinned
            if (!canSerializeEditor && this.isSticky(i)) {
                serializableSticky--;
            }
        }
        const serializableMru = this.mru
            .map((editor) => this.indexOf(editor, serializableEditors))
            .filter((i) => i >= 0);
        return {
            id: this.id,
            locked: this.locked ? true : undefined,
            editors: serializedEditors,
            mru: serializableMru,
            preview: serializablePreviewIndex,
            sticky: serializableSticky >= 0 ? serializableSticky : undefined,
        };
    }
    deserialize(data) {
        const registry = Registry.as(EditorExtensions.EditorFactory);
        if (typeof data.id === 'number') {
            this._id = data.id;
            EditorGroupModel_1.IDS = Math.max(data.id + 1, EditorGroupModel_1.IDS); // make sure our ID generator is always larger
        }
        else {
            this._id = EditorGroupModel_1.IDS++; // backwards compatibility
        }
        if (data.locked) {
            this.locked = true;
        }
        this.editors = coalesce(data.editors.map((e, index) => {
            let editor = undefined;
            const editorSerializer = registry.getEditorSerializer(e.id);
            if (editorSerializer) {
                const deserializedEditor = editorSerializer.deserialize(this.instantiationService, e.value);
                if (deserializedEditor instanceof EditorInput) {
                    editor = deserializedEditor;
                    this.registerEditorListeners(editor);
                }
            }
            if (!editor && typeof data.sticky === 'number' && index <= data.sticky) {
                data.sticky--; // if editor cannot be deserialized but was sticky, we need to decrease sticky index
            }
            return editor;
        }));
        this.mru = coalesce(data.mru.map((i) => this.editors[i]));
        this.selection = this.mru.length > 0 ? [this.mru[0]] : [];
        if (typeof data.preview === 'number') {
            this.preview = this.editors[data.preview];
        }
        if (typeof data.sticky === 'number') {
            this.sticky = data.sticky;
        }
        return this._id;
    }
    dispose() {
        dispose(Array.from(this.editorListeners));
        this.editorListeners.clear();
        this.transient.clear();
        super.dispose();
    }
};
EditorGroupModel = EditorGroupModel_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], EditorGroupModel);
export { EditorGroupModel };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbW1vbi9lZGl0b3IvZWRpdG9yR3JvdXBNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBSU4sZ0JBQWdCLEVBRWhCLGdCQUFnQixFQUNoQixrQkFBa0IsR0FHbEIsTUFBTSxjQUFjLENBQUE7QUFDckIsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQzlDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE1BQU0scUJBQXFCLEdBQUc7SUFDN0IsSUFBSSxFQUFFLE1BQU07SUFDWixLQUFLLEVBQUUsT0FBTztJQUNkLEtBQUssRUFBRSxPQUFPO0lBQ2QsSUFBSSxFQUFFLE1BQU07Q0FDWixDQUFBO0FBK0JELE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsS0FBZTtJQUVmLE1BQU0sU0FBUyxHQUFHLEtBQWdELENBQUE7SUFFbEUsT0FBTyxDQUFDLENBQUMsQ0FDUixTQUFTO1FBQ1QsT0FBTyxTQUFTLEtBQUssUUFB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