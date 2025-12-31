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
import { Disposable, DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { Selection } from '../../../../../../editor/common/core/selection.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
let NotebookSelectionHighlighter = class NotebookSelectionHighlighter extends Disposable {
    static { this.id = 'notebook.selectionHighlighter'; }
    // right now this lets us mimic the more performant cache implementation of the text editor (doesn't need to be a delayer)
    // todo: in the future, implement caching and change to a 250ms delay upon recompute
    // private readonly runDelayer: Delayer<void> = this._register(new Delayer<void>(0));
    constructor(notebookEditor, configurationService) {
        super();
        this.notebookEditor = notebookEditor;
        this.configurationService = configurationService;
        this.isEnabled = false;
        this.cellDecorationIds = new Map();
        this.anchorDisposables = new DisposableStore();
        this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.selectionHighlight')) {
                this.isEnabled = this.configurationService.getValue('editor.selectionHighlight');
            }
        }));
        this._register(this.notebookEditor.onDidChangeActiveCell(async () => {
            if (!this.isEnabled) {
                return;
            }
            this.anchorCell = this.notebookEditor.activeCellAndCodeEditor;
            if (!this.anchorCell) {
                return;
            }
            const activeCell = this.notebookEditor.getActiveCell();
            if (!activeCell) {
                return;
            }
            if (!activeCell.editorAttached) {
                await Event.toPromise(activeCell.onDidChangeEditorAttachState);
            }
            this.clearNotebookSelectionDecorations();
            this.anchorDisposables.clear();
            this.anchorDisposables.add(this.anchorCell[1].onDidChangeCursorPosition((e) => {
                if (e.reason !== 3 /* CursorChangeReason.Explicit */) {
                    this.clearNotebookSelectionDecorations();
                    return;
                }
                if (!this.anchorCell) {
                    return;
                }
                if (this.notebookEditor.hasModel()) {
                    this.clearNotebookSelectionDecorations();
                    this._update(this.notebookEditor);
                }
            }));
            if (this.notebookEditor.getEditorViewState().editorFocused &&
                this.notebookEditor.hasModel()) {
                this._update(this.notebookEditor);
            }
        }));
    }
    _update(editor) {
        if (!this.anchorCell || !this.isEnabled) {
            return;
        }
        // TODO: isTooLargeForTokenization check, notebook equivalent?
        // unlikely that any one cell's textmodel would be too large
        // get the word
        const textModel = this.anchorCell[0].textModel;
        if (!textModel || textModel.isTooLargeForTokenization()) {
            return;
        }
        const s = this.anchorCell[0].getSelections()[0];
        if (s.startLineNumber !== s.endLineNumber || s.isEmpty()) {
            // empty selections do nothing
            // multiline forbidden for perf reasons
            return;
        }
        const searchText = this.getSearchText(s, textModel);
        if (!searchText) {
            return;
        }
        const results = editor.textModel.findMatches(searchText, false, true, null);
        for (const res of results) {
            const cell = editor.getCellByHandle(res.cell.handle);
            if (!cell) {
                continue;
            }
            this.updateCellDecorations(cell, res.matches);
        }
    }
    updateCellDecorations(cell, matches) {
        const selections = matches.map((m) => {
            return Selection.fromRange(m.range, 0 /* SelectionDirection.LTR */);
        });
        const newDecorations = [];
        selections?.map((selection) => {
            const isEmpty = selection.isEmpty();
            if (!isEmpty) {
                newDecorations.push({
                    range: selection,
                    options: {
                        description: '',
                        className: '.nb-selection-highlight',
                    },
                });
            }
        });
        const oldDecorations = this.cellDecorationIds.get(cell) ?? [];
        this.cellDecorationIds.set(cell, cell.deltaModelDecorations(oldDecorations, newDecorations));
    }
    clearNotebookSelectionDecorations() {
        this.cellDecorationIds.forEach((_, cell) => {
            const cellDecorations = this.cellDecorationIds.get(cell) ?? [];
            if (cellDecorations) {
                cell.deltaModelDecorations(cellDecorations, []);
                this.cellDecorationIds.delete(cell);
            }
        });
    }
    getSearchText(selection, model) {
        return model.getValueInRange(selection).replace(/\r\n/g, '\n');
    }
    dispose() {
        super.dispose();
        this.anchorDisposables.dispose();
    }
};
NotebookSelectionHighlighter = __decorate([
    __param(1, IConfigurationService)
], NotebookSelectionHighlighter);
registerNotebookContribution(NotebookSelectionHighlighter.id, NotebookSelectionHighlighter);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWxlY3Rpb25IaWdobGlnaHQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbXVsdGljdXJzb3Ivbm90ZWJvb2tTZWxlY3Rpb25IaWdobGlnaHQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFeEYsT0FBTyxFQUFFLFNBQVMsRUFBc0IsTUFBTSxtREFBbUQsQ0FBQTtBQU9qRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQU94RyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVoRixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFXLCtCQUErQixBQUExQyxDQUEwQztJQU81RCwwSEFBMEg7SUFDMUgsb0ZBQW9GO0lBQ3BGLHFGQUFxRjtJQUVyRixZQUNrQixjQUErQixFQUN6QixvQkFBNEQ7UUFFbkYsS0FBSyxFQUFFLENBQUE7UUFIVSxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFDUix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBWjVFLGNBQVMsR0FBWSxLQUFLLENBQUE7UUFFMUIsc0JBQWlCLEdBQUcsSUFBSSxHQUFHLEVBQTRCLENBQUE7UUFFOUMsc0JBQWlCLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQVl6RCxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVUsMkJBQTJCLENBQUMsQ0FBQTtR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