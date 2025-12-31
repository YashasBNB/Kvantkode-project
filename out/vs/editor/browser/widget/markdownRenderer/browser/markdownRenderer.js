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
var MarkdownRenderer_1;
import { renderMarkdown, } from '../../../../../base/browser/markdownRenderer.js';
import { createTrustedTypesPolicy } from '../../../../../base/browser/trustedTypes.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { ILanguageService } from '../../../../common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../../../common/languages/modesRegistry.js';
import { tokenizeToString } from '../../../../common/languages/textToHtmlTokenizer.js';
import { applyFontInfo } from '../../../config/domFontInfo.js';
import './renderedMarkdown.css';
/**
 * Markdown renderer that can render codeblocks with the editor mechanics. This
 * renderer should always be preferred.
 */
let MarkdownRenderer = class MarkdownRenderer {
    static { MarkdownRenderer_1 = this; }
    static { this._ttpTokenizer = createTrustedTypesPolicy('tokenizeToString', {
        createHTML(html) {
            return html;
        },
    }); }
    constructor(_options, _languageService, _openerService) {
        this._options = _options;
        this._languageService = _languageService;
        this._openerService = _openerService;
    }
    render(markdown, options, markedOptions) {
        if (!markdown) {
            const element = document.createElement('span');
            return { element, dispose: () => { } };
        }
        const disposables = new DisposableStore();
        const rendered = disposables.add(renderMarkdown(markdown, { ...this._getRenderOptions(markdown, disposables), ...options }, markedOptions));
        rendered.element.classList.add('rendered-markdown');
        return {
            element: rendered.element,
            dispose: () => disposables.dispose(),
        };
    }
    _getRenderOptions(markdown, disposables) {
        return {
            codeBlockRenderer: async (languageAlias, value) => {
                // In markdown,
                // it is possible that we stumble upon language aliases (e.g.js instead of javascript)
                // it is possible no alias is given in which case we fall back to the current editor lang
                let languageId;
                if (languageAlias) {
                    languageId = this._languageService.getLanguageIdByLanguageName(languageAlias);
                }
                else if (this._options.editor) {
                    languageId = this._options.editor.getModel()?.getLanguageId();
                }
                if (!languageId) {
                    languageId = PLAINTEXT_LANGUAGE_ID;
                }
                const html = await tokenizeToString(this._languageService, value, languageId);
                const element = document.createElement('span');
                element.innerHTML = (MarkdownRenderer_1._ttpTokenizer?.createHTML(html) ?? html);
                // use "good" font
                if (this._options.editor) {
                    const fontInfo = this._options.editor.getOption(52 /* EditorOption.fontInfo */);
                    applyFontInfo(element, fontInfo);
                }
                else if (this._options.codeBlockFontFamily) {
                    element.style.fontFamily = this._options.codeBlockFontFamily;
                }
                if (this._options.codeBlockFontSize !== undefined) {
                    element.style.fontSize = this._options.codeBlockFontSize;
                }
                return element;
            },
            actionHandler: {
                callback: (link) => this.openMarkdownLink(link, markdown),
                disposables,
            },
        };
    }
    async openMarkdownLink(link, markdown) {
        await openLinkFromMarkdown(this._openerService, link, markdown.isTrusted);
    }
};
MarkdownRenderer = MarkdownRenderer_1 = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService)
], MarkdownRenderer);
export { MarkdownRenderer };
export async function openLinkFromMarkdown(openerService, link, isTrusted, skipValidation) {
    try {
        return await openerService.open(link, {
            fromUserGesture: true,
            allowContributedOpeners: true,
            allowCommands: toAllowCommandsOption(isTrusted),
            skipValidation,
        });
    }
    catch (e) {
        onUnexpectedError(e);
        return false;
    }
}
function toAllowCommandsOption(isTrusted) {
    if (isTrusted === true) {
        return true; // Allow all commands
    }
    if (isTrusted && Array.isArray(isTrusted.enabledCommands)) {
        return isTrusted.enabledCommands; // Allow subset of commands
    }
    return false; // Block commands
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9tYXJrZG93blJlbmRlcmVyL2Jyb3dzZXIvbWFya2Rvd25SZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLGNBQWMsR0FDZCxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBS3hFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTlELE9BQU8sd0JBQXdCLENBQUE7QUFZL0I7OztHQUdHO0FBQ0ksSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7O2FBQ2Isa0JBQWEsR0FBRyx3QkFBd0IsQ0FBQyxrQkFBa0IsRUFBRTtRQUMzRSxVQUFVLENBQUMsSUFBWTtZQUN0QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7S0FDRCxDQUFDLEFBSjBCLENBSTFCO0lBRUYsWUFDa0IsUUFBa0MsRUFDaEIsZ0JBQWtDLEVBQ3BDLGNBQThCO1FBRjlDLGFBQVEsR0FBUixRQUFRLENBQTBCO1FBQ2hCLHFCQUFnQixH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