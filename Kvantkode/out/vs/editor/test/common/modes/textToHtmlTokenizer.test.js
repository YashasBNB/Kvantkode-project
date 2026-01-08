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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFRvSHRtbFRva2VuaXplci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9jb21tb24vbW9kZXMvdGV4dFRvSHRtbFRva2VuaXplci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFDTix5QkFBeUIsRUFFekIsb0JBQW9CLEdBQ3BCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEUsT0FBTyxFQUNOLGlCQUFpQixFQUNqQixrQkFBa0IsR0FDbEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGFBQWEsRUFBRSxjQUFjLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUd6RCxLQUFLLENBQUMsb0NBQW9DLEVBQUUsR0FBRyxFQUFFO0lBQ2hELElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLG9CQUE4QyxDQUFBO0lBRWxELEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxvQkFBb0IsR0FBRyxtQkFBbUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtJQUN4RCxDQUFDLENBQUMsQ0FBQTtJQUVGLFFBQVEsQ0FBQyxHQUFHLEVBQUU7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