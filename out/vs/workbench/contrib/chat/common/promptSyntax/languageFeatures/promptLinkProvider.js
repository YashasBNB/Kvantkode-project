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
import { LANGUAGE_SELECTOR } from '../constants.js';
import { IPromptsService } from '../service/types.js';
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { FolderReference, NotPromptFile } from '../../promptFileReferenceErrors.js';
import { Extensions } from '../../../../../common/contributions.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
/**
 * Provides link references for prompt files.
 */
let PromptLinkProvider = class PromptLinkProvider extends Disposable {
    constructor(promptsService, languageService) {
        super();
        this.promptsService = promptsService;
        this.languageService = languageService;
        this._register(this.languageService.linkProvider.register(LANGUAGE_SELECTOR, this));
    }
    /**
     * Provide list of links for the provided text model.
     */
    async provideLinks(model, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const parser = this.promptsService.getSyntaxParserFor(model);
        assert(!parser.disposed, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const { references } = await parser.start().settled();
        // validate that the cancellation was not yet requested
        assert(!token.isCancellationRequested, new CancellationError());
        // filter out references that are not valid links
        const links = references
            .filter((reference) => {
            const { errorCondition, linkRange } = reference;
            if (!errorCondition && linkRange) {
                return true;
            }
            // don't provide links for folder references
            if (errorCondition instanceof FolderReference) {
                return false;
            }
            return errorCondition instanceof NotPromptFile;
        })
            .map((reference) => {
            const { uri, linkRange } = reference;
            // must always be true because of the filter above
            assertDefined(linkRange, 'Link range must be defined.');
            return {
                range: linkRange,
                url: uri,
            };
        });
        return {
            links,
        };
    }
};
PromptLinkProvider = __decorate([
    __param(0, IPromptsService),
    __param(1, ILanguageFeaturesService)
], PromptLinkProvider);
export { PromptLinkProvider };
// register the provider as a workbench contribution
Registry.as(Extensions.Workbench).registerWorkbenchContribution(PromptLinkProvider, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlRmVhdHVyZXMvcHJvbXB0TGlua1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUduRixPQUFPLEVBQW1DLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRXZHOztHQUVHO0FBQ0ksSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBQ2pELFlBQ21DLGNBQStCLEVBQ3RCLGVBQXlDO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSDJCLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUN0QixvQkFBZSxHQUFmLGVBQWUsQ0FBMEI7UUFJcEYsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtJQUNwRixDQUFDO0lBRUQ7O09BRUc7SUFDSSxLQUFLLENBQUMsWUFBWSxDQUFDLEtBQWlCLEVBQUUsS0FBd0I7UUFDcEUsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxxQ0FBcUMsQ0FBQyxDQUFBO1FBRS9ELG1EQUFtRDtRQUNuRCw4Q0FBOEM7UUFDOUMsTUFBTSxFQUFFLFVBQVUsRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXJELHVEQUF1RDtRQUN2RCxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFFL0QsaURBQWlEO1FBQ2pELE1BQU0sS0FBSyxHQUFZLFVBQVU7YUFDL0IsTUFBTSxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDckIsTUFBTSxFQUFFLGNBQWMsRUFBRSxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUE7WUFDL0MsSUFBSSxDQUFDLGNBQWMsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBRUQsNENBQTRDO1lBQzVDLElBQUksY0FBYyxZQUFZLGVBQWUsRUFBRSxDQUFDO2dCQUMvQyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7WUFFRCxPQUFPLGNBQWMsWUFBWSxhQUFhLENBQUE7UUFDL0MsQ0FBQyxDQUFDO2FBQ0QsR0FBRyxDQUFDLENBQUMsU0FBUyxFQUFFLEVBQUU7WUFDbEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxTQUFTLENBQUE7WUFFcEMsa0RBQWtEO1lBQ2xELGFBQWEsQ0FBQyxTQUFTLEVBQUUsNkJBQTZCLENBQUMsQ0FBQTtZQUV2RCxPQUFPO2dCQUNOLEtBQUssRUFBRSxTQUFTO2dCQUNoQixHQUFHLEVBQUUsR0FBRzthQUNSLENBQUE7UUFDRixDQUFDLENBQUMsQ0FBQTtRQUVILE9BQU87WUFDTixLQUFLO1NBQ0wsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBekRZLGtCQUFrQjtJQUU1QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsd0JBQXdCLENBQUE7R0FIZCxrQkFBa0IsQ0F5RDlCOztBQUVELG9EQUFvRDtBQUNwRCxRQUFRLENBQUMsRUFBRSxDQUFrQyxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsNkJBQTZCLENBQy9GLGtCQUFrQixvQ0FFbEIsQ0FBQSJ9