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
import { dispose } from '../../../../base/common/lifecycle.js';
import { EditOperation, } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IEditorWorkerService } from '../../../../editor/common/services/editorWorker.js';
import { IUndoRedoService, } from '../../../../platform/undoRedo/common/undoRedo.js';
import { SingleModelEditStackElement, MultiModelEditStackElement, } from '../../../../editor/common/model/editStack.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ResourceTextEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { SnippetController2 } from '../../../../editor/contrib/snippet/browser/snippetController2.js';
import { SnippetParser } from '../../../../editor/contrib/snippet/browser/snippetParser.js';
class ModelEditTask {
    constructor(_modelReference) {
        this._modelReference = _modelReference;
        this.model = this._modelReference.object.textEditorModel;
        this._edits = [];
    }
    dispose() {
        this._modelReference.dispose();
    }
    isNoOp() {
        if (this._edits.length > 0) {
            // contains textual edits
            return false;
        }
        if (this._newEol !== undefined && this._newEol !== this.model.getEndOfLineSequence()) {
            // contains an eol change that is a real change
            return false;
        }
        return true;
    }
    addEdit(resourceEdit) {
        this._expectedModelVersionId = resourceEdit.versionId;
        const { textEdit } = resourceEdit;
        if (typeof textEdit.eol === 'number') {
            // honor eol-change
            this._newEol = textEdit.eol;
        }
        if (!textEdit.range && !textEdit.text) {
            // lacks both a range and the text
            return;
        }
        if (Range.isEmpty(textEdit.range) && !textEdit.text) {
            // no-op edit (replace empty range with empty text)
            return;
        }
        // create edit operation
        let range;
        if (!textEdit.range) {
            range = this.model.getFullModelRange();
        }
        else {
            range = Range.lift(textEdit.range);
        }
        this._edits.push({
            ...EditOperation.replaceMove(range, textEdit.text),
            insertAsSnippet: textEdit.insertAsSnippet,
            keepWhitespace: textEdit.keepWhitespace,
        });
    }
    validate() {
        if (typeof this._expectedModelVersionId === 'undefined' ||
            this.model.getVersionId() === this._expectedModelVersionId) {
            return { canApply: true };
        }
        return { canApply: false, reason: this.model.uri };
    }
    getBeforeCursorState() {
        return null;
    }
    apply() {
        if (this._edits.length > 0) {
            this._edits = this._edits
                .map(this._transformSnippetStringToInsertText, this) // no editor -> no snippet mode
                .sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
            this.model.pushEditOperations(null, this._edits, () => null);
        }
        if (this._newEol !== undefined) {
            this.model.pushEOL(this._newEol);
        }
    }
    _transformSnippetStringToInsertText(edit) {
        // transform a snippet edit (and only those) into a normal text edit
        // for that we need to parse the snippet and get its actual text, e.g without placeholder
        // or variable syntaxes
        if (!edit.insertAsSnippet) {
            return edit;
        }
        if (!edit.text) {
            return edit;
        }
        const text = SnippetParser.asInsertText(edit.text);
        return { ...edit, insertAsSnippet: false, text };
    }
}
class EditorEditTask extends ModelEditTask {
    constructor(modelReference, editor) {
        super(modelReference);
        this._editor = editor;
    }
    getBeforeCursorState() {
        return this._canUseEditor() ? this._editor.getSelections() : null;
    }
    apply() {
        // Check that the editor is still for the wanted model. It might have changed in the
        // meantime and that means we cannot use the editor anymore (instead we perform the edit through the model)
        if (!this._canUseEditor()) {
            super.apply();
            return;
        }
        if (this._edits.length > 0) {
            const snippetCtrl = SnippetController2.get(this._editor);
            if (snippetCtrl && this._edits.some((edit) => edit.insertAsSnippet)) {
                // some edit is a snippet edit -> use snippet controller and ISnippetEdits
                const snippetEdits = [];
                for (const edit of this._edits) {
                    if (edit.range && edit.text !== null) {
                        snippetEdits.push({
                            range: Range.lift(edit.range),
                            template: edit.insertAsSnippet ? edit.text : SnippetParser.escape(edit.text),
                            keepWhitespace: edit.keepWhitespace,
                        });
                    }
                }
                snippetCtrl.apply(snippetEdits, { undoStopBefore: false, undoStopAfter: false });
            }
            else {
                // normal edit
                this._edits = this._edits
                    .map(this._transformSnippetStringToInsertText, this) // mixed edits (snippet and normal) -> no snippet mode
                    .sort((a, b) => Range.compareRangesUsingStarts(a.range, b.range));
                this._editor.executeEdits('', this._edits);
            }
        }
        if (this._newEol !== undefined) {
            if (this._editor.hasModel()) {
                this._editor.getModel().pushEOL(this._newEol);
            }
        }
    }
    _canUseEditor() {
        return this._editor?.getModel()?.uri.toString() === this.model.uri.toString();
    }
}
let BulkTextEdits = class BulkTextEdits {
    constructor(_label, _code, _editor, _undoRedoGroup, _undoRedoSource, _progress, _token, edits, _editorWorker, _modelService, _textModelResolverService, _undoRedoService) {
        this._label = _label;
        this._code = _code;
        this._editor = _editor;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._progress = _progress;
        this._token = _token;
        this._editorWorker = _editorWorker;
        this._modelService = _modelService;
        this._textModelResolverService = _textModelResolverService;
        this._undoRedoService = _undoRedoService;
        this._edits = new ResourceMap();
        for (const edit of edits) {
            let array = this._edits.get(edit.resource);
            if (!array) {
                array = [];
                this._edits.set(edit.resource, array);
            }
            array.push(edit);
        }
    }
    _validateBeforePrepare() {
        // First check if loaded models were not changed in the meantime
        for (const array of this._edits.values()) {
            for (const edit of array) {
                if (typeof edit.versionId === 'number') {
                    const model = this._modelService.getModel(edit.resource);
                    if (model && model.getVersionId() !== edit.versionId) {
                        // model changed in the meantime
                        throw new Error(`${model.uri.toString()} has changed in the meantime`);
                    }
                }
            }
        }
    }
    async _createEditsTasks() {
        const tasks = [];
        const promises = [];
        for (const [key, edits] of this._edits) {
            const promise = this._textModelResolverService.createModelReference(key).then(async (ref) => {
                let task;
                let makeMinimal = false;
                if (this._editor?.getModel()?.uri.toString() === ref.object.textEditorModel.uri.toString()) {
                    task = new EditorEditTask(ref, this._editor);
                    makeMinimal = true;
                }
                else {
                    task = new ModelEditTask(ref);
                }
                tasks.push(task);
                if (!makeMinimal) {
                    edits.forEach(task.addEdit, task);
                    return;
                }
                // group edits by type (snippet, metadata, or simple) and make simple groups more minimal
                const makeGroupMoreMinimal = async (start, end) => {
                    const oldEdits = edits.slice(start, end);
                    const newEdits = await this._editorWorker.computeMoreMinimalEdits(ref.object.textEditorModel.uri, oldEdits.map((e) => e.textEdit), false);
                    if (!newEdits) {
                        oldEdits.forEach(task.addEdit, task);
                    }
                    else {
                        newEdits.forEach((edit) => task.addEdit(new ResourceTextEdit(ref.object.textEditorModel.uri, edit, undefined, undefined)));
                    }
                };
                let start = 0;
                let i = 0;
                for (; i < edits.length; i++) {
                    if (edits[i].textEdit.insertAsSnippet || edits[i].metadata) {
                        await makeGroupMoreMinimal(start, i); // grouped edits until now
                        task.addEdit(edits[i]); // this edit
                        start = i + 1;
                    }
                }
                await makeGroupMoreMinimal(start, i);
            });
            promises.push(promise);
        }
        await Promise.all(promises);
        return tasks;
    }
    _validateTasks(tasks) {
        for (const task of tasks) {
            const result = task.validate();
            if (!result.canApply) {
                return result;
            }
        }
        return { canApply: true };
    }
    async apply() {
        this._validateBeforePrepare();
        const tasks = await this._createEditsTasks();
        try {
            if (this._token.isCancellationRequested) {
                return [];
            }
            const resources = [];
            const validation = this._validateTasks(tasks);
            if (!validation.canApply) {
                throw new Error(`${validation.reason.toString()} has changed in the meantime`);
            }
            if (tasks.length === 1) {
                // This edit touches a single model => keep things simple
                const task = tasks[0];
                if (!task.isNoOp()) {
                    const singleModelEditStackElement = new SingleModelEditStackElement(this._label, this._code, task.model, task.getBeforeCursorState());
                    this._undoRedoService.pushElement(singleModelEditStackElement, this._undoRedoGroup, this._undoRedoSource);
                    task.apply();
                    singleModelEditStackElement.close();
                    resources.push(task.model.uri);
                }
                this._progress.report(undefined);
            }
            else {
                // prepare multi model undo element
                const multiModelEditStackElement = new MultiModelEditStackElement(this._label, this._code, tasks.map((t) => new SingleModelEditStackElement(this._label, this._code, t.model, t.getBeforeCursorState())));
                this._undoRedoService.pushElement(multiModelEditStackElement, this._undoRedoGroup, this._undoRedoSource);
                for (const task of tasks) {
                    task.apply();
                    this._progress.report(undefined);
                    resources.push(task.model.uri);
                }
                multiModelEditStackElement.close();
            }
            return resources;
        }
        finally {
            dispose(tasks);
        }
    }
};
BulkTextEdits = __decorate([
    __param(8, IEditorWorkerService),
    __param(9, IModelService),
    __param(10, ITextModelService),
    __param(11, IUndoRedoService)
], BulkTextEdits);
export { BulkTextEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa1RleHRFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvYnVsa1RleHRFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUEyQixNQUFNLHNDQUFzQyxDQUFBO0FBR3ZGLE9BQU8sRUFDTixhQUFhLEdBRWIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFHL0QsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixnQkFBZ0IsR0FHaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sMkJBQTJCLEVBQzNCLDBCQUEwQixHQUMxQixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBVTNGLE1BQU0sYUFBYTtJQU9sQixZQUE2QixlQUFxRDtRQUFyRCxvQkFBZSxHQUFmLGVBQWUsQ0FBc0M7UUFDakYsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDeEQsSUFBSSxD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