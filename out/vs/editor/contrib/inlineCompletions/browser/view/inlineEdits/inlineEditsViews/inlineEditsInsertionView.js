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
import { $, n } from '../../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../../base/common/event.js';
import { Disposable } from '../../../../../../../base/common/lifecycle.js';
import { constObservable, derived, derivedWithStore, observableValue, } from '../../../../../../../base/common/observable.js';
import { IInstantiationService } from '../../../../../../../platform/instantiation/common/instantiation.js';
import { editorBackground } from '../../../../../../../platform/theme/common/colorRegistry.js';
import { asCssVariable } from '../../../../../../../platform/theme/common/colorUtils.js';
import { observableCodeEditor, } from '../../../../../../browser/observableCodeEditor.js';
import { Rect } from '../../../../../../browser/rect.js';
import { LineSource, renderLines, RenderOptions, } from '../../../../../../browser/widget/diffEditor/components/diffEditorViewZones/renderLines.js';
import { LineRange } from '../../../../../../common/core/lineRange.js';
import { OffsetRange } from '../../../../../../common/core/offsetRange.js';
import { Position } from '../../../../../../common/core/position.js';
import { Range } from '../../../../../../common/core/range.js';
import { ILanguageService } from '../../../../../../common/languages/language.js';
import { LineTokens } from '../../../../../../common/tokens/lineTokens.js';
import { TokenArray } from '../../../../../../common/tokens/tokenArray.js';
import { InlineDecoration } from '../../../../../../common/viewModel.js';
import { GhostText, GhostTextPart } from '../../../model/ghostText.js';
import { GhostTextView } from '../../ghostText/ghostTextView.js';
import { getModifiedBorderColor, modifiedBackgroundColor } from '../theme.js';
import { getPrefixTrim, mapOutFalsy } from '../utils/utils.js';
const BORDER_WIDTH = 1;
const WIDGET_SEPARATOR_WIDTH = 1;
const BORDER_RADIUS = 4;
let InlineEditsInsertionView = class InlineEditsInsertionView extends Disposable {
    constructor(_editor, _input, _tabAction, instantiationService, _languageService) {
        super();
        this._editor = _editor;
        this._input = _input;
        this._tabAction = _tabAction;
        this._languageService = _languageService;
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._state = derived(this, (reader) => {
            const state = this._input.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            if (state.startColumn === 1 &&
                state.lineNumber > 1 &&
                textModel.getLineLength(state.lineNumber) !== 0 &&
                state.text.endsWith(eol) &&
                !state.text.startsWith(eol)) {
                const endOfLineColumn = textModel.getLineLength(state.lineNumber - 1) + 1;
                return {
                    lineNumber: state.lineNumber - 1,
                    column: endOfLineColumn,
                    text: eol + state.text.slice(0, -eol.length),
                };
            }
            return { lineNumber: state.lineNumber, column: state.startColumn, text: state.text };
        });
        this._trimVertically = derived(this, (reader) => {
            const text = this._state.read(reader)?.text;
            if (!text || text.trim() === '') {
                return { topOffset: 0, bottomOffset: 0, linesTop: 0, linesBottom: 0 };
            }
            // Adjust for leading/trailing newlines
            const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
            const eol = this._editor.getModel().getEOL();
            let linesTop = 0;
            let linesBottom = 0;
            let i = 0;
            for (; i < text.length && text.startsWith(eol, i); i += eol.length) {
                linesTop += 1;
            }
            for (let j = text.length; j > i && text.endsWith(eol, j); j -= eol.length) {
                linesBottom += 1;
            }
            return {
                topOffset: linesTop * lineHeight,
                bottomOffset: linesBottom * lineHeight,
                linesTop,
                linesBottom,
            };
        });
        this._maxPrefixTrim = derived((reader) => {
            const state = this._state.read(reader);
            if (!state) {
                return { prefixLeftOffset: 0, prefixTrim: 0 };
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const trimVertically = this._trimVertically.read(reader);
            const lines = state.text.split(eol);
            const modifiedLines = lines.slice(trimVertically.linesTop, lines.length - trimVertically.linesBottom);
            if (trimVertically.linesTop === 0) {
                modifiedLines[0] = textModel.getLineContent(state.lineNumber) + modifiedLines[0];
            }
            const originalRange = new LineRange(state.lineNumber, state.lineNumber + (trimVertically.linesTop > 0 ? 0 : 1));
            return getPrefixTrim([], originalRange, modifiedLines, this._editor);
        });
        this._ghostText = derived((reader) => {
            const state = this._state.read(reader);
            const prefixTrim = this._maxPrefixTrim.read(reader);
            if (!state) {
                return undefined;
            }
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const modifiedLines = state.text.split(eol);
            const inlineDecorations = modifiedLines.map((line, i) => new InlineDecoration(new Range(i + 1, i === 0 ? 1 : prefixTrim.prefixTrim + 1, i + 1, line.length + 1), 'modified-background', 0 /* InlineDecorationType.Regular */));
            return new GhostText(state.lineNumber, [
                new GhostTextPart(state.column, state.text, false, inlineDecorations),
            ]);
        });
        this._display = derived(this, (reader) => !!this._state.read(reader) ? 'block' : 'none');
        this._editorMaxContentWidthInRange = derived(this, (reader) => {
            const state = this._state.read(reader);
            if (!state) {
                return 0;
            }
            this._editorObs.versionId.read(reader);
            const textModel = this._editor.getModel();
            const eol = textModel.getEOL();
            const textBeforeInsertion = state.text.startsWith(eol)
                ? ''
                : textModel.getValueInRange(new Range(state.lineNumber, 1, state.lineNumber, state.column));
            const textAfterInsertion = textModel.getValueInRange(new Range(state.lineNumber, state.column, state.lineNumber, textModel.getLineLength(state.lineNumber) + 1));
            const text = textBeforeInsertion + state.text + textAfterInsertion;
            const lines = text.split(eol);
            const renderOptions = RenderOptions.fromEditor(this._editor)
                .withSetWidth(false)
                .withScrollBeyondLastColumn(0);
            const lineWidths = lines.map((line) => {
                const t = textModel.tokenization.tokenizeLinesAt(state.lineNumber, [line])?.[0];
                let tokens;
                if (t) {
                    tokens = TokenArray.fromLineTokens(t).toLineTokens(line, this._languageService.languageIdCodec);
                }
                else {
                    tokens = LineTokens.createEmpty(line, this._languageService.languageIdCodec);
                }
                return renderLines(new LineSource([tokens]), renderOptions, [], $('div'), true).minWidthInPx;
            });
            // Take the max value that we observed.
            // Reset when either the edit changes or the editor text version.
            return Math.max(...lineWidths);
        });
        this.startLineOffset = this._trimVertically.map((v) => v.topOffset);
        this.originalLines = this._state.map((s) => s
            ? new LineRange(s.lineNumber, Math.min(s.lineNumber + 2, this._editor.getModel().getLineCount() + 1))
            : undefined);
        this._overlayLayout = derivedWithStore(this, (reader, store) => {
            this._ghostText.read(reader);
            const state = this._state.read(reader);
            if (!state) {
                return null;
            }
            // Update the overlay when the position changes
            this._editorObs
                .observePosition(observableValue(this, new Position(state.lineNumber, state.column)), store)
                .read(reader);
            const editorLayout = this._editorObs.layoutInfo.read(reader);
            const horizontalScrollOffset = this._editorObs.scrollLeft.read(reader);
            const verticalScrollbarWidth = this._editorObs.layoutInfoVerticalScrollbarWidth.read(reader);
            const right = editorLayout.contentLeft +
                this._editorMaxContentWidthInRange.read(reader) -
                horizontalScrollOffset;
            const prefixLeftOffset = this._maxPrefixTrim.read(reader).prefixLeftOffset ?? 0; /* fix due to observable bug? */
            const left = editorLayout.contentLeft + prefixLeftOffset - horizontalScrollOffset;
            if (right <= left) {
                return null;
            }
            const { topOffset: topTrim, bottomOffset: bottomTrim } = this._trimVertically.read(reader);
            const scrollTop = this._editorObs.scrollTop.read(reader);
            const height = this._ghostTextView.height.read(reader) - topTrim - bottomTrim;
            const top = this._editor.getTopForLineNumber(state.lineNumber) - scrollTop + topTrim;
            const bottom = top + height;
            const overlay = new Rect(left, top, right, bottom);
            return {
                overlay,
                startsAtContentLeft: prefixLeftOffset === 0,
                contentLeft: editorLayout.contentLeft,
                minContentWidthRequired: prefixLeftOffset + overlay.width + verticalScrollbarWidth,
            };
        }).recomputeInitiallyAndOnChange(this._store);
        this._modifiedOverlay = n
            .div({
            style: { pointerEvents: 'none' },
        }, derived((reader) => {
            const overlayLayoutObs = mapOutFalsy(this._overlayLayout).read(reader);
            if (!overlayLayoutObs) {
                return undefined;
            }
            // Create an overlay which hides the left hand side of the original overlay when it overflows to the left
            // such that there is a smooth transition at the edge of content left
            const overlayHider = overlayLayoutObs
                .map((layoutInfo) => Rect.fromLeftTopRightBottom(layoutInfo.contentLeft - BORDER_RADIUS - BORDER_WIDTH, layoutInfo.overlay.top, layoutInfo.contentLeft, layoutInfo.overlay.bottom))
                .read(reader);
            const overlayRect = overlayLayoutObs.map((l) => l.overlay
                .withMargin(0, BORDER_WIDTH, 0, l.startsAtContentLeft ? 0 : BORDER_WIDTH)
                .intersectHorizontal(new OffsetRange(overlayHider.left, Number.MAX_SAFE_INTEGER)));
            const underlayRect = overlayRect.map((rect) => rect.withMargin(WIDGET_SEPARATOR_WIDTH, WIDGET_SEPARATOR_WIDTH));
            return [
                n.div({
                    class: 'originalUnderlayInsertion',
                    style: {
                        ...underlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: `${BORDER_WIDTH + WIDGET_SEPARATOR_WIDTH}px solid ${asCssVariable(editorBackground)}`,
                        boxSizing: 'border-box',
                    },
                }),
                n.div({
                    class: 'originalOverlayInsertion',
                    style: {
                        ...overlayRect.read(reader).toStyles(),
                        borderRadius: BORDER_RADIUS,
                        border: getModifiedBorderColor(this._tabAction).map((bc) => `${BORDER_WIDTH}px solid ${asCssVariable(bc)}`),
                        boxSizing: 'border-box',
                        backgroundColor: asCssVariable(modifiedBackgroundColor),
                    },
                }),
                n.div({
                    class: 'originalOverlayHiderInsertion',
                    style: {
                        ...overlayHider.toStyles(),
                        backgroundColor: asCssVariable(editorBackground),
                    },
                }),
            ];
        }))
            .keepUpdated(this._store);
        this._view = n
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
        }, [[this._modifiedOverlay]])
            .keepUpdated(this._store);
        this._editorObs = observableCodeEditor(this._editor);
        this._ghostTextView = this._register(instantiationService.createInstance(GhostTextView, this._editor, {
            ghostText: this._ghostText,
            minReservedLineCount: constObservable(0),
            targetTextModel: this._editorObs.model.map((model) => model ?? undefined),
            warning: constObservable(undefined),
        }, observableValue(this, { syntaxHighlightingEnabled: true, extraClasses: ['inline-edit'] }), true, true));
        this.isHovered = this._ghostTextView.isHovered;
        this._register(this._ghostTextView.onDidClick((e) => {
            this._onDidClick.fire(e);
        }));
        this._register(this._editorObs.createOverlayWidget({
            domNode: this._view.element,
            position: constObservable(null),
            allowEditorOverflow: false,
            minContentWidthInPx: derived((reader) => {
                const info = this._overlayLayout.read(reader);
                if (info === null) {
                    return 0;
                }
                return info.minContentWidthRequired;
            }),
        }));
    }
};
InlineEditsInsertionView = __decorate([
    __param(3, IInstantiationService),
    __param(4, ILanguageService)
], InlineEditsInsertionView);
export { InlineEditsInsertionView };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lRWRpdHNJbnNlcnRpb25WaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci92aWV3L2lubGluZUVkaXRzL2lubGluZUVkaXRzVmlld3MvaW5saW5lRWRpdHNJbnNlcnRpb25WaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFL0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMxRSxPQUFPLEVBQ04sZUFBZSxFQUNmLE9BQU8sRUFDUCxnQkFBZ0IsRUFFaEIsZUFBZSxHQUNmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDM0csT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDOUYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXhGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEQsT0FBTyxFQUNOLFVBQVUsRUFDVixXQUFXLEVBQ1gsYUFBYSxHQUNiLE1BQU0sMkZBQTJGLENBQUE7QUFFbEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sMkNBQTJD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