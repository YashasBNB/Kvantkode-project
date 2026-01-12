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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { escapeRegExpCharacters } from '../../../../../base/common/strings.js';
import { URI } from '../../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { matchesScheme } from '../../../../../base/common/network.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { convertLinkRangeToBuffer, getXtermLineContent } from './terminalLinkHelpers.js';
import { TERMINAL_CONFIG_SECTION, } from '../../../terminal/common/terminal.js';
var Constants;
(function (Constants) {
    /**
     * The max line length to try extract word links from.
     */
    Constants[Constants["MaxLineLength"] = 2000] = "MaxLineLength";
})(Constants || (Constants = {}));
let TerminalWordLinkDetector = class TerminalWordLinkDetector extends Disposable {
    static { this.id = 'word'; }
    constructor(xterm, _configurationService, _productService) {
        super();
        this.xterm = xterm;
        this._configurationService = _configurationService;
        this._productService = _productService;
        // Word links typically search the workspace so it makes sense that their maximum link length is
        // quite small.
        this.maxLinkLength = 100;
        this._refreshSeparatorCodes();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.wordSeparators" /* TerminalSettingId.WordSeparators */)) {
                this._refreshSeparatorCodes();
            }
        }));
    }
    detect(lines, startLine, endLine) {
        const links = [];
        // Get the text representation of the wrapped line
        const text = getXtermLineContent(this.xterm.buffer.active, startLine, endLine, this.xterm.cols);
        if (text === '' || text.length > 2000 /* Constants.MaxLineLength */) {
            return [];
        }
        // Parse out all words from the wrapped line
        const words = this._parseWords(text);
        // Map the words to ITerminalLink objects
        for (const word of words) {
            if (word.text === '') {
                continue;
            }
            if (word.text.length > 0 && word.text.charAt(word.text.length - 1) === ':') {
                word.text = word.text.slice(0, -1);
                word.endIndex--;
            }
            const bufferRange = convertLinkRangeToBuffer(lines, this.xterm.cols, {
                startColumn: word.startIndex + 1,
                startLineNumber: 1,
                endColumn: word.endIndex + 1,
                endLineNumber: 1,
            }, startLine);
            // Support this product's URL protocol
            if (matchesScheme(word.text, this._productService.urlProtocol)) {
                const uri = URI.parse(word.text);
                if (uri) {
                    links.push({
                        text: word.text,
                        uri,
                        bufferRange,
                        type: "Url" /* TerminalBuiltinLinkType.Url */,
                    });
                }
                continue;
            }
            // Search links
            links.push({
                text: word.text,
                bufferRange,
                type: "Search" /* TerminalBuiltinLinkType.Search */,
                contextLine: text,
            });
        }
        return links;
    }
    _parseWords(text) {
        const words = [];
        const splitWords = text.split(this._separatorRegex);
        let runningIndex = 0;
        for (let i = 0; i < splitWords.length; i++) {
            words.push({
                text: splitWords[i],
                startIndex: runningIndex,
                endIndex: runningIndex + splitWords[i].length,
            });
            runningIndex += splitWords[i].length + 1;
        }
        return words;
    }
    _refreshSeparatorCodes() {
        const separators = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).wordSeparators;
        let powerlineSymbols = '';
        for (let i = 0xe0b0; i <= 0xe0bf; i++) {
            powerlineSymbols += String.fromCharCode(i);
        }
        this._separatorRegex = new RegExp(`[${escapeRegExpCharacters(separators)}${powerlineSymbols}]`, 'g');
    }
};
TerminalWordLinkDetector = __decorate([
    __param(1, IConfigurationService),
    __param(2, IProductService)
], TerminalWordLinkDetector);
export { TerminalWordLinkDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvYnJvd3Nlci90ZXJtaW5hbFdvcmRMaW5rRGV0ZWN0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRzFGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ3hGLE9BQU8sRUFFTix1QkFBdUIsR0FDdkIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc3QyxJQUFXLFNBS1Y7QUFMRCxXQUFXLFNBQVM7SUFDbkI7O09BRUc7SUFDSCw4REFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBTFUsU0FBUyxLQUFULFNBQVMsUUFLbkI7QUFRTSxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7YUFDaEQsT0FBRSxHQUFHLE1BQU0sQUFBVCxDQUFTO0lBUWxCLFlBQ1UsS0FBZSxFQUNELHFCQUE2RCxFQUNuRSxlQUFpRDtRQUVsRSxLQUFLLEVBQUUsQ0FBQTtRQUpFLFVBQUssR0FBTCxLQUFLLENBQVU7UUFDZ0IsMEJBQXFCLEdBQXJCLHFC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