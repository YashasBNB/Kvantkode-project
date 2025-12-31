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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tJbmxpbmVEaWZmLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL2lubGluZURpZmYvbm90ZWJvb2tJbmxpbmVEaWZmLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sNENBQTRDLENBQUE7QUFDcEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBR3hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR2hHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM3RCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUNOLHNDQUFzQyxFQUN0QyxxQ0FBcUMsR0FDckMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLGdDQUFnQyxHQUNoQyxNQUFNLHVDQUF1QyxDQUFBO0FBRXZDLElB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