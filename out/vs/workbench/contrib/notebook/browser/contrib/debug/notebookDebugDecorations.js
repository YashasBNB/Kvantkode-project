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
import { Delayer } from '../../../../../../base/common/async.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { debugIconBreakpointForeground } from '../../../../debug/browser/breakpointEditorContribution.js';
import { focusedStackFrameColor, topStackFrameColor, } from '../../../../debug/browser/callStackEditorContribution.js';
import { IDebugService } from '../../../../debug/common/debug.js';
import { NotebookOverviewRulerLane, } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { runningCellRulerDecorationColor } from '../../notebookEditorWidget.js';
import { CellUri, NotebookCellExecutionState } from '../../../common/notebookCommon.js';
import { INotebookExecutionStateService, NotebookExecutionType, } from '../../../common/notebookExecutionStateService.js';
let PausedCellDecorationContribution = class PausedCellDecorationContribution extends Disposable {
    static { this.id = 'workbench.notebook.debug.pausedCellDecorations'; }
    constructor(_notebookEditor, _debugService, _notebookExecutionStateService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._debugService = _debugService;
        this._notebookExecutionStateService = _notebookExecutionStateService;
        this._currentTopDecorations = [];
        this._currentOtherDecorations = [];
        this._executingCellDecorations = [];
        const delayer = this._register(new Delayer(200));
        this._register(_debugService.getModel().onDidChangeCallStack(() => this.updateExecutionDecorations()));
        this._register(_debugService.getViewModel().onDidFocusStackFrame(() => this.updateExecutionDecorations()));
        this._register(_notebookExecutionStateService.onDidChangeExecution((e) => {
            if (e.type === NotebookExecutionType.cell &&
                this._notebookEditor.textModel &&
                e.affectsNotebook(this._notebookEditor.textModel.uri)) {
                delayer.trigger(() => this.updateExecutionDecorations());
            }
        }));
    }
    updateExecutionDecorations() {
        const exes = this._notebookEditor.textModel
            ? this._notebookExecutionStateService.getCellExecutionsByHandleForNotebook(this._notebookEditor.textModel.uri)
            : undefined;
        const topFrameCellsAndRanges = [];
        let focusedFrameCellAndRange = undefined;
        const getNotebookCellAndRange = (sf) => {
            const parsed = CellUri.parse(sf.source.uri);
            if (parsed && parsed.notebook.toString() === this._notebookEditor.textModel?.uri.toString()) {
                return { handle: parsed.handle, range: sf.range };
            }
            return undefined;
        };
        for (const session of this._debugService.getModel().getSessions()) {
            for (const thread of session.getAllThreads()) {
                const topFrame = thread.getTopStackFrame();
                if (topFrame) {
                    const notebookCellAndRange = getNotebookCellAndRange(topFrame);
                    if (notebookCellAndRange) {
                        topFrameCellsAndRanges.push(notebookCellAndRange);
                        exes?.delete(notebookCellAndRange.handle);
                    }
                }
            }
        }
        const focusedFrame = this._debugService.getViewModel().focusedStackFrame;
        if (focusedFrame && focusedFrame.thread.stopped) {
            const thisFocusedFrameCellAndRange = getNotebookCellAndRange(focusedFrame);
            if (thisFocusedFrameCellAndRange &&
                !topFrameCellsAndRanges.some((topFrame) => topFrame.handle === thisFocusedFrameCellAndRange?.handle &&
                    Range.equalsRange(topFrame.range, thisFocusedFrameCellAndRange?.range))) {
                focusedFrameCellAndRange = thisFocusedFrameCellAndRange;
                exes?.delete(focusedFrameCellAndRange.handle);
            }
        }
        this.setTopFrameDecoration(topFrameCellsAndRanges);
        this.setFocusedFrameDecoration(focusedFrameCellAndRange);
        const exeHandles = exes
            ? Array.from(exes.entries())
                .filter(([_, exe]) => exe.state === NotebookCellExecutionState.Executing)
                .map(([handle]) => handle)
            : [];
        this.setExecutingCellDecorations(exeHandles);
    }
    setTopFrameDecoration(handlesAndRanges) {
        const newDecorations = handlesAndRanges.map(({ handle, range }) => {
            const options = {
                overviewRuler: {
                    color: topStackFrameColor,
                    includeOutput: false,
                    modelRanges: [range],
                    position: NotebookOverviewRulerLane.Full,
                },
            };
            return {
                handle,
                options,
            };
        });
        this._currentTopDecorations = this._notebookEditor.deltaCellDecorations(this._currentTopDecorations, newDecorations);
    }
    setFocusedFrameDecoration(focusedFrameCellAndRange) {
        let newDecorations = [];
        if (focusedFrameCellAndRange) {
            const options = {
                overviewRuler: {
                    color: focusedStackFrameColor,
                    includeOutput: false,
                    modelRanges: [focusedFrameCellAndRange.range],
                    position: NotebookOverviewRulerLane.Full,
                },
            };
            newDecorations = [
                {
                    handle: focusedFrameCellAndRange.handle,
                    options,
                },
            ];
        }
        this._currentOtherDecorations = this._notebookEditor.deltaCellDecorations(this._currentOtherDecorations, newDecorations);
    }
    setExecutingCellDecorations(handles) {
        const newDecorations = handles.map((handle) => {
            const options = {
                overviewRuler: {
                    color: runningCellRulerDecorationColor,
                    includeOutput: false,
                    modelRanges: [new Range(0, 0, 0, 0)],
                    position: NotebookOverviewRulerLane.Left,
                },
            };
            return {
                handle,
                options,
            };
        });
        this._executingCellDecorations = this._notebookEditor.deltaCellDecorations(this._executingCellDecorations, newDecorations);
    }
};
PausedCellDecorationContribution = __decorate([
    __param(1, IDebugService),
    __param(2, INotebookExecutionStateService)
], PausedCellDecorationContribution);
export { PausedCellDecorationContribution };
registerNotebookContribution(PausedCellDecorationContribution.id, PausedCellDecorationContribution);
let NotebookBreakpointDecorations = class NotebookBreakpointDecorations extends Disposable {
    static { this.id = 'workbench.notebook.debug.notebookBreakpointDecorations'; }
    constructor(_notebookEditor, _debugService, _configService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._debugService = _debugService;
        this._configService = _configService;
        this._currentDecorations = [];
        this._register(_debugService.getModel().onDidChangeBreakpoints(() => this.updateDecorations()));
        this._register(_configService.onDidChangeConfiguration((e) => e.affectsConfiguration('debug.showBreakpointsInOverviewRuler') &&
            this.updateDecorations()));
    }
    updateDecorations() {
        const enabled = this._configService.getValue('debug.showBreakpointsInOverviewRuler');
        const newDecorations = enabled
            ? this._debugService
                .getModel()
                .getBreakpoints()
                .map((breakpoint) => {
                const parsed = CellUri.parse(breakpoint.uri);
                if (!parsed ||
                    parsed.notebook.toString() !== this._notebookEditor.textModel.uri.toString()) {
                    return null;
                }
                const options = {
                    overviewRuler: {
                        color: debugIconBreakpointForeground,
                        includeOutput: false,
                        modelRanges: [new Range(breakpoint.lineNumber, 0, breakpoint.lineNumber, 0)],
                        position: NotebookOverviewRulerLane.Left,
                    },
                };
                return { handle: parsed.handle, options };
            })
                .filter((x) => !!x)
            : [];
        this._currentDecorations = this._notebookEditor.deltaCellDecorations(this._currentDecorations, newDecorations);
    }
};
NotebookBreakpointDecorations = __decorate([
    __param(1, IDebugService),
    __param(2, IConfigurationService)
], NotebookBreakpointDecorations);
export { NotebookBreakpointDecorations };
registerNotebookContribution(NotebookBreakpointDecorations.id, NotebookBreakpointDecorations);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWJ1Z0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvZGVidWcvbm90ZWJvb2tEZWJ1Z0RlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdkUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsa0JBQWtCLEdBQ2xCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlFLE9BQU8sRUFLTix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkYsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixxQkFBcUIsR0FDckIsTUFBTSxrREFBa0QsQ0FBQTtBQU9sRCxJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUNaLFNBQVEsVUFBVTthQUdYLE9BQUUsR0FBVyxnREFBZ0QsQUFBM0Qs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