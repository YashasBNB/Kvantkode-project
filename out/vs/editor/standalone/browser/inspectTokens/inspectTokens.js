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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdFRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvaW5zcGVjdFRva2Vucy9pbnNwZWN0VG9rZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFRakUsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sc0NBQXNDLENBQUE7QUFJN0MsT0FBTyxFQUdOLG9CQUFvQixHQUdwQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFHTixhQUFhLEdBQ2IsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sU0FBUyxFQUNULFlBQVksRUFDWixtQkFBbUIsR0FDbkIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUV2RSxJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF3QixTQUFRLFVBQVU7O2FBQ3hCLE9BQUUsR0FBRyw4QkFBOEIsQUFBakMsQ0FBaUM7SUFFbkQsTUFBTSxDQUFDLEdBQUcsQ0FBQyxNQUFtQjtRQUNwQyxPQUFPLE1BQU0sQ0FBQyxlQUFlLENBQTBCLHlC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