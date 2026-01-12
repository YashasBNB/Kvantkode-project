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
import { localize } from '../../../../../nls.js';
import { URI } from '../../../../../base/common/uri.js';
import { IWebContentExtractorService } from '../../../../../platform/webContentExtractor/common/webContentExtractor.js';
import { ITrustedDomainService } from '../../../url/browser/trustedDomainService.js';
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { InternalFetchWebPageToolId } from '../../common/tools/tools.js';
export const FetchWebPageToolData = {
    id: InternalFetchWebPageToolId,
    displayName: 'Fetch Web Page',
    canBeReferencedInPrompt: false,
    modelDescription: localize('fetchWebPage.modelDescription', 'Fetches the main content from a web page. This tool is useful for summarizing or analyzing the content of a webpage.'),
    source: { type: 'internal' },
    inputSchema: {
        type: 'object',
        properties: {
            urls: {
                type: 'array',
                items: {
                    type: 'string',
                },
                description: localize('fetchWebPage.urlsDescription', 'An array of URLs to fetch content from.'),
            },
        },
        required: ['urls'],
    },
};
let FetchWebPageTool = class FetchWebPageTool {
    constructor(_readerModeService, _trustedDomainService) {
        this._readerModeService = _readerModeService;
        this._trustedDomainService = _trustedDomainService;
        this._alreadyApprovedDomains = new Set();
    }
    async invoke(invocation, _countTokens, _token) {
        const parsedUriResults = this._parseUris(invocation.parameters.urls);
        const validUris = Array.from(parsedUriResults.values()).filter((uri) => !!uri);
        if (!validUris.length) {
            return {
                content: [
                    { kind: 'text', value: localize('fetchWebPage.noValidUrls', 'No valid URLs provided.') },
                ],
            };
        }
        // We approved these via confirmation, so mark them as "approved" in this session
        // if they are not approved via the trusted domain service.
        for (const uri of validUris) {
            if (!this._trustedDomainService.isValid(uri)) {
                this._alreadyApprovedDomains.add(uri.toString(true));
            }
        }
        const contents = await this._readerModeService.extract(validUris);
        // Make an array that contains either the content or undefined for invalid URLs
        const contentsWithUndefined = [];
        let indexInContents = 0;
        parsedUriResults.forEach((uri) => {
            if (uri) {
                contentsWithUndefined.push(contents[indexInContents]);
                indexInContents++;
            }
            else {
                contentsWithUndefined.push(undefined);
            }
        });
        return { content: this._getPromptPartsForResults(contentsWithUndefined) };
    }
    async prepareToolInvocation(parameters, token) {
        const map = this._parseUris(parameters.urls);
        const invalid = new Array();
        const valid = new Array();
        map.forEach((uri, url) => {
            if (!uri) {
                invalid.push(url);
            }
            else {
                valid.push(uri);
            }
        });
        const urlsNeedingConfirmation = valid.filter((url) => !this._trustedDomainService.isValid(url) &&
            !this._alreadyApprovedDomains.has(url.toString(true)));
        const pastTenseMessage = invalid.length
            ? invalid.length > 1
                ? // If there are multiple invalid URLs, show them all
                    new MarkdownString(localize('fetchWebPage.pastTenseMessage.plural', 'Fetched {0} web pages, but the following were invalid URLs:\n\n{1}\n\n', valid.length, invalid.map((url) => `- ${url}`).join('\n')))
                : // If there is only one invalid URL, show it
                    new MarkdownString(localize('fetchWebPage.pastTenseMessage.singular', 'Fetched web page, but the following was an invalid URL:\n\n{0}\n\n', invalid[0]))
            : // No invalid URLs
                new MarkdownString();
        const invocationMessage = new MarkdownString();
        if (valid.length > 1) {
            pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.plural', 'Fetched {0} web pages', valid.length));
            invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.plural', 'Fetching {0} web pages', valid.length));
        }
        else {
            const url = valid[0].toString();
            // If the URL is too long, show it as a link... otherwise, show it as plain text
            if (url.length > 400) {
                pastTenseMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.pastTenseMessageResult.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ],
                }, 'Fetched [web page]({0})', url));
                invocationMessage.appendMarkdown(localize({
                    key: 'fetchWebPage.invocationMessage.singularAsLink',
                    comment: [
                        // Make sure the link syntax is correct
                        '{Locked="]({0})"}',
                    ],
                }, 'Fetching [web page]({0})', url));
            }
            else {
                pastTenseMessage.appendMarkdown(localize('fetchWebPage.pastTenseMessageResult.singular', 'Fetched {0}', url));
                invocationMessage.appendMarkdown(localize('fetchWebPage.invocationMessage.singular', 'Fetching {0}', url));
            }
        }
        const result = { invocationMessage, pastTenseMessage };
        if (urlsNeedingConfirmation.length) {
            const confirmationTitle = urlsNeedingConfirmation.length > 1
                ? localize('fetchWebPage.confirmationTitle.plural', 'Fetch untrusted web pages?')
                : localize('fetchWebPage.confirmationTitle.singular', 'Fetch untrusted web page?');
            const managedTrustedDomainsCommand = 'workbench.action.manageTrustedDomain';
            const confirmationMessage = new MarkdownString(urlsNeedingConfirmation.length > 1
                ? urlsNeedingConfirmation.map((uri) => `- ${uri.toString()}`).join('\n')
                : urlsNeedingConfirmation[0].toString(), {
                isTrusted: { enabledCommands: [managedTrustedDomainsCommand] },
                supportThemeIcons: true,
            });
            confirmationMessage.appendMarkdown('\n\n$(info) ' +
                localize('fetchWebPage.confirmationMessageManageTrustedDomains', 'You can [manage your trusted domains]({0}) to skip this confirmation in the future.', `command:${managedTrustedDomainsCommand}`));
            result.confirmationMessages = {
                title: confirmationTitle,
                message: confirmationMessage,
                allowAutoConfirm: false,
            };
        }
        return result;
    }
    _parseUris(urls) {
        const results = new Map();
        urls?.forEach((uri) => {
            try {
                const uriObj = URI.parse(uri);
                results.set(uri, uriObj);
            }
            catch (e) {
                results.set(uri, undefined);
            }
        });
        return results;
    }
    _getPromptPartsForResults(results) {
        return results.map((value) => ({
            kind: 'text',
            value: value || localize('fetchWebPage.invalidUrl', 'Invalid URL'),
        }));
    }
};
FetchWebPageTool = __decorate([
    __param(0, IWebContentExtractorService),
    __param(1, ITrustedDomainService)
], FetchWebPageTool);
export { FetchWebPageTool };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9lbGVjdHJvbi1zYW5kYm94L3Rvb2xzL2ZldGNoUGFnZVRvb2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUN2SCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQVVwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFeEUsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQWM7SUFDOUMsRUFBRSxFQUFFLDBCQUEwQjtJQUM5QixXQUFXLEVBQUUsZ0JBQWdCO0lBQzdCLHVCQUF1QixFQUFFLEtBQUs7SUFDOUIsZ0JBQWdCLEVBQUUsUUFBUSxDQUN6QiwrQkFBK0IsRUFDL0Isc0hBQXNILENBQ3RIO0lBQ0QsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRTtJQUM1QixXQUFXLEVBQUU7UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLFVBQVUsRUFBRTtZQUNYLElBQUksRUFBRTtnQkFDTCxJQUFJLEVBQUUsT0FBTztnQkFDYixLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFFBQVE7aUJBQ2Q7Z0JBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsOEJBQThCLEVBQzlCLHlDQUF5QyxDQUN6QzthQUNEO1NBQ0Q7UUFDRCxRQUFRLEVBQUUs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