var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { $, getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Color } from '../../../../../../../base/common/color.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, constObservable, derived, derivedObservableWithCache, observableFromEvent, } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable, asCssVariableWithDefault, } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { observableCodeEditor } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { EmbeddedCodeEditorWidget } from '../../../../../../browser/widget/codeEditor/embeddedCodeEditorWidget.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { StickyScrollController } from '../../../../../stickyScroll/browser/stickyScrollController.js';
import { InlineCompletionContextKeys } from '../../../controller/inlineCompletionContextKeys.js';
import { getEditorBlendedColor, getModifiedBorderColor, getOriginalBorderColor, modifiedBackgroundColor, originalBackgroundColor, } from '../theme.js';
import { PathBuilder, getContentRenderWidth, getOffsetForPos, mapOutFalsy, maxContentWidthInRange, } from '../utils/utils.js';
const HORIZONTAL_PADDING = 0;
const VERTICAL_PADDING = 0;
const ENABLE_OVERFLOW = false;
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
const ORIGINAL_END_PADDING = 20;
const MODIFIED_END_PADDING = 12;
let InlineEditsSideBySideView = class InlineEditsSideBySideView extends Disposable {
    // This is an approximation and should be improved by using the real parameters used bellow
    static fitsInsideViewport(editor, textModel, edit, originalDisplayRange, reader) {
        const editorObs = observableCodeEditor(editor);
        const editorWidth = editorObs.layoutInfoWidth.read(reader);
        const editorContentLeft = editorObs.layoutInfoContentLeft.read(reader);
        const editorVerticalScrollbar = editor.getLayoutInfo().verticalScrollbarWidth;
        const minimapWidth = editorObs.layoutInfoMinimap.read(reader).minimapLeft !== 0
            ? editorObs.layoutInfoMinimap.read(reader).minimapWidth
            : 0;
        const maxOriginalContent = maxContentWidthInRange(editorObs, originalDisplayRange, undefined /* do not reconsider on each layout info change */);
        const maxModifiedContent = edit.lineEdit.newLines.reduce((max, line) => Math.max(max, getContentRenderWidth(line, editor, textModel)), 0);
        const originalPadding = ORIGINAL_END_PADDING; // padding after last line of original editor
        const modifiedPadding = MODIFIED_END_PADDING + 2 * BORDER_WIDTH; // padding after last line of modified editor
        return (maxOriginalContent + maxModifiedContent + originalPadding + modifiedPadding <
            editorWidth - editorContentLeft - editorVerticalScrollbar - minimapWidth);
    }
    constructor(_editor, _edit, _previewTextModel, _uiState, _tabAction, _instantiationService, _themeService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._previewTextModel = _previewTextModel;
        this._uiState = _uiState;
        this._tabAction = _tabAction;
        this._instantiationService = _instantiationService;
        this._themeService = _themeService;
        this._editorObs = observableCodeEditor(this._editor);
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._display = derived(this, (reader) => !!this._uiState.read(reader) ? 'block' : 'none');
        this.previewRef = n.ref();
        this._editorContainer = n
            .div({
            class: ['editorContainer'],
            style: { position: 'absolute', overflow: 'hidden', cursor: 'pointer' },
            onmousedown: (e) => {
                e.preventDefault(); // This prevents that the editor loses focus
            },
            onclick: (e) => {
                this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
            },
        }, [n.div({ class: 'preview', style: { pointerEvents: 'none' }, ref: this.previewRef })])
            .keepUpdated(this._store);
        this.isHovered = this._editorContainer.didMouseMoveDuringHover;
        this.previewEditor = this._register(this._instantiationService.createInstance(EmbeddedCodeEditorWidget, this.previewRef.element, {
            glyphMargin: false,
            lineNumbers: 'off',
            minimap: { enabled: false },
            guides: {
                indentation: false,
                bracketPairs: false,
                bracketPairsHorizontal: false,
                highlightActiveIndentation: false,
            },
            rulers: [],
            padding: { top: 0, bottom: 0 },
            folding: false,
            selectOnLineNumbers: false,
            selectionHighlight: false,
            columnSelection: false,
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            lineDecorationsWidth: 0,
            lineNumbersMinChars: 0,
            revealHorizontalRightPadding: 0,
            bracketPairColorization: { enabled: true, independentColorPoolPerBracketType: false },
            scrollBeyondLastLine: false,
            scrollbar: {
                vertical: 'hidden',
                horizontal: 'hidden',
                handleMouseWheel: false,
            },
            readOnly: true,
            wordWrap: 'off',
            wordWrapOverride1: 'off',
            wordWrapOverride2: 'off',
        }, {
            contextKeyValues: {
                [InlineCompletionContextKeys.inInlineEditsPreviewEditor.key]: true,
            },
            contributions: [],
        }, this._editor));
        this._previewEditorObs = observableCodeEditor(this.previewEditor);
        this._activeViewZones = [];
        this._updatePreviewEditor = derived((reader) => {
            this._editorContainer.readEffect(reader);
            this._previewEditorObs.model.read(reader); // update when the model is set
            // Setting this here explicitly to make sure that the preview editor is
            // visible when needed, we're also checking that these fields are defined
            // because of the auto run initial
            // Before removing these, verify with a non-monospace font family
            this._display.read(reader);
            if (this._nonOverflowView) {
                this._nonOverflowView.element.style.display = this._display.read(reader);
            }
            const uiState = this._uiState.read(reader);
            const edit = this._edit.read(reader);
            if (!uiState || !edit) {
                return;
            }
            const range = edit.originalLineRange;
            const hiddenAreas = [];
            if (range.startLineNumber > 1) {
                hiddenAreas.push(new Range(1, 1, range.startLineNumber - 1, 1));
            }
            if (range.startLineNumber + uiState.newTextLineCount <
                this._previewTextModel.getLineCount() + 1) {
                hiddenAreas.push(new Range(range.startLineNumber + uiState.newTextLineCount, 1, this._previewTextModel.getLineCount() + 1, 1));
            }
            this.previewEditor.setHiddenAreas(hiddenAreas, undefined, true);
            // TODO: is this the proper way to handle viewzones?
            const previousViewZones = [...this._activeViewZones];
            this._activeViewZones = [];
            const reducedLinesCount = range.endLineNumberExclusive - range.startLineNumber - uiState.newTextLineCount;
            this.previewEditor.changeViewZones((changeAccessor) => {
                previousViewZones.forEach((id) => changeAccessor.removeZone(id));
                if (reducedLinesCount > 0) {
                    this._activeViewZones.push(changeAccessor.addZone({
                        afterLineNumber: range.startLineNumber + uiState.newTextLineCount - 1,
                        heightInLines: reducedLinesCount,
                        showInHiddenAreas: true,
                        domNode: $('div.diagonal-fill.inline-edits-view-zone'),
                    }));
                }
            });
        });
        this._previewEditorWidth = derived(this, (reader) => {
            const edit = this._edit.read(reader);
            if (!edit) {
                return 0;
            }
            this._updatePreviewEditor.read(reader);
            return maxContentWidthInRange(this._previewEditorObs, edit.modifiedLineRange, reader);
        });
        this._cursorPosIfTouchesEdit = derived(this, (reader) => {
            const cursorPos = this._editorObs.cursorPosition.read(reader);
            const edit = this._edit.read(reader);
            if (!edit || !cursorPos) {
                return undefined;
            }
            return edit.modifiedLineRange.contains(cursorPos.lineNumber) ? cursorPos : undefined;
        });
        this._originalStartPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.startLineNumber, 1) : null;
        });
        this._originalEndPosition = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            return inlineEdit ? new Position(inlineEdit.originalLineRange.endLineNumberExclusive, 1) : null;
        });
        this._originalVerticalStartPosition = this._editorObs
            .observePosition(this._originalStartPosition, this._store)
            .map((p) => p?.y);
        this._originalVerticalEndPosition = this._editorObs
            .observePosition(this._originalEndPosition, this._store)
            .map((p) => p?.y);
        this._originalDisplayRange = this._uiState.map((s) => s?.originalDisplayRange);
        this._editorMaxContentWidthInRange = derived(this, (reader) => {
            const originalDisplayRange = this._originalDisplayRange.read(reader);
            if (!originalDisplayRange) {
                return constObservable(0);
            }
            this._editorObs.versionId.read(reader);
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return derivedObservableWithCache(this, (reader, lastValue) => {
                const maxWidth = maxContentWidthInRange(this._editorObs, originalDisplayRange, reader);
                return Math.max(maxWidth, lastValue ?? 0);
            });
        }).map((v, r) => v.read(r));
        this._previewEditorLayoutInfo = derived(this, (reader) => {
            const inlineEdit = this._edit.read(reader);
            if (!inlineEdit) {
                return null;
            }
            const state = this._uiState.read(reader);
            if (!state) {
                return null;
            }
            const range = inlineEdit.originalLineRange;
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const editorContentMaxWidthInRange = this._editorMaxContentWidthInRange.read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const previewContentWidth = this._previewEditorWidth.read(reader);
            const editorContentAreaWidth = editorLayout.contentWidth - editorLayout.verticalScrollbarWidth;
            const editorBoundingClientRect = this._editor.getContainerDomNode().getBoundingClientRect();
            const clientContentAreaRight = editorLayout.contentLeft + editorLayout.contentWidth + editorBoundingClientRect.left;
            const remainingWidthRightOfContent = getWindow(this._editor.getContainerDomNode()).innerWidth - clientContentAreaRight;
            const remainingWidthRightOfEditor = getWindow(this._editor.getContainerDomNode()).innerWidth - editorBoundingClientRect.right;
            const desiredMinimumWidth = Math.min(editorLayout.contentWidth * 0.3, previewContentWidth, 100);
            const IN_EDITOR_DISPLACEMENT = 0;
            const maximumAvailableWidth = IN_EDITOR_DISPLACEMENT + remainingWidthRightOfContent;
            const cursorPos = this._cursorPosIfTouchesEdit.read(reader);
            const maxPreviewEditorLeft = Math.max(
            // We're starting from the content area right and moving it left by IN_EDITOR_DISPLACEMENT and also by an amount to ensure some minimum desired width
            editorContentAreaWidth +
                horizontalScrollOffset -
                IN_EDITOR_DISPLACEMENT -
                Math.max(0, desiredMinimumWidth - maximumAvailableWidth), 
            // But we don't want that the moving left ends up covering the cursor, so this will push it to the right again
            Math.min(cursorPos ? getOffsetForPos(this._editorObs, cursorPos, reader) + 50 : 0, editorContentAreaWidth + horizontalScrollOffset));
            const previewEditorLeftInTextArea = Math.min(editorContentMaxWidthInRange + ORIGINAL_END_PADDING, maxPreviewEditorLeft);
            const maxContentWidth = editorContentMaxWidthInRange + ORIGINAL_END_PADDING + previewContentWidth + 70;
            const dist = maxPreviewEditorLeft - previewEditorLeftInTextArea;
            let desiredPreviewEditorScrollLeft;
            let codeRight;
            if (previewEditorLeftInTextArea > horizontalScrollOffset) {
                desiredPreviewEditorScrollLeft = 0;
                codeRight = editorLayout.contentLeft + previewEditorLeftInTextArea - horizontalScrollOffset;
            }
            else {
                desiredPreviewEditorScrollLeft = horizontalScrollOffset - previewEditorLeftInTextArea;
                codeRight = editorLayout.contentLeft;
            }
            const selectionTop = this._originalVerticalStartPosition.read(reader) ??
                this._editor.getTopForLineNumber(range.startLineNumber) -
                    this._editorObs.scrollTop.read(reader);
            const selectionBottom = this._originalVerticalEndPosition.read(reader) ??
                this._editor.getBottomForLineNumber(range.endLineNumberExclusive - 1) -
                    this._editorObs.scrollTop.read(reader);
            // TODO: const { prefixLeftOffset } = getPrefixTrim(inlineEdit.edit.edits.map(e => e.range), inlineEdit.originalLineRange, [], this._editor);
            const codeLeft = editorLayout.contentLeft - horizontalScrollOffset;
            let codeRect = Rect.fromLeftTopRightBottom(codeLeft, selectionTop, codeRight, selectionBottom);
            const isInsertion = codeRect.height === 0;
            if (!isInsertion) {
                codeRect = codeRect.withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING);
            }
            const editHeight = this._editor.getOption(68 /* EditorOption.lineHeight */) * inlineEdit.modifiedLineRange.length;
            const codeHeight = selectionBottom - selectionTop;
            const previewEditorHeight = Math.max(codeHeight, editHeight);
            const clipped = dist === 0;
            const codeEditDist = 0;
            const previewEditorWidth = Math.min(previewContentWidth + MODIFIED_END_PADDING, remainingWidthRightOfEditor + editorLayout.width - editorLayout.contentLeft - codeEditDist);
            let editRect = Rect.fromLeftTopWidthHeight(codeRect.right + codeEditDist, selectionTop, previewEditorWidth, previewEditorHeight);
            if (!isInsertion) {
                editRect = editRect
                    .withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING)
                    .translateX(HORIZONTAL_PADDING + BORDER_WIDTH);
            }
            else {
                // Align top of edit with insertion line
                editRect = editRect
                    .withMargin(VERTICAL_PADDING, HORIZONTAL_PADDING)
                    .translateY(VERTICAL_PADDING);
            }
            // debugView(debugLogRects({ codeRect, editRect }, this._editor.getDomNode()!), reader);
            return {
                codeRect,
                editRect,
                codeScrollLeft: horizontalScrollOffset,
                contentLeft: editorLayout.contentLeft,
                isInsertion,
                maxContentWidth,
                shouldShowShadow: clipped,
                desiredPreviewEditorScrollLeft,
                previewEditorWidth,
            };
        });
        this._stickyScrollController = StickyScrollController.get(this._editorObs.editor);
        this._stickyScrollHeight = this._stickyScrollController
            ? observableFromEvent(this._stickyScrollController.onDidChangeStickyScrollHeight, () => this._stickyScrollController.stickyScrollWidgetHeight)
            : constObservable(0);
        this._shouldOverflow = derived((reader) => {
            if (!ENABLE_OVERFLOW) {
                return false;
            }
            const range = this._edit.read(reader)?.originalLineRange;
            if (!range) {
                return false;
            }
            const stickyScrollHeight = this._stickyScrollHeight.read(reader);
            const top = this._editor.getTopForLineNumber(range.startLineNumber) -
                this._editorObs.scrollTop.read(reader);
            if (top <= stickyScrollHeight) {
                return false;
            }
            const bottom = this._editor.getTopForLineNumber(range.endLineNumberExclusive) -
                this._editorObs.scrollTop.read(reader);
            if (bottom >= this._editorObs.layoutInfo.read(reader).height) {
                return false;
            }
            return true;
        });
        this._originalBackgroundColor = observableFromEvent(this, this._themeService.onDidColorThemeChange, () => {
            return (this._themeService.getColorTheme().getColor(originalBackgroundColor) ?? Color.transparent);
        });
        this._backgroundSvg = n
            .svg({
            transform: 'translate(-0.5 -0.5)',
            style: { overflow: 'visible', pointerEvents: 'none', position: 'absolute' },
        }, [
            n.svgElem('path', {
                class: 'rightOfModifiedBackgroundCoverUp',
                d: derived((reader) => {
                    const layoutInfo = this._previewEditorLayoutInfo.read(reader);
                    if (!layoutInfo) {
                        return undefined;
                    }
                    const originalBackgroundColor = this._originalBackgroundColor.read(reader);
                    if (originalBackgroundColor.isTransparent()) {
                        return undefined;
                    }
                    return new PathBuilder()
                        .moveTo(layoutInfo.codeRect.getRightTop())
                        .lineTo(layoutInfo.codeRect.getRightTop().deltaX(1000))
                        .lineTo(layoutInfo.codeRect.getRightBottom().deltaX(1000))
                        .lineTo(layoutInfo.codeRect.getRightBottom())
                        .build();
                }),
                style: {
                    fill: asCssVariableWithDefault(editorBackground, 'transparent'),
                },
            }),
        ])
            .keepUpdated(this._store);
        this._originalOverlay = n
            .div({
            style: {
                pointerEvents: 'none',
                display: this._previewEditorLayoutInfo.map((layoutInfo) => layoutInfo?.isInsertion ? 'none' : 'block'),
            },
        }, derived((reader) => {
            const layoutInfoObs = mapOutFalsy(this._previewEditorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            const borderStyling = getOriginalBorderColor(this._tabAction).map((bc) => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`);
            const borderStylingSeparator = `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`;
            const hasBorderLeft = layoutInfoObs.read(reader).codeScrollLeft !== 0;
            const isModifiedLower = layoutInfoObs.map((layoutInfo) => layoutInfo.codeRect.bottom < layoutInfo.editRect.bottom);
            const transitionRectSize = BORDER_RADIUS * 2 + BORDER_WIDTH * 2;
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayHider = layoutInfoObs
                .map((layoutInfo) => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.codeRect.top, layoutInfo.contentLeft, layoutInfo.codeRect.bottom + transitionRectSize))
                .read(reader);
            const intersectionLine = new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER);
            const overlayRect = layoutInfoObs.map((layoutInfo) => layoutInfo.codeRect.intersectHorizontal(intersectionLine));
            const separatorRect = overlayRect.map((overlayRect) => overlayRect
                .withMargin(WIDGET_SEPARATOR_WIDTH, 0, WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH)
                .intersectHorizontal(intersectionLine));
            const transitionRect = overlayRect.map((overlayRect) => Rect.fromLeftTopWidthHeight(overlayRect.right - transitionRectSize + BORDER_WIDTH, overlayRect.bottom - BORDER_WIDTH, transitionRectSize, transitionRectSize).intersectHorizontal(intersectionLine));
            return [
                n.div({
                    class: 'originalSeparatorSideBySide',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        boxSizing: 'border-box',
                        borderRadius: `${BORDER_RADIUS}px 0 0 ${BORDER_RADIUS}px`,
                        borderTop: borderStylingSeparator,
                        borderBottom: borderStylingSeparator,
                        borderLeft: hasBorderLeft ? 'none' : borderStylingSeparator,
                    },
                }),
                n.div({
                    class: 'originalOverlaySideBySide',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        boxSizing: 'border-box',
                        borderRadius: `${BORDER_RADIUS}px 0 0 ${BORDER_RADIUS}px`,
                        borderTop: borderStyling,
                        borderBottom: borderStyling,
                        borderLeft: hasBorderLeft ? 'none' : borderStyling,
                        backgroundColor: asCssVariable(originalBackgroundColor),
                    },
                }),
                n.div({
                    class: 'originalCornerCutoutSideBySide',
                    style: {
                        pointerEvents: 'none',
                        display: isModifiedLower.map((isLower) => (isLower ? 'block' : 'none')),
                        ...transitionRect.read(reader).toStyles(),
                    },
                }, [
                    n.div({
                        class: 'originalCornerCutoutBackground',
                        style: {
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                            width: '100%',
                            height: '100%',
                            backgroundColor: getEditorBlendedColor(originalBackgroundColor, this._themeService).map((c) => c.toString()),
                        },
                    }),
                    n.div({
                        class: 'originalCornerCutoutBorder',
                        style: {
                            position: 'absolute',
                            top: '0px',
                            left: '0px',
                            width: '100%',
                            height: '100%',
                            boxSizing: 'border-box',
                            borderTop: borderStyling,
                            borderRight: borderStyling,
                            borderRadius: `0 100% 0 0`,
                            backgroundColor: asCssVariable(editorBackground),
                        },
                    }),
                ]),
                n.div({
                    class: 'originalOverlaySideBySideHider',
                    style: {
                        ...overlayHider.toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    },
                }),
            ];
        }))
            .keepUpdated(this._store);
        this._modifiedOverlay = n
            .div({
            style: { pointerEvents: 'none' },
        }, derived((reader) => {
            const layoutInfoObs = mapOutFalsy(this._previewEditorLayoutInfo).read(reader);
            if (!layoutInfoObs) {
                return undefined;
            }
            const isModifiedLower = layoutInfoObs.map((layoutInfo) => layoutInfo.codeRect.bottom < layoutInfo.editRect.bottom);
            const borderRadius = isModifiedLower.map((isLower) => `0 ${BORDER_RADIUS}px ${BORDER_RADIUS}px ${isLower ? BORDER_RADIUS : 0}px`);
            const borderStyling = getEditorBlendedColor(getModifiedBorderColor(this._tabAction), this._themeService).map((c) => `1px solid ${c.toString()}`);
            const borderStylingSeparator = `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`;
            const overlayRect = layoutInfoObs.map((layoutInfo) => layoutInfo.editRect.withMargin(0, BORDER_WIDTH));
            const separatorRect = overlayRect.map((overlayRect) => overlayRect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH, 0));
            const insertionRect = derived((reader) => {
                const overlay = overlayRect.read(reader);
                const layoutinfo = layoutInfoObs.read(reader);
                if (!layoutinfo.isInsertion || layoutinfo.contentLeft >= overlay.left) {
                    return Rect.fromLeftTopWidthHeight(overlay.left, overlay.top, 0, 0);
                }
                return new Rect(layoutinfo.contentLeft, overlay.top, overlay.left, overlay.top + BORDER_WIDTH * 2);
            });
            return [
                n.div({
                    class: 'modifiedInsertionSideBySide',
                    style: {
                        ...insertionRect.read(reader).toStyles(),
                        backgroundColor: getModifiedBorderColor(this._tabAction).map((c) => asCssVariable(c)),
                    },
                }),
                n.div({
                    class: 'modifiedSeparatorSideBySide',
                    style: {
                        ...separatorRect.read(reader).toStyles(),
                        borderRadius,
                        borderTop: borderStylingSeparator,
                        borderBottom: borderStylingSeparator,
                        borderRight: borderStylingSeparator,
                        boxSizing: 'border-box',
                    },
                }),
                n.div({
                    class: 'modifiedOverlaySideBySide',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius,
                        border: borderStyling,
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(modifiedBackgroundColor),
                    },
                }),
            ];
        }))
            .keepUpdated(this._store);
        this._nonOverflowView = n
            .div({
            class: 'inline-edits-view',
            style: {
                position: 'absolute',
                overflow: 'visible',
                top: '0px',
                left: '0px',
                zIndex: '0',
                display: this._display,
            },
        }, [
            this._backgroundSvg,
            derived(this, (reader) => this._shouldOverflow.read(reader)
                ? []
                : [this._editorContainer, this._originalOverlay, this._modifiedOverlay]),
        ])
            .keepUpdated(this._store);
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._nonOverflowView.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived((reader) => {
                const x = this._previewEditorLayoutInfo.read(reader)?.maxContentWidth;
                if (x === undefined) {
                    return 0;
                }
                return x;
            }),
        }));
        this.previewEditor.setModel(this._previewTextModel);
        this._register(autorun((reader) => {
            const layoutInfo = this._previewEditorLayoutInfo.read(reader);
            if (!layoutInfo) {
                return;
            }
            const editorRect = layoutInfo.editRect.withMargin(-VERTICAL_PADDING, -HORIZONTAL_PADDING);
            this.previewEditor.layout({
                height: editorRect.height,
                width: layoutInfo.previewEditorWidth + 15 /* Make sure editor does not scroll horizontally */,
            });
            this._editorContainer.element.style.top = `${editorRect.top}px`;
            this._editorContainer.element.style.left = `${editorRect.left}px`;
            this._editorContainer.element.style.width = `${layoutInfo.previewEditorWidth + HORIZONTAL_PADDING}px`; // Set width to clip view zone
            //this._editorContainer.element.style.borderRadius = `0 ${BORDER_RADIUS}px ${BORDER_RADIUS}px 0`;
        }));
        this._register(autorun((reader) => {
            const layoutInfo = this._previewEditorLayoutInfo.read(reader);
            if (!layoutInfo) {
                return;
            }
            this._previewEditorObs.editor.setScrollLeft(layoutInfo.desiredPreviewEditorScrollLeft);
        }));
        this._updatePreviewEditor.recomputeInitiallyAndOnChange(this._store);
    }
};
InlineEditsSideBySideView = __decorate([
    __param(5, IInstantiationService),
    __param(6, IThemeService)
], InlineEditsSideBySideView);
export { InlineEditsSideBySideView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNTaWRlQnlTaWRlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNTaWRlQnlTaWRlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMxRSxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBR04sT0FBTyxFQUNQLGVBQWUsRUFDZixPQUFPLEVBQ1AsMEJBQTBCLEVBQzFCLG1CQUFtQixHQUNuQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFFQUFxRSxDQUFBO0FBQzNHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzlGLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEdBQ3hCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTFGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RCxPQUFPLEVB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