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
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { MarkdownRenderer, } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { REVEAL_IN_EXPLORER_COMMAND_ID } from '../../files/browser/fileConstants.js';
import { ITrustedDomainService } from '../../url/browser/trustedDomainService.js';
const allowedHtmlTags = [
    'b',
    'blockquote',
    'br',
    'code',
    'em',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'hr',
    'i',
    'li',
    'ol',
    'p',
    'pre',
    'strong',
    'sub',
    'sup',
    'table',
    'tbody',
    'td',
    'th',
    'thead',
    'tr',
    'ul',
    'a',
    'img',
    // TODO@roblourens when we sanitize attributes in markdown source, we can ban these elements at that step. microsoft/vscode-copilot#5091
    // Not in the official list, but used for codicons and other vscode markdown extensions
    'span',
    'div',
];
/**
 * This wraps the MarkdownRenderer and applies sanitizer options needed for Chat.
 */
let ChatMarkdownRenderer = class ChatMarkdownRenderer extends MarkdownRenderer {
    constructor(options, languageService, openerService, trustedDomainService, hoverService, fileService, commandService) {
        super(options ?? {}, languageService, openerService);
        this.trustedDomainService = trustedDomainService;
        this.hoverService = hoverService;
        this.fileService = fileService;
        this.commandService = commandService;
    }
    render(markdown, options, markedOptions) {
        options = {
            ...options,
            remoteImageIsAllowed: (uri) => this.trustedDomainService.isValid(uri),
            sanitizerOptions: {
                replaceWithPlaintext: true,
                allowedTags: allowedHtmlTags,
            },
        };
        const mdWithBody = markdown && markdown.supportHtml
            ? {
                ...markdown,
                // dompurify uses DOMParser, which strips leading comments. Wrapping it all in 'body' prevents this.
                // The \n\n prevents marked.js from parsing the body contents as just text in an 'html' token, instead of actual markdown.
                value: `<body>\n\n${markdown.value}</body>`,
            }
            : markdown;
        const result = super.render(mdWithBody, options, markedOptions);
        return this.attachCustomHover(result);
    }
    attachCustomHover(result) {
        const store = new DisposableStore();
        result.element.querySelectorAll('a').forEach((element) => {
            if (element.title) {
                const title = element.title;
                element.title = '';
                store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), element, title));
            }
        });
        return {
            element: result.element,
            dispose: () => {
                result.dispose();
                store.dispose();
            },
        };
    }
    async openMarkdownLink(link, markdown) {
        try {
            const uri = URI.parse(link);
            if ((await this.fileService.stat(uri)).isDirectory) {
                return this.commandService.executeCommand(REVEAL_IN_EXPLORER_COMMAND_ID, uri);
            }
        }
        catch {
            // noop
        }
        return super.openMarkdownLink(link, markdown);
    }
};
ChatMarkdownRenderer = __decorate([
    __param(1, ILanguageService),
    __param(2, IOpenerService),
    __param(3, ITrustedDomainService),
    __param(4, IHoverService),
    __param(5, IFileService),
    __param(6, ICommandService)
], ChatMarkdownRenderer);
export { ChatMarkdownRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0TWFya2Rvd25SZW5kZXJlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUVuRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFHTixnQkFBZ0IsR0FDaEIsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFakYsTUFBTSxlQUFlLEdBQUc7SUFDdkIsR0FBRztJQUNILFlBQVk7SUFDWixJQUFJO0lBQ0osTUFBTTtJQUNOLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osR0FBRztJQUNILElBQUk7SUFDSixJQUFJO0lBQ0osR0FBRztJQUNI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