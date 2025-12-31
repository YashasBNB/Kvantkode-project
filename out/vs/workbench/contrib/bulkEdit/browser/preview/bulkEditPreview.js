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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0VkaXRQcmV2aWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9wcmV2aWV3L2J1bGtFZGl0UHJldmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFckcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEUsT0FBTyxFQUNOLGFBQWEsR0FFYixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hE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