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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../../editor/browser/services/codeEditorService.js';
import { registerSingleton, } from '../../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../../platform/instantiation/common/instantiation.js';
export const IConsistentItemService = createDecorator('ConsistentItemService');
let ConsistentItemService = class ConsistentItemService extends Disposable {
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        // the items that are attached to each URI, completely independent from current state of editors
        this.consistentItemIdsOfURI = {};
        this.infoOfConsistentItemId = {};
        // current state of items on each editor, and the fns to call to remove them
        this.itemIdsOfEditorId = {};
        this.consistentItemIdOfItemId = {};
        this.disposeFnOfItemId = {};
        this.consistentItemIdPool = 0;
        const removeItemsFromEditor = (editor) => {
            const editorId = editor.getId();
            for (const itemId of this.itemIdsOfEditorId[editorId] ?? [])
                this._removeItemFromEditor(editor, itemId);
        };
        // put items on the editor, based on the consistent items for that URI
        const putItemsOnEditor = (editor, uri) => {
            if (!uri)
                return;
            for (const consistentItemId of this.consistentItemIdsOfURI[uri.fsPath] ?? [])
                this._putItemOnEditor(editor, consistentItemId);
        };
        // when editor switches tabs (models)
        const addTabSwitchListeners = (editor) => {
            this._register(editor.onDidChangeModel((e) => {
                removeItemsFromEditor(editor);
                putItemsOnEditor(editor, e.newModelUrl);
            }));
        };
        // when editor is disposed
        const addDisposeListener = (editor) => {
            this._register(editor.onDidDispose(() => {
                // anything on the editor has been disposed already
                for (const itemId of this.itemIdsOfEditorId[editor.getId()] ?? [])
                    delete this.disposeFnOfItemId[itemId];
            }));
        };
        const initializeEditor = (editor) => {
            // if (editor.getModel()?.uri.scheme !== 'file') return // THIS BREAKS THINGS
            addTabSwitchListeners(editor);
            addDisposeListener(editor);
            putItemsOnEditor(editor, editor.getModel()?.uri ?? null);
        };
        // initialize current editors + any new editors
        for (let editor of this._editorService.listCodeEditors())
            initializeEditor(editor);
        this._register(this._editorService.onCodeEditorAdd((editor) => {
            initializeEditor(editor);
        }));
        // when an editor is deleted, remove its items
        this._register(this._editorService.onCodeEditorRemove((editor) => {
            removeItemsFromEditor(editor);
        }));
    }
    _putItemOnEditor(editor, consistentItemId) {
        const { fn } = this.infoOfConsistentItemId[consistentItemId];
        // add item
        const dispose = fn(editor);
        const itemId = generateUuid();
        const editorId = editor.getId();
        if (!(editorId in this.itemIdsOfEditorId))
            this.itemIdsOfEditorId[editorId] = new Set();
        this.itemIdsOfEditorId[editorId].add(itemId);
        this.consistentItemIdOfItemId[itemId] = consistentItemId;
        this.disposeFnOfItemId[itemId] = () => {
            // console.log('calling remove for', itemId)
            dispose?.();
        };
    }
    _removeItemFromEditor(editor, itemId) {
        const editorId = editor.getId();
        this.itemIdsOfEditorId[editorId]?.delete(itemId);
        this.disposeFnOfItemId[itemId]?.();
        delete this.disposeFnOfItemId[itemId];
        delete this.consistentItemIdOfItemId[itemId];
    }
    getEditorsOnURI(uri) {
        const editors = this._editorService
            .listCodeEditors()
            .filter((editor) => editor.getModel()?.uri.fsPath === uri.fsPath);
        return editors;
    }
    addConsistentItemToURI({ uri, fn }) {
        const consistentItemId = this.consistentItemIdPool++ + '';
        if (!(uri.fsPath in this.consistentItemIdsOfURI))
            this.consistentItemIdsOfURI[uri.fsPath] = new Set();
        this.consistentItemIdsOfURI[uri.fsPath].add(consistentItemId);
        this.infoOfConsistentItemId[consistentItemId] = { fn, uri };
        const editors = this.getEditorsOnURI(uri);
        for (const editor of editors)
            this._putItemOnEditor(editor, consistentItemId);
        return consistentItemId;
    }
    removeConsistentItemFromURI(consistentItemId) {
        if (!(consistentItemId in this.infoOfConsistentItemId))
            return;
        const { uri } = this.infoOfConsistentItemId[consistentItemId];
        const editors = this.getEditorsOnURI(uri);
        for (const editor of editors) {
            for (const itemId of this.itemIdsOfEditorId[editor.getId()] ?? []) {
                if (this.consistentItemIdOfItemId[itemId] === consistentItemId)
                    this._removeItemFromEditor(editor, itemId);
            }
        }
        // clear
        this.consistentItemIdsOfURI[uri.fsPath]?.delete(consistentItemId);
        delete this.infoOfConsistentItemId[consistentItemId];
    }
};
ConsistentItemService = __decorate([
    __param(0, ICodeEditorService)
], ConsistentItemService);
export { ConsistentItemService };
registerSingleton(IConsistentItemService, ConsistentItemService, 0 /* InstantiationType.Eager */);
export const IConsistentEditorItemService = createDecorator('ConsistentEditorItemService');
let ConsistentEditorItemService = class ConsistentEditorItemService extends Disposable {
    constructor(_editorService) {
        super();
        this._editorService = _editorService;
        /**
         * For each editorId, we track the set of itemIds that have been "added" to that editor.
         * This does *not* necessarily mean they're currently mounted (the user may have switched models).
         */
        this.itemIdsByEditorId = {};
        /**
         * For each itemId, we store relevant info (the fn to call on the editor, the editorId, the uri, and the current dispose function).
         */
        this.itemInfoById = {};
        //
        // Wire up listeners to watch for new editors, removed editors, etc.
        //
        // Initialize any already-existing editors
        for (const editor of this._editorService.listCodeEditors()) {
            this._initializeEditor(editor);
        }
        // When an editor is added, track it
        this._register(this._editorService.onCodeEditorAdd((editor) => {
            this._initializeEditor(editor);
        }));
        // When an editor is removed, remove all items associated with that editor
        this._register(this._editorService.onCodeEditorRemove((editor) => {
            this._removeAllItemsFromEditor(editor);
        }));
    }
    /**
     * Sets up listeners on the provided editor so that:
     * - If the editor changes models, we remove items and re-mount only if the new model matches.
     * - If the editor is disposed, we do the needed cleanup.
     */
    _initializeEditor(editor) {
        const editorId = editor.getId();
        //
        // Listen for model changes
        //
        this._register(editor.onDidChangeModel((e) => {
            this._removeAllItemsFromEditor(editor);
            if (!e.newModelUrl) {
                return;
            }
            // Re-mount any items that belong to this editor and match the new URI
            const itemsForEditor = this.itemIdsByEditorId[editorId];
            if (itemsForEditor) {
                for (const itemId of itemsForEditor) {
                    const itemInfo = this.itemInfoById[itemId];
                    if (itemInfo && itemInfo.uriFsPath === e.newModelUrl.fsPath) {
                        this._mountItemOnEditor(editor, itemId);
                    }
                }
            }
        }));
        //
        // When the editor is disposed, remove all items from it
        //
        this._register(editor.onDidDispose(() => {
            this._removeAllItemsFromEditor(editor);
        }));
        //
        // If the editor already has a model (e.g. on initial load), try mounting items
        //
        const uri = editor.getModel()?.uri;
        if (!uri) {
            return;
        }
        const itemsForEditor = this.itemIdsByEditorId[editorId];
        if (itemsForEditor) {
            for (const itemId of itemsForEditor) {
                const itemInfo = this.itemInfoById[itemId];
                if (itemInfo && itemInfo.uriFsPath === uri.fsPath) {
                    this._mountItemOnEditor(editor, itemId);
                }
            }
        }
    }
    /**
     * Actually calls the item-creation function `fn(editor)` and saves the resulting disposeFn
     * so we can later clean it up.
     */
    _mountItemOnEditor(editor, itemId) {
        const info = this.itemInfoById[itemId];
        if (!info) {
            return;
        }
        const { fn } = info;
        const disposeFn = fn(editor);
        info.disposeFn = disposeFn;
    }
    /**
     * Removes a single item from an editor (calling its `disposeFn` if present).
     */
    _removeItemFromEditor(editor, itemId) {
        const info = this.itemInfoById[itemId];
        if (info?.disposeFn) {
            info.disposeFn();
            info.disposeFn = undefined;
        }
    }
    /**
     * Removes *all* items from the given editor. Typically called when the editor changes model or is disposed.
     */
    _removeAllItemsFromEditor(editor) {
        const editorId = editor.getId();
        const itemsForEditor = this.itemIdsByEditorId[editorId];
        if (!itemsForEditor) {
            return;
        }
        for (const itemId of itemsForEditor) {
            this._removeItemFromEditor(editor, itemId);
        }
    }
    /**
     * Public API: Adds an item to an *individual* editor (determined by editor ID),
     * but only when that editor is showing the same model (uri.fsPath).
     */
    addToEditor(editor, fn) {
        const uri = editor.getModel()?.uri;
        if (!uri) {
            throw new Error('No URI on the provided editor or in AddItemInputs.');
        }
        const editorId = editor.getId();
        // Create an ID for this item
        const itemId = generateUuid();
        // Record the info
        this.itemInfoById[itemId] = {
            editorId,
            uriFsPath: uri.fsPath,
            fn,
        };
        // Add to the editor's known items
        if (!this.itemIdsByEditorId[editorId]) {
            this.itemIdsByEditorId[editorId] = new Set();
        }
        this.itemIdsByEditorId[editorId].add(itemId);
        // If the editor's current URI matches, mount it now
        if (editor.getModel()?.uri.fsPath === uri.fsPath) {
            this._mountItemOnEditor(editor, itemId);
        }
        return itemId;
    }
    /**
     * Public API: Removes an item from the *specific* editor. We look up which editor
     * had this item and remove it from that editor.
     */
    removeFromEditor(itemId) {
        const info = this.itemInfoById[itemId];
        if (!info) {
            // Nothing to remove
            return;
        }
        const { editorId } = info;
        // Find the editor in question
        const editor = this._editorService.listCodeEditors().find((ed) => ed.getId() === editorId);
        if (editor) {
            // Dispose on that editor
            this._removeItemFromEditor(editor, itemId);
        }
        // Clean up references
        this.itemIdsByEditorId[editorId]?.delete(itemId);
        delete this.itemInfoById[itemId];
    }
};
ConsistentEditorItemService = __decorate([
    __param(0, ICodeEditorService)
], ConsistentEditorItemService);
export { ConsistentEditorItemService };
registerSingleton(IConsistentEditorItemService, ConsistentEditorItemService, 0 /* InstantiationType.Eager */);
