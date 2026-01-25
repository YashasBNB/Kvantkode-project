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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Rvd25SZW5kZXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L21hcmtkb3duUmVuZGVyZXIvYnJvd3Nlci9tYXJrZG93blJlbmRlcmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBR04sY0FBYyxHQUNkLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLeEUsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVoRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFOUQsT0FBTyx3QkFBd0IsQ0FBQTtBQVkvQjs7O0dBR0c7QUFDSSxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjs7YUFDYixrQkFBYSxHQUFHLHdCQUF3QixDQUFDLGtCQUFrQixFQUFFO1FBQzNFLFVBQVUsQ0FBQyxJQUFZO1lBQ3RCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztLQUNELENBQUMsQUFKMEIsQ0FJMUI7SUFFRixZQUNrQixRQUFrQyxFQUNoQixnQkFBa0MsRUFDcEMsY0FBOEI7UUFGOUMsYUFBUSxHQUFSLFFBQVEsQ0FBMEI7UUFDaEIscUJB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