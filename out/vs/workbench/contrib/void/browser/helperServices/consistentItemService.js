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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc2lzdGVudEl0ZW1TZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL2hlbHBlclNlcnZpY2VzL2NvbnNpc3RlbnRJdGVtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQ2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFhL0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsdUJBQXVCLENBQUMsQ0FBQTtBQUUxRCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFZcEQsWUFBZ0MsY0FBbUQ7UUFDbEYsS0FBSyxFQUFFLENBQUE7UUFEeUMsbUJBQWMsR0FBZCxjQUFjLENBQW9CO1FBVG5GLGdHQUFnRztRQUMvRSwyQkFBc0IsR0FBNEMsRUFBRSxDQUFBO1FBQ3BFLDJCQUFzQixHQUFrQyxFQUFFLENBQUE7UUFFM0UsNEVBQTRFO1FBQzNELHNCQUFpQixHQUE0QyxFQUFFLENBQUE7UUFDL0QsNkJBQXdCLEdBQTJCLEVBQUUsQ0FBQTtRQUNyRCxzQkFBaUIsR0FBK0IsRUFBRSxDQUFBO1FBbUduRSx5QkFBb0IsR0FBRyxDQUFDLENBQUE7UUE5RnZCLE1BQU0scUJBQXFCLEdBQUcsQ0FBQyxNQUFtQixFQUFFLEVBQUU7WUFDckQsTUFBTSxRQUFRLEdB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