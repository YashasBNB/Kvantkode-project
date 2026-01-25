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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc2lzdGVudEl0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvaGVscGVyU2VydmljZXMvY29uc2lzdGVudEl0ZW1TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGOzs7Ozs7Ozs7O0FBRTFGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQWEvRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBRTFELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQVlwRCxZQUFnQyxjQUFtRDtRQUNsRixLQUFLLEVBQUUsQ0FBQTtRQUR5QyxtQkFBYyxHQUFkLGNBQWMsQ0FBb0I7UUFUbkYsZ0dBQWdHO1FBQy9FLDJCQUFzQixHQUE0QyxFQUFFLENBQUE7UUFDcEUsMkJBQXNCLEdBQWtDLEVBQUUsQ0FBQTtRQUUzRSw0RUFBNEU7UUFDM0Qsc0JBQWlCLEdBQTRDLEVBQUUsQ0FBQTtRQUMvRCw2QkFBd0IsR0FBMkIsRUFBRSxDQUFBO1FBQ3JELHNCQUFpQixHQUErQixFQUFFLENBQUE7UUFtR25FLHlCQUFvQixHQUFHLENBQUMsQ0FBQTtRQTlGdkIsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLE1BQW1CLEVBQUUsRUFBRTtZQUNyRCxNQUFNLFFB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