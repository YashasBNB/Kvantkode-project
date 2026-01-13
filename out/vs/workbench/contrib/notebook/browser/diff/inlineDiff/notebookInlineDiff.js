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
import { Event } from '../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { autorun } from '../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { INotebookEditorWorkerService } from '../../../common/services/notebookWorkerService.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { NotebookCellDiffDecorator } from './notebookCellDiffDecorator.js';
import { NotebookDeletedCellDecorator } from './notebookDeletedCellDecorator.js';
import { NotebookInsertedCellDecorator } from './notebookInsertedCellDecorator.js';
import { INotebookLoggingService } from '../../../common/notebookLoggingService.js';
import { computeDiff } from '../../../common/notebookDiff.js';
import { registerSingleton, } from '../../../../../../platform/instantiation/common/extensions.js';
import { INotebookOriginalModelReferenceFactory, NotebookOriginalModelReferenceFactory, } from './notebookOriginalModelRefFactory.js';
import { INotebookOriginalCellModelFactory, OriginalNotebookCellModelFactory, } from './notebookOriginalCellModelFactory.js';
let NotebookInlineDiffDecorationContribution = class NotebookInlineDiffDecorationContribution extends Disposable {
    static { this.ID = 'workbench.notebook.inlineDiffDecoration'; }
    constructor(notebookEditor, notebookEditorWorkerService, instantiationService, logService) {
        super();
        this.notebookEditor = notebookEditor;
        this.notebookEditorWorkerService = notebookEditorWorkerService;
        this.instantiationService = instantiationService;
        this.logService = logService;
        this.cellDecorators = new Map();
        this.listeners = [];
        this.logService.debug('inlineDiff', 'Watching for previous model');
        this._register(autorun((reader) => {
            this.previous = this.notebookEditor.notebookOptions.previousModelToCompare.read(reader);
            if (this.previous) {
                this.logService.debug('inlineDiff', 'Previous model set');
                if (this.notebookEditor.hasModel()) {
                    this.initialize();
                }
                else {
                    this.logService.debug('inlineDiff', 'Waiting for model to attach');
                    this.listeners.push(Event.once(this.notebookEditor.onDidAttachViewModel)(() => this.initialize()));
                }
            }
        }));
    }
    clear() {
        this.listeners.forEach((l) => l.dispose());
        this.cellDecorators.forEach((v, cell) => {
            v.dispose();
            this.cellDecorators.delete(cell);
        });
        this.insertedCellDecorator?.dispose();
        this.deletedCellDecorator?.dispose();
        this.cachedNotebookDiff = undefined;
        this.listeners = [];
        this.logService.debug('inlineDiff', 'Cleared decorations and listeners');
    }
    dispose() {
        this.logService.debug('inlineDiff', 'Disposing');
        this.clear();
        super.dispose();
    }
    initialize() {
        this.clear();
        if (!this.previous) {
            return;
        }
        this.insertedCellDecorator = this.instantiationService.createInstance(NotebookInsertedCellDecorator, this.notebookEditor);
        this.deletedCellDecorator = this.instantiationService.createInstance(NotebookDeletedCellDecorator, this.notebookEditor, undefined);
        this._update();
        const onVisibleChange = Event.debounce(this.notebookEditor.onDidChangeVisibleRanges, (e) => e, 100, undefined, undefined, undefined, this._store);
        this.listeners.push(onVisibleChange(() => this._update()));
        this.listeners.push(this.notebookEditor.onDidChangeModel(() => this._update()));
        if (this.notebookEditor.textModel) {
            const onContentChange = Event.debounce(this.notebookEditor.textModel.onDidChangeContent, (_, event) => event, 100, undefined, undefined, undefined, this._store);
            const onOriginalContentChange = Event.debounce(this.previous.onDidChangeContent, (_, event) => event, 100, undefined, undefined, undefined, this._store);
            this.listeners.push(onContentChange(() => this._update()));
            this.listeners.push(onOriginalContentChange(() => this._update()));
        }
        this.logService.debug('inlineDiff', 'Initialized');
    }
    async _update() {
        const current = this.notebookEditor.getViewModel()?.notebookDocument;
        if (!this.previous || !current) {
            this.logService.debug('inlineDiff', 'Update skipped - no original or current document');
            return;
        }
        if (!this.cachedNotebookDiff ||
            this.cachedNotebookDiff.originalVersion !== this.previous.versionId ||
            this.cachedNotebookDiff.version !== current.versionId) {
            let diffInfo = { cellDiffInfo: [] };
            try {
                const notebookDiff = await this.notebookEditorWorkerService.computeDiff(this.previous.uri, current.uri);
                diffInfo = computeDiff(this.previous, current, notebookDiff);
            }
            catch (e) {
                this.logService.error('inlineDiff', 'Error computing diff:\n' + e);
                return;
            }
            this.cachedNotebookDiff = {
                cellDiffInfo: diffInfo.cellDiffInfo,
                originalVersion: this.previous.versionId,
                version: current.versionId,
            };
            this.insertedCellDecorator?.apply(diffInfo.cellDiffInfo);
            this.deletedCellDecorator?.apply(diffInfo.cellDiffInfo, this.previous);
        }
        await this.updateCells(this.previous, current, this.cachedNotebookDiff.cellDiffInfo);
    }
    async updateCells(original, modified, cellDiffs) {
        const validDiffDecorators = new Set();
        cellDiffs.forEach((diff) => {
            if (diff.type === 'modified') {
                const modifiedCell = modified.cells[diff.modifiedCellIndex];
                const originalCell = original.cells[diff.originalCellIndex];
                const editor = this.notebookEditor.codeEditors.find(([vm]) => vm.handle === modifiedCell.handle)?.[1];
                if (editor) {
                    const currentDecorator = this.cellDecorators.get(modifiedCell);
                    if (currentDecorator?.modifiedCell !== modifiedCell ||
                        currentDecorator?.originalCell !== originalCell) {
                        currentDecorator?.dispose();
                        const decorator = this.instantiationService.createInstance(NotebookCellDiffDecorator, this.notebookEditor, modifiedCell, originalCell, editor);
                        this.cellDecorators.set(modifiedCell, decorator);
                        validDiffDecorators.add(decorator);
                        this._register(editor.onDidDispose(() => {
                            decorator.dispose();
                            if (this.cellDecorators.get(modifiedCell) === decorator) {
                                this.cellDecorators.delete(modifiedCell);
                            }
                        }));
                    }
                    else if (currentDecorator) {
                        validDiffDecorators.add(currentDecorator);
                    }
                }
            }
        });
        // Dispose old decorators
        this.cellDecorators.forEach((v, cell) => {
            if (!validDiffDecorators.has(v)) {
                v.dispose();
                this.cellDecorators.delete(cell);
            }
        });
    }
};
NotebookInlineDiffDecorationContribution = __decorate([
    __param(1, INotebookEditorWorkerService),
    __param(2, IInstantiationService),
    __param(3, INotebookLoggingService)
], NotebookInlineDiffDecorationContribution);
export { NotebookInlineDiffDecorationContribution };
registerNotebookContribution(NotebookInlineDiffDecorationContribution.ID, NotebookInlineDiffDecorationContribution);
registerSingleton(INotebookOriginalModelReferenceFactory, NotebookOriginalModelReferenceFactory, 1 /* InstantiationType.Delayed */);
registerSingleton(INotebookOriginalCellModelFactory, OriginalNotebookCellModelFactory, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2RpZmYvaW5saW5lRGlmZi9ub3RlYm9va0lubGluZURpZmYudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFHeEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHaEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDbkYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzdELE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSwrREFBK0QsQ0FBQTtBQUN0RSxPQUFPLEVBQ04sc0NBQXNDLEVBQ3RDLHFDQUFxQyxHQUNyQyxNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsZ0NBQWdDLEdBQ2hDLE1B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