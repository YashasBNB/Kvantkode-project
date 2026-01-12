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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFRocmVhZFpvbmVXaWRnZXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFRocmVhZFpvbmVXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQWUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUdOLFlBQVksR0FFWixNQUFNLDZDQUE2QyxDQUFBO0FBRXBELE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEtBQUssU0FBUyxNQUFNLHdDQUF3QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDOUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELE9BQU8sRUFDTixvQkFBb0IsR0FHcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU5RCxP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