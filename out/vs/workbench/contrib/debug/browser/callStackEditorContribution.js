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
import { distinct } from '../../../../base/common/arrays.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { GlyphMarginLane, OverviewRulerLane, } from '../../../../editor/common/model.js';
import { localize } from '../../../../nls.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { debugStackframe, debugStackframeFocused } from './debugIcons.js';
import { IDebugService } from '../common/debug.js';
import './media/callStackEditorContribution.css';
export const topStackFrameColor = registerColor('editor.stackFrameHighlightBackground', { dark: '#ffff0033', light: '#ffff6673', hcDark: '#ffff0033', hcLight: '#ffff6673' }, localize('topStackFrameLineHighlight', 'Background color for the highlight of line at the top stack frame position.'));
export const focusedStackFrameColor = registerColor('editor.focusedStackFrameHighlightBackground', { dark: '#7abd7a4d', light: '#cee7ce73', hcDark: '#7abd7a4d', hcLight: '#cee7ce73' }, localize('focusedStackFrameLineHighlight', 'Background color for the highlight of line at focused stack frame position.'));
const stickiness = 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */;
// we need a separate decoration for glyph margin, since we do not want it on each line of a multi line statement.
const TOP_STACK_FRAME_MARGIN = {
    description: 'top-stack-frame-margin',
    glyphMarginClassName: ThemeIcon.asClassName(debugStackframe),
    glyphMargin: { position: GlyphMarginLane.Right },
    zIndex: 9999,
    stickiness,
    overviewRuler: {
        position: OverviewRulerLane.Full,
        color: themeColorFromId(topStackFrameColor),
    },
};
const FOCUSED_STACK_FRAME_MARGIN = {
    description: 'focused-stack-frame-margin',
    glyphMarginClassName: ThemeIcon.asClassName(debugStackframeFocused),
    glyphMargin: { position: GlyphMarginLane.Right },
    zIndex: 9999,
    stickiness,
    overviewRuler: {
        position: OverviewRulerLane.Full,
        color: themeColorFromId(focusedStackFrameColor),
    },
};
export const TOP_STACK_FRAME_DECORATION = {
    description: 'top-stack-frame-decoration',
    isWholeLine: true,
    className: 'debug-top-stack-frame-line',
    stickiness,
};
export const FOCUSED_STACK_FRAME_DECORATION = {
    description: 'focused-stack-frame-decoration',
    isWholeLine: true,
    className: 'debug-focused-stack-frame-line',
    stickiness,
};
export const makeStackFrameColumnDecoration = (noCharactersBefore) => ({
    description: 'top-stack-frame-inline-decoration',
    before: {
        content: '\uEB8B',
        inlineClassName: noCharactersBefore
            ? 'debug-top-stack-frame-column start-of-line'
            : 'debug-top-stack-frame-column',
        inlineClassNameAffectsLetterSpacing: true,
    },
});
export function createDecorationsForStackFrame(stackFrame, isFocusedSession, noCharactersBefore) {
    // only show decorations for the currently focused thread.
    const result = [];
    const columnUntilEOLRange = new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn, stackFrame.range.startLineNumber, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */);
    const range = new Range(stackFrame.range.startLineNumber, stackFrame.range.startColumn, stackFrame.range.startLineNumber, stackFrame.range.startColumn + 1);
    // compute how to decorate the editor. Different decorations are used if this is a top stack frame, focused stack frame,
    // an exception or a stack frame that did not change the line number (we only decorate the columns, not the whole line).
    const topStackFrame = stackFrame.thread.getTopStackFrame();
    if (stackFrame.getId() === topStackFrame?.getId()) {
        if (isFocusedSession) {
            result.push({
                options: TOP_STACK_FRAME_MARGIN,
                range,
            });
        }
        result.push({
            options: TOP_STACK_FRAME_DECORATION,
            range: columnUntilEOLRange,
        });
        if (stackFrame.range.startColumn > 1) {
            result.push({
                options: makeStackFrameColumnDecoration(noCharactersBefore),
                range: columnUntilEOLRange,
            });
        }
    }
    else {
        if (isFocusedSession) {
            result.push({
                options: FOCUSED_STACK_FRAME_MARGIN,
                range,
            });
        }
        result.push({
            options: FOCUSED_STACK_FRAME_DECORATION,
            range: columnUntilEOLRange,
        });
    }
    return result;
}
let CallStackEditorContribution = class CallStackEditorContribution extends Disposable {
    constructor(editor, debugService, uriIdentityService, logService) {
        super();
        this.editor = editor;
        this.debugService = debugService;
        this.uriIdentityService = uriIdentityService;
        this.logService = logService;
        this.decorations = this.editor.createDecorationsCollection();
        const setDecorations = () => this.decorations.set(this.createCallStackDecorations());
        this._register(Event.any(this.debugService.getViewModel().onDidFocusStackFrame, this.debugService.getModel().onDidChangeCallStack)(() => {
            setDecorations();
        }));
        this._register(this.editor.onDidChangeModel((e) => {
            if (e.newModelUrl) {
                setDecorations();
            }
        }));
        setDecorations();
    }
    createCallStackDecorations() {
        const editor = this.editor;
        if (!editor.hasModel()) {
            return [];
        }
        const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
        const decorations = [];
        this.debugService
            .getModel()
            .getSessions()
            .forEach((s) => {
            const isSessionFocused = s === focusedStackFrame?.thread.session;
            s.getAllThreads().forEach((t) => {
                if (t.stopped) {
                    const callStack = t.getCallStack();
                    const stackFrames = [];
                    if (callStack.length > 0) {
                        // Always decorate top stack frame, and decorate focused stack frame if it is not the top stack frame
                        if (focusedStackFrame && !focusedStackFrame.equals(callStack[0])) {
                            stackFrames.push(focusedStackFrame);
                        }
                        stackFrames.push(callStack[0]);
                    }
                    stackFrames.forEach((candidateStackFrame) => {
                        if (candidateStackFrame &&
                            this.uriIdentityService.extUri.isEqual(candidateStackFrame.source.uri, editor.getModel()?.uri)) {
                            if (candidateStackFrame.range.startLineNumber > editor.getModel()?.getLineCount() ||
                                candidateStackFrame.range.startLineNumber < 1) {
                                this.logService.warn(`CallStackEditorContribution: invalid stack frame line number: ${candidateStackFrame.range.startLineNumber}`);
                                return;
                            }
                            const noCharactersBefore = editor
                                .getModel()
                                .getLineFirstNonWhitespaceColumn(candidateStackFrame.range.startLineNumber) >=
                                candidateStackFrame.range.startColumn;
                            decorations.push(...createDecorationsForStackFrame(candidateStackFrame, isSessionFocused, noCharactersBefore));
                        }
                    });
                }
            });
        });
        // Deduplicate same decorations so colors do not stack #109045
        return distinct(decorations, (d) => `${d.options.className} ${d.options.glyphMarginClassName} ${d.range.startLineNumber} ${d.range.startColumn}`);
    }
    dispose() {
        super.dispose();
        this.decorations.clear();
    }
};
CallStackEditorContribution = __decorate([
    __param(1, IDebugService),
    __param(2, IUriIdentityService),
    __param(3, ILogService)
], CallStackEditorContribution);
export { CallStackEditorContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrRWRpdG9yQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9jYWxsU3RhY2tFZGl0b3JDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFHakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBSy9ELE9BQU8sRUFDTixlQUFlLEVBR2YsaUJBQWlCLEdBRWpCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDcEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxlQUFlLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFlLE1BQU0sb0JBQW9CLENBQUE7QUFDL0QsT0FBTyx5Q0FBeUMsQ0FBQTtBQUVoRCxNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxhQUFhLENBQzlDLHNDQUFz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