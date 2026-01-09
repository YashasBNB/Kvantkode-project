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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrRWRpdG9yQ29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2NhbGxTdGFja0VkaXRvckNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFLL0QsT0FBTyxFQUNOLGVBQWUsRUFHZixpQkFBaUIsR0FFakIsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQWUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMvRCxPQUFPLHlDQUF5QyxDQUFBO0FBRWhELE1BQU0sQ0FBQyxNQUFNLGtCQUFr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