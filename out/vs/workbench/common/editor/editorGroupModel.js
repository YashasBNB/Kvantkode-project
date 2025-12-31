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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yR3JvdXBNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb21tb24vZWRpdG9yL2VkaXRvckdyb3VwTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUlOLGdCQUFnQixFQUVoQixnQkFBZ0IsRUFDaEIsa0JBQWtCLEdBR2xCLE1BQU0sY0FBYyxDQUFBO0FBQ3JCLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUM5QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxNQUFNLHFCQUFxQixHQUFHO0lBQzdCLElBQUksRUFBRSxNQUFNO0lBQ1osS0FBSyxFQUFFLE9BQU87SUFDZCxLQUFLLEVBQUUsT0FBTztJQUNkLElBQUksRUFBRSxNQUFNO0NBQ1osQ0FBQTtBQStCRCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLEtBQWU7SUFFZixNQUFNLFNBQVMsR0FBRyxLQUFnRCxDQUFBO0lBRWxFLE9BQU8sQ0FBQyxDQUFDLENBQ1IsU0FBUztRQUNULE9BQU8sU0FBUyxLQUFLLFFBQVE7UUFDN0IsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDO1FBQ2hDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUM1QixDQUFBO0FBQ0YsQ0FBQztBQTJDRCxNQUFNLFVBQVUsd0JBQXdCLENBQUMsQ0FBeUI7SUFDakUsTUFBTSxTQUFTLEdBQUcsQ0FBMEIsQ0FBQTtJQUU1QyxPQUFPLFNBQVMsQ0FBQyxNQUFNLElBQUksU0FBUyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUE7QUFDL0QsQ0FBQztBQU1ELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxDQUF5QjtJQUMvRCxNQUFNLFNBQVMsR0FBRyxDQUEwQixDQUFBO0lBRTVDLE9BQU8sU0FBUyxDQUFDLElBQUksNkNBQXFDLElBQUksU0FBUyxDQUFDLFdBQVcsS0FBSyxTQUFTLENBQUE7QUFDbEcsQ0FBQztBQWFELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxDQUF5QjtJQUMvRCxNQUFNLFNBQVMsR0FBRyxDQUEwQixDQUFBO0lBRTVDLE9BQU8sQ0FDTixTQUFTLENBQUMsSUFBSSw2Q0FBcUM7UUFDbkQsU0FBUyxDQUFDLFdBQVcsS0FBSyxTQUFTO1FBQ25DLFNBQVMsQ0FBQyxjQUFjLEtBQUssU0FBUyxDQUN0QyxDQUFBO0FBQ0YsQ0FBQztBQW9CRCxNQUFNLFVBQVUsdUJBQXVCLENBQUMsQ0FBeUI7SUFDaEUsTUFBTSxTQUFTLEdBQUcsQ0FBMkIsQ0FBQTtJQUU3QyxPQUFPLENBQ04sU0FBUyxDQUFDLElBQUksOENBQXNDO1FBQ3BELFNBQVMsQ0FBQyxXQUFXLEtBQUssU0FBUztRQUNuQyxTQUFTLENBQUMsT0FBTyxLQUFLLFNBQVM7UUFDL0IsU0FBUyxDQUFDLE1BQU0sS0FBSyxTQUFTLENBQzlCLENBQUE7QUFDRixDQUFDO0FBcURNLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTs7YUFDaEMsUUFBRyxHQUFHLENBQUMsQUFBSixDQUFJO0lBY3RCLElBQUksRUFBRTtRQUNMLE9BQU8sSUFBSSxDQUFDLEdBQUcsQ0FBQTtJQUNoQixDQUFDO0lBV0QsSUFBWSxNQUFNO1FBQ2pCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxJQUFJLENBQUE7SUFDakMsQ0FBQztJQVNELFlBQ0Msc0JBQStELEVBQ3hDLG9CQUE0RCxFQUM1RCxvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIaUMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUMzQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBdkNwRixnQkFBZ0I7UUFFQyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUNsRCxJQUFJLE9BQU8sQ0FBeUI7WUFDbkMsb0JBQW9CLEVBQUUsR0FBRyxDQUFDLHdEQUF3RDtTQUNsRixDQUFDLENBQ0YsQ0FBQTtRQUNRLHFCQUFnQixHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxLQUFLLENBQUE7UUFTaEQsWUFBTyxHQUFrQixFQUFFLENBQUE7UUFDM0IsUUFBRyxHQUFrQixFQUFFLENBQUE7UUFFZCxvQkFBZSxHQUFHLElBQUksR0FBRyxFQUFtQixDQUFBO1FBRXJELFdBQU0sR0FBRyxLQUFLLENBQUE7UUFFZCxjQUFTLEdBQWtCLEVBQUUsQ0FBQSxDQUFDLGlEQUFpRDtRQU0vRSxZQUFPLEdBQXVCLElBQUksQ0FBQSxDQUFDLDBCQUEwQjtRQUM3RCxXQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUEsQ0FBQyx3Q0FBd0M7UUFDM0MsY0FBUyxHQUFHLElBQUksR0FBRyxFQUFlLENBQUEsQ0FBQyw2QkFBNkI7UUFZaEYsSUFBSSw0QkFBNEIsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDcEQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsR0FBRyxHQUFHLGtCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFBO1FBQ2xDLENBQUM7UUFFRCxJQUFJLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtJQUN6QixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDekYsQ0FBQTtJQUNGLENBQUM7SUFFTyxzQkFBc0IsQ0FBQyxDQUE2QjtRQUMzRCxJQUNDLENBQUM7WUFDRCxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrQ0FBa0MsQ0FBQztZQUMzRCxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyw4Q0FBOEMsQ0FBQyxFQUN0RSxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDOUQsa0NBQWtDLENBQ2xDLENBQUE7UUFDRCxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDcEUsOENBQThDLENBQzlDLENBQUE7SUFDRixDQUFDO0lBRUQsSUFBSSxLQUFLO1FBQ1IsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUN2QixDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQW1CLEVBQUUsT0FBcUM7UUFDcEUsTUFBTSxPQUFPLEdBQ1osS0FBSyw4Q0FBc0MsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXhGLElBQUksT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDO1lBQzVCLHVDQUF1QztZQUN2QyxJQUFJLEtBQUssOENBQXNDLEVBQUUsQ0FBQztnQkFDakQsT0FBTyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBRUQsOENBQThDO1lBQzlDLE9BQU8sT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCxnQkFBZ0IsQ0FBQyxLQUFhO1FBQzdCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2YsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ25CLENBQUM7SUFFRCxRQUFRLENBQUMsU0FBNEM7UUFDcEQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELElBQUksYUFBYTtRQUNoQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELFVBQVUsQ0FBQyxTQUFzQixFQUFFLE9BQTRCO1FBQzlELE1BQU0sVUFBVSxHQUNmLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxPQUFPLE9BQU8sRUFBRSxLQUFLLEtBQUssUUFBUSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDeEYsTUFBTSxVQUFVLEdBQUcsT0FBTyxFQUFFLE1BQU0sSUFBSSxPQUFPLEVBQUUsTUFBTSxDQUFBO1FBQ3JELE1BQU0sYUFBYSxHQUFHLENBQUMsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFBO1FBQzFDLE1BQU0sVUFBVSxHQUNmLE9BQU8sRUFBRSxNQUFNLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQyxVQUFVLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFN0YsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUVsRSxhQUFhO1FBQ2IsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7WUFDN0IsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFBO1lBQzNCLE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRS9DLGdDQUFnQztZQUNoQyxJQUFJLFdBQW1CLENBQUE7WUFDdkIsSUFBSSxPQUFPLElBQUksT0FBTyxPQUFPLENBQUMsS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNsRCxXQUFXLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtZQUM1QixDQUFDO1lBRUQsMEJBQTBCO2lCQUNyQixJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckUsV0FBVyxHQUFHLENBQUMsQ0FBQTtnQkFFZix1REFBdUQ7Z0JBQ3ZELDBEQUEwRDtnQkFDMUQsSUFBSSxDQUFDLFVBQVUsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQy9DLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQztZQUNGLENBQUM7WUFFRCxvQkFBb0I7aUJBQ2YsSUFBSSxJQUFJLENBQUMscUJBQXFCLEtBQUsscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3BFLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQTtZQUNsQyxDQUFDO1lBRUQsMkNBQTJDO2lCQUN0QyxDQUFDO2dCQUNMLHNDQUFzQztnQkFDdEMsSUFBSSxJQUFJLENBQUMscUJBQXFCLEtBQUsscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQy9ELElBQUksYUFBYSxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7d0JBQ2pELFdBQVcsR0FBRyxDQUFDLENBQUEsQ0FBQyw0Q0FBNEM7b0JBQzdELENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxXQUFXLEdBQUcsYUFBYSxDQUFBLENBQUMsK0JBQStCO29CQUM1RCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsdUNBQXVDO3FCQUNsQyxDQUFDO29CQUNMLFdBQVcsR0FBRyxhQUFhLEdBQUcsQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO2dCQUVELHVEQUF1RDtnQkFDdkQsMERBQTBEO2dCQUMxRCxJQUFJLENBQUMsVUFBVSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztvQkFDL0MsV0FBVyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQztZQUVELHNFQUFzRTtZQUN0RSxxRUFBcUU7WUFDckUsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO2dCQUViLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ2pDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO2dCQUMxQixDQUFDO1lBQ0YsQ0FBQztZQUVELHlFQUF5RTtZQUN6RSxJQUFJLFVBQVUsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDakMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1lBQzNDLENBQUM7WUFFRCxtQkFBbUI7WUFDbkIsSUFBSSxhQUFhLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ2xELENBQUM7WUFFRCxpQkFBaUI7WUFDakIsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO2dCQUNqQixpRUFBaUU7Z0JBQ2pFLElBQUksSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQixNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtvQkFDakQsSUFBSSxXQUFXLEdBQUcsY0FBYyxFQUFFLENBQUM7d0JBQ2xDLFdBQVcsRUFBRSxDQUFBLENBQUMseURBQXlEO29CQUN4RSxDQUFDO29CQUVELElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsV0FBVyxFQUFFLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3RFLENBQUM7Z0JBRUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxTQUFTLENBQUE7WUFDekIsQ0FBQztZQUVELFlBQVk7WUFDWixJQUFJLENBQUMsdUJBQXVCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFFdkMsUUFBUTtZQUNSLE1BQU0sS0FBSyxHQUEwQjtnQkFDcEMsSUFBSSwwQ0FBa0M7Z0JBQ3RDLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixXQUFXLEVBQUUsV0FBVzthQUN4QixDQUFBO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUVsQywwQ0FBMEM7WUFDMUMsSUFBSSxDQUFDLFlBQVksQ0FDaEIsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQzFDLE9BQU8sRUFBRSxpQkFBaUIsSUFBSSxFQUFFLENBQ2hDLENBQUE7WUFFRCxPQUFPO2dCQUNOLE1BQU0sRUFBRSxTQUFTO2dCQUNqQixLQUFLLEVBQUUsSUFBSTthQUNYLENBQUE7UUFDRixDQUFDO1FBRUQsa0JBQWtCO2FBQ2IsQ0FBQztZQUNMLE1BQU0sQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsR0FBRyxzQkFBc0IsQ0FBQTtZQUVwRSxvRkFBb0Y7WUFDcEYsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsY0FBYyxFQUNkLG1CQUFtQixFQUNuQixhQUFhLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsY0FBYyxDQUFDLENBQ2xFLENBQUE7WUFFRCxTQUFTO1lBQ1QsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLEVBQUUsbUJBQW1CLENBQUMsQ0FBQTtZQUNoRCxDQUFDO1lBRUQsMENBQTBDO1lBQzFDLElBQUksQ0FBQyxZQUFZLENBQ2hCLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUMvQyxPQUFPLEVBQUUsaUJBQWlCLElBQUksRUFBRSxDQUNoQyxDQUFBO1lBRUQsZ0JBQWdCO1lBQ2hCLElBQUksT0FBTyxJQUFJLE9BQU8sT0FBTyxDQUFDLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbEQsSUFBSSxDQUFDLFVBQVUsQ0FBQyxjQUFjLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLENBQUM7WUFFRCw0REFBNEQ7WUFDNUQsc0RBQXNEO1lBQ3RELElBQUksVUFBVSxFQUFFLENBQUM7Z0JBQ2hCLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtZQUMzRCxDQUFDO1lBRUQsT0FBTztnQkFDTixNQUFNLEVBQUUsY0FBYztnQkFDdEIsS0FBSyxFQUFFLEtBQUs7YUFDWixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx1QkFBdUIsQ0FBQyxNQUFtQjtRQUNsRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxlQUFlLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRW5DLG9EQUFvRDtRQUNwRCxTQUFTLENBQUMsR0FBRyxDQUNaLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLEdBQUcsRUFBRTtZQUNyQyxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUNoRCxJQUFJLFdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxLQUFLLEdBQTRCO29CQUN0QyxJQUFJLG1EQUEwQztvQkFDOUMsTUFBTTtvQkFDTixXQUFXO2lCQUNYLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUNuQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDhCQUE4QjtRQUM5QixTQUFTLENBQUMsR0FBRyxDQUNaLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUU7WUFDNUIsTUFBTSxLQUFLLEdBQTRCO2dCQUN0QyxJQUFJLDRDQUFtQztnQkFDdkMsTUFBTTtnQkFDTixXQUFXLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO2FBQ3pDLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCx3QkFBd0I7UUFDeEIsU0FBUyxDQUFDLEdBQUcsQ0FDWixNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFO1lBQzVCLE1BQU0sS0FBSyxHQUE0QjtnQkFDdEMsSUFBSSwyQ0FBbUM7Z0JBQ3ZDLE1BQU07Z0JBQ04sV0FBVyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQzthQUN6QyxDQUFBO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsNkJBQTZCO1FBQzdCLFNBQVMsQ0FBQyxHQUFHLENBQ1osTUFBTSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRTtZQUNuQyxNQUFNLEtBQUssR0FBNEI7Z0JBQ3RDLElBQUksbURBQTBDO2dCQUM5QyxNQUFNO2dCQUNOLFdBQVcsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7YUFDekMsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHlEQUF5RDtRQUN6RCxTQUFTLENBQUMsR0FBRyxDQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFO1lBQy9CLElBQUksS0FBSyxDQUFDLElBQUksOENBQXNDLElBQUksS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdkYsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO2dCQUNsQixJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhLENBQ3BCLFNBQXNCLEVBQ3RCLFdBQXdCLEVBQ3hCLFlBQW9CLEVBQ3BCLFFBQVEsR0FBRyxJQUFJO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsa0JBQWtCLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBLENBQUMsMkRBQTJEO1FBRW5KLDZGQUE2RjtRQUM3RiwyRkFBMkY7UUFDM0YsMEVBQTBFO1FBQzFFLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxFQUFFLEtBQUssRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUU3QyxJQUFJLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLE1BQU0sS0FBSyxHQUEyQjtnQkFDckMsSUFBSSwyQ0FBbUM7Z0JBQ3ZDLEdBQUcsV0FBVzthQUNkLENBQUE7WUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRUQsV0FBVyxDQUNWLFNBQXNCLEVBQ3RCLE9BQU8sR0FBRyxrQkFBa0IsQ0FBQyxPQUFPLEVBQ3BDLFFBQVEsR0FBRyxJQUFJO1FBRWYsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxTQUFTLEVBQUUsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBRXBFLElBQUksV0FBVyxFQUFFLENBQUM7WUFDakIsTUFBTSxLQUFLLEdBQTJCO2dCQUNyQyxJQUFJLDJDQUFtQztnQkFDdkMsR0FBRyxXQUFXO2FBQ2QsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFFbEMsT0FBTyxXQUFXLENBQUE7UUFDbkIsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxhQUFhLENBQ3BCLFNBQXNCLEVBQ3RCLE9BQTJCLEVBQzNCLFFBQWlCO1FBRWpCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDckMsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsQixPQUFPLFNBQVMsQ0FBQSxDQUFDLFlBQVk7UUFDOUIsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVuQyx1QkFBdUI7UUFDdkIsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUE7UUFDN0MsSUFBSSxRQUFRLElBQUksY0FBYyxFQUFFLENBQUM7WUFDaEMsdUJBQXVCO1lBQ3ZCLElBQUksSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksU0FBc0IsQ0FBQTtnQkFDMUIsSUFBSSxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FBQztvQkFDdEMsU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUEsQ0FBQyxrRkFBa0Y7Z0JBQzNHLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxJQUFJLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDdkMsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMscURBQXFEO29CQUMxRixDQUFDO3lCQUFNLENBQUM7d0JBQ1AsU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQyxDQUFBLENBQUMsaUNBQWlDO29CQUN0RSxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsMEJBQTBCO2dCQUMxQixNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUN2RCxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxLQUFLLE1BQU0sSUFBSSxRQUFRLEtBQUssU0FBUyxDQUMzRCxDQUFBO2dCQUNELElBQUksQ0FBQyxjQUFjLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxFQUFFLDBCQUEwQixDQUFDLENBQUE7WUFDNUYsQ0FBQztZQUVELHNDQUFzQztpQkFDakMsQ0FBQztnQkFDTCxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7UUFFRCx5QkFBeUI7YUFDcEIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQzFCLHdDQUF3QztZQUN4QyxJQUFJLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FDdkQsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLFFBQVEsS0FBSyxNQUFNLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxZQUFZLENBQ25FLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsSUFBSSxDQUFDLFlBQVksRUFDakIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLEVBQy9CLDBCQUEwQixDQUMxQixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFN0IscUJBQXFCO1FBQ3JCLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXhCLFFBQVE7UUFDUixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxDQUFBO0lBQ3ZELENBQUM7SUFFRCxVQUFVLENBQUMsU0FBc0IsRUFBRSxPQUFlO1FBQ2pELDJDQUEyQztRQUMzQyxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDbEMsQ0FBQzthQUFNLElBQUksT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3hCLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNyQyxJQUFJLEtBQUssR0FBRyxDQUFDLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQ3BDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBRTFCLDRFQUE0RTtRQUM1RSxJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZCxDQUFDO1FBRUQsMkRBQTJEO2FBQ3RELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDMUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU87UUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUV2QyxhQUFhO1FBQ2IsTUFBTSxLQUFLLEdBQTBCO1lBQ3BDLElBQUksMENBQWtDO1lBQ3RDLE1BQU07WUFDTixjQUFjLEVBQUUsS0FBSztZQUNyQixXQUFXLEVBQUUsT0FBTztTQUNwQixDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVsQyx1REFBdUQ7UUFDdkQsSUFBSSxNQUFNLEtBQUssSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQzVCLE1BQU0sS0FBSyxHQUE0QjtnQkFDdEMsSUFBSSw2Q0FBb0M7Z0JBQ3hDLE1BQU07Z0JBQ04sV0FBVyxFQUFFLE9BQU87YUFDcEIsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFNBQVMsQ0FBQyxTQUFrQztRQUMzQyxJQUFJLE1BQU0sR0FBNEIsU0FBUyxDQUFBO1FBRS9DLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sY0FBYztRQUNyQixnRUFBZ0U7UUFDaEUsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCxTQUFTO1FBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksMkNBQW1DLEVBQUUsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUFFTyxlQUFlLENBQUMsU0FBc0I7UUFDN0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFNLENBQUMsWUFBWTtRQUNwQixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUE7UUFFakMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRTVDLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELElBQUksZUFBZTtRQUNsQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUEsQ0FBQyw2QkFBNkI7SUFDaEcsQ0FBQztJQUVELFVBQVUsQ0FBQyxzQkFBNEM7UUFDdEQsSUFBSSxNQUErQixDQUFBO1FBQ25DLElBQUksT0FBTyxzQkFBc0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsc0JBQXNCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RELENBQUM7UUFFRCxPQUFPLENBQUMsQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM3QyxDQUFDO0lBRU8sWUFBWSxDQUFDLE1BQW1CO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELFlBQVksQ0FDWCw2QkFBMEMsRUFDMUMsZ0NBQStDO1FBRS9DLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsNkJBQTZCLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFNLENBQUMsWUFBWTtRQUNwQixDQUFDO1FBRUQsTUFBTSxDQUFDLG9CQUFvQixFQUFFLHlCQUF5QixDQUFDLEdBQUcsR0FBRyxDQUFBO1FBRTdELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBQWUsQ0FBQTtRQUN0RCxLQUFLLE1BQU0sK0JBQStCLElBQUksZ0NBQWdDLEVBQUUsQ0FBQztZQUNoRixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLCtCQUErQixDQUFDLENBQUE7WUFDNUQsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLE9BQU0sQ0FBQyxZQUFZO1lBQ3BCLENBQUM7WUFFRCxNQUFNLENBQUMsc0JBQXNCLENBQUMsR0FBRyxHQUFHLENBQUE7WUFDcEMsSUFBSSxzQkFBc0IsS0FBSyxvQkFBb0IsRUFBRSxDQUFDO2dCQUNyRCxTQUFRLENBQUMsbUJBQW1CO1lBQzdCLENBQUM7WUFFRCx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNwRCxDQUFDO1FBRUQsSUFBSSxDQUFDLGNBQWMsQ0FDbEIsb0JBQW9CLEVBQ3BCLHlCQUF5QixFQUN6QixLQUFLLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLENBQ25DLENBQUE7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUNyQixvQkFBd0MsRUFDeEMseUJBQTZDLEVBQzdDLHVCQUFzQztRQUV0QyxNQUFNLG9CQUFvQixHQUFHLElBQUksQ0FBQyxZQUFZLENBQUE7UUFDOUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBRXhDLElBQUksWUFBMkIsQ0FBQTtRQUMvQixJQUFJLG9CQUFvQixFQUFFLENBQUM7WUFDMUIsWUFBWSxHQUFHLENBQUMsb0JBQW9CLEVBQUUsR0FBRyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7YUFBTSxDQUFDO1lBQ1AsWUFBWSxHQUFHLEVBQUUsQ0FBQTtRQUNsQixDQUFDO1FBRUQsbUJBQW1CO1FBQ25CLElBQUksQ0FBQyxTQUFTLEdBQUcsWUFBWSxDQUFBO1FBRTdCLHlDQUF5QztRQUN6QyxNQUFNLG1CQUFtQixHQUN4QixvQkFBb0I7WUFDcEIsT0FBTyx5QkFBeUIsS0FBSyxRQUFRO1lBQzdDLG9CQUFvQixLQUFLLG9CQUFvQixDQUFBO1FBQzlDLElBQUksbUJBQW1CLEVBQUUsQ0FBQztZQUN6Qiw2QkFBNkI7WUFDN0IsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDN0QsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVCLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFFdEMsUUFBUTtZQUNSLE1BQU0sS0FBSyxHQUE0QjtnQkFDdEMsSUFBSSw0Q0FBb0M7Z0JBQ3hDLE1BQU0sRUFBRSxvQkFBb0I7Z0JBQzVCLFdBQVcsRUFBRSx5QkFBeUI7YUFDdEMsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELDBDQUEwQztRQUMxQyxJQUNDLG1CQUFtQjtZQUNuQixpQkFBaUIsQ0FBQyxNQUFNLEtBQUssWUFBWSxDQUFDLE1BQU07WUFDaEQsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsRUFDakUsQ0FBQztZQUNGLE1BQU0sS0FBSyxHQUEyQjtnQkFDckMsSUFBSSxnREFBd0M7YUFDNUMsQ0FBQTtZQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbkMsQ0FBQztJQUNGLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQix5REFBeUQ7UUFDekQsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCxTQUFTO1FBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksMENBQWtDLEVBQUUsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYTtRQUNyQix5REFBeUQ7UUFDekQsNERBQTREO1FBQzVELDREQUE0RDtRQUM1RCxTQUFTO1FBQ1QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksMENBQWtDLEVBQUUsQ0FBQyxDQUFBO0lBQ3hFLENBQUM7SUFFRCxHQUFHLENBQUMsU0FBc0I7UUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFNLENBQUMsWUFBWTtRQUNwQixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUE7UUFFakMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFL0IsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sS0FBSyxDQUFDLE1BQW1CLEVBQUUsV0FBbUI7UUFDckQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7WUFDM0IsT0FBTSxDQUFDLGdDQUFnQztRQUN4QyxDQUFDO1FBRUQsa0JBQWtCO1FBQ2xCLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRWhDLG1EQUFtRDtRQUNuRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQTtRQUVuQixRQUFRO1FBQ1IsTUFBTSxLQUFLLEdBQTRCO1lBQ3RDLElBQUksMENBQWlDO1lBQ3JDLE1BQU07WUFDTixXQUFXO1NBQ1gsQ0FBQTtRQUNELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkMsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFzQjtRQUMzQixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU0sQ0FBQyxZQUFZO1FBQ3BCLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUVqQyxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUVqQyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxPQUFPLENBQUMsTUFBbUIsRUFBRSxXQUFtQjtRQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzVCLE9BQU0sQ0FBQyxpQ0FBaUM7UUFDekMsQ0FBQztRQUVELFVBQVU7UUFDVixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBRXJCLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBNEI7WUFDdEMsSUFBSSwwQ0FBaUM7WUFDckMsTUFBTTtZQUNOLFdBQVc7U0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUVsQyxrQ0FBa0M7UUFDbEMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixJQUFJLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUVELFFBQVEsQ0FBQyxzQkFBNEM7UUFDcEQsSUFBSSxNQUFtQixDQUFBO1FBQ3ZCLElBQUksT0FBTyxzQkFBc0IsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO1FBQzlDLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxHQUFHLHNCQUFzQixDQUFBO1FBQ2hDLENBQUM7UUFFRCxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBc0I7UUFDM0IsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDVixPQUFNLENBQUMsWUFBWTtRQUNwQixDQUFDO1FBRUQsTUFBTSxDQUFDLE1BQU0sRUFBRSxXQUFXLENBQUMsR0FBRyxHQUFHLENBQUE7UUFFakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFFakMsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sT0FBTyxDQUFDLE1BQW1CLEVBQUUsV0FBbUI7UUFDdkQsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDaEMsT0FBTSxDQUFDLHFDQUFxQztRQUM3QyxDQUFDO1FBRUQsYUFBYTtRQUNiLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFaEIsMkNBQTJDO1FBQzNDLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXZDLHNCQUFzQjtRQUN0QixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFYixRQUFRO1FBQ1IsTUFBTSxLQUFLLEdBQTRCO1lBQ3RDLElBQUksNkNBQW9DO1lBQ3hDLE1BQU07WUFDTixXQUFXLEVBQUUsY0FBYztTQUMzQixDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFNBQXNCO1FBQzdCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ1YsT0FBTSxDQUFDLFlBQVk7UUFDcEIsQ0FBQztRQUVELE1BQU0sQ0FBQyxNQUFNLEVBQUUsV0FBVyxDQUFDLEdBQUcsR0FBRyxDQUFBO1FBRWpDLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRW5DLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLFNBQVMsQ0FBQyxNQUFtQixFQUFFLFdBQW1CO1FBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDakMsT0FBTSxDQUFDLG1DQUFtQztRQUMzQyxDQUFDO1FBRUQsZ0RBQWdEO1FBQ2hELE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUE7UUFDbEMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFdkMsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUViLFFBQVE7UUFDUixNQUFNLEtBQUssR0FBNEI7WUFDdEMsSUFBSSw2Q0FBb0M7WUFDeEMsTUFBTTtZQUNOLFdBQVcsRUFBRSxjQUFjO1NBQzNCLENBQUE7UUFDRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25DLENBQUM7SUFFRCxRQUFRLENBQUMsZ0JBQXNDO1FBQzlDLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNyQixPQUFPLEtBQUssQ0FBQSxDQUFDLG1CQUFtQjtRQUNqQyxDQUFDO1FBRUQsSUFBSSxLQUFhLENBQUE7UUFDakIsSUFBSSxPQUFPLGdCQUFnQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQzFDLEtBQUssR0FBRyxnQkFBZ0IsQ0FBQTtRQUN6QixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdkMsQ0FBQztRQUVELElBQUksS0FBSyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQTtJQUM1QixDQUFDO0lBRUQsWUFBWSxDQUFDLFNBQXNCLEVBQUUsU0FBa0I7UUFDdEQsSUFBSSxDQUFDLFNBQVMsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxPQUFNLENBQUMsc0JBQXNCO1FBQzlCLENBQUM7UUFFRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztZQUNWLE9BQU0sQ0FBQyxZQUFZO1FBQ3BCLENBQUM7UUFFRCxNQUFNLENBQUMsTUFBTSxFQUFFLFdBQVcsQ0FBQyxHQUFHLEdBQUcsQ0FBQTtRQUVqQyxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxXQUFXLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFbkQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sY0FBYyxDQUFDLE1BQW1CLEVBQUUsV0FBbUIsRUFBRSxTQUFrQjtRQUNsRixJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNCLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ2pDLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELFFBQVE7UUFDUixNQUFNLEtBQUssR0FBNEI7WUFDdEMsSUFBSSxnREFBdUM7WUFDM0MsTUFBTTtZQUNOLFdBQVc7U0FDWCxDQUFBO1FBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUNuQyxDQUFDO0lBRUQsV0FBVyxDQUFDLHNCQUE0QztRQUN2RCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQy9CLE9BQU8sS0FBSyxDQUFBLENBQUMsc0JBQXNCO1FBQ3BDLENBQUM7UUFFRCxJQUFJLE1BQStCLENBQUE7UUFDbkMsSUFBSSxPQUFPLHNCQUFzQixLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ2hELE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLHNCQUFzQixDQUFDLENBQUE7UUFDOUMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEQsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM5QyxDQUFDO0lBRU8sTUFBTSxDQUFDLEtBQWEsRUFBRSxHQUFZLEVBQUUsTUFBb0I7UUFDL0QsTUFBTSx1QkFBdUIsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBRW5ELDBCQUEwQjtRQUMxQixJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2QsQ0FBQztRQUVELDJCQUEyQjtRQUMzQixJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ1osSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDaEQsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFFRCxpQkFBaUI7UUFDakIsQ0FBQztZQUNBLE1BQU07WUFDTixJQUFJLENBQUMsR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO2dCQUNwQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUMzQiwyQ0FBMkM7b0JBQzNDLDZDQUE2QztvQkFDN0MsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3RCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCwwQ0FBMEM7b0JBQzFDLDJDQUEyQztvQkFDM0MsZ0RBQWdEO29CQUNoRCx5Q0FBeUM7b0JBQ3pDLDBDQUEwQztvQkFDMUMsNENBQTRDO29CQUM1QyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBO2dCQUM5QixDQUFDO1lBQ0YsQ0FBQztZQUVELG1CQUFtQjtpQkFDZCxDQUFDO2dCQUNMLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUVsRSxTQUFTO2dCQUNULElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7b0JBQ3BCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLENBQUMsQ0FBQSxDQUFDLGtCQUFrQjtnQkFDbEQsQ0FBQztnQkFFRCxVQUFVO3FCQUNMLElBQUksR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFBLENBQUMsMEJBQTBCO2dCQUNsRSxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUNOLFNBQW1ELEVBQ25ELE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxFQUN0QixPQUE2QjtRQUU3QixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUNkLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNoQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsT0FBTyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3pDLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUV6QixJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxrRUFBa0U7Z0JBQ2xFLHFFQUFxRTtnQkFDckUscUVBQXFFO2dCQUNyRSxJQUNDLE9BQU8sRUFBRSxpQkFBaUI7b0JBQzFCLE1BQU0sWUFBWSxxQkFBcUI7b0JBQ3ZDLENBQUMsQ0FBQyxTQUFTLFlBQVkscUJBQXFCLENBQUMsRUFDNUMsQ0FBQztvQkFDRixLQUFLLEdBQUcsQ0FBQyxDQUFBO2dCQUNWLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLEdBQUcsQ0FBQyxDQUFBO29CQUNULE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsVUFBVSxDQUNULFNBQTZCLEVBQzdCLE9BQTZCO1FBRTdCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDNUQsSUFBSSxLQUFLLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsQixPQUFPLFNBQVMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDcEMsQ0FBQztJQUVELE9BQU8sQ0FBQyxTQUE2QixFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTztRQUM1RCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxNQUFNLENBQUMsU0FBNkIsRUFBRSxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU87UUFDM0QsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFRCxRQUFRLENBQUMsU0FBNEMsRUFBRSxPQUE2QjtRQUNuRixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7SUFDN0QsQ0FBQztJQUVPLE9BQU8sQ0FDZCxNQUFzQyxFQUN0QyxTQUFtRCxFQUNuRCxPQUE2QjtRQUU3QixJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDM0IsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsSUFDQyxPQUFPLEVBQUUsaUJBQWlCO1lBQzFCLE1BQU0sWUFBWSxxQkFBcUI7WUFDdkMsQ0FBQyxDQUFDLFNBQVMsWUFBWSxxQkFBcUIsQ0FBQyxFQUM1QyxDQUFDO1lBQ0YsUUFBUSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztnQkFDbkMsS0FBSyxnQkFBZ0IsQ0FBQyxHQUFHO29CQUN4QixJQUNDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDO3dCQUNoRCxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sQ0FBQyxFQUNqRCxDQUFDO3dCQUNGLE9BQU8sSUFBSSxDQUFBO29CQUNaLENBQUM7b0JBQ0QsTUFBSztnQkFDTixLQUFLLGdCQUFnQixDQUFDLElBQUk7b0JBQ3pCLElBQ0MsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUM7d0JBQ2hELElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLEVBQ2pELENBQUM7d0JBQ0YsT0FBTyxJQUFJLENBQUE7b0JBQ1osQ0FBQztvQkFDRCxNQUFLO1lBQ1AsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxNQUFNLEtBQUssU0FBUyxDQUFBO1FBRXpDLElBQUksT0FBTyxFQUFFLFlBQVksRUFBRSxDQUFDO1lBQzNCLE9BQU8sWUFBWSxDQUFBO1FBQ3BCLENBQUM7UUFFRCxPQUFPLFlBQVksSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELElBQUksQ0FBQyxNQUFlO1FBQ25CLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxNQUFNLEVBQUUsQ0FBQztZQUM5QixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtZQUVwQixJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSwyQ0FBbUMsRUFBRSxDQUFDLENBQUE7UUFDekUsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLO1FBQ0osTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxrQkFBZ0IsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUVuRiw2QkFBNkI7UUFDN0IsS0FBSyxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyQyxLQUFLLENBQUMsR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLEtBQUssQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQTtRQUM1QixLQUFLLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3pDLEtBQUssQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUUxQiwrQ0FBK0M7UUFDL0MsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDcEMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxTQUFTO1FBQ1IsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFcEYseURBQXlEO1FBQ3pELHVEQUF1RDtRQUN2RCwrQ0FBK0M7UUFDL0MsTUFBTSxtQkFBbUIsR0FBa0IsRUFBRSxDQUFBO1FBQzdDLE1BQU0saUJBQWlCLEdBQTZCLEVBQUUsQ0FBQTtRQUN0RCxJQUFJLHdCQUE0QyxDQUFBO1FBQ2hELElBQUksa0JBQWtCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQTtRQUVwQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUM5QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlCLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1lBRTlCLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzdELElBQUksZ0JBQWdCLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQztvQkFDbEQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7b0JBQ3BDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBRVosMkJBQTJCO2dCQUMzQixJQUFJLE9BQU8sS0FBSyxLQUFLLFFBQVEsRUFBRSxDQUFDO29CQUMvQixrQkFBa0IsR0FBRyxJQUFJLENBQUE7b0JBRXpCLGlCQUFpQixDQUFDLElBQUksQ0FBQyxFQUFFLEVBQUUsRUFBRSxNQUFNLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7b0JBQ3BELG1CQUFtQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtvQkFFaEMsSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE1BQU0sRUFBRSxDQUFDO3dCQUM3Qix3QkFBd0IsR0FBRyxtQkFBbUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO29CQUMxRCxDQUFDO2dCQUNGLENBQUM7Z0JBRUQsOEJBQThCO3FCQUN6QixDQUFDO29CQUNMLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7WUFFRCxrRkFBa0Y7WUFDbEYsSUFBSSxDQUFDLGtCQUFrQixJQUFJLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0Msa0JBQWtCLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxHQUFHO2FBQzlCLEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEVBQUUsbUJBQW1CLENBQUMsQ0FBQzthQUMxRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUV2QixPQUFPO1lBQ04sRUFBRSxFQUFFLElBQUksQ0FBQyxFQUFFO1lBQ1gsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUztZQUN0QyxPQUFPLEVBQUUsaUJBQWlCO1lBQzFCLEdBQUcsRUFBRSxlQUFlO1lBQ3BCLE9BQU8sRUFBRSx3QkFBd0I7WUFDakMsTUFBTSxFQUFFLGtCQUFrQixJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLFNBQVM7U0FDaEUsQ0FBQTtJQUNGLENBQUM7SUFFTyxXQUFXLENBQUMsSUFBaUM7UUFDcEQsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FBeUIsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFcEYsSUFBSSxPQUFPLElBQUksQ0FBQyxFQUFFLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsRUFBRSxDQUFBO1lBRWxCLGtCQUFnQixDQUFDLEdBQUcsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLGtCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFBLENBQUMsOENBQThDO1FBQ2xILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLEdBQUcsR0FBRyxrQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQSxDQUFDLDBCQUEwQjtRQUM3RCxDQUFDO1FBRUQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUE7UUFDbkIsQ0FBQztRQUVELElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUM3QixJQUFJLE1BQU0sR0FBNEIsU0FBUyxDQUFBO1lBRS9DLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMzRCxJQUFJLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sa0JBQWtCLEdBQUcsZ0JBQWdCLENBQUMsV0FBVyxDQUN0RCxJQUFJLENBQUMsb0JBQW9CLEVBQ3pCLENBQUMsQ0FBQyxLQUFLLENBQ1AsQ0FBQTtnQkFDRCxJQUFJLGtCQUFrQixZQUFZLFdBQVcsRUFBRSxDQUFDO29CQUMvQyxNQUFNLEdBQUcsa0JBQWtCLENBQUE7b0JBQzNCLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDckMsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLENBQUMsTUFBTSxJQUFJLE9BQU8sSUFBSSxDQUFDLE1BQU0sS0FBSyxRQUFRLElBQUksS0FBSyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFBLENBQUMsb0ZBQW9GO1lBQ25HLENBQUM7WUFFRCxPQUFPLE1BQU0sQ0FBQTtRQUNkLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsR0FBRyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFekQsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFFekQsSUFBSSxPQUFPLElBQUksQ0FBQyxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDdEMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUMxQyxDQUFDO1FBRUQsSUFBSSxPQUFPLElBQUksQ0FBQyxNQUFNLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBQzFCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxHQUFHLENBQUE7SUFDaEIsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQTtRQUN6QyxJQUFJLENBQUMsZUFBZSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBRTVCLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7UUFFdEIsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7O0FBcnFDVyxnQkFBZ0I7SUF5QzFCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtHQTFDWCxnQkFBZ0IsQ0FzcUM1QiJ9