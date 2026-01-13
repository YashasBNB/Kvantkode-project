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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci92aWV3TW9kZWwvbm90ZWJvb2tPdXRsaW5lRGF0YVNvdXJjZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBT3pELE9BQU8sRUFDTiw0QkFBNEIsR0FFNUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQU9sQyxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE2QjtJQVV6QyxZQUNrQixPQUF3QixFQUN6QixjQUErQyxFQUN4QyxxQkFBNkQsRUFFcEYsb0JBQWtFO1FBSmpELFlBQU8sR0FBUCxPQUFPLENBQWlCO1FBQ1IsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBQ3ZCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFbkUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUE2QjtRQWRsRCxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFcEMsaUJBQVksR0FBRyxJQUFJLE9BQU8sRUFBc0IsQ0FBQTtRQUN4RCxnQkFBVyxHQUE4QixJQUFJLENB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