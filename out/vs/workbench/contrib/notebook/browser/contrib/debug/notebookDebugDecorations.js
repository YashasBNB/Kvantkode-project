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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEZWJ1Z0RlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL2RlYnVnL25vdGVib29rRGVidWdEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGtCQUFrQixHQUNsQixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RSxPQUFPLEVBS04seUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0UsT0FBTyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIscUJBQXFCLEdBQ3JCLE1BQU0sa0RBQWtELENBQUE7QUFPbEQsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FDWixTQUFRLFVBQVU7YUFHWCxPQUFFLEdBQVcsZ0RBQWdELEFBQTNELENBQTJE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