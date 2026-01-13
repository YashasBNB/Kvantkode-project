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
var InspectTokensController_1;
import './inspectTokens.css';
import { $, append, reset } from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { TokenizationRegistry, } from '../../../common/languages.js';
import { TokenMetadata, } from '../../../common/encodedTokenAttributes.js';
import { NullState, nullTokenize, nullTokenizeEncoded, } from '../../../common/languages/nullTokenize.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { IStandaloneThemeService } from '../../common/standaloneTheme.js';
import { InspectTokensNLS } from '../../../common/standaloneStrings.js';
let InspectTokensController = class InspectTokensController extends Disposable {
    static { InspectTokensController_1 = this; }
    static { this.ID = 'editor.contrib.inspectTokens'; }
    static get(editor) {
        return editor.getContribution(InspectTokensController_1.ID);
    }
    constructor(editor, standaloneColorService, languageService) {
        super();
        this._editor = editor;
        this._languageService = languageService;
        this._widget = null;
        this._register(this._editor.onDidChangeModel((e) => this.stop()));
        this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
        this._register(TokenizationRegistry.onDidChange((e) => this.stop()));
        this._register(this._editor.onKeyUp((e) => e.keyCode === 9 /* KeyCode.Escape */ && this.stop()));
    }
    dispose() {
        this.stop();
        super.dispose();
    }
    launch() {
        if (this._widget) {
            return;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        this._widget = new InspectTokensWidget(this._editor, this._languageService);
    }
    stop() {
        if (this._widget) {
            this._widget.dispose();
            this._widget = null;
        }
    }
};
InspectTokensController = InspectTokensController_1 = __decorate([
    __param(1, IStandaloneThemeService),
    __param(2, ILanguageService)
], InspectTokensController);
class InspectTokens extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inspectTokens',
            label: InspectTokensNLS.inspectTokensAction,
            alias: 'Developer: Inspect Tokens',
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        const controller = InspectTokensController.get(editor);
        controller?.launch();
    }
}
function renderTokenText(tokenText) {
    let result = '';
    for (let charIndex = 0, len = tokenText.length; charIndex < len; charIndex++) {
        const charCode = tokenText.charCodeAt(charIndex);
        switch (charCode) {
            case 9 /* CharCode.Tab */:
                result += '\u2192'; // &rarr;
                break;
            case 32 /* CharCode.Space */:
                result += '\u00B7'; // &middot;
                break;
            default:
                result += String.fromCharCode(charCode);
        }
    }
    return result;
}
function getSafeTokenizationSupport(languageIdCodec, languageId) {
    const tokenizationSupport = TokenizationRegistry.get(languageId);
    if (tokenizationSupport) {
        return tokenizationSupport;
    }
    const encodedLanguageId = languageIdCodec.encodeLanguageId(languageId);
    return {
        getInitialState: () => NullState,
        tokenize: (line, hasEOL, state) => nullTokenize(languageId, state),
        tokenizeEncoded: (line, hasEOL, state) => nullTokenizeEncoded(encodedLanguageId, state),
    };
}
class InspectTokensWidget extends Disposable {
    static { this._ID = 'editor.contrib.inspectTokensWidget'; }
    constructor(editor, languageService) {
        super();
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this._editor = editor;
        this._languageService = languageService;
        this._model = this._editor.getModel();
        this._domNode = document.createElement('div');
        this._domNode.className = 'tokens-inspect-widget';
        this._tokenizationSupport = getSafeTokenizationSupport(this._languageService.languageIdCodec, this._model.getLanguageId());
        this._compute(this._editor.getPosition());
        this._register(this._editor.onDidChangeCursorPosition((e) => this._compute(this._editor.getPosition())));
        this._editor.addContentWidget(this);
    }
    dispose() {
        this._editor.removeContentWidget(this);
        super.dispose();
    }
    getId() {
        return InspectTokensWidget._ID;
    }
    _compute(position) {
        const data = this._getTokensAtLine(position.lineNumber);
        let token1Index = 0;
        for (let i = data.tokens1.length - 1; i >= 0; i--) {
            const t = data.tokens1[i];
            if (position.column - 1 >= t.offset) {
                token1Index = i;
                break;
            }
        }
        let token2Index = 0;
        for (let i = data.tokens2.length >>> 1; i >= 0; i--) {
            if (position.column - 1 >= data.tokens2[i << 1]) {
                token2Index = i;
                break;
            }
        }
        const lineContent = this._model.getLineContent(position.lineNumber);
        let tokenText = '';
        if (token1Index < data.tokens1.length) {
            const tokenStartIndex = data.tokens1[token1Index].offset;
            const tokenEndIndex = token1Index + 1 < data.tokens1.length
                ? data.tokens1[token1Index + 1].offset
                : lineContent.length;
            tokenText = lineContent.substring(tokenStartIndex, tokenEndIndex);
        }
        reset(this._domNode, $('h2.tm-token', undefined, renderTokenText(tokenText), $('span.tm-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));
        append(this._domNode, $('hr.tokens-inspect-separator', { style: 'clear:both' }));
        const metadata = (token2Index << 1) + 1 < data.tokens2.length
            ? this._decodeMetadata(data.tokens2[(token2Index << 1) + 1])
            : null;
        append(this._domNode, $('table.tm-metadata-table', undefined, $('tbody', undefined, $('tr', undefined, $('td.tm-metadata-key', undefined, 'language'), $('td.tm-metadata-value', undefined, `${metadata ? metadata.languageId : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'token type'), $('td.tm-metadata-value', undefined, `${metadata ? this._tokenTypeToString(metadata.tokenType) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'font style'), $('td.tm-metadata-value', undefined, `${metadata ? this._fontStyleToString(metadata.fontStyle) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'foreground'), $('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.foreground) : '-?-'}`)), $('tr', undefined, $('td.tm-metadata-key', undefined, 'background'), $('td.tm-metadata-value', undefined, `${metadata ? Color.Format.CSS.formatHex(metadata.background) : '-?-'}`)))));
        append(this._domNode, $('hr.tokens-inspect-separator'));
        if (token1Index < data.tokens1.length) {
            append(this._domNode, $('span.tm-token-type', undefined, data.tokens1[token1Index].type));
        }
        this._editor.layoutContentWidget(this);
    }
    _decodeMetadata(metadata) {
        const colorMap = TokenizationRegistry.getColorMap();
        const languageId = TokenMetadata.getLanguageId(metadata);
        const tokenType = TokenMetadata.getTokenType(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        const foreground = TokenMetadata.getForeground(metadata);
        const background = TokenMetadata.getBackground(metadata);
        return {
            languageId: this._languageService.languageIdCodec.decodeLanguageId(languageId),
            tokenType: tokenType,
            fontStyle: fontStyle,
            foreground: colorMap[foreground],
            background: colorMap[background],
        };
    }
    _tokenTypeToString(tokenType) {
        switch (tokenType) {
            case 0 /* StandardTokenType.Other */:
                return 'Other';
            case 1 /* StandardTokenType.Comment */:
                return 'Comment';
            case 2 /* StandardTokenType.String */:
                return 'String';
            case 3 /* StandardTokenType.RegEx */:
                return 'RegEx';
            default:
                return '??';
        }
    }
    _fontStyleToString(fontStyle) {
        let r = '';
        if (fontStyle & 1 /* FontStyle.Italic */) {
            r += 'italic ';
        }
        if (fontStyle & 2 /* FontStyle.Bold */) {
            r += 'bold ';
        }
        if (fontStyle & 4 /* FontStyle.Underline */) {
            r += 'underline ';
        }
        if (fontStyle & 8 /* FontStyle.Strikethrough */) {
            r += 'strikethrough ';
        }
        if (r.length === 0) {
            r = '---';
        }
        return r;
    }
    _getTokensAtLine(lineNumber) {
        const stateBeforeLine = this._getStateBeforeLine(lineNumber);
        const tokenizationResult1 = this._tokenizationSupport.tokenize(this._model.getLineContent(lineNumber), true, stateBeforeLine);
        const tokenizationResult2 = this._tokenizationSupport.tokenizeEncoded(this._model.getLineContent(lineNumber), true, stateBeforeLine);
        return {
            startState: stateBeforeLine,
            tokens1: tokenizationResult1.tokens,
            tokens2: tokenizationResult2.tokens,
            endState: tokenizationResult1.endState,
        };
    }
    _getStateBeforeLine(lineNumber) {
        let state = this._tokenizationSupport.getInitialState();
        for (let i = 1; i < lineNumber; i++) {
            const tokenizationResult = this._tokenizationSupport.tokenize(this._model.getLineContent(i), true, state);
            state = tokenizationResult.endState;
        }
        return state;
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            position: this._editor.getPosition(),
            preference: [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
}
registerEditorContribution(InspectTokensController.ID, InspectTokensController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(InspectTokens);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdFRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9pbnNwZWN0VG9rZW5zL2luc3BlY3RUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQVFqRSxPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUk3QyxPQUFPLEVBR04sb0JBQW9CLEdBR3BCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUdOLGFBQWEsR0FDYixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFDTixTQUFTLEVBQ1QsWUFBWSxFQUNaLG1CQUFtQixHQUNuQixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXZFLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXdCLFNBQVEsVUFBVTs7YUFDeEIsT0FBRSxHQUFHLDhCQUE4QixBQUFqQyxDQUFpQztJQUVuRCxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQW1CO1FBQ3BDLE9BQU8s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