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
import { getWindow, n } from '../../../../../../../base/browser/dom.js';
import { StandardMouseEvent } from '../../../../../../../base/browser/mouseEvent.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, observableValue, } from '../../../../../../../base/common/observable.js';
import { editorBackground, editorHoverForeground, } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { Point } from '../../../../../../browser/point.js';
import { Rect } from '../../../../../../browser/rect.js';
import { LineSource, renderLines, RenderOptions, } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { SingleOffsetEdit } from '../../../../../../common/core/offsetEdit.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens } from '../../../../../../common/tokens/lineTokens.js';
import { TokenArray } from '../../../../../../common/tokens/tokenArray.js';
import { getModifiedBorderColor, getOriginalBorderColor, modifiedChangedTextOverlayColor, originalChangedTextOverlayColor, } from '../theme.js';
import { mapOutFalsy, rectToProps } from '../utils/utils.js';
let InlineEditsWordReplacementView = class InlineEditsWordReplacementView extends Disposable {
    static { this.MAX_LENGTH = 100; }
    constructor(_editor, 
    /** Must be single-line in both sides */
    _edit, _tabAction, _languageService) {
        super();
        this._editor = _editor;
        this._edit = _edit;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._start = this._editor.observePosition(constObservable(this._edit.range.getStartPosition()), this._store);
        this._end = this._editor.observePosition(constObservable(this._edit.range.getEndPosition()), this._store);
        this._line = document.createElement('div');
        this._hoverableElement = observableValue(this, null);
        this.isHovered = this._hoverableElement.map((e, reader) => e?.didMouseMoveDuringHover.read(reader) ?? false);
        this._renderTextEffect = derived((_reader) => {
            const tm = this._editor.model.get();
            const origLine = tm.getLineContent(this._edit.range.startLineNumber);
            const edit = SingleOffsetEdit.replace(new OffsetRange(this._edit.range.startColumn - 1, this._edit.range.endColumn - 1), this._edit.text);
            const lineToTokenize = edit.apply(origLine);
            const t = tm.tokenization.tokenizeLinesAt(this._edit.range.startLineNumber, [
                lineToTokenize,
            ])?.[0];
            let tokens;
            if (t) {
                tokens = TokenArray.fromLineTokens(t)
                    .slice(edit.getRangeAfterApply())
                    .toLineTokens(this._edit.text, this._languageService.languageIdCodec);
            }
            else {
                tokens = LineTokens.createEmpty(this._edit.text, this._languageService.languageIdCodec);
            }
            const res = renderLines(new LineSource([tokens]), RenderOptions.fromEditor(this._editor.editor)
                .withSetWidth(false)
                .withScrollBeyondLastColumn(0), [], this._line, true);
            this._line.style.width = `${res.minWidthInPx}px`;
        });
        this._layout = derived(this, (reader) => {
            this._renderTextEffect.read(reader);
            const widgetStart = this._start.read(reader);
            const widgetEnd = this._end.read(reader);
            // TODO@hediet better about widgetStart and widgetEnd in a single transaction!
            if (!widgetStart || !widgetEnd || widgetStart.x > widgetEnd.x || widgetStart.y > widgetEnd.y) {
                return undefined;
            }
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */).read(reader);
            const scrollLeft = this._editor.scrollLeft.read(reader);
            const w = this._editor
                .getOption(52 /* EditorOption.fontInfo */)
                .read(reader).typicalHalfwidthCharacterWidth;
            const modifiedLeftOffset = 3 * w;
            const modifiedTopOffset = 4;
            const modifiedOffset = new Point(modifiedLeftOffset, modifiedTopOffset);
            const originalLine = Rect.fromPoints(widgetStart, widgetEnd)
                .withHeight(lineHeight)
                .translateX(-scrollLeft);
            const modifiedLine = Rect.fromPointSize(originalLine.getLeftBottom().add(modifiedOffset), new Point(this._edit.text.length * w, originalLine.height));
            const lowerBackground = modifiedLine.withLeft(originalLine.left);
            // debugView(debugLogRects({ lowerBackground }, this._editor.editor.getContainerDomNode()), reader);
            return {
                originalLine,
                modifiedLine,
                lowerBackground,
                lineHeight,
            };
        });
        this._root = n
            .div({
            class: 'word-replacement',
        }, [
            derived((reader) => {
                const layout = mapOutFalsy(this._layout).read(reader);
                if (!layout) {
                    return [];
                }
                const contentLeft = this._editor.layoutInfoContentLeft.read(reader);
                const borderWidth = 1;
                const originalBorderColor = getOriginalBorderColor(this._tabAction)
                    .map((c) => asCssVariable(c))
                    .read(reader);
                const modifiedBorderColor = getModifiedBorderColor(this._tabAction)
                    .map((c) => asCssVariable(c))
                    .read(reader);
                return [
                    n.div({
                        style: {
                            position: 'absolute',
                            top: 0,
                            left: contentLeft,
                            width: this._editor.contentWidth,
                            height: this._editor.editor.getContentHeight(),
                            overflow: 'hidden',
                            pointerEvents: 'none',
                        },
                    }, [
                        n.div({
                            style: {
                                position: 'absolute',
                                ...rectToProps((reader) => layout
                                    .read(reader)
                                    .lowerBackground.withMargin(borderWidth, 2 * borderWidth, borderWidth, 0)),
                                background: asCssVariable(editorBackground),
                                //boxShadow: `${asCssVariable(scrollbarShadow)} 0 6px 6px -6px`,
                                cursor: 'pointer',
                                pointerEvents: 'auto',
                            },
                            onmousedown: (e) => {
                                e.preventDefault(); // This prevents that the editor loses focus
                            },
                            onmouseup: (e) => this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e)),
                            obsRef: (elem) => {
                                this._hoverableElement.set(elem, undefined);
                            },
                        }),
                        n.div({
                            style: {
                                position: 'absolute',
                                ...rectToProps((reader) => layout.read(reader).modifiedLine.withMargin(1, 2)),
                                fontFamily: this._editor.getOption(51 /* EditorOption.fontFamily */),
                                fontSize: this._editor.getOption(54 /* EditorOption.fontSize */),
                                fontWeight: this._editor.getOption(55 /* EditorOption.fontWeight */),
                                pointerEvents: 'none',
                                boxSizing: 'border-box',
                                borderRadius: '4px',
                                border: `${borderWidth}px solid ${modifiedBorderColor}`,
                                background: asCssVariable(modifiedChangedTextOverlayColor),
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                outline: `2px solid ${asCssVariable(editorBackground)}`,
                            },
                        }, [this._line]),
                        n.div({
                            style: {
                                position: 'absolute',
                                ...rectToProps((reader) => layout.read(reader).originalLine.withMargin(1)),
                                boxSizing: 'border-box',
                                borderRadius: '4px',
                                border: `${borderWidth}px solid ${originalBorderColor}`,
                                background: asCssVariable(originalChangedTextOverlayColor),
                                pointerEvents: 'none',
                            },
                        }, []),
                        n.svg({
                            width: 11,
                            height: 14,
                            viewBox: '0 0 11 14',
                            fill: 'none',
                            style: {
                                position: 'absolute',
                                left: layout.map((l) => l.modifiedLine.left - 16),
                                top: layout.map((l) => l.modifiedLine.top + Math.round((l.lineHeight - 14 - 5) / 2)),
                            },
                        }, [
                            n.svgElem('path', {
                                d: 'M1 0C1 2.98966 1 5.92087 1 8.49952C1 9.60409 1.89543 10.5 3 10.5H10.5',
                                stroke: asCssVariable(editorHoverForeground),
                            }),
                            n.svgElem('path', {
                                d: 'M6 7.5L9.99999 10.49998L6 13.5',
                                stroke: asCssVariable(editorHoverForeground),
                            }),
                        ]),
                    ]),
                ];
            }),
        ])
            .keepUpdated(this._store);
        this._register(this._editor.createOverlayWidget({
            domNode: this._root.element,
            minContentWidthInPx: constObservable(0),
            position: constObservable({ preference: { top: 0, left: 0 } }),
            allowEditorOverflow: false,
        }));
    }
};
InlineEditsWordReplacementView = __decorate([
    __param(3, ILanguageService)
], InlineEditsWordReplacementView);
export { InlineEditsWordReplacementView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNXb3JkUmVwbGFjZW1lbnRWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNXb3JkUmVwbGFjZW1lbnRWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUEyQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2hHLE9BQU8sRUFBZSxrQkFBa0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDMUUsT0FBTyxFQUNOLGVBQWUsRUFDZixPQUFPLEVBRVAsZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixxQkFBcUIsR0FDckIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFeEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sVUFBVSxFQUNWLFdBQVcsRUFDWCxhQUFhLEdBQ2IsTUFBTSwyRkFBMkYsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFMUUsT0FBTyxFQUFFLGdCQUFnQixF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