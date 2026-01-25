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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld3BvcnRXYXJtdXAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi92aWV3cG9ydFdhcm11cC92aWV3cG9ydFdhcm11cC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUNOLGFBQWEsR0FNYixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hGLE9BQU8sRUFBcUIsa0JBQWtCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFckUsSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNkIsU0FBUSxVQUFVO2FBQzdDLE9BQUUsR0FBVyxtQ0FBbUMsQUFBOUMsQ0FBOEM7SUFJdkQsWUFDa0IsZUFBZ0MsRUFDL0IsZ0JBQW1ELEVBQzlDLG9CQUEyQztRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUpVLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNkLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFKckQsb0JBQWUsR0FBNEIsSUFBSSxDQUFBO1FBUy9ELElBQUksQ0FBQyxlQUFlLEdB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