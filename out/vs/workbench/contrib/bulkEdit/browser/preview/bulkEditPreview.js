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
var BulkFileOperations_1, BulkEditPreviewProvider_1;
import { ITextModelService, } from '../../../../../editor/common/services/resolverService.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IModelService } from '../../../../../editor/common/services/model.js';
import { createTextBufferFactoryFromSnapshot } from '../../../../../editor/common/model/textModel.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { coalesceInPlace } from '../../../../../base/common/arrays.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { EditOperation, } from '../../../../../editor/common/core/editOperation.js';
import { IInstantiationService, } from '../../../../../platform/instantiation/common/instantiation.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Emitter, Event } from '../../../../../base/common/event.js';
import { ConflictDetector } from '../conflicts.js';
import { ResourceMap } from '../../../../../base/common/map.js';
import { localize } from '../../../../../nls.js';
import { extUri } from '../../../../../base/common/resources.js';
import { ResourceFileEdit, ResourceTextEdit, } from '../../../../../editor/browser/services/bulkEditService.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { generateUuid } from '../../../../../base/common/uuid.js';
import { SnippetParser } from '../../../../../editor/contrib/snippet/browser/snippetParser.js';
import { MicrotaskDelay } from '../../../../../base/common/symbols.js';
export class CheckedStates {
    constructor() {
        this._states = new WeakMap();
        this._checkedCount = 0;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
    }
    dispose() {
        this._onDidChange.dispose();
    }
    get checkedCount() {
        return this._checkedCount;
    }
    isChecked(obj) {
        return this._states.get(obj) ?? false;
    }
    updateChecked(obj, value) {
        const valueNow = this._states.get(obj);
        if (valueNow === value) {
            return;
        }
        if (valueNow === undefined) {
            if (value) {
                this._checkedCount += 1;
            }
        }
        else {
            if (value) {
                this._checkedCount += 1;
            }
            else {
                this._checkedCount -= 1;
            }
        }
        this._states.set(obj, value);
        this._onDidChange.fire(obj);
    }
}
export class BulkTextEdit {
    constructor(parent, textEdit) {
        this.parent = parent;
        this.textEdit = textEdit;
    }
}
export var BulkFileOperationType;
(function (BulkFileOperationType) {
    BulkFileOperationType[BulkFileOperationType["TextEdit"] = 1] = "TextEdit";
    BulkFileOperationType[BulkFileOperationType["Create"] = 2] = "Create";
    BulkFileOperationType[BulkFileOperationType["Delete"] = 4] = "Delete";
    BulkFileOperationType[BulkFileOperationType["Rename"] = 8] = "Rename";
})(BulkFileOperationType || (BulkFileOperationType = {}));
export class BulkFileOperation {
    constructor(uri, parent) {
        this.uri = uri;
        this.parent = parent;
        this.type = 0;
        this.textEdits = [];
        this.originalEdits = new Map();
    }
    addEdit(index, type, edit) {
        this.type |= type;
        this.originalEdits.set(index, edit);
        if (edit instanceof ResourceTextEdit) {
            this.textEdits.push(new BulkTextEdit(this, edit));
        }
        else if (type === 8 /* BulkFileOperationType.Rename */) {
            this.newUri = edit.newResource;
        }
    }
    needsConfirmation() {
        for (const [, edit] of this.originalEdits) {
            if (!this.parent.checked.isChecked(edit)) {
                return true;
            }
        }
        return false;
    }
}
export class BulkCategory {
    static { this._defaultMetadata = Object.freeze({
        label: localize('default', 'Other'),
        icon: Codicon.symbolFile,
        needsConfirmation: false,
    }); }
    static keyOf(metadata) {
        return metadata?.label || '<default>';
    }
    constructor(metadata = BulkCategory._defaultMetadata) {
        this.metadata = metadata;
        this.operationByResource = new Map();
    }
    get fileOperations() {
        return this.operationByResource.values();
    }
}
let BulkFileOperations = BulkFileOperations_1 = class BulkFileOperations {
    static async create(accessor, bulkEdit) {
        const result = accessor.get(IInstantiationService).createInstance(BulkFileOperations_1, bulkEdit);
        return await result._init();
    }
    constructor(_bulkEdit, _fileService, instaService) {
        this._bulkEdit = _bulkEdit;
        this._fileService = _fileService;
        this.checked = new CheckedStates();
        this.fileOperations = [];
        this.categories = [];
        this.conflicts = instaService.createInstance(ConflictDetector, _bulkEdit);
    }
    dispose() {
        this.checked.dispose();
        this.conflicts.dispose();
    }
    async _init() {
        const operationByResource = new Map();
        const operationByCategory = new Map();
        const newToOldUri = new ResourceMap();
        for (let idx = 0; idx < this._bulkEdit.length; idx++) {
            const edit = this._bulkEdit[idx];
            let uri;
            let type;
            // store inital checked state
            this.checked.updateChecked(edit, !edit.metadata?.needsConfirmation);
            if (edit instanceof ResourceTextEdit) {
                type = 1 /* BulkFileOperationType.TextEdit */;
                uri = edit.resource;
            }
            else if (edit instanceof ResourceFileEdit) {
                if (edit.newResource && edit.oldResource) {
                    type = 8 /* BulkFileOperationType.Rename */;
                    uri = edit.oldResource;
                    if (edit.options?.overwrite === undefined &&
                        edit.options?.ignoreIfExists &&
                        (await this._fileService.exists(uri))) {
                        // noop -> "soft" rename to something that already exists
                        continue;
                    }
                    // map newResource onto oldResource so that text-edit appear for
                    // the same file element
                    newToOldUri.set(edit.newResource, uri);
                }
                else if (edit.oldResource) {
                    type = 4 /* BulkFileOperationType.Delete */;
                    uri = edit.oldResource;
                    if (edit.options?.ignoreIfNotExists && !(await this._fileService.exists(uri))) {
                        // noop -> "soft" delete something that doesn't exist
                        continue;
                    }
                }
                else if (edit.newResource) {
                    type = 2 /* BulkFileOperationType.Create */;
                    uri = edit.newResource;
                    if (edit.options?.overwrite === undefined &&
                        edit.options?.ignoreIfExists &&
                        (await this._fileService.exists(uri))) {
                        // noop -> "soft" create something that already exists
                        continue;
                    }
                }
                else {
                    // invalid edit -> skip
                    continue;
                }
            }
            else {
                // unsupported edit
                continue;
            }
            const insert = (uri, map) => {
                let key = extUri.getComparisonKey(uri, true);
                let operation = map.get(key);
                // rename
                if (!operation && newToOldUri.has(uri)) {
                    uri = newToOldUri.get(uri);
                    key = extUri.getComparisonKey(uri, true);
                    operation = map.get(key);
                }
                if (!operation) {
                    operation = new BulkFileOperation(uri, this);
                    map.set(key, operation);
                }
                operation.addEdit(idx, type, edit);
            };
            insert(uri, operationByResource);
            // insert into "this" category
            const key = BulkCategory.keyOf(edit.metadata);
            let category = operationByCategory.get(key);
            if (!category) {
                category = new BulkCategory(edit.metadata);
                operationByCategory.set(key, category);
            }
            insert(uri, category.operationByResource);
        }
        operationByResource.forEach((value) => this.fileOperations.push(value));
        operationByCategory.forEach((value) => this.categories.push(value));
        // "correct" invalid parent-check child states that is
        // unchecked file edits (rename, create, delete) uncheck
        // all edits for a file, e.g no text change without rename
        for (const file of this.fileOperations) {
            if (file.type !== 1 /* BulkFileOperationType.TextEdit */) {
                let checked = true;
                for (const edit of file.originalEdits.values()) {
                    if (edit instanceof ResourceFileEdit) {
                        checked = checked && this.checked.isChecked(edit);
                    }
                }
                if (!checked) {
                    for (const edit of file.originalEdits.values()) {
                        this.checked.updateChecked(edit, checked);
                    }
                }
            }
        }
        // sort (once) categories atop which have unconfirmed edits
        this.categories.sort((a, b) => {
            if (a.metadata.needsConfirmation === b.metadata.needsConfirmation) {
                return a.metadata.label.localeCompare(b.metadata.label);
            }
            else if (a.metadata.needsConfirmation) {
                return -1;
            }
            else {
                return 1;
            }
        });
        return this;
    }
    getWorkspaceEdit() {
        const result = [];
        let allAccepted = true;
        for (let i = 0; i < this._bulkEdit.length; i++) {
            const edit = this._bulkEdit[i];
            if (this.checked.isChecked(edit)) {
                result[i] = edit;
                continue;
            }
            allAccepted = false;
        }
        if (allAccepted) {
            return this._bulkEdit;
        }
        // not all edits have been accepted
        coalesceInPlace(result);
        return result;
    }
    async getFileEditOperation(edit) {
        const content = await edit.options.contents;
        if (!content) {
            return undefined;
        }
        return EditOperation.replaceMove(Range.lift({
            startLineNumber: 0,
            startColumn: 0,
            endLineNumber: Number.MAX_VALUE,
            endColumn: 0,
        }), content.toString());
    }
    async getFileEdits(uri) {
        for (const file of this.fileOperations) {
            if (file.uri.toString() === uri.toString()) {
                const result = [];
                let ignoreAll = false;
                for (const edit of file.originalEdits.values()) {
                    if (edit instanceof ResourceFileEdit) {
                        result.push(this.getFileEditOperation(edit));
                    }
                    else if (edit instanceof ResourceTextEdit) {
                        if (this.checked.isChecked(edit)) {
                            result.push(Promise.resolve(EditOperation.replaceMove(Range.lift(edit.textEdit.range), !edit.textEdit.insertAsSnippet
                                ? edit.textEdit.text
                                : SnippetParser.asInsertText(edit.textEdit.text))));
                        }
                    }
                    else if (!this.checked.isChecked(edit)) {
                        // UNCHECKED WorkspaceFileEdit disables all text edits
                        ignoreAll = true;
                    }
                }
                if (ignoreAll) {
                    return [];
                }
                return (await Promise.all(result))
                    .filter((r) => r !== undefined)
                    .sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
            }
        }
        return [];
    }
    getUriOfEdit(edit) {
        for (const file of this.fileOperations) {
            for (const value of file.originalEdits.values()) {
                if (value === edit) {
                    return file.uri;
                }
            }
        }
        throw new Error('invalid edit');
    }
};
BulkFileOperations = BulkFileOperations_1 = __decorate([
    __param(1, IFileService),
    __param(2, IInstantiationService)
], BulkFileOperations);
export { BulkFileOperations };
let BulkEditPreviewProvider = class BulkEditPreviewProvider {
    static { BulkEditPreviewProvider_1 = this; }
    static { this.Schema = 'vscode-bulkeditpreview-editor'; }
    static { this.emptyPreview = URI.from({ scheme: this.Schema, fragment: 'empty' }); }
    static fromPreviewUri(uri) {
        return URI.parse(uri.query);
    }
    constructor(_operations, _languageService, _modelService, _textModelResolverService) {
        this._operations = _operations;
        this._languageService = _languageService;
        this._modelService = _modelService;
        this._textModelResolverService = _textModelResolverService;
        this._disposables = new DisposableStore();
        this._modelPreviewEdits = new Map();
        this._instanceId = generateUuid();
        this._disposables.add(this._textModelResolverService.registerTextModelContentProvider(BulkEditPreviewProvider_1.Schema, this));
        this._ready = this._init();
    }
    dispose() {
        this._disposables.dispose();
    }
    asPreviewUri(uri) {
        return URI.from({
            scheme: BulkEditPreviewProvider_1.Schema,
            authority: this._instanceId,
            path: uri.path,
            query: uri.toString(),
        });
    }
    async _init() {
        for (const operation of this._operations.fileOperations) {
            await this._applyTextEditsToPreviewModel(operation.uri);
        }
        this._disposables.add(Event.debounce(this._operations.checked.onDidChange, (_last, e) => e, MicrotaskDelay)((e) => {
            const uri = this._operations.getUriOfEdit(e);
            this._applyTextEditsToPreviewModel(uri);
        }));
    }
    async _applyTextEditsToPreviewModel(uri) {
        const model = await this._getOrCreatePreviewModel(uri);
        // undo edits that have been done before
        const undoEdits = this._modelPreviewEdits.get(model.id);
        if (undoEdits) {
            model.applyEdits(undoEdits);
        }
        // apply new edits and keep (future) undo edits
        const newEdits = await this._operations.getFileEdits(uri);
        const newUndoEdits = model.applyEdits(newEdits, true);
        this._modelPreviewEdits.set(model.id, newUndoEdits);
    }
    async _getOrCreatePreviewModel(uri) {
        const previewUri = this.asPreviewUri(uri);
        let model = this._modelService.getModel(previewUri);
        if (!model) {
            try {
                // try: copy existing
                const ref = await this._textModelResolverService.createModelReference(uri);
                const sourceModel = ref.object.textEditorModel;
                model = this._modelService.createModel(createTextBufferFactoryFromSnapshot(sourceModel.createSnapshot()), this._languageService.createById(sourceModel.getLanguageId()), previewUri);
                ref.dispose();
            }
            catch {
                // create NEW model
                model = this._modelService.createModel('', this._languageService.createByFilepathOrFirstLine(previewUri), previewUri);
            }
            // this is a little weird but otherwise editors and other cusomers
            // will dispose my models before they should be disposed...
            // And all of this is off the eventloop to prevent endless recursion
            queueMicrotask(async () => {
                this._disposables.add(await this._textModelResolverService.createModelReference(model.uri));
            });
        }
        return model;
    }
    async provideTextContent(previewUri) {
        if (previewUri.toString() === BulkEditPreviewProvider_1.emptyPreview.toString()) {
            return this._modelService.createModel('', null, previewUri);
        }
        await this._ready;
        return this._modelService.getModel(previewUri);
    }
};
BulkEditPreviewProvider = BulkEditPreviewProvider_1 = __decorate([
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, ITextModelService)
], BulkEditPreviewProvider);
export { BulkEditPreviewProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC9icm93c2VyL3ByZXZpZXcvYnVsa0VkaXRQcmV2aWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNsRSxPQUFPLEVBQ04sYUFBYSxHQUViLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7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