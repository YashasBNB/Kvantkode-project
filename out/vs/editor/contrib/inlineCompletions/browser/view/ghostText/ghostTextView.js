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
var GhostTextView_1;
import { createTrustedTypesPolicy } from '../../../../../../base/browser/trustedTypes.js';
import { renderIcon } from '../../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { Emitter, Event } from '../../../../../../base/common/event.js';
import { createHotClass } from '../../../../../../base/common/hotReloadHelpers.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, constObservable, derived, observableSignalFromEvent, observableValue, } from '../../../../../../base/common/observable.js';
import * as strings from '../../../../../../base/common/strings.js';
import { applyFontInfo } from '../../../../../browser/config/domFontInfo.js';
import { observableCodeEditor } from '../../../../../browser/observableCodeEditor.js';
import { EditorFontLigatures, } from '../../../../../common/config/editorOptions.js';
import { OffsetEdit, SingleOffsetEdit } from '../../../../../common/core/offsetEdit.js';
import { Position } from '../../../../../common/core/position.js';
import { Range } from '../../../../../common/core/range.js';
import { StringBuilder } from '../../../../../common/core/stringBuilder.js';
import { ILanguageService } from '../../../../../common/languages/language.js';
import { InjectedTextCursorStops, } from '../../../../../common/model.js';
import { LineTokens } from '../../../../../common/tokens/lineTokens.js';
import { LineDecoration } from '../../../../../common/viewLayout/lineDecorations.js';
import { RenderLineInput, renderViewLine, } from '../../../../../common/viewLayout/viewLineRenderer.js';
import { GhostTextReplacement } from '../../model/ghostText.js';
import { ColumnRange } from '../../utils.js';
import { addDisposableListener, getWindow, isHTMLElement, n, } from '../../../../../../base/browser/dom.js';
import './ghostTextView.css';
import { StandardMouseEvent } from '../../../../../../base/browser/mouseEvent.js';
import { CodeEditorWidget } from '../../../../../browser/widget/codeEditor/codeEditorWidget.js';
const USE_SQUIGGLES_FOR_WARNING = true;
const GHOST_TEXT_CLASS_NAME = 'ghost-text';
let GhostTextView = class GhostTextView extends Disposable {
    static { GhostTextView_1 = this; }
    static { this.hot = createHotClass(GhostTextView_1); }
    constructor(_editor, _model, _options, _shouldKeepCursorStable, _isClickable, _languageService) {
        super();
        this._editor = _editor;
        this._model = _model;
        this._options = _options;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._languageService = _languageService;
        this._isDisposed = observableValue(this, false);
        this._editorObs = observableCodeEditor(this._editor);
        this._warningState = derived((reader) => {
            const gt = this._model.ghostText.read(reader);
            if (!gt) {
                return undefined;
            }
            const warning = this._model.warning.read(reader);
            if (!warning) {
                return undefined;
            }
            return {
                lineNumber: gt.lineNumber,
                position: new Position(gt.lineNumber, gt.parts[0].column),
                icon: warning.icon,
            };
        });
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._useSyntaxHighlighting = this._options.map((o) => o.syntaxHighlightingEnabled);
        this._extraClassNames = derived(this, (reader) => {
            const extraClasses = [...(this._options.read(reader).extraClasses ?? [])];
            if (this._useSyntaxHighlighting.read(reader)) {
                extraClasses.push('syntax-highlighted');
            }
            if (USE_SQUIGGLES_FOR_WARNING && this._warningState.read(reader)) {
                extraClasses.push('warning');
            }
            const extraClassNames = extraClasses.map((c) => ` ${c}`).join('');
            return extraClassNames;
        });
        this.uiState = derived(this, (reader) => {
            if (this._isDisposed.read(reader)) {
                return undefined;
            }
            const textModel = this._editorObs.model.read(reader);
            if (textModel !== this._model.targetTextModel.read(reader)) {
                return undefined;
            }
            const ghostText = this._model.ghostText.read(reader);
            if (!ghostText) {
                return undefined;
            }
            const replacedRange = ghostText instanceof GhostTextReplacement ? ghostText.columnRange : undefined;
            const syntaxHighlightingEnabled = this._useSyntaxHighlighting.read(reader);
            const extraClassNames = this._extraClassNames.read(reader);
            const { inlineTexts, additionalLines, hiddenRange } = computeGhostTextViewData(ghostText, textModel, GHOST_TEXT_CLASS_NAME + extraClassNames);
            const currentLine = textModel.getLineContent(ghostText.lineNumber);
            const edit = new OffsetEdit(inlineTexts.map((t) => SingleOffsetEdit.insert(t.column - 1, t.text)));
            const tokens = syntaxHighlightingEnabled
                ? textModel.tokenization.tokenizeLinesAt(ghostText.lineNumber, [
                    edit.apply(currentLine),
                    ...additionalLines.map((l) => l.content),
                ])
                : undefined;
            const newRanges = edit.getNewTextRanges();
            const inlineTextsWithTokens = inlineTexts.map((t, idx) => ({
                ...t,
                tokens: tokens?.[0]?.getTokensInRange(newRanges[idx]),
            }));
            const tokenizedAdditionalLines = additionalLines.map((l, idx) => ({
                content: tokens?.[idx + 1] ??
                    LineTokens.createEmpty(l.content, this._languageService.languageIdCodec),
                decorations: l.decorations,
            }));
            return {
                replacedRange,
                inlineTexts: inlineTextsWithTokens,
                additionalLines: tokenizedAdditionalLines,
                hiddenRange,
                lineNumber: ghostText.lineNumber,
                additionalReservedLineCount: this._model.minReservedLineCount.read(reader),
                targetTextModel: textModel,
                syntaxHighlightingEnabled,
            };
        });
        this.decorations = derived(this, (reader) => {
            const uiState = this.uiState.read(reader);
            if (!uiState) {
                return [];
            }
            const decorations = [];
            const extraClassNames = this._extraClassNames.read(reader);
            if (uiState.replacedRange) {
                decorations.push({
                    range: uiState.replacedRange.toRange(uiState.lineNumber),
                    options: {
                        inlineClassName: 'inline-completion-text-to-replace' + extraClassNames,
                        description: 'GhostTextReplacement',
                    },
                });
            }
            if (uiState.hiddenRange) {
                decorations.push({
                    range: uiState.hiddenRange.toRange(uiState.lineNumber),
                    options: { inlineClassName: 'ghost-text-hidden', description: 'ghost-text-hidden' },
                });
            }
            for (const p of uiState.inlineTexts) {
                decorations.push({
                    range: Range.fromPositions(new Position(uiState.lineNumber, p.column)),
                    options: {
                        description: 'ghost-text-decoration',
                        after: {
                            content: p.text,
                            tokens: p.tokens,
                            inlineClassName: (p.preview ? 'ghost-text-decoration-preview' : 'ghost-text-decoration') +
                                (this._isClickable ? ' clickable' : '') +
                                extraClassNames +
                                p.lineDecorations.map((d) => ' ' + d.className).join(' '), // TODO: take the ranges into account for line decorations
                            cursorStops: InjectedTextCursorStops.Left,
                            attachedData: new GhostTextAttachedData(this),
                        },
                        showIfCollapsed: true,
                    },
                });
            }
            return decorations;
        });
        this._additionalLinesWidget = this._register(new AdditionalLinesWidget(this._editor, derived((reader) => {
            /** @description lines */
            const uiState = this.uiState.read(reader);
            return uiState
                ? {
                    lineNumber: uiState.lineNumber,
                    additionalLines: uiState.additionalLines,
                    minReservedLineCount: uiState.additionalReservedLineCount,
                    targetTextModel: uiState.targetTextModel,
                }
                : undefined;
        }), this._shouldKeepCursorStable, this._isClickable));
        this._isInlineTextHovered = this._editorObs.isTargetHovered((p) => p.target.type === 6 /* MouseTargetType.CONTENT_TEXT */ &&
            p.target.detail.injectedText?.options.attachedData instanceof GhostTextAttachedData &&
            p.target.detail.injectedText.options.attachedData.owner === this, this._store);
        this.isHovered = derived(this, (reader) => {
            if (this._isDisposed.read(reader)) {
                return false;
            }
            return (this._isInlineTextHovered.read(reader) || this._additionalLinesWidget.isHovered.read(reader));
        });
        this.height = derived(this, (reader) => {
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */).read(reader);
            return lineHeight + (this._additionalLinesWidget.viewZoneHeight.read(reader) ?? 0);
        });
        this._register(toDisposable(() => {
            this._isDisposed.set(true, undefined);
        }));
        this._register(this._editorObs.setDecorations(this.decorations));
        if (this._isClickable) {
            this._register(this._additionalLinesWidget.onDidClick((e) => this._onDidClick.fire(e)));
            this._register(this._editor.onMouseUp((e) => {
                if (e.target.type !== 6 /* MouseTargetType.CONTENT_TEXT */) {
                    return;
                }
                const a = e.target.detail.injectedText?.options.attachedData;
                if (a instanceof GhostTextAttachedData && a.owner === this) {
                    this._onDidClick.fire(e.event);
                }
            }));
        }
        this._register(autorunWithStore((reader, store) => {
            if (USE_SQUIGGLES_FOR_WARNING) {
                return;
            }
            const state = this._warningState.read(reader);
            if (!state) {
                return;
            }
            const lineHeight = this._editorObs.getOption(68 /* EditorOption.lineHeight */);
            store.add(this._editorObs.createContentWidget({
                position: constObservable({
                    position: new Position(state.lineNumber, Number.MAX_SAFE_INTEGER),
                    preference: [0 /* ContentWidgetPositionPreference.EXACT */],
                    positionAffinity: 1 /* PositionAffinity.Right */,
                }),
                allowEditorOverflow: false,
                domNode: n
                    .div({
                    class: 'ghost-text-view-warning-widget',
                    style: {
                        width: lineHeight,
                        height: lineHeight,
                        marginLeft: 4,
                        color: 'orange',
                    },
                    ref: (dom) => {
                        ;
                        dom.ghostTextViewWarningWidgetData = {
                            range: Range.fromPositions(state.position),
                        };
                    },
                }, [
                    n.div({
                        class: 'ghost-text-view-warning-widget-icon',
                        style: {
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            alignContent: 'center',
                            alignItems: 'center',
                        },
                    }, [renderIcon(state.icon && 'id' in state.icon ? state.icon : Codicon.warning)]),
                ])
                    .keepUpdated(store).element,
            }));
        }));
    }
    static getWarningWidgetContext(domNode) {
        const data = domNode.ghostTextViewWarningWidgetData;
        if (data) {
            return data;
        }
        else if (domNode.parentElement) {
            return this.getWarningWidgetContext(domNode.parentElement);
        }
        return undefined;
    }
    ownsViewZone(viewZoneId) {
        return this._additionalLinesWidget.viewZoneId === viewZoneId;
    }
};
GhostTextView = GhostTextView_1 = __decorate([
    __param(5, ILanguageService)
], GhostTextView);
export { GhostTextView };
class GhostTextAttachedData {
    constructor(owner) {
        this.owner = owner;
    }
}
function computeGhostTextViewData(ghostText, textModel, ghostTextClassName) {
    const inlineTexts = [];
    const additionalLines = [];
    function addToAdditionalLines(ghLines, className) {
        if (additionalLines.length > 0) {
            const lastLine = additionalLines[additionalLines.length - 1];
            if (className) {
                lastLine.decorations.push(new LineDecoration(lastLine.content.length + 1, lastLine.content.length + 1 + ghLines[0].line.length, className, 0 /* InlineDecorationType.Regular */));
            }
            lastLine.content += ghLines[0].line;
            ghLines = ghLines.slice(1);
        }
        for (const ghLine of ghLines) {
            additionalLines.push({
                content: ghLine.line,
                decorations: className
                    ? [
                        new LineDecoration(1, ghLine.line.length + 1, className, 0 /* InlineDecorationType.Regular */),
                        ...ghLine.lineDecorations,
                    ]
                    : [...ghLine.lineDecorations],
            });
        }
    }
    const textBufferLine = textModel.getLineContent(ghostText.lineNumber);
    let hiddenTextStartColumn = undefined;
    let lastIdx = 0;
    for (const part of ghostText.parts) {
        let ghLines = part.lines;
        if (hiddenTextStartColumn === undefined) {
            inlineTexts.push({
                column: part.column,
                text: ghLines[0].line,
                preview: part.preview,
                lineDecorations: ghLines[0].lineDecorations,
            });
            ghLines = ghLines.slice(1);
        }
        else {
            addToAdditionalLines([{ line: textBufferLine.substring(lastIdx, part.column - 1), lineDecorations: [] }], undefined);
        }
        if (ghLines.length > 0) {
            addToAdditionalLines(ghLines, ghostTextClassName);
            if (hiddenTextStartColumn === undefined && part.column <= textBufferLine.length) {
                hiddenTextStartColumn = part.column;
            }
        }
        lastIdx = part.column - 1;
    }
    if (hiddenTextStartColumn !== undefined) {
        addToAdditionalLines([{ line: textBufferLine.substring(lastIdx), lineDecorations: [] }], undefined);
    }
    const hiddenRange = hiddenTextStartColumn !== undefined
        ? new ColumnRange(hiddenTextStartColumn, textBufferLine.length + 1)
        : undefined;
    return {
        inlineTexts,
        additionalLines,
        hiddenRange,
    };
}
export class AdditionalLinesWidget extends Disposable {
    get viewZoneId() {
        return this._viewZoneInfo?.viewZoneId;
    }
    get viewZoneHeight() {
        return this._viewZoneHeight;
    }
    constructor(_editor, _lines, _shouldKeepCursorStable, _isClickable) {
        super();
        this._editor = _editor;
        this._lines = _lines;
        this._shouldKeepCursorStable = _shouldKeepCursorStable;
        this._isClickable = _isClickable;
        this._viewZoneHeight = observableValue('viewZoneHeight', undefined);
        this.editorOptionsChanged = observableSignalFromEvent('editorOptionChanged', Event.filter(this._editor.onDidChangeConfiguration, (e) => e.hasChanged(33 /* EditorOption.disableMonospaceOptimizations */) ||
            e.hasChanged(122 /* EditorOption.stopRenderingLineAfter */) ||
            e.hasChanged(104 /* EditorOption.renderWhitespace */) ||
            e.hasChanged(99 /* EditorOption.renderControlCharacters */) ||
            e.hasChanged(53 /* EditorOption.fontLigatures */) ||
            e.hasChanged(52 /* EditorOption.fontInfo */) ||
            e.hasChanged(68 /* EditorOption.lineHeight */)));
        this._onDidClick = this._register(new Emitter());
        this.onDidClick = this._onDidClick.event;
        this._viewZoneListener = this._register(new MutableDisposable());
        this.isHovered = observableCodeEditor(this._editor).isTargetHovered((p) => isTargetGhostText(p.target.element), this._store);
        this.hasBeenAccepted = false;
        if (this._editor instanceof CodeEditorWidget && this._shouldKeepCursorStable) {
            this._register(this._editor.onBeforeExecuteEdit((e) => (this.hasBeenAccepted = e.source === 'inlineSuggestion.accept')));
        }
        this._register(autorun((reader) => {
            /** @description update view zone */
            const lines = this._lines.read(reader);
            this.editorOptionsChanged.read(reader);
            if (lines) {
                this.hasBeenAccepted = false;
                this.updateLines(lines.lineNumber, lines.additionalLines, lines.minReservedLineCount);
            }
            else {
                this.clear();
            }
        }));
    }
    dispose() {
        super.dispose();
        this.clear();
    }
    clear() {
        this._viewZoneListener.clear();
        this._editor.changeViewZones((changeAccessor) => {
            this.removeActiveViewZone(changeAccessor);
        });
    }
    updateLines(lineNumber, additionalLines, minReservedLineCount) {
        const textModel = this._editor.getModel();
        if (!textModel) {
            return;
        }
        const { tabSize } = textModel.getOptions();
        this._editor.changeViewZones((changeAccessor) => {
            const store = new DisposableStore();
            this.removeActiveViewZone(changeAccessor);
            const heightInLines = Math.max(additionalLines.length, minReservedLineCount);
            if (heightInLines > 0) {
                const domNode = document.createElement('div');
                renderLines(domNode, tabSize, additionalLines, this._editor.getOptions(), this._isClickable);
                if (this._isClickable) {
                    store.add(addDisposableListener(domNode, 'mousedown', (e) => {
                        e.preventDefault(); // This prevents that the editor loses focus
                    }));
                    store.add(addDisposableListener(domNode, 'click', (e) => {
                        if (isTargetGhostText(e.target)) {
                            this._onDidClick.fire(new StandardMouseEvent(getWindow(e), e));
                        }
                    }));
                }
                this.addViewZone(changeAccessor, lineNumber, heightInLines, domNode);
            }
            this._viewZoneListener.value = store;
        });
    }
    addViewZone(changeAccessor, afterLineNumber, heightInLines, domNode) {
        const id = changeAccessor.addZone({
            afterLineNumber: afterLineNumber,
            heightInLines: heightInLines,
            domNode,
            afterColumnAffinity: 1 /* PositionAffinity.Right */,
            onComputedHeight: (height) => {
                this._viewZoneHeight.set(height, undefined); // TODO: can a transaction be used to avoid flickering?
            },
        });
        this.keepCursorStable(afterLineNumber, heightInLines);
        this._viewZoneInfo = { viewZoneId: id, heightInLines, lineNumber: afterLineNumber };
    }
    removeActiveViewZone(changeAccessor) {
        if (this._viewZoneInfo) {
            changeAccessor.removeZone(this._viewZoneInfo.viewZoneId);
            if (!this.hasBeenAccepted) {
                this.keepCursorStable(this._viewZoneInfo.lineNumber, -this._viewZoneInfo.heightInLines);
            }
            this._viewZoneInfo = undefined;
            this._viewZoneHeight.set(undefined, undefined);
        }
    }
    keepCursorStable(lineNumber, heightInLines) {
        if (!this._shouldKeepCursorStable) {
            return;
        }
        const cursorLineNumber = this._editor.getSelection()?.getStartPosition()?.lineNumber;
        if (cursorLineNumber !== undefined && lineNumber < cursorLineNumber) {
            this._editor.setScrollTop(this._editor.getScrollTop() +
                heightInLines * this._editor.getOption(68 /* EditorOption.lineHeight */));
        }
    }
}
function isTargetGhostText(target) {
    return isHTMLElement(target) && target.classList.contains(GHOST_TEXT_CLASS_NAME);
}
function renderLines(domNode, tabSize, lines, opts, isClickable) {
    const disableMonospaceOptimizations = opts.get(33 /* EditorOption.disableMonospaceOptimizations */);
    const stopRenderingLineAfter = opts.get(122 /* EditorOption.stopRenderingLineAfter */);
    // To avoid visual confusion, we don't want to render visible whitespace
    const renderWhitespace = 'none';
    const renderControlCharacters = opts.get(99 /* EditorOption.renderControlCharacters */);
    const fontLigatures = opts.get(53 /* EditorOption.fontLigatures */);
    const fontInfo = opts.get(52 /* EditorOption.fontInfo */);
    const lineHeight = opts.get(68 /* EditorOption.lineHeight */);
    let classNames = 'suggest-preview-text';
    if (isClickable) {
        classNames += ' clickable';
    }
    const sb = new StringBuilder(10000);
    sb.appendString(`<div class="${classNames}">`);
    for (let i = 0, len = lines.length; i < len; i++) {
        const lineData = lines[i];
        const lineTokens = lineData.content;
        sb.appendString('<div class="view-line');
        sb.appendString('" style="top:');
        sb.appendString(String(i * lineHeight));
        sb.appendString('px;width:1000000px;">');
        const line = lineTokens.getLineContent();
        const isBasicASCII = strings.isBasicASCII(line);
        const containsRTL = strings.containsRTL(line);
        renderViewLine(new RenderLineInput(fontInfo.isMonospace && !disableMonospaceOptimizations, fontInfo.canUseHalfwidthRightwardsArrow, line, false, isBasicASCII, containsRTL, 0, lineTokens, lineData.decorations, tabSize, 0, fontInfo.spaceWidth, fontInfo.middotWidth, fontInfo.wsmiddotWidth, stopRenderingLineAfter, renderWhitespace, renderControlCharacters, fontLigatures !== EditorFontLigatures.OFF, null), sb);
        sb.appendString('</div>');
    }
    sb.appendString('</div>');
    applyFontInfo(domNode, fontInfo);
    const html = sb.build();
    const trustedhtml = ttPolicy ? ttPolicy.createHTML(html) : html;
    domNode.innerHTML = trustedhtml;
}
export const ttPolicy = createTrustedTypesPolicy('editorGhostText', {
    createHTML: (value) => value,
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2hvc3RUZXh0Vmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvdmlldy9naG9zdFRleHQvZ2hvc3RUZXh0Vmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRixPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sNENBQTRDLENBQUE7QUFDbkQsT0FBTyxFQUVOLE9BQU8sRUFDUCxnQkFBZ0IsRUFDaEIsZUFBZSxFQUNmLE9BQU8sRUFDUCx5QkFBeUIsRUFDekIsZUFBZSxHQUNmLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxLQUFLLE9BQU8sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFRNUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUNOLG1CQUFtQixHQUduQixNQUFNLCtDQUErQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0NB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