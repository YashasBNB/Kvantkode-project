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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmV0Y2hQYWdlVG9vbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvZWxlY3Ryb24tc2FuZGJveC90b29scy9mZXRjaFBhZ2VUb29sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMkVBQTJFLENBQUE7QUFDdkgsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFVcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLG9CQUFvQixHQUFjO0lBQzlDLEVBQUUsRUFBRSwwQkFBMEI7SUFDOUIsV0FBVyxFQUFFLGdCQUFnQjtJQUM3Qix1QkFBdUIsRUFBRSxLQUFLO0lBQzlCLGdCQUFnQixFQUFFLFFBQVEsQ0FDekIsK0JBQStCLEVBQy9CLHNIQUFzSCxDQUN0SDtJQUNELE1BQU0sRUFBRSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUU7SUFDNUIsV0FBVyxFQUFFO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxVQUFVLEVBQUU7WUFDWCxJQUFJLEVBQUU7Z0JBQ0wsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO2lCQUNkO2dCQUNELFdBQVcsRUFBRSxRQUFRLENBQ3BCLDhCQUE4QixFQUM5Qix5Q0FBeUMsQ0FDekM7YUFDRDtTQUNEO1FBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxDQUFDO0tBQ2xCO0NBQ0QsQ0FBQTtBQUVNLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBRzVCLFlBQzhCLGtCQUFnRSxFQUN0RSxxQkFBNkQ7UUFEdEMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUE2QjtRQUNyRCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBSjdFLDRCQUF1QixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7SUFLaEQsQ0FBQztJQUVKLEtBQUssQ0FBQyxNQUFNLENBQ1gsVUFBMkIsRUFDM0IsWUFBaUMsRUFDakMsTUFBeUI7UUFFekIsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFFLFVBQVUsQ0FBQyxVQUFrQyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzdGLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQWMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU87Z0JBQ04sT0FBTyxFQUFFO29CQUNSLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsUUFBUSxDQUFDLDBCQUEwQixFQUFFLHlCQUF5QixDQUFDLEVBQUU7aUJBQ3hGO2FBQ0QsQ0FBQTtRQUNGLENBQUM7UUFFRCxpRkFBaUY7UUFDakYsMkRBQTJEO1FBQzNELEtBQUssTUFBTSxHQUFHLElBQUksU0FBUyxFQUFFLENBQUM7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDOUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDckQsQ0FBQztRQUNGLENBQUM7UUFFRCxNQUFNLFFBQVEsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDakUsK0VBQStFO1FBQy9FLE1BQU0scUJBQXFCLEdBQTJCLEVBQUUsQ0FBQTtRQUN4RCxJQUFJLGVBQWUsR0FBRyxDQUFDLENBQUE7UUFDdkIsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDaEMsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDVCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUE7Z0JBQ3JELGVBQWUsRUFBRSxDQUFBO1lBQ2xCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDdEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMseUJBQXlCLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFBO0lBQzFFLENBQUM7SUFFRCxLQUFLLENBQUMscUJBQXFCLENBQzFCLFVBQWUsRUFDZixLQUF3QjtRQUV4QixNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxNQUFNLE9BQU8sR0FBRyxJQUFJLEtBQUssRUFBVSxDQUFBO1FBQ25DLE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFPLENBQUE7UUFDOUIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUN4QixJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7Z0JBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNsQixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixNQUFNLHVCQUF1QixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQzNDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FDUCxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQ3hDLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQ3RELENBQUE7UUFFRCxNQUFNLGdCQUFnQixHQUFHLE9BQU8sQ0FBQyxNQUFNO1lBQ3RDLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ25CLENBQUMsQ0FBQyxvREFBb0Q7b0JBQ3JELElBQUksY0FBYyxDQUNqQixRQUFRLENBQ1Asc0NBQXNDLEVBQ3RDLHdFQUF3RSxFQUN4RSxLQUFLLENBQUMsTUFBTSxFQUNaLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQzNDLENBQ0Q7Z0JBQ0YsQ0FBQyxDQUFDLDRDQUE0QztvQkFDN0MsSUFBSSxjQUFjLENBQ2pCLFFBQVEsQ0FDUCx3Q0FBd0MsRUFDeEMsb0VBQW9FLEVBQ3BFLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FDVixDQUNEO1lBQ0gsQ0FBQyxDQUFDLGtCQUFrQjtnQkFDbkIsSUFBSSxjQUFjLEVBQUUsQ0FBQTtRQUV0QixNQUFNLGlCQUFpQixHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDOUMsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3RCLGdCQUFnQixDQUFDLGNBQWMsQ0FDOUIsUUFBUSxDQUNQLDRDQUE0QyxFQUM1Qyx1QkFBdUIsRUFDdkIsS0FBSyxDQUFDLE1BQU0sQ0FDWixDQUNELENBQUE7WUFDRCxpQkFBaUIsQ0FBQyxjQUFjLENBQy9CLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSx3QkFBd0IsRUFBRSxLQUFLLENBQUMsTUFBTSxDQUFDLENBQ3pGLENBQUE7UUFDRixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQixnRkFBZ0Y7WUFDaEYsSUFBSSxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsRUFBRSxDQUFDO2dCQUN0QixnQkFBZ0IsQ0FBQyxjQUFjLENBQzlCLFFBQVEsQ0FDUDtvQkFDQyxHQUFHLEVBQUUsb0RBQW9EO29CQUN6RCxPQUFPLEVBQUU7d0JBQ1IsdUNBQXVDO3dCQUN2QyxtQkFBbUI7cUJBQ25CO2lCQUNELEVBQ0QseUJBQXlCLEVBQ3pCLEdBQUcsQ0FDSCxDQUNELENBQUE7Z0JBQ0QsaUJBQWlCLENBQUMsY0FBYyxDQUMvQixRQUFRLENBQ1A7b0JBQ0MsR0FBRyxFQUFFLCtDQUErQztvQkFDcEQsT0FBTyxFQUFFO3dCQUNSLHVDQUF1Qzt3QkFDdkMsbUJBQW1CO3FCQUNuQjtpQkFDRCxFQUNELDBCQUEwQixFQUMxQixHQUFHLENBQ0gsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGdCQUFnQixDQUFDLGNBQWMsQ0FDOUIsUUFBUSxDQUFDLDhDQUE4QyxFQUFFLGFBQWEsRUFBRSxHQUFHLENBQUMsQ0FDNUUsQ0FBQTtnQkFDRCxpQkFBaUIsQ0FBQyxjQUFjLENBQy9CLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSxjQUFjLEVBQUUsR0FBRyxDQUFDLENBQ3hFLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUE0QixFQUFFLGlCQUFpQixFQUFFLGdCQUFnQixFQUFFLENBQUE7UUFDL0UsSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNwQyxNQUFNLGlCQUFpQixHQUN0Qix1QkFBdUIsQ0FBQyxNQUFNLEdBQUcsQ0FBQztnQkFDakMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx1Q0FBdUMsRUFBRSw0QkFBNEIsQ0FBQztnQkFDakYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyx5Q0FBeUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBO1lBRXBGLE1BQU0sNEJBQTRCLEdBQUcsc0NBQXNDLENBQUE7WUFDM0UsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLGNBQWMsQ0FDN0MsdUJBQXVCLENBQUMsTUFBTSxHQUFHLENBQUM7Z0JBQ2pDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLEtBQUssR0FBRyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO2dCQUN4RSxDQUFDLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQ3hDO2dCQUNDLFNBQVMsRUFBRSxFQUFFLGVBQWUsRUFBRSxDQUFDLDRCQUE0QixDQUFDLEVBQUU7Z0JBQzlELGlCQUFpQixFQUFFLElBQUk7YUFDdkIsQ0FDRCxDQUFBO1lBRUQsbUJBQW1CLENBQUMsY0FBYyxDQUNqQyxjQUFjO2dCQUNiLFFBQVEsQ0FDUCxzREFBc0QsRUFDdEQscUZBQXFGLEVBQ3JGLFdBQVcsNEJBQTRCLEVBQUUsQ0FDekMsQ0FDRixDQUFBO1lBRUQsTUFBTSxDQUFDLG9CQUFvQixHQUFHO2dCQUM3QixLQUFLLEVBQUUsaUJBQWlCO2dCQUN4QixPQUFPLEVBQUUsbUJBQW1CO2dCQUM1QixnQkFBZ0IsRUFBRSxLQUFLO2FBQ3ZCLENBQUE7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sVUFBVSxDQUFDLElBQWU7UUFDakMsTUFBTSxPQUFPLEdBQUcsSUFBSSxHQUFHLEVBQTJCLENBQUE7UUFDbEQsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ3JCLElBQUksQ0FBQztnQkFDSixNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO2dCQUM3QixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6QixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUM1QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFDRixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyx5QkFBeUIsQ0FBQyxPQUErQjtRQUNoRSxPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDOUIsSUFBSSxFQUFFLE1BQU07WUFDWixLQUFLLEVBQUUsS0FBSyxJQUFJLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxhQUFhLENBQUM7U0FDbEUsQ0FBQyxDQUFDLENBQUE7SUFDSixDQUFDO0NBQ0QsQ0FBQTtBQXJNWSxnQkFBZ0I7SUFJMUIsV0FBQSwyQkFBMkIsQ0FBQTtJQUMzQixXQUFBLHFCQUFxQixDQUFBO0dBTFgsZ0JBQWdCLENBcU01QiJ9