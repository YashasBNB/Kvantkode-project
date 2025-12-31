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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdE1hcmtkb3duUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdE1hcmtkb3duUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFFbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBR04sZ0JBQWdCLEdBQ2hCLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRWpGLE1BQU0sZUFBZSxHQUFHO0lBQ3ZCLEdBQUc7SUFDSCxZQUFZO0lBQ1osSUFBSTtJQUNKLE1BQU07SUFDTixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLElBQUk7SUFDSixJQUFJO0lBQ0osSUFBSTtJQUNKLEdBQUc7SUFDSCxJQUFJO0lBQ0osSUFBSTtJQUNKLEdBQUc7SUFDSCxLQUFL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