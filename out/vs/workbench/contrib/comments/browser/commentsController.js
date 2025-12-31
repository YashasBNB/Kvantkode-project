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
import { Action } from '../../../../base/common/actions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { findFirstIdxMonotonousOrArrLen } from '../../../../base/common/arraysFind.js';
import { createCancelablePromise, Delayer, } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import './media/review.css';
import { isCodeEditor, isDiffEditor, } from '../../../../editor/browser/editorBrowser.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { EditorType, } from '../../../../editor/common/editorCommon.js';
import { ModelDecorationOptions, TextModel } from '../../../../editor/common/model/textModel.js';
import * as languages from '../../../../editor/common/languages.js';
import * as nls from '../../../../nls.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { CommentGlyphWidget } from './commentGlyphWidget.js';
import { ICommentService } from './commentService.js';
import { CommentWidgetFocus, isMouseUpEventDragFromMouseDown, parseMouseDownInfoFromEvent, ReviewZoneWidget, } from './commentThreadZoneWidget.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { EmbeddedCodeEditorWidget } from '../../../../editor/browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { COMMENTS_VIEW_ID } from './commentsTreeViewer.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { COMMENTEDITOR_DECORATION_KEY } from './commentReply.js';
import { Emitter } from '../../../../base/common/event.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { CommentThreadRangeDecorator } from './commentThreadRangeDecorator.js';
import { status } from '../../../../base/browser/ui/aria/aria.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { URI } from '../../../../base/common/uri.js';
import { threadHasMeaningfulComments } from './commentsModel.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
export const ID = 'editor.contrib.review';
class CommentingRangeDecoration {
    get id() {
        return this._decorationId;
    }
    set id(id) {
        this._decorationId = id;
    }
    get range() {
        return {
            startLineNumber: this._startLineNumber,
            startColumn: 1,
            endLineNumber: this._endLineNumber,
            endColumn: 1,
        };
    }
    constructor(_editor, _ownerId, _extensionId, _label, _range, options, commentingRangesInfo, isHover = false) {
        this._editor = _editor;
        this._ownerId = _ownerId;
        this._extensionId = _extensionId;
        this._label = _label;
        this._range = _range;
        this.options = options;
        this.commentingRangesInfo = commentingRangesInfo;
        this.isHover = isHover;
        this._startLineNumber = _range.startLineNumber;
        this._endLineNumber = _range.endLineNumber;
    }
    getCommentAction() {
        return {
            extensionId: this._extensionId,
            label: this._label,
            ownerId: this._ownerId,
            commentingRangesInfo: this.commentingRangesInfo,
        };
    }
    getOriginalRange() {
        return this._range;
    }
    getActiveRange() {
        return this.id ? this._editor.getModel().getDecorationRange(this.id) : undefined;
    }
}
class CommentingRangeDecorator {
    static { this.description = 'commenting-range-decorator'; }
    constructor() {
        this.commentingRangeDecorations = [];
        this.decorationIds = [];
        this._lastHover = -1;
        this._onDidChangeDecorationsCount = new Emitter();
        this.onDidChangeDecorationsCount = this._onDidChangeDecorationsCount.event;
        const decorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: 'comment-range-glyph comment-diff-added',
        };
        this.decorationOptions = ModelDecorationOptions.createDynamic(decorationOptions);
        const hoverDecorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: `comment-range-glyph line-hover`,
        };
        this.hoverDecorationOptions = ModelDecorationOptions.createDynamic(hoverDecorationOptions);
        const multilineDecorationOptions = {
            description: CommentingRangeDecorator.description,
            isWholeLine: true,
            linesDecorationsClassName: `comment-range-glyph multiline-add`,
        };
        this.multilineDecorationOptions = ModelDecorationOptions.createDynamic(multilineDecorationOptions);
    }
    updateHover(hoverLine) {
        if (this._editor && this._infos && hoverLine !== this._lastHover) {
            this._doUpdate(this._editor, this._infos, hoverLine);
        }
        this._lastHover = hoverLine ?? -1;
    }
    updateSelection(cursorLine, range = new Range(0, 0, 0, 0)) {
        this._lastSelection = range.isEmpty() ? undefined : range;
        this._lastSelectionCursor = range.isEmpty() ? undefined : cursorLine;
        // Some scenarios:
        // Selection is made. Emphasis should show on the drag/selection end location.
        // Selection is made, then user clicks elsewhere. We should still show the decoration.
        if (this._editor && this._infos) {
            this._doUpdate(this._editor, this._infos, cursorLine, range);
        }
    }
    update(editor, commentInfos, cursorLine, range) {
        if (editor) {
            this._editor = editor;
            this._infos = commentInfos;
            this._doUpdate(editor, commentInfos, cursorLine, range);
        }
    }
    _lineHasThread(editor, lineRange) {
        return editor
            .getDecorationsInRange(lineRange)
            ?.find((decoration) => decoration.options.description === CommentGlyphWidget.description);
    }
    _doUpdate(editor, commentInfos, emphasisLine = -1, selectionRange = this._lastSelection) {
        const model = editor.getModel();
        if (!model) {
            return;
        }
        // If there's still a selection, use that.
        emphasisLine = this._lastSelectionCursor ?? emphasisLine;
        const commentingRangeDecorations = [];
        for (const info of commentInfos) {
            info.commentingRanges.ranges.forEach((range) => {
                const rangeObject = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                let intersectingSelectionRange = selectionRange
                    ? rangeObject.intersectRanges(selectionRange)
                    : undefined;
                if (selectionRange &&
                    emphasisLine >= 0 &&
                    intersectingSelectionRange &&
                    // If there's only one selection line, then just drop into the else if and show an emphasis line.
                    !(intersectingSelectionRange.startLineNumber ===
                        intersectingSelectionRange.endLineNumber &&
                        emphasisLine === intersectingSelectionRange.startLineNumber)) {
                    // The emphasisLine should be within the commenting range, even if the selection range stretches
                    // outside of the commenting range.
                    // Clip the emphasis and selection ranges to the commenting range
                    let intersectingEmphasisRange;
                    if (emphasisLine <= intersectingSelectionRange.startLineNumber) {
                        intersectingEmphasisRange = intersectingSelectionRange.collapseToStart();
                        intersectingSelectionRange = new Range(intersectingSelectionRange.startLineNumber + 1, 1, intersectingSelectionRange.endLineNumber, 1);
                    }
                    else {
                        intersectingEmphasisRange = new Range(intersectingSelectionRange.endLineNumber, 1, intersectingSelectionRange.endLineNumber, 1);
                        intersectingSelectionRange = new Range(intersectingSelectionRange.startLineNumber, 1, intersectingSelectionRange.endLineNumber - 1, 1);
                    }
                    commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, intersectingSelectionRange, this.multilineDecorationOptions, info.commentingRanges, true));
                    if (!this._lineHasThread(editor, intersectingEmphasisRange)) {
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, intersectingEmphasisRange, this.hoverDecorationOptions, info.commentingRanges, true));
                    }
                    const beforeRangeEndLine = Math.min(intersectingEmphasisRange.startLineNumber, intersectingSelectionRange.startLineNumber) - 1;
                    const hasBeforeRange = rangeObject.startLineNumber <= beforeRangeEndLine;
                    const afterRangeStartLine = Math.max(intersectingEmphasisRange.endLineNumber, intersectingSelectionRange.endLineNumber) + 1;
                    const hasAfterRange = rangeObject.endLineNumber >= afterRangeStartLine;
                    if (hasBeforeRange) {
                        const beforeRange = new Range(range.startLineNumber, 1, beforeRangeEndLine, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, beforeRange, this.decorationOptions, info.commentingRanges, true));
                    }
                    if (hasAfterRange) {
                        const afterRange = new Range(afterRangeStartLine, 1, range.endLineNumber, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, afterRange, this.decorationOptions, info.commentingRanges, true));
                    }
                }
                else if (rangeObject.startLineNumber <= emphasisLine &&
                    emphasisLine <= rangeObject.endLineNumber) {
                    if (rangeObject.startLineNumber < emphasisLine) {
                        const beforeRange = new Range(range.startLineNumber, 1, emphasisLine - 1, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, beforeRange, this.decorationOptions, info.commentingRanges, true));
                    }
                    const emphasisRange = new Range(emphasisLine, 1, emphasisLine, 1);
                    if (!this._lineHasThread(editor, emphasisRange)) {
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, emphasisRange, this.hoverDecorationOptions, info.commentingRanges, true));
                    }
                    if (emphasisLine < rangeObject.endLineNumber) {
                        const afterRange = new Range(emphasisLine + 1, 1, range.endLineNumber, 1);
                        commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, afterRange, this.decorationOptions, info.commentingRanges, true));
                    }
                }
                else {
                    commentingRangeDecorations.push(new CommentingRangeDecoration(editor, info.uniqueOwner, info.extensionId, info.label, range, this.decorationOptions, info.commentingRanges));
                }
            });
        }
        editor.changeDecorations((accessor) => {
            this.decorationIds = accessor.deltaDecorations(this.decorationIds, commentingRangeDecorations);
            commentingRangeDecorations.forEach((decoration, index) => (decoration.id = this.decorationIds[index]));
        });
        const rangesDifference = this.commentingRangeDecorations.length - commentingRangeDecorations.length;
        this.commentingRangeDecorations = commentingRangeDecorations;
        if (rangesDifference) {
            this._onDidChangeDecorationsCount.fire(this.commentingRangeDecorations.length);
        }
    }
    areRangesIntersectingOrTouchingByLine(a, b) {
        // Check if `a` is before `b`
        if (a.endLineNumber < b.startLineNumber - 1) {
            return false;
        }
        // Check if `b` is before `a`
        if (b.endLineNumber + 1 < a.startLineNumber) {
            return false;
        }
        // These ranges must intersect
        return true;
    }
    getMatchedCommentAction(commentRange) {
        if (commentRange === undefined) {
            const foundInfos = this._infos?.filter((info) => info.commentingRanges.fileComments);
            if (foundInfos) {
                return foundInfos.map((foundInfo) => {
                    return {
                        action: {
                            ownerId: foundInfo.uniqueOwner,
                            extensionId: foundInfo.extensionId,
                            label: foundInfo.label,
                            commentingRangesInfo: foundInfo.commentingRanges,
                        },
                    };
                });
            }
            return [];
        }
        // keys is ownerId
        const foundHoverActions = new Map();
        for (const decoration of this.commentingRangeDecorations) {
            const range = decoration.getActiveRange();
            if (range && this.areRangesIntersectingOrTouchingByLine(range, commentRange)) {
                // We can have several commenting ranges that match from the same uniqueOwner because of how
                // the line hover and selection decoration is done.
                // The ranges must be merged so that we can see if the new commentRange fits within them.
                const action = decoration.getCommentAction();
                const alreadyFoundInfo = foundHoverActions.get(action.ownerId);
                if (alreadyFoundInfo?.action.commentingRangesInfo === action.commentingRangesInfo) {
                    // Merge ranges.
                    const newRange = new Range(range.startLineNumber < alreadyFoundInfo.range.startLineNumber
                        ? range.startLineNumber
                        : alreadyFoundInfo.range.startLineNumber, range.startColumn < alreadyFoundInfo.range.startColumn
                        ? range.startColumn
                        : alreadyFoundInfo.range.startColumn, range.endLineNumber > alreadyFoundInfo.range.endLineNumber
                        ? range.endLineNumber
                        : alreadyFoundInfo.range.endLineNumber, range.endColumn > alreadyFoundInfo.range.endColumn
                        ? range.endColumn
                        : alreadyFoundInfo.range.endColumn);
                    foundHoverActions.set(action.ownerId, { range: newRange, action });
                }
                else {
                    foundHoverActions.set(action.ownerId, { range, action });
                }
            }
        }
        const seenOwners = new Set();
        return Array.from(foundHoverActions.values()).filter((action) => {
            if (seenOwners.has(action.action.ownerId)) {
                return false;
            }
            else {
                seenOwners.add(action.action.ownerId);
                return true;
            }
        });
    }
    getNearestCommentingRange(findPosition, reverse) {
        let findPositionContainedWithin;
        let decorations;
        if (reverse) {
            decorations = [];
            for (let i = this.commentingRangeDecorations.length - 1; i >= 0; i--) {
                decorations.push(this.commentingRangeDecorations[i]);
            }
        }
        else {
            decorations = this.commentingRangeDecorations;
        }
        for (const decoration of decorations) {
            const range = decoration.getActiveRange();
            if (!range) {
                continue;
            }
            if (findPositionContainedWithin &&
                this.areRangesIntersectingOrTouchingByLine(range, findPositionContainedWithin)) {
                findPositionContainedWithin = Range.plusRange(findPositionContainedWithin, range);
                continue;
            }
            if (range.startLineNumber <= findPosition.lineNumber &&
                findPosition.lineNumber <= range.endLineNumber) {
                findPositionContainedWithin = new Range(range.startLineNumber, range.startColumn, range.endLineNumber, range.endColumn);
                continue;
            }
            if (!reverse && range.endLineNumber < findPosition.lineNumber) {
                continue;
            }
            if (reverse && range.startLineNumber > findPosition.lineNumber) {
                continue;
            }
            return range;
        }
        return decorations.length > 0 ? (decorations[0].getActiveRange() ?? undefined) : undefined;
    }
    dispose() {
        this.commentingRangeDecorations = [];
    }
}
/**
 * Navigate to the next or previous comment in the current thread.
 * @param type
 */
export function moveToNextCommentInThread(commentInfo, type) {
    if (!commentInfo?.comment || !commentInfo?.thread?.comments) {
        return;
    }
    const currentIndex = commentInfo.thread.comments?.indexOf(commentInfo.comment);
    if (currentIndex === undefined || currentIndex < 0) {
        return;
    }
    if (type === 'previous' && currentIndex === 0) {
        return;
    }
    if (type === 'next' && currentIndex === commentInfo.thread.comments.length - 1) {
        return;
    }
    const comment = commentInfo.thread.comments?.[type === 'previous' ? currentIndex - 1 : currentIndex + 1];
    if (!comment) {
        return;
    }
    return {
        ...commentInfo,
        comment,
    };
}
export function revealCommentThread(commentService, editorService, uriIdentityService, commentThread, comment, focusReply, pinned, preserveFocus, sideBySide) {
    if (!commentThread.resource) {
        return;
    }
    if (!commentService.isCommentingEnabled) {
        commentService.enableCommenting(true);
    }
    const range = commentThread.range;
    const focus = focusReply
        ? CommentWidgetFocus.Editor
        : preserveFocus
            ? CommentWidgetFocus.None
            : CommentWidgetFocus.Widget;
    const activeEditor = editorService.activeTextEditorControl;
    // If the active editor is a diff editor where one of the sides has the comment,
    // then we try to reveal the comment in the diff editor.
    const currentActiveResources = isDiffEditor(activeEditor)
        ? [activeEditor.getOriginalEditor(), activeEditor.getModifiedEditor()]
        : activeEditor
            ? [activeEditor]
            : [];
    const threadToReveal = commentThread.threadId;
    const commentToReveal = comment?.uniqueIdInThread;
    const resource = URI.parse(commentThread.resource);
    for (const editor of currentActiveResources) {
        const model = editor.getModel();
        if (model instanceof TextModel && uriIdentityService.extUri.isEqual(resource, model.uri)) {
            if (threadToReveal && isCodeEditor(editor)) {
                const controller = CommentController.get(editor);
                controller?.revealCommentThread(threadToReveal, commentToReveal, true, focus);
            }
            return;
        }
    }
    editorService
        .openEditor({
        resource,
        options: {
            pinned: pinned,
            preserveFocus: preserveFocus,
            selection: range ?? new Range(1, 1, 1, 1),
        },
    }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP)
        .then((editor) => {
        if (editor) {
            const control = editor.getControl();
            if (threadToReveal && isCodeEditor(control)) {
                const controller = CommentController.get(control);
                controller?.revealCommentThread(threadToReveal, commentToReveal, true, focus);
            }
        }
    });
}
let CommentController = class CommentController {
    constructor(editor, commentService, instantiationService, codeEditorService, contextMenuService, quickInputService, viewsService, configurationService, contextKeyService, editorService, keybindingService, accessibilityService, notificationService) {
        this.commentService = commentService;
        this.instantiationService = instantiationService;
        this.codeEditorService = codeEditorService;
        this.contextMenuService = contextMenuService;
        this.quickInputService = quickInputService;
        this.viewsService = viewsService;
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.keybindingService = keybindingService;
        this.accessibilityService = accessibilityService;
        this.notificationService = notificationService;
        this.globalToDispose = new DisposableStore();
        this.localToDispose = new DisposableStore();
        this.mouseDownInfo = null;
        this._commentingRangeSpaceReserved = false;
        this._commentingRangeAmountReserved = 0;
        this._emptyThreadsToAddQueue = [];
        this._inProcessContinueOnComments = new Map();
        this._editorDisposables = [];
        this._hasRespondedToEditorChange = false;
        this._commentInfos = [];
        this._commentWidgets = [];
        this._pendingNewCommentCache = {};
        this._pendingEditsCache = {};
        this._computePromise = null;
        this._activeCursorHasCommentingRange =
            CommentContextKeys.activeCursorHasCommentingRange.bindTo(contextKeyService);
        this._activeCursorHasComment =
            CommentContextKeys.activeCursorHasComment.bindTo(contextKeyService);
        this._activeEditorHasCommentingRange =
            CommentContextKeys.activeEditorHasCommentingRange.bindTo(contextKeyService);
        if (editor instanceof EmbeddedCodeEditorWidget) {
            return;
        }
        this.editor = editor;
        this._commentingRangeDecorator = new CommentingRangeDecorator();
        this.globalToDispose.add(this._commentingRangeDecorator.onDidChangeDecorationsCount((count) => {
            if (count === 0) {
                this.clearEditorListeners();
            }
            else if (this._editorDisposables.length === 0) {
                this.registerEditorListeners();
            }
        }));
        this.globalToDispose.add((this._commentThreadRangeDecorator = new CommentThreadRangeDecorator(this.commentService)));
        this.globalToDispose.add(this.commentService.onDidDeleteDataProvider((ownerId) => {
            if (ownerId) {
                delete this._pendingNewCommentCache[ownerId];
                delete this._pendingEditsCache[ownerId];
            }
            else {
                this._pendingNewCommentCache = {};
                this._pendingEditsCache = {};
            }
            this.beginCompute();
        }));
        this.globalToDispose.add(this.commentService.onDidSetDataProvider((_) => this.beginComputeAndHandleEditorChange()));
        this.globalToDispose.add(this.commentService.onDidUpdateCommentingRanges((_) => this.beginComputeAndHandleEditorChange()));
        this.globalToDispose.add(this.commentService.onDidSetResourceCommentInfos(async (e) => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (editorURI && editorURI.toString() === e.resource.toString()) {
                await this.setComments(e.commentInfos.filter((commentInfo) => commentInfo !== null));
            }
        }));
        this.globalToDispose.add(this.commentService.onDidChangeCommentingEnabled((e) => {
            if (e) {
                this.registerEditorListeners();
                this.beginCompute();
            }
            else {
                this.tryUpdateReservedSpace();
                this.clearEditorListeners();
                this._commentingRangeDecorator.update(this.editor, []);
                this._commentThreadRangeDecorator.update(this.editor, []);
                dispose(this._commentWidgets);
                this._commentWidgets = [];
            }
        }));
        this.globalToDispose.add(this.editor.onWillChangeModel((e) => this.onWillChangeModel(e)));
        this.globalToDispose.add(this.editor.onDidChangeModel((_) => this.onModelChanged()));
        this.globalToDispose.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('diffEditor.renderSideBySide')) {
                this.beginCompute();
            }
        }));
        this.onModelChanged();
        this.codeEditorService.registerDecorationType('comment-controller', COMMENTEDITOR_DECORATION_KEY, {});
        this.globalToDispose.add(this.commentService.registerContinueOnCommentProvider({
            provideContinueOnComments: () => {
                const pendingComments = [];
                if (this._commentWidgets) {
                    for (const zone of this._commentWidgets) {
                        const zonePendingComments = zone.getPendingComments();
                        const pendingNewComment = zonePendingComments.newComment;
                        if (!pendingNewComment) {
                            continue;
                        }
                        let lastCommentBody;
                        if (zone.commentThread.comments && zone.commentThread.comments.length) {
                            const lastComment = zone.commentThread.comments[zone.commentThread.comments.length - 1];
                            if (typeof lastComment.body === 'string') {
                                lastCommentBody = lastComment.body;
                            }
                            else {
                                lastCommentBody = lastComment.body.value;
                            }
                        }
                        if (pendingNewComment.body !== lastCommentBody) {
                            pendingComments.push({
                                uniqueOwner: zone.uniqueOwner,
                                uri: zone.editor.getModel().uri,
                                range: zone.commentThread.range,
                                comment: pendingNewComment,
                                isReply: zone.commentThread.comments !== undefined &&
                                    zone.commentThread.comments.length > 0,
                            });
                        }
                    }
                }
                return pendingComments;
            },
        }));
    }
    registerEditorListeners() {
        this._editorDisposables = [];
        if (!this.editor) {
            return;
        }
        this._editorDisposables.push(this.editor.onMouseMove((e) => this.onEditorMouseMove(e)));
        this._editorDisposables.push(this.editor.onMouseLeave(() => this.onEditorMouseLeave()));
        this._editorDisposables.push(this.editor.onDidChangeCursorPosition((e) => this.onEditorChangeCursorPosition(e.position)));
        this._editorDisposables.push(this.editor.onDidFocusEditorWidget(() => this.onEditorChangeCursorPosition(this.editor?.getPosition() ?? null)));
        this._editorDisposables.push(this.editor.onDidChangeCursorSelection((e) => this.onEditorChangeCursorSelection(e)));
        this._editorDisposables.push(this.editor.onDidBlurEditorWidget(() => this.onEditorChangeCursorSelection()));
    }
    clearEditorListeners() {
        dispose(this._editorDisposables);
        this._editorDisposables = [];
    }
    onEditorMouseLeave() {
        this._commentingRangeDecorator.updateHover();
    }
    onEditorMouseMove(e) {
        const position = e.target.position?.lineNumber;
        if (e.event.leftButton.valueOf() && position && this.mouseDownInfo) {
            this._commentingRangeDecorator.updateSelection(position, new Range(this.mouseDownInfo.lineNumber, 1, position, 1));
        }
        else {
            this._commentingRangeDecorator.updateHover(position);
        }
    }
    onEditorChangeCursorSelection(e) {
        const position = this.editor?.getPosition()?.lineNumber;
        if (position) {
            this._commentingRangeDecorator.updateSelection(position, e?.selection);
        }
    }
    onEditorChangeCursorPosition(e) {
        if (!e) {
            return;
        }
        const range = Range.fromPositions(e, { column: -1, lineNumber: e.lineNumber });
        const decorations = this.editor?.getDecorationsInRange(range);
        let hasCommentingRange = false;
        if (decorations) {
            for (const decoration of decorations) {
                if (decoration.options.description === CommentGlyphWidget.description) {
                    // We don't allow multiple comments on the same line.
                    hasCommentingRange = false;
                    break;
                }
                else if (decoration.options.description === CommentingRangeDecorator.description) {
                    hasCommentingRange = true;
                }
            }
        }
        this._activeCursorHasCommentingRange.set(hasCommentingRange);
        this._activeCursorHasComment.set(this.getCommentsAtLine(range).length > 0);
    }
    isEditorInlineOriginal(testEditor) {
        if (this.configurationService.getValue('diffEditor.renderSideBySide')) {
            return false;
        }
        const foundEditor = this.editorService.visibleTextEditorControls.find((editor) => {
            if (editor.getEditorType() === EditorType.IDiffEditor) {
                const diffEditor = editor;
                return diffEditor.getOriginalEditor() === testEditor;
            }
            return false;
        });
        return !!foundEditor;
    }
    beginCompute() {
        this._computePromise = createCancelablePromise((token) => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (editorURI) {
                return this.commentService.getDocumentComments(editorURI);
            }
            return Promise.resolve([]);
        });
        this._computeAndSetPromise = this._computePromise.then(async (commentInfos) => {
            await this.setComments(coalesce(commentInfos));
            this._computePromise = null;
        }, (error) => console.log(error));
        this._computePromise.then(() => (this._computeAndSetPromise = undefined));
        return this._computeAndSetPromise;
    }
    beginComputeCommentingRanges() {
        if (this._computeCommentingRangeScheduler) {
            if (this._computeCommentingRangePromise) {
                this._computeCommentingRangePromise.cancel();
                this._computeCommentingRangePromise = null;
            }
            this._computeCommentingRangeScheduler
                .trigger(() => {
                const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
                if (editorURI) {
                    return this.commentService.getDocumentComments(editorURI);
                }
                return Promise.resolve([]);
            })
                .then((commentInfos) => {
                if (this.commentService.isCommentingEnabled) {
                    const meaningfulCommentInfos = coalesce(commentInfos);
                    this._commentingRangeDecorator.update(this.editor, meaningfulCommentInfos, this.editor?.getPosition()?.lineNumber, this.editor?.getSelection() ?? undefined);
                }
            }, (err) => {
                onUnexpectedError(err);
                return null;
            });
        }
    }
    static get(editor) {
        return editor.getContribution(ID);
    }
    revealCommentThread(threadId, commentUniqueId, fetchOnceIfNotExist, focus) {
        const commentThreadWidget = this._commentWidgets.filter((widget) => widget.commentThread.threadId === threadId);
        if (commentThreadWidget.length === 1) {
            commentThreadWidget[0].reveal(commentUniqueId, focus);
        }
        else if (fetchOnceIfNotExist) {
            if (this._computeAndSetPromise) {
                this._computeAndSetPromise.then((_) => {
                    this.revealCommentThread(threadId, commentUniqueId, false, focus);
                });
            }
            else {
                this.beginCompute().then((_) => {
                    this.revealCommentThread(threadId, commentUniqueId, false, focus);
                });
            }
        }
    }
    collapseAll() {
        for (const widget of this._commentWidgets) {
            widget.collapse(true);
        }
    }
    expandAll() {
        for (const widget of this._commentWidgets) {
            widget.expand();
        }
    }
    expandUnresolved() {
        for (const widget of this._commentWidgets) {
            if (widget.commentThread.state === languages.CommentThreadState.Unresolved) {
                widget.expand();
            }
        }
    }
    nextCommentThread(focusThread) {
        this._findNearestCommentThread(focusThread);
    }
    _findNearestCommentThread(focusThread, reverse) {
        if (!this._commentWidgets.length || !this.editor?.hasModel()) {
            return;
        }
        const after = reverse
            ? this.editor.getSelection().getStartPosition()
            : this.editor.getSelection().getEndPosition();
        const sortedWidgets = this._commentWidgets.sort((a, b) => {
            if (reverse) {
                const temp = a;
                a = b;
                b = temp;
            }
            if (a.commentThread.range === undefined) {
                return -1;
            }
            if (b.commentThread.range === undefined) {
                return 1;
            }
            if (a.commentThread.range.startLineNumber < b.commentThread.range.startLineNumber) {
                return -1;
            }
            if (a.commentThread.range.startLineNumber > b.commentThread.range.startLineNumber) {
                return 1;
            }
            if (a.commentThread.range.startColumn < b.commentThread.range.startColumn) {
                return -1;
            }
            if (a.commentThread.range.startColumn > b.commentThread.range.startColumn) {
                return 1;
            }
            return 0;
        });
        const idx = findFirstIdxMonotonousOrArrLen(sortedWidgets, (widget) => {
            const lineValueOne = reverse
                ? after.lineNumber
                : (widget.commentThread.range?.startLineNumber ?? 0);
            const lineValueTwo = reverse
                ? (widget.commentThread.range?.startLineNumber ?? 0)
                : after.lineNumber;
            const columnValueOne = reverse ? after.column : (widget.commentThread.range?.startColumn ?? 0);
            const columnValueTwo = reverse ? (widget.commentThread.range?.startColumn ?? 0) : after.column;
            if (lineValueOne > lineValueTwo) {
                return true;
            }
            if (lineValueOne < lineValueTwo) {
                return false;
            }
            if (columnValueOne > columnValueTwo) {
                return true;
            }
            return false;
        });
        const nextWidget = sortedWidgets[idx];
        if (nextWidget !== undefined) {
            this.editor.setSelection(nextWidget.commentThread.range ?? new Range(1, 1, 1, 1));
            nextWidget.reveal(undefined, focusThread ? CommentWidgetFocus.Widget : CommentWidgetFocus.None);
        }
    }
    previousCommentThread(focusThread) {
        this._findNearestCommentThread(focusThread, true);
    }
    _findNearestCommentingRange(reverse) {
        if (!this.editor?.hasModel()) {
            return;
        }
        const after = this.editor.getSelection().getEndPosition();
        const range = this._commentingRangeDecorator.getNearestCommentingRange(after, reverse);
        if (range) {
            const position = reverse ? range.getEndPosition() : range.getStartPosition();
            this.editor.setPosition(position);
            this.editor.revealLineInCenterIfOutsideViewport(position.lineNumber);
        }
        if (this.accessibilityService.isScreenReaderOptimized()) {
            const commentRangeStart = range?.getStartPosition().lineNumber;
            const commentRangeEnd = range?.getEndPosition().lineNumber;
            if (commentRangeStart && commentRangeEnd) {
                const oneLine = commentRangeStart === commentRangeEnd;
                oneLine
                    ? status(nls.localize('commentRange', 'Line {0}', commentRangeStart))
                    : status(nls.localize('commentRangeStart', 'Lines {0} to {1}', commentRangeStart, commentRangeEnd));
            }
        }
    }
    nextCommentingRange() {
        this._findNearestCommentingRange();
    }
    previousCommentingRange() {
        this._findNearestCommentingRange(true);
    }
    dispose() {
        this.globalToDispose.dispose();
        this.localToDispose.dispose();
        dispose(this._editorDisposables);
        dispose(this._commentWidgets);
        this.editor = null; // Strict null override - nulling out in dispose
    }
    onWillChangeModel(e) {
        if (e.newModelUrl) {
            this.tryUpdateReservedSpace(e.newModelUrl);
        }
    }
    async handleCommentAdded(editorId, uniqueOwner, thread) {
        const matchedZones = this._commentWidgets.filter((zoneWidget) => zoneWidget.uniqueOwner === uniqueOwner &&
            zoneWidget.commentThread.threadId === thread.threadId);
        if (matchedZones.length) {
            return;
        }
        const matchedNewCommentThreadZones = this._commentWidgets.filter((zoneWidget) => zoneWidget.uniqueOwner === uniqueOwner &&
            zoneWidget.commentThread.commentThreadHandle === -1 &&
            Range.equalsRange(zoneWidget.commentThread.range, thread.range));
        if (matchedNewCommentThreadZones.length) {
            matchedNewCommentThreadZones[0].update(thread);
            return;
        }
        const continueOnCommentIndex = this._inProcessContinueOnComments
            .get(uniqueOwner)
            ?.findIndex((pending) => {
            if (pending.range === undefined) {
                return thread.range === undefined;
            }
            else {
                return Range.lift(pending.range).equalsRange(thread.range);
            }
        });
        let continueOnCommentText;
        if (continueOnCommentIndex !== undefined && continueOnCommentIndex >= 0) {
            continueOnCommentText = this._inProcessContinueOnComments
                .get(uniqueOwner)
                ?.splice(continueOnCommentIndex, 1)[0].comment.body;
        }
        const pendingCommentText = (this._pendingNewCommentCache[uniqueOwner] &&
            this._pendingNewCommentCache[uniqueOwner][thread.threadId]) ??
            continueOnCommentText;
        const pendingEdits = this._pendingEditsCache[uniqueOwner] && this._pendingEditsCache[uniqueOwner][thread.threadId];
        const shouldReveal = thread.canReply &&
            thread.isTemplate &&
            (!thread.comments || thread.comments.length === 0) &&
            (!thread.editorId || thread.editorId === editorId);
        await this.displayCommentThread(uniqueOwner, thread, shouldReveal, pendingCommentText, pendingEdits);
        this._commentInfos.filter((info) => info.uniqueOwner === uniqueOwner)[0].threads.push(thread);
        this.tryUpdateReservedSpace();
    }
    onModelChanged() {
        this.localToDispose.clear();
        this.tryUpdateReservedSpace();
        this.removeCommentWidgetsAndStoreCache();
        if (!this.editor) {
            return;
        }
        this._hasRespondedToEditorChange = false;
        this.localToDispose.add(this.editor.onMouseDown((e) => this.onEditorMouseDown(e)));
        this.localToDispose.add(this.editor.onMouseUp((e) => this.onEditorMouseUp(e)));
        if (this._editorDisposables.length) {
            this.clearEditorListeners();
            this.registerEditorListeners();
        }
        this._computeCommentingRangeScheduler = new Delayer(200);
        this.localToDispose.add({
            dispose: () => {
                this._computeCommentingRangeScheduler?.cancel();
                this._computeCommentingRangeScheduler = null;
            },
        });
        this.localToDispose.add(this.editor.onDidChangeModelContent(async () => {
            this.beginComputeCommentingRanges();
        }));
        this.localToDispose.add(this.commentService.onDidUpdateCommentThreads(async (e) => {
            const editorURI = this.editor && this.editor.hasModel() && this.editor.getModel().uri;
            if (!editorURI || !this.commentService.isCommentingEnabled) {
                return;
            }
            if (this._computePromise) {
                await this._computePromise;
            }
            const commentInfo = this._commentInfos.filter((info) => info.uniqueOwner === e.uniqueOwner);
            if (!commentInfo || !commentInfo.length) {
                return;
            }
            const added = e.added.filter((thread) => thread.resource && thread.resource === editorURI.toString());
            const removed = e.removed.filter((thread) => thread.resource && thread.resource === editorURI.toString());
            const changed = e.changed.filter((thread) => thread.resource && thread.resource === editorURI.toString());
            const pending = e.pending.filter((pending) => pending.uri.toString() === editorURI.toString());
            removed.forEach((thread) => {
                const matchedZones = this._commentWidgets.filter((zoneWidget) => zoneWidget.uniqueOwner === e.uniqueOwner &&
                    zoneWidget.commentThread.threadId === thread.threadId &&
                    zoneWidget.commentThread.threadId !== '');
                if (matchedZones.length) {
                    const matchedZone = matchedZones[0];
                    const index = this._commentWidgets.indexOf(matchedZone);
                    this._commentWidgets.splice(index, 1);
                    matchedZone.dispose();
                }
                const infosThreads = this._commentInfos.filter((info) => info.uniqueOwner === e.uniqueOwner)[0].threads;
                for (let i = 0; i < infosThreads.length; i++) {
                    if (infosThreads[i] === thread) {
                        infosThreads.splice(i, 1);
                        i--;
                    }
                }
            });
            for (const thread of changed) {
                const matchedZones = this._commentWidgets.filter((zoneWidget) => zoneWidget.uniqueOwner === e.uniqueOwner &&
                    zoneWidget.commentThread.threadId === thread.threadId);
                if (matchedZones.length) {
                    const matchedZone = matchedZones[0];
                    matchedZone.update(thread);
                    this.openCommentsView(thread);
                }
            }
            const editorId = this.editor?.getId();
            for (const thread of added) {
                await this.handleCommentAdded(editorId, e.uniqueOwner, thread);
            }
            for (const thread of pending) {
                await this.resumePendingComment(editorURI, thread);
            }
            this._commentThreadRangeDecorator.update(this.editor, commentInfo);
        }));
        this.beginComputeAndHandleEditorChange();
    }
    async resumePendingComment(editorURI, thread) {
        const matchedZones = this._commentWidgets.filter((zoneWidget) => zoneWidget.uniqueOwner === thread.uniqueOwner &&
            Range.lift(zoneWidget.commentThread.range)?.equalsRange(thread.range));
        if (thread.isReply && matchedZones.length) {
            this.commentService.removeContinueOnComment({
                uniqueOwner: thread.uniqueOwner,
                uri: editorURI,
                range: thread.range,
                isReply: true,
            });
            matchedZones[0].setPendingComment(thread.comment);
        }
        else if (matchedZones.length) {
            this.commentService.removeContinueOnComment({
                uniqueOwner: thread.uniqueOwner,
                uri: editorURI,
                range: thread.range,
                isReply: false,
            });
            const existingPendingComment = matchedZones[0].getPendingComments().newComment;
            // We need to try to reconcile the existing pending comment with the incoming pending comment
            let pendingComment;
            if (!existingPendingComment || thread.comment.body.includes(existingPendingComment.body)) {
                pendingComment = thread.comment;
            }
            else if (existingPendingComment.body.includes(thread.comment.body)) {
                pendingComment = existingPendingComment;
            }
            else {
                pendingComment = {
                    body: `${existingPendingComment}\n${thread.comment.body}`,
                    cursor: thread.comment.cursor,
                };
            }
            matchedZones[0].setPendingComment(pendingComment);
        }
        else if (!thread.isReply) {
            const threadStillAvailable = this.commentService.removeContinueOnComment({
                uniqueOwner: thread.uniqueOwner,
                uri: editorURI,
                range: thread.range,
                isReply: false,
            });
            if (!threadStillAvailable) {
                return;
            }
            if (!this._inProcessContinueOnComments.has(thread.uniqueOwner)) {
                this._inProcessContinueOnComments.set(thread.uniqueOwner, []);
            }
            this._inProcessContinueOnComments.get(thread.uniqueOwner)?.push(thread);
            await this.commentService.createCommentThreadTemplate(thread.uniqueOwner, thread.uri, thread.range ? Range.lift(thread.range) : undefined);
        }
    }
    beginComputeAndHandleEditorChange() {
        this.beginCompute().then(() => {
            if (!this._hasRespondedToEditorChange) {
                if (this._commentInfos.some((commentInfo) => commentInfo.commentingRanges.ranges.length > 0 ||
                    commentInfo.commentingRanges.fileComments)) {
                    this._hasRespondedToEditorChange = true;
                    const verbose = this.configurationService.getValue("accessibility.verbosity.comments" /* AccessibilityVerbositySettingId.Comments */);
                    if (verbose) {
                        const keybinding = this.keybindingService
                            .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */)
                            ?.getAriaLabel();
                        if (keybinding) {
                            status(nls.localize('hasCommentRangesKb', 'Editor has commenting ranges, run the command Open Accessibility Help ({0}), for more information.', keybinding));
                        }
                        else {
                            status(nls.localize('hasCommentRangesNoKb', 'Editor has commenting ranges, run the command Open Accessibility Help, which is currently not triggerable via keybinding, for more information.'));
                        }
                    }
                    else {
                        status(nls.localize('hasCommentRanges', 'Editor has commenting ranges.'));
                    }
                }
            }
        });
    }
    async openCommentsView(thread) {
        if (thread.comments && thread.comments.length > 0 && threadHasMeaningfulComments(thread)) {
            const openViewState = this.configurationService.getValue(COMMENTS_SECTION).openView;
            if (openViewState === 'file') {
                return this.viewsService.openView(COMMENTS_VIEW_ID);
            }
            else if (openViewState === 'firstFile' ||
                (openViewState === 'firstFileUnresolved' &&
                    thread.state === languages.CommentThreadState.Unresolved)) {
                const hasShownView = this.viewsService.getViewWithId(COMMENTS_VIEW_ID)?.hasRendered;
                if (!hasShownView) {
                    return this.viewsService.openView(COMMENTS_VIEW_ID);
                }
            }
        }
        return undefined;
    }
    async displayCommentThread(uniqueOwner, thread, shouldReveal, pendingComment, pendingEdits) {
        const editor = this.editor?.getModel();
        if (!editor) {
            return;
        }
        if (!this.editor || this.isEditorInlineOriginal(this.editor)) {
            return;
        }
        let continueOnCommentReply;
        if (thread.range && !pendingComment) {
            continueOnCommentReply = this.commentService.removeContinueOnComment({
                uniqueOwner,
                uri: editor.uri,
                range: thread.range,
                isReply: true,
            });
        }
        const zoneWidget = this.instantiationService.createInstance(ReviewZoneWidget, this.editor, uniqueOwner, thread, pendingComment ?? continueOnCommentReply?.comment, pendingEdits);
        await zoneWidget.display(thread.range, shouldReveal);
        this._commentWidgets.push(zoneWidget);
        this.openCommentsView(thread);
    }
    onEditorMouseDown(e) {
        this.mouseDownInfo = this._activeEditorHasCommentingRange.get()
            ? parseMouseDownInfoFromEvent(e)
            : null;
    }
    onEditorMouseUp(e) {
        const matchedLineNumber = isMouseUpEventDragFromMouseDown(this.mouseDownInfo, e);
        this.mouseDownInfo = null;
        if (!this.editor || matchedLineNumber === null || !e.target.element) {
            return;
        }
        const mouseUpIsOnDecorator = e.target.element.className.indexOf('comment-range-glyph') >= 0;
        const lineNumber = e.target.position.lineNumber;
        let range;
        let selection;
        // Check for drag along gutter decoration
        if (matchedLineNumber !== lineNumber) {
            if (matchedLineNumber > lineNumber) {
                selection = new Range(matchedLineNumber, this.editor.getModel().getLineLength(matchedLineNumber) + 1, lineNumber, 1);
            }
            else {
                selection = new Range(matchedLineNumber, 1, lineNumber, this.editor.getModel().getLineLength(lineNumber) + 1);
            }
        }
        else if (mouseUpIsOnDecorator) {
            selection = this.editor.getSelection();
        }
        // Check for selection at line number.
        if (selection &&
            selection.startLineNumber <= lineNumber &&
            lineNumber <= selection.endLineNumber) {
            range = selection;
            this.editor.setSelection(new Range(selection.endLineNumber, 1, selection.endLineNumber, 1));
        }
        else if (mouseUpIsOnDecorator) {
            range = new Range(lineNumber, 1, lineNumber, 1);
        }
        if (range) {
            this.addOrToggleCommentAtLine(range, e);
        }
    }
    getCommentsAtLine(commentRange) {
        return this._commentWidgets.filter((widget) => widget.getGlyphPosition() === (commentRange ? commentRange.endLineNumber : 0));
    }
    async addOrToggleCommentAtLine(commentRange, e) {
        // If an add is already in progress, queue the next add and process it after the current one finishes to
        // prevent empty comment threads from being added to the same line.
        if (!this._addInProgress) {
            this._addInProgress = true;
            // The widget's position is undefined until the widget has been displayed, so rely on the glyph position instead
            const existingCommentsAtLine = this.getCommentsAtLine(commentRange);
            if (existingCommentsAtLine.length) {
                const allExpanded = existingCommentsAtLine.every((widget) => widget.expanded);
                existingCommentsAtLine.forEach(allExpanded ? (widget) => widget.collapse(true) : (widget) => widget.expand(true));
                this.processNextThreadToAdd();
                return;
            }
            else {
                this.addCommentAtLine(commentRange, e);
            }
        }
        else {
            this._emptyThreadsToAddQueue.push([commentRange, e]);
        }
    }
    processNextThreadToAdd() {
        this._addInProgress = false;
        const info = this._emptyThreadsToAddQueue.shift();
        if (info) {
            this.addOrToggleCommentAtLine(info[0], info[1]);
        }
    }
    clipUserRangeToCommentRange(userRange, commentRange) {
        if (userRange.startLineNumber < commentRange.startLineNumber) {
            userRange = new Range(commentRange.startLineNumber, commentRange.startColumn, userRange.endLineNumber, userRange.endColumn);
        }
        if (userRange.endLineNumber > commentRange.endLineNumber) {
            userRange = new Range(userRange.startLineNumber, userRange.startColumn, commentRange.endLineNumber, commentRange.endColumn);
        }
        return userRange;
    }
    addCommentAtLine(range, e) {
        const newCommentInfos = this._commentingRangeDecorator.getMatchedCommentAction(range);
        if (!newCommentInfos.length || !this.editor?.hasModel()) {
            this._addInProgress = false;
            if (!newCommentInfos.length) {
                if (range) {
                    this.notificationService.error(nls.localize('comments.addCommand.error', 'The cursor must be within a commenting range to add a comment.'));
                }
                else {
                    this.notificationService.error(nls.localize('comments.addFileCommentCommand.error', 'File comments are not allowed on this file.'));
                }
            }
            return Promise.resolve();
        }
        if (newCommentInfos.length > 1) {
            if (e && range) {
                this.contextMenuService.showContextMenu({
                    getAnchor: () => e.event,
                    getActions: () => this.getContextMenuActions(newCommentInfos, range),
                    getActionsContext: () => (newCommentInfos.length ? newCommentInfos[0] : undefined),
                    onHide: () => {
                        this._addInProgress = false;
                    },
                });
                return Promise.resolve();
            }
            else {
                const picks = this.getCommentProvidersQuickPicks(newCommentInfos);
                return this.quickInputService
                    .pick(picks, {
                    placeHolder: nls.localize('pickCommentService', 'Select Comment Provider'),
                    matchOnDescription: true,
                })
                    .then((pick) => {
                    if (!pick) {
                        return;
                    }
                    const commentInfos = newCommentInfos.filter((info) => info.action.ownerId === pick.id);
                    if (commentInfos.length) {
                        const { ownerId } = commentInfos[0].action;
                        const clippedRange = range && commentInfos[0].range
                            ? this.clipUserRangeToCommentRange(range, commentInfos[0].range)
                            : range;
                        this.addCommentAtLine2(clippedRange, ownerId);
                    }
                })
                    .then(() => {
                    this._addInProgress = false;
                });
            }
        }
        else {
            const { ownerId } = newCommentInfos[0].action;
            const clippedRange = range && newCommentInfos[0].range
                ? this.clipUserRangeToCommentRange(range, newCommentInfos[0].range)
                : range;
            this.addCommentAtLine2(clippedRange, ownerId);
        }
        return Promise.resolve();
    }
    getCommentProvidersQuickPicks(commentInfos) {
        const picks = commentInfos.map((commentInfo) => {
            const { ownerId, extensionId, label } = commentInfo.action;
            return {
                label: label ?? extensionId ?? ownerId,
                id: ownerId,
            };
        });
        return picks;
    }
    getContextMenuActions(commentInfos, commentRange) {
        const actions = [];
        commentInfos.forEach((commentInfo) => {
            const { ownerId, extensionId, label } = commentInfo.action;
            actions.push(new Action('addCommentThread', `${label || extensionId}`, undefined, true, () => {
                const clippedRange = commentInfo.range
                    ? this.clipUserRangeToCommentRange(commentRange, commentInfo.range)
                    : commentRange;
                this.addCommentAtLine2(clippedRange, ownerId);
                return Promise.resolve();
            }));
        });
        return actions;
    }
    addCommentAtLine2(range, ownerId) {
        if (!this.editor) {
            return;
        }
        this.commentService.createCommentThreadTemplate(ownerId, this.editor.getModel().uri, range, this.editor.getId());
        this.processNextThreadToAdd();
        return;
    }
    getExistingCommentEditorOptions(editor) {
        const lineDecorationsWidth = editor.getOption(67 /* EditorOption.lineDecorationsWidth */);
        let extraEditorClassName = [];
        const configuredExtraClassName = editor.getRawOptions().extraEditorClassName;
        if (configuredExtraClassName) {
            extraEditorClassName = configuredExtraClassName.split(' ');
        }
        return { lineDecorationsWidth, extraEditorClassName };
    }
    getWithoutCommentsEditorOptions(editor, extraEditorClassName, startingLineDecorationsWidth) {
        let lineDecorationsWidth = startingLineDecorationsWidth;
        const inlineCommentPos = extraEditorClassName.findIndex((name) => name === 'inline-comment');
        if (inlineCommentPos >= 0) {
            extraEditorClassName.splice(inlineCommentPos, 1);
        }
        const options = editor.getOptions();
        if (options.get(45 /* EditorOption.folding */) &&
            options.get(115 /* EditorOption.showFoldingControls */) !== 'never') {
            lineDecorationsWidth += 11; // 11 comes from https://github.com/microsoft/vscode/blob/94ee5f58619d59170983f453fe78f156c0cc73a3/src/vs/workbench/contrib/comments/browser/media/review.css#L485
        }
        lineDecorationsWidth -= 24;
        return { extraEditorClassName, lineDecorationsWidth };
    }
    getWithCommentsLineDecorationWidth(editor, startingLineDecorationsWidth) {
        let lineDecorationsWidth = startingLineDecorationsWidth;
        const options = editor.getOptions();
        if (options.get(45 /* EditorOption.folding */) &&
            options.get(115 /* EditorOption.showFoldingControls */) !== 'never') {
            lineDecorationsWidth -= 11;
        }
        lineDecorationsWidth += 24;
        this._commentingRangeAmountReserved = lineDecorationsWidth;
        return this._commentingRangeAmountReserved;
    }
    getWithCommentsEditorOptions(editor, extraEditorClassName, startingLineDecorationsWidth) {
        extraEditorClassName.push('inline-comment');
        return {
            lineDecorationsWidth: this.getWithCommentsLineDecorationWidth(editor, startingLineDecorationsWidth),
            extraEditorClassName,
        };
    }
    updateEditorLayoutOptions(editor, extraEditorClassName, lineDecorationsWidth) {
        editor.updateOptions({
            extraEditorClassName: extraEditorClassName.join(' '),
            lineDecorationsWidth: lineDecorationsWidth,
        });
    }
    ensureCommentingRangeReservedAmount(editor) {
        const existing = this.getExistingCommentEditorOptions(editor);
        if (existing.lineDecorationsWidth !== this._commentingRangeAmountReserved) {
            editor.updateOptions({
                lineDecorationsWidth: this.getWithCommentsLineDecorationWidth(editor, existing.lineDecorationsWidth),
            });
        }
    }
    tryUpdateReservedSpace(uri) {
        if (!this.editor) {
            return;
        }
        const hasCommentsOrRangesInInfo = this._commentInfos.some((info) => {
            const hasRanges = Boolean(info.commentingRanges &&
                (Array.isArray(info.commentingRanges)
                    ? info.commentingRanges
                    : info.commentingRanges.ranges).length);
            return hasRanges || info.threads.length > 0;
        });
        uri = uri ?? this.editor.getModel()?.uri;
        const resourceHasCommentingRanges = uri
            ? this.commentService.resourceHasCommentingRanges(uri)
            : false;
        const hasCommentsOrRanges = hasCommentsOrRangesInInfo || resourceHasCommentingRanges;
        if (hasCommentsOrRanges && this.commentService.isCommentingEnabled) {
            if (!this._commentingRangeSpaceReserved) {
                this._commentingRangeSpaceReserved = true;
                const { lineDecorationsWidth, extraEditorClassName } = this.getExistingCommentEditorOptions(this.editor);
                const newOptions = this.getWithCommentsEditorOptions(this.editor, extraEditorClassName, lineDecorationsWidth);
                this.updateEditorLayoutOptions(this.editor, newOptions.extraEditorClassName, newOptions.lineDecorationsWidth);
            }
            else {
                this.ensureCommentingRangeReservedAmount(this.editor);
            }
        }
        else if ((!hasCommentsOrRanges || !this.commentService.isCommentingEnabled) &&
            this._commentingRangeSpaceReserved) {
            this._commentingRangeSpaceReserved = false;
            const { lineDecorationsWidth, extraEditorClassName } = this.getExistingCommentEditorOptions(this.editor);
            const newOptions = this.getWithoutCommentsEditorOptions(this.editor, extraEditorClassName, lineDecorationsWidth);
            this.updateEditorLayoutOptions(this.editor, newOptions.extraEditorClassName, newOptions.lineDecorationsWidth);
        }
    }
    async setComments(commentInfos) {
        if (!this.editor || !this.commentService.isCommentingEnabled) {
            return;
        }
        this._commentInfos = commentInfos;
        this.tryUpdateReservedSpace();
        // create viewzones
        this.removeCommentWidgetsAndStoreCache();
        let hasCommentingRanges = false;
        for (const info of this._commentInfos) {
            if (!hasCommentingRanges &&
                (info.commentingRanges.ranges.length > 0 || info.commentingRanges.fileComments)) {
                hasCommentingRanges = true;
            }
            const providerCacheStore = this._pendingNewCommentCache[info.uniqueOwner];
            const providerEditsCacheStore = this._pendingEditsCache[info.uniqueOwner];
            info.threads = info.threads.filter((thread) => !thread.isDisposed);
            for (const thread of info.threads) {
                let pendingComment = undefined;
                if (providerCacheStore) {
                    pendingComment = providerCacheStore[thread.threadId];
                }
                let pendingEdits = undefined;
                if (providerEditsCacheStore) {
                    pendingEdits = providerEditsCacheStore[thread.threadId];
                }
                await this.displayCommentThread(info.uniqueOwner, thread, false, pendingComment, pendingEdits);
            }
            for (const thread of info.pendingCommentThreads ?? []) {
                this.resumePendingComment(this.editor.getModel().uri, thread);
            }
        }
        this._commentingRangeDecorator.update(this.editor, this._commentInfos);
        this._commentThreadRangeDecorator.update(this.editor, this._commentInfos);
        if (hasCommentingRanges) {
            this._activeEditorHasCommentingRange.set(true);
        }
        else {
            this._activeEditorHasCommentingRange.set(false);
        }
    }
    collapseAndFocusRange(threadId) {
        this._commentWidgets
            ?.find((widget) => widget.commentThread.threadId === threadId)
            ?.collapseAndFocusRange();
    }
    removeCommentWidgetsAndStoreCache() {
        if (this._commentWidgets) {
            this._commentWidgets.forEach((zone) => {
                const pendingComments = zone.getPendingComments();
                const pendingNewComment = pendingComments.newComment;
                const providerNewCommentCacheStore = this._pendingNewCommentCache[zone.uniqueOwner];
                let lastCommentBody;
                if (zone.commentThread.comments && zone.commentThread.comments.length) {
                    const lastComment = zone.commentThread.comments[zone.commentThread.comments.length - 1];
                    if (typeof lastComment.body === 'string') {
                        lastCommentBody = lastComment.body;
                    }
                    else {
                        lastCommentBody = lastComment.body.value;
                    }
                }
                if (pendingNewComment && pendingNewComment.body !== lastCommentBody) {
                    if (!providerNewCommentCacheStore) {
                        this._pendingNewCommentCache[zone.uniqueOwner] = {};
                    }
                    this._pendingNewCommentCache[zone.uniqueOwner][zone.commentThread.threadId] =
                        pendingNewComment;
                }
                else {
                    if (providerNewCommentCacheStore) {
                        delete providerNewCommentCacheStore[zone.commentThread.threadId];
                    }
                }
                const pendingEdits = pendingComments.edits;
                const providerEditsCacheStore = this._pendingEditsCache[zone.uniqueOwner];
                if (Object.keys(pendingEdits).length > 0) {
                    if (!providerEditsCacheStore) {
                        this._pendingEditsCache[zone.uniqueOwner] = {};
                    }
                    this._pendingEditsCache[zone.uniqueOwner][zone.commentThread.threadId] = pendingEdits;
                }
                else if (providerEditsCacheStore) {
                    delete providerEditsCacheStore[zone.commentThread.threadId];
                }
                zone.dispose();
            });
        }
        this._commentWidgets = [];
    }
};
CommentController = __decorate([
    __param(1, ICommentService),
    __param(2, IInstantiationService),
    __param(3, ICodeEditorService),
    __param(4, IContextMenuService),
    __param(5, IQuickInputService),
    __param(6, IViewsService),
    __param(7, IConfigurationService),
    __param(8, IContextKeyService),
    __param(9, IEditorService),
    __param(10, IKeybindingService),
    __param(11, IAccessibilityService),
    __param(12, INotificationService)
], CommentController);
export { CommentController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNDb250cm9sbGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50c0NvbnRyb2xsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN0RixPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sR0FDUCxNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsT0FBTyxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDNUYsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBR04sWUFBWSxFQUNaLFlBQVksR0FDWixNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQ04sVUFBVSxHQUtWLE1BQU0sMkNBQTJDLENBQUE7QUFFbEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLFNBQVMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2hHLE9BQU8sS0FBSyxTQUFTLE1BQU0sd0NBQXdDLENBQUE7QUFDbkUsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixP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