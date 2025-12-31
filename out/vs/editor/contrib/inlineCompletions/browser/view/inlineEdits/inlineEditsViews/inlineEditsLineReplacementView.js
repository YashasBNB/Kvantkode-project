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
import { $, getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable, toDisposable } from '../../../../../../../base/common/lifecycle.js';
import { autorun, autorunDelta, constObservable, derived, } from '../../../../../../../base/common/observable.js';
import { editorBackground, scrollbarShadow, } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { IThemeService } from '../../../../../../../platform/theme/common/themeService.js';
import { EditorMouseEvent } from '../../../../../../browser/editorDom.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { LineSource, renderLines, RenderOptions, } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Range } from '../../../../../../common/core/range.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens } from '../../../../../../common/tokens/lineTokens.js';
import { TokenArray } from '../../../../../../common/tokens/tokenArray.js';
import { InlineDecoration } from '../../../../../../common/viewModel.js';
import { getEditorBlendedColor, getModifiedBorderColor, getOriginalBorderColor, modifiedChangedLineBackgroundColor, originalBackgroundColor, } from '../theme.js';
import { getPrefixTrim, mapOutFalsy, rectToProps } from '../utils/utils.js';
let InlineEditsLineReplacementView = class InlineEditsLineReplacementView extends Disposable {
    constructor(_editor, _edit, _tabAction, _languageService, _themeService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._originalBubblesDecorationCollection = this._editor.editor.createDecorationsCollection();
        this._originalBubblesDecorationOptions = {
            description: 'inlineCompletions-original-bubble',
            className: 'inlineCompletions-original-bubble',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        };
        this._maxPrefixTrim = this._edit.map((e) => e
            ? getPrefixTrim(e.replacements.flatMap((r) => [r.originalRange, r.modifiedRange]), e.originalRange, e.modifiedLines, this._editor.editor)
            : undefined);
        this._modifiedLineElements = derived((reader) => {
            const lines = [];
            let requiredWidth = 0;
            const prefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!edit || !prefixTrim) {
                return undefined;
            }
            const maxPrefixTrim = prefixTrim.prefixTrim;
            const modifiedBubbles = rangesToBubbleRanges(edit.replacements.map((r) => r.modifiedRange)).map((r) => new Range(r.startLineNumber, r.startColumn - maxPrefixTrim, r.endLineNumber, r.endColumn - maxPrefixTrim));
            const textModel = this._editor.model.get();
            const startLineNumber = edit.modifiedRange.startLineNumber;
            for (let i = 0; i < edit.modifiedRange.length; i++) {
                const line = document.createElement('div');
                const lineNumber = startLineNumber + i;
                const modLine = edit.modifiedLines[i].slice(maxPrefixTrim);
                const t = textModel.tokenization.tokenizeLinesAt(lineNumber, [modLine])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(modLine, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(modLine, this._languageService.languageIdCodec);
                }
                // Inline decorations are broken down into individual spans. To be able to render rounded corners, we need to set the start and end decorations separately.
                const decorations = [];
                for (const modified of modifiedBubbles.filter((b) => b.startLineNumber === lineNumber)) {
                    const validatedEndColumn = Math.min(modified.endColumn, modLine.length + 1);
                    decorations.push(new InlineDecoration(new Range(1, modified.startColumn, 1, validatedEndColumn), 'inlineCompletions-modified-bubble', 0 /* InlineDecorationType.Regular */));
                    decorations.push(new InlineDecoration(new Range(1, modified.startColumn, 1, modified.startColumn + 1), 'start', 0 /* InlineDecorationType.Regular */));
                    decorations.push(new InlineDecoration(new Range(1, validatedEndColumn - 1, 1, validatedEndColumn), 'end', 0 /* InlineDecorationType.Regular */));
                }
                // TODO: All lines should be rendered at once for one dom element
                const result = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor.editor)
                    .withSetWidth(false)
                    .withScrollBeyondLastColumn(0), decorations, line, true);
                this._editor.getOption(52 /* EditorOption.fontInfo */).read(reader); // update when font info changes
                requiredWidth = Math.max(requiredWidth, result.minWidthInPx);
                lines.push(line);
            }
            return { lines, requiredWidth: requiredWidth };
        });
        this._layout = derived(this, (reader) => {
            const modifiedLines = this._modifiedLineElements.read(reader);
            const maxPrefixTrim = this._maxPrefixTrim.read(reader);
            const edit = this._edit.read(reader);
            if (!modifiedLines || !maxPrefixTrim || !edit) {
                return undefined;
            }
            const { prefixLeftOffset } = maxPrefixTrim;
            const { requiredWidth } = modifiedLines;
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
            const verticalScrollbarWidth = this._editor.layoutInfoVerticalScrollbarWidth.read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const scrollTop = this._editor.scrollTop.read(reader);
            const editorLeftOffset = contentLeft - scrollLeft;
            const textModel = this._editor.editor.getModel();
            const originalLineWidths = edit.originalRange.mapToLineArray((line) => this._editor.editor.getOffsetForColumn(line, textModel.getLineMaxColumn(line)) -
                prefixLeftOffset);
            const maxLineWidth = Math.max(...originalLineWidths, requiredWidth);
            const startLineNumber = edit.originalRange.startLineNumber;
            const endLineNumber = edit.originalRange.endLineNumberExclusive - 1;
            const topOfOriginalLines = this._editor.editor.getTopForLineNumber(startLineNumber) - scrollTop;
            const bottomOfOriginalLines = this._editor.editor.getBottomForLineNumber(endLineNumber) - scrollTop;
            // Box Widget positioning
            const originalLinesOverlay = Rect.fromLeftTopWidthHeight(editorLeftOffset + prefixLeftOffset, topOfOriginalLines, maxLineWidth, bottomOfOriginalLines - topOfOriginalLines);
            const modifiedLinesOverlay = Rect.fromLeftTopWidthHeight(originalLinesOverlay.left, originalLinesOverlay.bottom, originalLinesOverlay.width, edit.modifiedRange.length * lineHeight);
            const background = Rect.hull([originalLinesOverlay, modifiedLinesOverlay]);
            const lowerBackground = background.intersectVertical(new OffsetRange(originalLinesOverlay.bottom, Number.MAX_SAFE_INTEGER));
            const lowerText = new Rect(lowerBackground.left, lowerBackground.top, lowerBackground.right, lowerBackground.bottom);
            return {
                originalLinesOverlay,
                modifiedLinesOverlay,
                background,
                lowerBackground,
                lowerText,
                minContentWidthRequired: prefixLeftOffset + maxLineWidth + verticalScrollbarWidth,
            };
        });
        this._viewZoneInfo = derived((reader) => {
            const shouldShowViewZone = this._editor
                .getOption(64 /* EditorOption.inlineSuggest */)
                .map((o) => o.edits.allowCodeShifting === 'always')
                .read(reader);
            if (!shouldShowViewZone) {
                return undefined;
            }
            const layout = this._layout.read(reader);
            const edit = this._edit.read(reader);
            if (!layout || !edit) {
                return undefined;
            }
            const viewZoneHeight = layout.lowerBackground.height;
            const viewZoneLineNumber = edit.originalRange.endLineNumberExclusive;
            return { height: viewZoneHeight, lineNumber: viewZoneLineNumber };
        });
        this._div = n
            .div({
            class: 'line-replacement',
        }, [
            derived((reader) => {
                const layout = mapOutFalsy(this._layout).read(reader);
                const modifiedLineElements = this._modifiedLineElements.read(reader);
                if (!layout || !modifiedLineElements) {
                    return [];
                }
                const layoutProps = layout.read(reader);
                const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
                const contentWidth = this._editor.contentWidth.read(reader);
                const contentHeight = this._editor.editor.getContentHeight();
                const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
                modifiedLineElements.lines.forEach((l) => {
                    l.style.width = `${layoutProps.lowerText.width}px`;
                    l.style.height = `${lineHeight}px`;
                    l.style.position = 'relative';
                });
                const modifiedBorderColor = getModifiedBorderColor(this._tabAction).read(reader);
                const originalBorderColor = getOriginalBorderColor(this._tabAction).read(reader);
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: contentLeft,
                            width: contentWidth,
                            height: contentHeight,
                            overflow: 'hidden',
                            pointerEvents: 'none',
                        },
                    }, [
                        n.div({
                            class: 'originalOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps((reader) => layout.read(reader).background.translateX(-contentLeft)),
                                borderRadius: '4px',
                                border: getEditorBlendedColor(originalBorderColor, this._themeService).map((c) => `1px solid ${c.toString()}`),
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                background: asCssVariable(originalBackgroundColor),
                            },
                        }),
                        n.div({
                            class: 'modifiedOverlayLineReplacement',
                            style: {
                                position: 'absolute',
                                ...rectToProps((reader) => layout.read(reader).lowerBackground.translateX(-contentLeft)),
                                borderRadius: '4px',
                                background: asCssVariable(editorBackground),
                                boxShadow: `${asCssVariable(scrollbarShadow)} 0 6px 6px -6px`,
                                border: `1px solid ${asCssVariable(modifiedBorderColor)}`,
                                boxSizing: 'border-box',
                                overflow: 'hidden',
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            },
                            onmousedown: (e) => {
                                e.preventDefault(); // This prevents that the editor loses focus
                            },
                            onclick: (e) => this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)),
                        }, [
                            n.div({
                                style: {
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    background: asCssVariable(modifiedChangedLineBackgroundColor),
                                },
                            }),
                        ]),
                        n.div({
                            class: 'modifiedLinesLineReplacement',
                            style: {
                                position: 'absolute',
                                boxSizing: 'border-box',
                                ...rectToProps((reader) => layout.read(reader).lowerText.translateX(-contentLeft)),
                                fontFamily: this._editor.getOption(51 /* EditorOption.fontFamily */),
                                fontSize: this._editor.getOption(54 /* EditorOption.fontSize */),
                                fontWeight: this._editor.getOption(55 /* EditorOption.fontWeight */),
                                pointerEvents: 'none',
                                whiteSpace: 'nowrap',
                                borderRadius: '4px',
                                overflow: 'hidden',
                            },
                        }, [...modifiedLineElements.lines]),
                    ]),
                ];
            }),
        ])
            .keepUpdated(this._store);
        this.isHovered = this._editor.isTargetHovered((e) => this._isMouseOverWidget(e), this._store);
        // View Zones
        this._previousViewZoneInfo = undefined;
        this._register(toDisposable(() => this._originalBubblesDecorationCollection.clear()));
        this._register(toDisposable(() => this._editor.editor.changeViewZones((accessor) => this.removePreviousViewZone(accessor))));
        this._register(autorunDelta(this._viewZoneInfo, ({ lastValue, newValue }) => {
            if (lastValue === newValue ||
                (lastValue?.height === newValue?.height && lastValue?.lineNumber === newValue?.lineNumber)) {
                return;
            }
            this._editor.editor.changeViewZones((changeAccessor) => {
                this.removePreviousViewZone(changeAccessor);
                if (!newValue) {
                    return;
                }
                this.addViewZone(newValue, changeAccessor);
            });
        }));
        this._register(autorun((reader) => {
            const edit = this._edit.read(reader);
            const originalBubbles = [];
            if (edit) {
                originalBubbles.push(...rangesToBubbleRanges(edit.replacements.map((r) => r.originalRange)));
            }
            this._originalBubblesDecorationCollection.set(originalBubbles.map((r) => ({
                range: r,
                options: this._originalBubblesDecorationOptions,
            })));
        }));
        this._register(this._editor.createOverlayWidget({
            domNode: this._div.element,
            minContentWidthInPx: derived((reader) => {
                return this._layout.read(reader)?.minContentWidthRequired ?? 0;
            }),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
    _isMouseOverWidget(e) {
        const layout = this._layout.get();
        if (!layout || !(e.event instanceof EditorMouseEvent)) {
            return false;
        }
        return layout.lowerBackground.containsPoint(new Point(e.event.relativePos.x, e.event.relativePos.y));
    }
    removePreviousViewZone(changeAccessor) {
        if (!this._previousViewZoneInfo) {
            return;
        }
        changeAccessor.removeZone(this._previousViewZoneInfo.id);
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= this._previousViewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() - this._previousViewZoneInfo.height);
        }
        this._previousViewZoneInfo = undefined;
    }
    addViewZone(viewZoneInfo, changeAccessor) {
        const activeViewZone = changeAccessor.addZone({
            afterLineNumber: viewZoneInfo.lineNumber - 1,
            heightInPx: viewZoneInfo.height, // move computation to layout?
            domNode: $('div'),
        });
        this._previousViewZoneInfo = {
            height: viewZoneInfo.height,
            lineNumber: viewZoneInfo.lineNumber,
            id: activeViewZone,
        };
        const cursorLineNumber = this._editor.cursorLineNumber.get();
        if (cursorLineNumber !== null && cursorLineNumber >= viewZoneInfo.lineNumber) {
            this._editor.editor.setScrollTop(this._editor.scrollTop.get() + viewZoneInfo.height);
        }
    }
};
InlineEditsLineReplacementView = __decorate([
    __param(3, ILanguageService),
    __param(4, IThemeService)
], InlineEditsLineReplacementView);
export { InlineEditsLineReplacementView };
function rangesToBubbleRanges(ranges) {
    const result = [];
    while (ranges.length) {
        let range = ranges.shift();
        if (range.startLineNumber !== range.endLineNumber) {
            ranges.push(new Range(range.startLineNumber + 1, 1, range.endLineNumber, range.endColumn));
            range = new Range(range.startLineNumber, range.startColumn, range.startLineNumber, Number.MAX_SAFE_INTEGER); // TODO: this is not correct
        }
        result.push(range);
    }
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNMaW5lUmVwbGFjZW1lbnRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNMaW5lUmVwbGFjZW1lbnRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsU0FBUyxFQUFFLENBQUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQzFFLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hGLE9BQU8sRUFDTixPQUFPLEVBQ1AsWUFBWSxFQUNaLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGVBQWUsR0FDZixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFLMUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sVUFBVSxFQUNWLFdBQVcsRUFDWCxhQUFhLEdBQ2IsTUFBTSwyRkFBMkYsQ0FB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