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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL2Jyb3dzZXIvdGVybWluYWxXb3JkTGlua0RldGVjdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUcxRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN4RixPQUFPLEVBRU4sdUJBQXVCLEdBQ3ZCLE1BQU0sc0NBQXNDLENBQUE7QUFHN0MsSUFBVyxTQUtWO0FBTEQsV0FBVyxTQUFTO0lBQ25COztPQUVHO0lBQ0gsOERBQW9CLENBQUE7QUFDckIsQ0FBQyxFQUxVLFNBQVMsS0FBVCxTQUFTLFFBS25CO0FBUU0sSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVO2FBQ2hELE9BQUUsR0FBRyxNQUFNLEFBQVQsQ0FBUztJQVFsQixZQUNVLEtBQWUsRUFDRCxxQkFBNkQsRUFDbkUsZUFBaUQ7UUFFbEUsS0FBSyxFQUFFLENBQUE7UUFKRSxVQUFLLEdBQUwsS0FBSyxDQUFVO1FBQ2dCLDBCQUFxQixHQUFyQixxQkFBcUIs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