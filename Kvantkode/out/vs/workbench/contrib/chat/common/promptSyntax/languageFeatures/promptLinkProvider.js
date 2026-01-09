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
