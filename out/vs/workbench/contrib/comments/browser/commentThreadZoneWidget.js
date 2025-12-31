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
import { Color } from '../../../../base/common/color.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isCodeEditor, } from '../../../../editor/browser/editorBrowser.js';
import { Range } from '../../../../editor/common/core/range.js';
import * as languages from '../../../../editor/common/languages.js';
import { ZoneWidget } from '../../../../editor/contrib/zoneWidget/browser/zoneWidget.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { CommentGlyphWidget } from './commentGlyphWidget.js';
import { ICommentService } from './commentService.js';
import { EDITOR_FONT_DEFAULTS, } from '../../../../editor/common/config/editorOptions.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { CommentThreadWidget } from './commentThreadWidget.js';
import { commentThreadStateBackgroundColorVar, commentThreadStateColorVar, getCommentThreadStateBorderColor, } from './commentColors.js';
import { peekViewBorder } from '../../../../editor/contrib/peekView/browser/peekView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { StableEditorScrollState } from '../../../../editor/browser/stableEditorScroll.js';
import Severity from '../../../../base/common/severity.js';
import * as nls from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
function getCommentThreadWidgetStateColor(thread, theme) {
    return getCommentThreadStateBorderColor(thread, theme) ?? theme.getColor(peekViewBorder);
}
export var CommentWidgetFocus;
(function (CommentWidgetFocus) {
    CommentWidgetFocus[CommentWidgetFocus["None"] = 0] = "None";
    CommentWidgetFocus[CommentWidgetFocus["Widget"] = 1] = "Widget";
    CommentWidgetFocus[CommentWidgetFocus["Editor"] = 2] = "Editor";
})(CommentWidgetFocus || (CommentWidgetFocus = {}));
export function parseMouseDownInfoFromEvent(e) {
    const range = e.target.range;
    if (!range) {
        return null;
    }
    if (!e.event.leftButton) {
        return null;
    }
    if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
        return null;
    }
    const data = e.target.detail;
    const gutterOffsetX = data.offsetX - data.glyphMarginWidth - data.lineNumbersWidth - data.glyphMarginLeft;
    // don't collide with folding and git decorations
    if (gutterOffsetX > 20) {
        return null;
    }
    return { lineNumber: range.startLineNumber };
}
export function isMouseUpEventDragFromMouseDown(mouseDownInfo, e) {
    if (!mouseDownInfo) {
        return null;
    }
    const { lineNumber } = mouseDownInfo;
    const range = e.target.range;
    if (!range) {
        return null;
    }
    return lineNumber;
}
export function isMouseUpEventMatchMouseDown(mouseDownInfo, e) {
    if (!mouseDownInfo) {
        return null;
    }
    const { lineNumber } = mouseDownInfo;
    const range = e.target.range;
    if (!range || range.startLineNumber !== lineNumber) {
        return null;
    }
    if (e.target.type !== 4 /* MouseTargetType.GUTTER_LINE_DECORATIONS */) {
        return null;
    }
    return lineNumber;
}
let ReviewZoneWidget = class ReviewZoneWidget extends ZoneWidget {
    get uniqueOwner() {
        return this._uniqueOwner;
    }
    get commentThread() {
        return this._commentThread;
    }
    get expanded() {
        return this._isExpanded;
    }
    constructor(editor, _uniqueOwner, _commentThread, _pendingComment, _pendingEdits, instantiationService, themeService, commentService, contextKeyService, configurationService, dialogService) {
        super(editor, {
            keepEditorSelection: true,
            isAccessible: true,
            showArrow: !!_commentThread.range,
        });
        this._uniqueOwner = _uniqueOwner;
        this._commentThread = _commentThread;
        this._pendingComment = _pendingComment;
        this._pendingEdits = _pendingEdits;
        this.themeService = themeService;
        this.commentService = commentService;
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this._onDidClose = new Emitter();
        this._onDidCreateThread = new Emitter();
        this._globalToDispose = new DisposableStore();
        this._commentThreadDisposables = [];
        this._contextKeyService = contextKeyService.createScoped(this.domNode);
        this._scopedInstantiationService = this._globalToDispose.add(instantiationService.createChild(new ServiceCollection([IContextKeyService, this._contextKeyService])));
        const controller = this.commentService.getCommentController(this._uniqueOwner);
        if (controller) {
            this._commentOptions = controller.options;
        }
        this._initialCollapsibleState = _pendingComment
            ? languages.CommentThreadCollapsibleState.Expanded
            : _commentThread.initialCollapsibleState;
        _commentThread.initialCollapsibleState = this._initialCollapsibleState;
        this._commentThreadDisposables = [];
        this.create();
        this._globalToDispose.add(this.themeService.onDidColorThemeChange(this._applyTheme, this));
        this._globalToDispose.add(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this._applyTheme(this.themeService.getColorTheme());
            }
        }));
        this._applyTheme(this.themeService.getColorTheme());
    }
    get onDidClose() {
        return this._onDidClose.event;
    }
    get onDidCreateThread() {
        return this._onDidCreateThread.event;
    }
    getPosition() {
        if (this.position) {
            return this.position;
        }
        if (this._commentGlyph) {
            return this._commentGlyph.getPosition().position ?? undefined;
        }
        return undefined;
    }
    revealRange() {
        // we don't do anything here as we always do the reveal ourselves.
    }
    reveal(commentUniqueId, focus = CommentWidgetFocus.None) {
        this.makeVisible(commentUniqueId, focus);
        const comment = this._commentThread.comments?.find((comment) => comment.uniqueIdInThread === commentUniqueId) ?? this._commentThread.comments?.[0];
        this.commentService.setActiveCommentAndThread(this.uniqueOwner, {
            thread: this._commentThread,
            comment,
        });
    }
    _expandAndShowZoneWidget() {
        if (!this._isExpanded) {
            this.show(this.arrowPosition(this._commentThread.range), 2);
        }
    }
    _setFocus(commentUniqueId, focus) {
        if (focus === CommentWidgetFocus.Widget) {
            this._commentThreadWidget.focus(commentUniqueId);
        }
        else if (focus === CommentWidgetFocus.Editor) {
            this._commentThreadWidget.focusCommentEditor();
        }
    }
    _goToComment(commentUniqueId, focus) {
        const height = this.editor.getLayoutInfo().height;
        const coords = this._commentThreadWidget.getCommentCoords(commentUniqueId);
        if (coords) {
            let scrollTop = 1;
            if (this._commentThread.range) {
                const commentThreadCoords = coords.thread;
                const commentCoords = coords.comment;
                scrollTop =
                    this.editor.getTopForLineNumber(this._commentThread.range.startLineNumber) -
                        height / 2 +
                        commentCoords.top -
                        commentThreadCoords.top;
            }
            this.editor.setScrollTop(scrollTop);
            this._setFocus(commentUniqueId, focus);
        }
        else {
            this._goToThread(focus);
        }
    }
    _goToThread(focus) {
        const rangeToReveal = this._commentThread.range
            ? new Range(this._commentThread.range.startLineNumber, this._commentThread.range.startColumn, this._commentThread.range.endLineNumber + 1, 1)
            : new Range(1, 1, 1, 1);
        this.editor.revealRangeInCenter(rangeToReveal);
        this._setFocus(undefined, focus);
    }
    makeVisible(commentUniqueId, focus = CommentWidgetFocus.None) {
        this._expandAndShowZoneWidget();
        if (commentUniqueId !== undefined) {
            this._goToComment(commentUniqueId, focus);
        }
        else {
            this._goToThread(focus);
        }
    }
    getPendingComments() {
        return {
            newComment: this._commentThreadWidget.getPendingComment(),
            edits: this._commentThreadWidget.getPendingEdits(),
        };
    }
    setPendingComment(pending) {
        this._pendingComment = pending;
        this.expand();
        this._commentThreadWidget.setPendingComment(pending);
    }
    _fillContainer(container) {
        this.setCssClass('review-widget');
        this._commentThreadWidget = this._scopedInstantiationService.createInstance(CommentThreadWidget, container, this.editor, this._uniqueOwner, this.editor.getModel().uri, this._contextKeyService, this._scopedInstantiationService, this._commentThread, this._pendingComment, this._pendingEdits, {
            editor: this.editor,
            codeBlockFontSize: '',
            codeBlockFontFamily: this.configurationService.getValue('editor').fontFamily ||
                EDITOR_FONT_DEFAULTS.fontFamily,
        }, this._commentOptions, {
            actionRunner: async () => {
                if (!this._commentThread.comments || !this._commentThread.comments.length) {
                    const newPosition = this.getPosition();
                    if (newPosition) {
                        const originalRange = this._commentThread.range;
                        if (!originalRange) {
                            return;
                        }
                        let range;
                        if (newPosition.lineNumber !== originalRange.endLineNumber) {
                            // The widget could have moved as a result of editor changes.
                            // We need to try to calculate the new, more correct, range for the comment.
                            const distance = newPosition.lineNumber - originalRange.endLineNumber;
                            range = new Range(originalRange.startLineNumber + distance, originalRange.startColumn, originalRange.endLineNumber + distance, originalRange.endColumn);
                        }
                        else {
                            range = new Range(originalRange.startLineNumber, originalRange.startColumn, originalRange.endLineNumber, originalRange.endColumn);
                        }
                        await this.commentService.updateCommentThreadTemplate(this.uniqueOwner, this._commentThread.commentThreadHandle, range);
                    }
                }
            },
            collapse: () => {
                return this.collapse(true);
            },
        });
        this._disposables.add(this._commentThreadWidget);
    }
    arrowPosition(range) {
        if (!range) {
            return undefined;
        }
        // Arrow on top edge of zone widget will be at the start of the line if range is multi-line, else at midpoint of range (rounding rightwards)
        return {
            lineNumber: range.endLineNumber,
            column: range.endLineNumber === range.startLineNumber
                ? (range.startColumn + range.endColumn + 1) / 2
                : 1,
        };
    }
    deleteCommentThread() {
        this.dispose();
        this.commentService.disposeCommentThread(this.uniqueOwner, this._commentThread.threadId);
    }
    doCollapse() {
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
    }
    async collapse(confirm = false) {
        if (!confirm || (await this.confirmCollapse())) {
            this.doCollapse();
            return true;
        }
        else {
            return false;
        }
    }
    async confirmCollapse() {
        const confirmSetting = this.configurationService.getValue('comments.thread.confirmOnCollapse');
        if (confirmSetting === 'whenHasUnsubmittedComments' &&
            this._commentThreadWidget.hasUnsubmittedComments) {
            const result = await this.dialogService.confirm({
                message: nls.localize('confirmCollapse', 'Collapsing a comment thread will discard unsubmitted comments. Do you want to collapse this comment thread?'),
                primaryButton: nls.localize('collapse', 'Collapse'),
                type: Severity.Warning,
                checkbox: { label: nls.localize('neverAskAgain', 'Never ask me again'), checked: false },
            });
            if (result.checkboxChecked) {
                await this.configurationService.updateValue('comments.thread.confirmOnCollapse', 'never');
            }
            return result.confirmed;
        }
        return true;
    }
    expand(setActive) {
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
        if (setActive) {
            this.commentService.setActiveCommentAndThread(this.uniqueOwner, {
                thread: this._commentThread,
            });
        }
    }
    getGlyphPosition() {
        if (this._commentGlyph) {
            return this._commentGlyph.getPosition().position.lineNumber;
        }
        return 0;
    }
    async update(commentThread) {
        if (this._commentThread !== commentThread) {
            this._commentThreadDisposables.forEach((disposable) => disposable.dispose());
            this._commentThread = commentThread;
            this._commentThreadDisposables = [];
            this.bindCommentThreadListeners();
        }
        await this._commentThreadWidget.updateCommentThread(commentThread);
        // Move comment glyph widget and show position if the line has changed.
        const lineNumber = this._commentThread.range?.endLineNumber ?? 1;
        let shouldMoveWidget = false;
        if (this._commentGlyph) {
            this._commentGlyph.setThreadState(commentThread.state);
            if (this._commentGlyph.getPosition().position.lineNumber !== lineNumber) {
                shouldMoveWidget = true;
                this._commentGlyph.setLineNumber(lineNumber);
            }
        }
        if ((shouldMoveWidget && this._isExpanded) ||
            (this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded &&
                !this._isExpanded)) {
            this.show(this.arrowPosition(this._commentThread.range), 2);
        }
        else if (this._commentThread.collapsibleState !== languages.CommentThreadCollapsibleState.Expanded) {
            this.hide();
        }
    }
    _onWidth(widthInPixel) {
        this._commentThreadWidget.layout(widthInPixel);
    }
    _doLayout(heightInPixel, widthInPixel) {
        this._commentThreadWidget.layout(widthInPixel);
    }
    async display(range, shouldReveal) {
        if (range) {
            this._commentGlyph = new CommentGlyphWidget(this.editor, range?.endLineNumber ?? -1);
            this._commentGlyph.setThreadState(this._commentThread.state);
            this._globalToDispose.add(this._commentGlyph.onDidChangeLineNumber(async (e) => {
                if (!this._commentThread.range) {
                    return;
                }
                const shift = e - this._commentThread.range.endLineNumber;
                const newRange = new Range(this._commentThread.range.startLineNumber + shift, this._commentThread.range.startColumn, this._commentThread.range.endLineNumber + shift, this._commentThread.range.endColumn);
                this._commentThread.range = newRange;
            }));
        }
        await this._commentThreadWidget.display(this.editor.getOption(68 /* EditorOption.lineHeight */), shouldReveal);
        this._disposables.add(this._commentThreadWidget.onDidResize((dimension) => {
            this._refresh(dimension);
        }));
        if (this._commentThread.collapsibleState === languages.CommentThreadCollapsibleState.Expanded) {
            this.show(this.arrowPosition(range), 2);
        }
        // If this is a new comment thread awaiting user input then we need to reveal it.
        if (shouldReveal) {
            this.makeVisible();
        }
        this.bindCommentThreadListeners();
    }
    bindCommentThreadListeners() {
        this._commentThreadDisposables.push(this._commentThread.onDidChangeComments(async (_) => {
            await this.update(this._commentThread);
        }));
        this._commentThreadDisposables.push(this._commentThread.onDidChangeCollapsibleState((state) => {
            if (state === languages.CommentThreadCollapsibleState.Expanded && !this._isExpanded) {
                this.show(this.arrowPosition(this._commentThread.range), 2);
                this._commentThreadWidget.ensureFocusIntoNewEditingComment();
                return;
            }
            if (state === languages.CommentThreadCollapsibleState.Collapsed && this._isExpanded) {
                this.hide();
                return;
            }
        }));
        if (this._initialCollapsibleState === undefined) {
            const onDidChangeInitialCollapsibleState = this._commentThread.onDidChangeInitialCollapsibleState((state) => {
                // File comments always start expanded
                this._initialCollapsibleState = state;
                this._commentThread.collapsibleState = this._initialCollapsibleState;
                onDidChangeInitialCollapsibleState.dispose();
            });
            this._commentThreadDisposables.push(onDidChangeInitialCollapsibleState);
        }
        this._commentThreadDisposables.push(this._commentThread.onDidChangeState(() => {
            const borderColor = getCommentThreadWidgetStateColor(this._commentThread.state, this.themeService.getColorTheme()) || Color.transparent;
            this.style({
                frameColor: borderColor,
                arrowColor: borderColor,
            });
            this.container?.style.setProperty(commentThreadStateColorVar, `${borderColor}`);
            this.container?.style.setProperty(commentThreadStateBackgroundColorVar, `${borderColor.transparent(0.1)}`);
        }));
    }
    async submitComment() {
        return this._commentThreadWidget.submitComment();
    }
    _refresh(dimensions) {
        if (this._isExpanded === undefined && dimensions.height === 0 && dimensions.width === 0) {
            this.commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
            return;
        }
        if (this._isExpanded) {
            this._commentThreadWidget.layout();
            const headHeight = Math.ceil(this.editor.getOption(68 /* EditorOption.lineHeight */) * 1.2);
            const lineHeight = this.editor.getOption(68 /* EditorOption.lineHeight */);
            const arrowHeight = Math.round(lineHeight / 3);
            const frameThickness = Math.round(lineHeight / 9) * 2;
            const computedLinesNumber = Math.ceil((headHeight +
                dimensions.height +
                arrowHeight +
                frameThickness +
                8) /** margin bottom to avoid margin collapse */ /
                lineHeight);
            if (this._viewZone?.heightInLines === computedLinesNumber) {
                return;
            }
            const currentPosition = this.getPosition();
            if (this._viewZone &&
                currentPosition &&
                currentPosition.lineNumber !== this._viewZone.afterLineNumber &&
                this._viewZone.afterLineNumber !== 0) {
                this._viewZone.afterLineNumber = currentPosition.lineNumber;
            }
            const capture = StableEditorScrollState.capture(this.editor);
            this._relayout(computedLinesNumber);
            capture.restore(this.editor);
        }
    }
    _applyTheme(theme) {
        const borderColor = getCommentThreadWidgetStateColor(this._commentThread.state, this.themeService.getColorTheme()) || Color.transparent;
        this.style({
            arrowColor: borderColor,
            frameColor: borderColor,
        });
        const fontInfo = this.editor.getOption(52 /* EditorOption.fontInfo */);
        // Editor decorations should also be responsive to theme changes
        this._commentThreadWidget.applyTheme(theme, fontInfo);
    }
    show(rangeOrPos, heightInLines) {
        const glyphPosition = this._commentGlyph?.getPosition();
        let range = Range.isIRange(rangeOrPos)
            ? rangeOrPos
            : rangeOrPos
                ? Range.fromPositions(rangeOrPos)
                : undefined;
        if (glyphPosition?.position &&
            range &&
            glyphPosition.position.lineNumber !== range.endLineNumber) {
            // The widget could have moved as a result of editor changes.
            // We need to try to calculate the new, more correct, range for the comment.
            const distance = glyphPosition.position.lineNumber - range.endLineNumber;
            range = new Range(range.startLineNumber + distance, range.startColumn, range.endLineNumber + distance, range.endColumn);
        }
        this._isExpanded = true;
        super.show(range ?? new Range(0, 0, 0, 0), heightInLines);
        this._commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
        this._refresh(this._commentThreadWidget.getDimensions());
    }
    async collapseAndFocusRange() {
        if ((await this.collapse(true)) &&
            Range.isIRange(this.commentThread.range) &&
            isCodeEditor(this.editor)) {
            this.editor.setSelection(this.commentThread.range);
        }
    }
    hide() {
        if (this._isExpanded) {
            this._isExpanded = false;
            // Focus the container so that the comment editor will be blurred before it is hidden
            if (this.editor.hasWidgetFocus()) {
                this.editor.focus();
            }
            if (!this._commentThread.comments || !this._commentThread.comments.length) {
                this.deleteCommentThread();
            }
        }
        super.hide();
    }
    dispose() {
        super.dispose();
        if (this._commentGlyph) {
            this._commentGlyph.dispose();
            this._commentGlyph = undefined;
        }
        this._globalToDispose.dispose();
        this._commentThreadDisposables.forEach((global) => global.dispose());
        this._onDidClose.fire(undefined);
    }
};
ReviewZoneWidget = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService),
    __param(7, ICommentService),
    __param(8, IContextKeyService),
    __param(9, IConfigurationService),
    __param(10, IDialogService)
], ReviewZoneWidget);
export { ReviewZoneWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRUaHJlYWRab25lV2lkZ2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFlLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFHTixZQUFZLEdBRVosTUFBTSw2Q0FBNkMsQ0FBQTtBQUVwRCxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxLQUFLLFNBQVMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFlLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRCxPQUFPLEVBQ04sb0JBQW9CLEdBR3BCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFOUQsT0FBTyxF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