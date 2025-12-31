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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNTaWRlQnlTaWRlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9pbmxpbmVFZGl0cy9pbmxpbmVFZGl0c1ZpZXdzL2lubGluZUVkaXRzU2lkZUJ5U2lkZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDMUUsT0FBTyxFQUFlLGtCQUFrQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDakcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUdOLE9BQU8sRUFDUCxlQUFlLEVBQ2YsT0FBTyxFQUNQLDBCQUEwQixFQUMxQixtQkFBbUIsR0FDbkIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMzRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUM5RixPQUFPLEVBQ04sYUFBYSxFQUNiLHdCQUF3QixHQUN4QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUUxRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEQsT0FBTyxFQUFFLHdC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