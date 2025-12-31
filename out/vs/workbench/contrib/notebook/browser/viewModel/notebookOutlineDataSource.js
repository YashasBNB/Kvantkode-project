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
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { isEqual } from '../../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../../../platform/markers/common/markers.js';
import { CellKind } from '../../common/notebookCommon.js';
import { INotebookOutlineEntryFactory, } from './notebookOutlineEntryFactory.js';
let NotebookCellOutlineDataSource = class NotebookCellOutlineDataSource {
    constructor(_editor, _markerService, _configurationService, _outlineEntryFactory) {
        this._editor = _editor;
        this._markerService = _markerService;
        this._configurationService = _configurationService;
        this._outlineEntryFactory = _outlineEntryFactory;
        this._disposables = new DisposableStore();
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._entries = [];
        this.recomputeState();
    }
    get activeElement() {
        return this._activeEntry;
    }
    get entries() {
        return this._entries;
    }
    get isEmpty() {
        return this._entries.length === 0;
    }
    get uri() {
        return this._uri;
    }
    async computeFullSymbols(cancelToken) {
        try {
            const notebookEditorWidget = this._editor;
            const notebookCells = notebookEditorWidget
                ?.getViewModel()
                ?.viewCells.filter((cell) => cell.cellKind === CellKind.Code);
            if (notebookCells) {
                const promises = [];
                // limit the number of cells so that we don't resolve an excessive amount of text models
                for (const cell of notebookCells.slice(0, 50)) {
                    // gather all symbols asynchronously
                    promises.push(this._outlineEntryFactory.cacheSymbols(cell, cancelToken));
                }
                await Promise.allSettled(promises);
            }
            this.recomputeState();
        }
        catch (err) {
            console.error('Failed to compute notebook outline symbols:', err);
            // Still recompute state with whatever symbols we have
            this.recomputeState();
        }
    }
    recomputeState() {
        this._disposables.clear();
        this._activeEntry = undefined;
        this._uri = undefined;
        if (!this._editor.hasModel()) {
            return;
        }
        this._uri = this._editor.textModel.uri;
        const notebookEditorWidget = this._editor;
        if (notebookEditorWidget.getLength() === 0) {
            return;
        }
        const notebookCells = notebookEditorWidget.getViewModel().viewCells;
        const entries = [];
        for (const cell of notebookCells) {
            entries.push(...this._outlineEntryFactory.getOutlineEntries(cell, entries.length));
        }
        // build a tree from the list of entries
        if (entries.length > 0) {
            const result = [entries[0]];
            const parentStack = [entries[0]];
            for (let i = 1; i < entries.length; i++) {
                const entry = entries[i];
                while (true) {
                    const len = parentStack.length;
                    if (len === 0) {
                        // root node
                        result.push(entry);
                        parentStack.push(entry);
                        break;
                    }
                    else {
                        const parentCandidate = parentStack[len - 1];
                        if (parentCandidate.level < entry.level) {
                            parentCandidate.addChild(entry);
                            parentStack.push(entry);
                            break;
                        }
                        else {
                            parentStack.pop();
                        }
                    }
                }
            }
            this._entries = result;
        }
        // feature: show markers with each cell
        const markerServiceListener = new MutableDisposable();
        this._disposables.add(markerServiceListener);
        const updateMarkerUpdater = () => {
            if (notebookEditorWidget.isDisposed) {
                return;
            }
            const doUpdateMarker = (clear) => {
                for (const entry of this._entries) {
                    if (clear) {
                        entry.clearMarkers();
                    }
                    else {
                        entry.updateMarkers(this._markerService);
                    }
                }
            };
            const problem = this._configurationService.getValue('problems.visibility');
            if (problem === undefined) {
                return;
            }
            const config = this._configurationService.getValue("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */);
            if (problem && config) {
                markerServiceListener.value = this._markerService.onMarkerChanged((e) => {
                    if (notebookEditorWidget.isDisposed) {
                        console.error('notebook editor is disposed');
                        return;
                    }
                    if (e.some((uri) => notebookEditorWidget.getCellsInRange().some((cell) => isEqual(cell.uri, uri)))) {
                        doUpdateMarker(false);
                        this._onDidChange.fire({});
                    }
                });
                doUpdateMarker(false);
            }
            else {
                markerServiceListener.clear();
                doUpdateMarker(true);
            }
        };
        updateMarkerUpdater();
        this._disposables.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('problems.visibility') ||
                e.affectsConfiguration("outline.problems.enabled" /* OutlineConfigKeys.problemsEnabled */)) {
                updateMarkerUpdater();
                this._onDidChange.fire({});
            }
        }));
        const { changeEventTriggered } = this.recomputeActive();
        if (!changeEventTriggered) {
            this._onDidChange.fire({});
        }
    }
    recomputeActive() {
        let newActive;
        const notebookEditorWidget = this._editor;
        if (notebookEditorWidget) {
            //TODO don't check for widget, only here if we do have
            if (notebookEditorWidget.hasModel() && notebookEditorWidget.getLength() > 0) {
                const cell = notebookEditorWidget.cellAt(notebookEditorWidget.getFocus().start);
                if (cell) {
                    for (const entry of this._entries) {
                        newActive = entry.find(cell, []);
                        if (newActive) {
                            break;
                        }
                    }
                }
            }
        }
        if (newActive !== this._activeEntry) {
            this._activeEntry = newActive;
            this._onDidChange.fire({ affectOnlyActiveElement: true });
            return { changeEventTriggered: true };
        }
        return { changeEventTriggered: false };
    }
    dispose() {
        this._entries.length = 0;
        this._activeEntry = undefined;
        this._disposables.dispose();
    }
};
NotebookCellOutlineDataSource = __decorate([
    __param(1, IMarkerService),
    __param(2, IConfigurationService),
    __param(3, INotebookOutlineEntryFactory)
], NotebookCellOutlineDataSource);
export { NotebookCellOutlineDataSource };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld01vZGVsL25vdGVib29rT3V0bGluZURhdGFTb3VyY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWxGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQU96RCxPQUFPLEVBQ04sNEJBQTRCLEdBRTVCLE1BQU0sa0NBQWtDLENBQUE7QUFPbEMsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBNkI7SUFVekMsWUFDa0IsT0FBd0IsRUFDekIsY0FBK0MsRUFDeEMscUJBQTZELEVBRXBGLG9CQUFrRTtRQUpqRCxZQUFPLEdBQVAsT0FBTyxDQUFpQjtRQUNSLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUN2QiwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBRW5FLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBNkI7UUFkbEQsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXBDLGlCQUFZLEdBQUcsSUFBSSxPQUFPLEVBQXNCLENBQUE7UUFDeEQsZ0JBQVcsR0FBOEIsSUFBSSxDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUE7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