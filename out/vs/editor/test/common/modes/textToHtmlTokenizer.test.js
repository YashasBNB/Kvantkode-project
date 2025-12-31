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
import assert from 'assert';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { EncodedTokenizationResult, TokenizationRegistry, } from '../../../common/languages.js';
import { ILanguageService } from '../../../common/languages/language.js';
import { _tokenizeToString, tokenizeLineToHTML, } from '../../../common/languages/textToHtmlTokenizer.js';
import { LanguageIdCodec } from '../../../common/services/languagesRegistry.js';
import { TestLineToken, TestLineTokens } from '../core/testLineToken.js';
import { createModelServices } from '../testTextModel.js';
suite('Editor Modes - textToHtmlTokenizer', () => {
    let disposables;
    let instantiationService;
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = createModelServices(disposables);
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    function toStr(pieces) {
        const resultArr = pieces.map((t) => `<span class="${t.className}">${t.text}</span>`);
        return resultArr.join('');
    }
    test('TextToHtmlTokenizer 1', () => {
        const mode = disposables.add(instantiationService.createInstance(Mode));
        const support = TokenizationRegistry.get(mode.languageId);
        const actual = _tokenizeToString('.abc..def...gh', new LanguageIdCodec(), support);
        const expected = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expectedStr = `<div class="monaco-tokenized-source">${toStr(expected)}</div>`;
        assert.strictEqual(actual, expectedStr);
    });
    test('TextToHtmlTokenizer 2', () => {
        const mode = disposables.add(instantiationService.createInstance(Mode));
        const support = TokenizationRegistry.get(mode.languageId);
        const actual = _tokenizeToString('.abc..def...gh\n.abc..def...gh', new LanguageIdCodec(), support);
        const expected1 = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expected2 = [
            { className: 'mtk7', text: '.' },
            { className: 'mtk9', text: 'abc' },
            { className: 'mtk7', text: '..' },
            { className: 'mtk9', text: 'def' },
            { className: 'mtk7', text: '...' },
            { className: 'mtk9', text: 'gh' },
        ];
        const expectedStr1 = toStr(expected1);
        const expectedStr2 = toStr(expected2);
        const expectedStr = `<div class="monaco-tokenized-source">${expectedStr1}<br/>${expectedStr2}</div>`;
        assert.strictEqual(actual, expectedStr);
    });
    test('tokenizeLineToHTML', () => {
        const text = 'Ciao hello world!';
        const lineTokens = new TestLineTokens([
            new TestLineToken(4, ((3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                ((2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>>
                0),
            new TestLineToken(5, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(10, (4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(11, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(17, ((5 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                (4 /* FontStyle.Underline */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>>
                0),
        ]);
        const colorMap = [null, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 17, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">world!</span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 12, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">w</span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 11, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 1, 11, 4, true), [
            '<div>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">iao</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 4, 11, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160;</span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 5, 11, 4, true), [
            '<div>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 5, 10, 4, true), ['<div>', '<span style="color: #00ff00;">hello</span>', '</div>'].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 6, 9, 4, true), ['<div>', '<span style="color: #00ff00;">ell</span>', '</div>'].join(''));
    });
    test('tokenizeLineToHTML handle spaces #35954', () => {
        const text = '  Ciao   hello world!';
        const lineTokens = new TestLineTokens([
            new TestLineToken(2, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(6, ((3 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                ((2 /* FontStyle.Bold */ | 1 /* FontStyle.Italic */) << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>>
                0),
            new TestLineToken(9, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(14, (4 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(15, (1 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0),
            new TestLineToken(21, ((5 << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
                (4 /* FontStyle.Underline */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */)) >>>
                0),
        ]);
        const colorMap = [null, '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff'];
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 21, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> &#160; </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">world!</span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 17, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">Ciao</span>',
            '<span style="color: #000000;"> &#160; </span>',
            '<span style="color: #00ff00;">hello</span>',
            '<span style="color: #000000;"> </span>',
            '<span style="color: #0000ff;text-decoration: underline;">wo</span>',
            '</div>',
        ].join(''));
        assert.strictEqual(tokenizeLineToHTML(text, lineTokens, colorMap, 0, 3, 4, true), [
            '<div>',
            '<span style="color: #000000;">&#160; </span>',
            '<span style="color: #ff0000;font-style: italic;font-weight: bold;">C</span>',
            '</div>',
        ].join(''));
    });
});
let Mode = class Mode extends Disposable {
    constructor(languageService) {
        super();
        this.languageId = 'textToHtmlTokenizerMode';
        this._register(languageService.registerLanguage({ id: this.languageId }));
        this._register(TokenizationRegistry.register(this.languageId, {
            getInitialState: () => null,
            tokenize: undefined,
            tokenizeEncoded: (line, hasEOL, state) => {
                const tokensArr = [];
                let prevColor = -1;
                for (let i = 0; i < line.length; i++) {
                    const colorId = (line.charAt(i) === '.' ? 7 : 9);
                    if (prevColor !== colorId) {
                        tokensArr.push(i);
                        tokensArr.push((colorId << 15 /* MetadataConsts.FOREGROUND_OFFSET */) >>> 0);
                    }
                    prevColor = colorId;
                }
                const tokens = new Uint32Array(tokensArr.length);
                for (let i = 0; i < tokens.length; i++) {
                    tokens[i] = tokensArr[i];
                }
                return new EncodedTokenizationResult(tokens, null);
            },
        }));
    }
};
Mode = __decorate([
    __param(0, ILanguageService)
], Mode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvY29tbW9uL21vZGVzL3RleHRUb0h0bWxUb2tlbml6ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQ04seUJBQXlCLEVBRXpCLG9CQUFvQixHQUNwQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsa0JBQWtCLEdBQ2xCLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxhQUFhLEVBQUUsY0FBYyxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFHekQsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxJQUFJLFdBQTRCLENBQUE7SUFDaEMsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDbkMsb0JBQW9CLEdBQUcsbUJBQW1CLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDeEQsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2Is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