/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createTrustedTypesPolicy } from '../../../base/browser/trustedTypes.js';
import * as strings from '../../../base/common/strings.js';
import { TokenizationRegistry, } from '../../common/languages.js';
import { LineTokens } from '../../common/tokens/lineTokens.js';
import { RenderLineInput, renderViewLine2 as renderViewLine, } from '../../common/viewLayout/viewLineRenderer.js';
import { ViewLineRenderingData } from '../../common/viewModel.js';
import { MonarchTokenizer } from '../common/monarch/monarchLexer.js';
const ttPolicy = createTrustedTypesPolicy('standaloneColorizer', { createHTML: (value) => value });
export class Colorizer {
    static colorizeElement(themeService, languageService, domNode, options) {
        options = options || {};
        const theme = options.theme || 'vs';
        const mimeType = options.mimeType || domNode.getAttribute('lang') || domNode.getAttribute('data-lang');
        if (!mimeType) {
            console.error('Mode not detected');
            return Promise.resolve();
        }
        const languageId = languageService.getLanguageIdByMimeType(mimeType) || mimeType;
        themeService.setTheme(theme);
        const text = domNode.firstChild ? domNode.firstChild.nodeValue : '';
        domNode.className += ' ' + theme;
        const render = (str) => {
            const trustedhtml = ttPolicy?.createHTML(str) ?? str;
            domNode.innerHTML = trustedhtml;
        };
        return this.colorize(languageService, text || '', languageId, options).then(render, (err) => console.error(err));
    }
    static async colorize(languageService, text, languageId, options) {
        const languageIdCodec = languageService.languageIdCodec;
        let tabSize = 4;
        if (options && typeof options.tabSize === 'number') {
            tabSize = options.tabSize;
        }
        if (strings.startsWithUTF8BOM(text)) {
            text = text.substr(1);
        }
        const lines = strings.splitLines(text);
        if (!languageService.isRegisteredLanguageId(languageId)) {
            return _fakeColorize(lines, tabSize, languageIdCodec);
        }
        const tokenizationSupport = await TokenizationRegistry.getOrCreate(languageId);
        if (tokenizationSupport) {
            return _colorize(lines, tabSize, tokenizationSupport, languageIdCodec);
        }
        return _fakeColorize(lines, tabSize, languageIdCodec);
    }
    static colorizeLine(line, mightContainNonBasicASCII, mightContainRTL, tokens, tabSize = 4) {
        const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, mightContainNonBasicASCII);
        const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, mightContainRTL);
        const renderResult = renderViewLine(new RenderLineInput(false, true, line, false, isBasicASCII, containsRTL, 0, tokens, [], tabSize, 0, 0, 0, 0, -1, 'none', false, false, null));
        return renderResult.html;
    }
    static colorizeModelLine(model, lineNumber, tabSize = 4) {
        const content = model.getLineContent(lineNumber);
        model.tokenization.forceTokenization(lineNumber);
        const tokens = model.tokenization.getLineTokens(lineNumber);
        const inflatedTokens = tokens.inflate();
        return this.colorizeLine(content, model.mightContainNonBasicASCII(), model.mightContainRTL(), inflatedTokens, tabSize);
    }
}
function _colorize(lines, tabSize, tokenizationSupport, languageIdCodec) {
    return new Promise((c, e) => {
        const execute = () => {
            const result = _actualColorize(lines, tabSize, tokenizationSupport, languageIdCodec);
            if (tokenizationSupport instanceof MonarchTokenizer) {
                const status = tokenizationSupport.getLoadStatus();
                if (status.loaded === false) {
                    status.promise.then(execute, e);
                    return;
                }
            }
            c(result);
        };
        execute();
    });
}
function _fakeColorize(lines, tabSize, languageIdCodec) {
    let html = [];
    const defaultMetadata = ((0 /* FontStyle.None */ << 11 /* MetadataConsts.FONT_STYLE_OFFSET */) |
        (1 /* ColorId.DefaultForeground */ << 15 /* MetadataConsts.FOREGROUND_OFFSET */) |
        (2 /* ColorId.DefaultBackground */ << 24 /* MetadataConsts.BACKGROUND_OFFSET */)) >>>
        0;
    const tokens = new Uint32Array(2);
    tokens[0] = 0;
    tokens[1] = defaultMetadata;
    for (let i = 0, length = lines.length; i < length; i++) {
        const line = lines[i];
        tokens[0] = line.length;
        const lineTokens = new LineTokens(tokens, line, languageIdCodec);
        const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, /* check for basic ASCII */ true);
        const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, 
        /* check for RTL */ true);
        const renderResult = renderViewLine(new RenderLineInput(false, true, line, false, isBasicASCII, containsRTL, 0, lineTokens, [], tabSize, 0, 0, 0, 0, -1, 'none', false, false, null));
        html = html.concat(renderResult.html);
        html.push('<br/>');
    }
    return html.join('');
}
function _actualColorize(lines, tabSize, tokenizationSupport, languageIdCodec) {
    let html = [];
    let state = tokenizationSupport.getInitialState();
    for (let i = 0, length = lines.length; i < length; i++) {
        const line = lines[i];
        const tokenizeResult = tokenizationSupport.tokenizeEncoded(line, true, state);
        LineTokens.convertToEndOffset(tokenizeResult.tokens, line.length);
        const lineTokens = new LineTokens(tokenizeResult.tokens, line, languageIdCodec);
        const isBasicASCII = ViewLineRenderingData.isBasicASCII(line, /* check for basic ASCII */ true);
        const containsRTL = ViewLineRenderingData.containsRTL(line, isBasicASCII, 
        /* check for RTL */ true);
        const renderResult = renderViewLine(new RenderLineInput(false, true, line, false, isBasicASCII, containsRTL, 0, lineTokens.inflate(), [], tabSize, 0, 0, 0, 0, -1, 'none', false, false, null));
        html = html.concat(renderResult.html);
        html.push('<br/>');
        state = tokenizeResult.endState;
    }
    return html.join('');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JpemVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9jb2xvcml6ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUUxRCxPQUFPLEVBR04sb0JBQW9CLEdBQ3BCLE1BQU0sMkJBQTJCLENBQUE7QUFHbEMsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sZUFBZSxFQUNmLGVBQWUsSUFBSSxjQUFjLEdBQ2pDLE1BQU0sNkNBQTZDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHcEUsTUFBTSxRQUFRLEdBQUcsd0JBQXdCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7QUFXbEcsTUFBTSxPQUFPLFNBQVM7SUFDZCxNQUFNLENBQUMsZUFBZSxDQUM1QixZQUFxQyxFQUNyQyxlQUFpQyxFQUNqQyxPQUFvQixFQUNwQixPQUFpQztRQUVqQyxPQUFPLEdBQUcsT0FBTyxJQUFJLEVBQUUsQ0FBQTtRQUN2QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQTtRQUNuQyxNQUFNLFFBQVEsR0FDYixPQUFPLENBQUMsUUFBUSxJQUFJLE9BQU8sQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksT0FBTyxDQUFDLFlBQVksQ0FBQyxXQUFXLENB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