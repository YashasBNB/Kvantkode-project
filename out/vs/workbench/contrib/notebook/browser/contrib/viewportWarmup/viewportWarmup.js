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
import { RunOnceScheduler } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { IAccessibilityService } from '../../../../../../platform/accessibility/common/accessibility.js';
import { CellEditState, } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { outputDisplayLimit } from '../../viewModel/codeCellViewModel.js';
import { CellKind } from '../../../common/notebookCommon.js';
import { cellRangesToIndexes } from '../../../common/notebookRange.js';
import { INotebookService } from '../../../common/notebookService.js';
let NotebookViewportContribution = class NotebookViewportContribution extends Disposable {
    static { this.id = 'workbench.notebook.viewportWarmup'; }
    constructor(_notebookEditor, _notebookService, accessibilityService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._notebookService = _notebookService;
        this._warmupDocument = null;
        this._warmupViewport = new RunOnceScheduler(() => this._warmupViewportNow(), 200);
        this._register(this._warmupViewport);
        this._register(this._notebookEditor.onDidScroll(() => {
            this._warmupViewport.schedule();
        }));
        this._warmupDocument = new RunOnceScheduler(() => this._warmupDocumentNow(), 200);
        this._register(this._warmupDocument);
        this._register(this._notebookEditor.onDidAttachViewModel(() => {
            if (this._notebookEditor.hasModel()) {
                this._warmupDocument?.schedule();
            }
        }));
        if (this._notebookEditor.hasModel()) {
            this._warmupDocument?.schedule();
        }
    }
    _warmupDocumentNow() {
        if (this._notebookEditor.hasModel()) {
            for (let i = 0; i < this._notebookEditor.getLength(); i++) {
                const cell = this._notebookEditor.cellAt(i);
                if (cell?.cellKind === CellKind.Markup &&
                    cell?.getEditState() === CellEditState.Preview &&
                    !cell.isInputCollapsed) {
                    // TODO@rebornix currently we disable markdown cell rendering in webview for accessibility
                    // this._notebookEditor.createMarkupPreview(cell);
                }
                else if (cell?.cellKind === CellKind.Code) {
                    this._warmupCodeCell(cell);
                }
            }
        }
    }
    _warmupViewportNow() {
        if (this._notebookEditor.isDisposed) {
            return;
        }
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const visibleRanges = this._notebookEditor.getVisibleRangesPlusViewportAboveAndBelow();
        cellRangesToIndexes(visibleRanges).forEach((index) => {
            const cell = this._notebookEditor.cellAt(index);
            if (cell?.cellKind === CellKind.Markup &&
                cell?.getEditState() === CellEditState.Preview &&
                !cell.isInputCollapsed) {
                ;
                this._notebookEditor.createMarkupPreview(cell);
            }
            else if (cell?.cellKind === CellKind.Code) {
                this._warmupCodeCell(cell);
            }
        });
    }
    _warmupCodeCell(viewCell) {
        if (viewCell.isOutputCollapsed) {
            return;
        }
        const outputs = viewCell.outputsViewModels;
        for (const output of outputs.slice(0, outputDisplayLimit)) {
            const [mimeTypes, pick] = output.resolveMimeTypes(this._notebookEditor.textModel, undefined);
            if (!mimeTypes.find((mimeType) => mimeType.isTrusted) || mimeTypes.length === 0) {
                continue;
            }
            const pickedMimeTypeRenderer = mimeTypes[pick];
            if (!pickedMimeTypeRenderer) {
                return;
            }
            if (!this._notebookEditor.hasModel()) {
                return;
            }
            const renderer = this._notebookService.getRendererInfo(pickedMimeTypeRenderer.rendererId);
            if (!renderer) {
                return;
            }
            const result = {
                type: 1 /* RenderOutputType.Extension */,
                renderer,
                source: output,
                mimeType: pickedMimeTypeRenderer.mimeType,
            };
            this._notebookEditor.createOutput(viewCell, result, 0, true);
        }
    }
};
NotebookViewportContribution = __decorate([
    __param(1, INotebookService),
    __param(2, IAccessibilityService)
], NotebookViewportContribution);
registerNotebookContribution(NotebookViewportContribution.id, NotebookViewportContribution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRXYXJtdXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvdmlld3BvcnRXYXJtdXAvdmlld3BvcnRXYXJtdXAudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDekUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFDTixhQUFhLEdBTWIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQXFCLGtCQUFrQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXJFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUM3QyxPQUFFLEdBQVcsbUNBQW1DLEFBQTlDLENBQThDO0lBSXZELFlBQ2tCLGVBQWdDLEVBQy9CLGdCQUFtRCxFQUM5QyxvQkFBMkM7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFKVSxvQkFBZSxHQUFmLGVBQWUsQ0FBaUI7UUFDZCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBSnJELG9CQUFlLEdBQTRCLElBQUksQ0FBQTtRQVMvRCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDakYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsZUFBZSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUU7WUFDckMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLGdCQUFnQixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ2pGLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGVBQWUsQ0FBQyxvQkFBb0IsQ0FBQyxHQUFHLEVBQUU7WUFDOUMsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3JDLElBQUksQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLENBQUE7WUFDakMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsZUFBZSxFQUFFLFFBQVEsRUFBRSxDQUFBO1FBQ2pDLENBQUM7SUFDRixDQUFDO0lBRU8sa0JBQWtCO1FBQ3pCLElBQUksSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUUzQyxJQUNDLElBQUksRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU07b0JBQ2xDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTztvQkFDOUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLENBQUM7b0JBQ0YsMEZBQTBGO29CQUMxRixrREFBa0Q7Z0JBQ25ELENBQUM7cUJBQU0sSUFBSSxJQUFJLEVBQUUsUUFBUSxLQUFLLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztvQkFDN0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUF5QixDQUFDLENBQUE7Z0JBQ2hELENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxrQkFBa0I7UUFDekIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3JDLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMseUNBQXlDLEVBQUUsQ0FBQTtRQUN0RixtQkFBbUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUNwRCxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUUvQyxJQUNDLElBQUksRUFBRSxRQUFRLEtBQUssUUFBUSxDQUFDLE1BQU07Z0JBQ2xDLElBQUksRUFBRSxZQUFZLEVBQUUsS0FBSyxhQUFhLENBQUMsT0FBTztnQkFDOUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQ3JCLENBQUM7Z0JBQ0YsQ0FBQztnQkFBQyxJQUFJLENBQUMsZUFBMkMsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3RSxDQUFDO2lCQUFNLElBQUksSUFBSSxFQUFFLFFBQVEsS0FBSyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzdDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBeUIsQ0FBQyxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxlQUFlLENBQUMsUUFBMkI7UUFDbEQsSUFBSSxRQUFRLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUNoQyxPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQTtRQUMxQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLGtCQUFrQixDQUFDLEVBQUUsQ0FBQztZQUMzRCxNQUFNLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVUsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM3RixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ2pGLFNBQVE7WUFDVCxDQUFDO1lBRUQsTUFBTSxzQkFBc0IsR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUE7WUFFOUMsSUFBSSxDQUFDLHNCQUFzQixFQUFFLENBQUM7Z0JBQzdCLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBRXpGLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sTUFBTSxHQUF1QjtnQkFDbEMsSUFBSSxvQ0FBNEI7Z0JBQ2hDLFFBQVE7Z0JBQ1IsTUFBTSxFQUFFLE1BQU07Z0JBQ2QsUUFBUSxFQUFFLHNCQUFzQixDQUFDLFFBQVE7YUFDekMsQ0FBQTtZQUNELElBQUksQ0FBQyxlQUFlLENBQUMsWUFBWSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdELENBQUM7SUFDRixDQUFDOztBQW5ISSw0QkFBNEI7SUFPL0IsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHFCQUFxQixDQUFBO0dBUmxCLDRCQUE0QixDQW9IakM7QUFFRCw0QkFBNEIsQ0FBQyw0QkFBNEIsQ0FBQyxFQUFFLEVBQUUsNEJBQTRCLENBQUMsQ0FBQSJ9