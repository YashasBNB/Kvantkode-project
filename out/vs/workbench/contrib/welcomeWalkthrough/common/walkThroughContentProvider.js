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
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import * as marked from '../../../../base/common/marked/marked.js';
import { Schemas } from '../../../../base/common/network.js';
import { Range } from '../../../../editor/common/core/range.js';
import { createTextBufferFactory } from '../../../../editor/common/model/textModel.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
class WalkThroughContentProviderRegistry {
    constructor() {
        this.providers = new Map();
    }
    registerProvider(moduleId, provider) {
        this.providers.set(moduleId, provider);
    }
    getProvider(moduleId) {
        return this.providers.get(moduleId);
    }
}
export const walkThroughContentRegistry = new WalkThroughContentProviderRegistry();
export async function moduleToContent(instantiationService, resource) {
    if (!resource.query) {
        throw new Error('Walkthrough: invalid resource');
    }
    const query = JSON.parse(resource.query);
    if (!query.moduleId) {
        throw new Error('Walkthrough: invalid resource');
    }
    const provider = walkThroughContentRegistry.getProvider(query.moduleId);
    if (!provider) {
        throw new Error(`Walkthrough: no provider registered for ${query.moduleId}`);
    }
    return instantiationService.invokeFunction(provider);
}
let WalkThroughSnippetContentProvider = class WalkThroughSnippetContentProvider {
    static { this.ID = 'workbench.contrib.walkThroughSnippetContentProvider'; }
    constructor(textModelResolverService, languageService, modelService, instantiationService) {
        this.textModelResolverService = textModelResolverService;
        this.languageService = languageService;
        this.modelService = modelService;
        this.instantiationService = instantiationService;
        this.loads = new Map();
        this.textModelResolverService.registerTextModelContentProvider(Schemas.walkThroughSnippet, this);
    }
    async textBufferFactoryFromResource(resource) {
        let ongoing = this.loads.get(resource.toString());
        if (!ongoing) {
            ongoing = moduleToContent(this.instantiationService, resource)
                .then((content) => createTextBufferFactory(content))
                .finally(() => this.loads.delete(resource.toString()));
            this.loads.set(resource.toString(), ongoing);
        }
        return ongoing;
    }
    async provideTextContent(resource) {
        const factory = await this.textBufferFactoryFromResource(resource.with({ fragment: '' }));
        let codeEditorModel = this.modelService.getModel(resource);
        if (!codeEditorModel) {
            const j = parseInt(resource.fragment);
            let i = 0;
            const renderer = new marked.marked.Renderer();
            renderer.code = ({ text, lang }) => {
                i++;
                const languageId = typeof lang === 'string'
                    ? this.languageService.getLanguageIdByLanguageName(lang) || ''
                    : '';
                const languageSelection = this.languageService.createById(languageId);
                // Create all models for this resource in one go... we'll need them all and we don't want to re-parse markdown each time
                const model = this.modelService.createModel(text, languageSelection, resource.with({ fragment: `${i}.${lang}` }));
                if (i === j) {
                    codeEditorModel = model;
                }
                return '';
            };
            const textBuffer = factory.create(1 /* DefaultEndOfLine.LF */).textBuffer;
            const lineCount = textBuffer.getLineCount();
            const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
            const markdown = textBuffer.getValueInRange(range, 0 /* EndOfLinePreference.TextDefined */);
            marked.marked(markdown, { renderer });
        }
        return assertIsDefined(codeEditorModel);
    }
};
WalkThroughSnippetContentProvider = __decorate([
    __param(0, ITextModelService),
    __param(1, ILanguageService),
    __param(2, IModelService),
    __param(3, IInstantiationService)
], WalkThroughSnippetContentProvider);
export { WalkThroughSnippetContentProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lV2Fsa3Rocm91Z2gvY29tbW9uL3dhbGtUaHJvdWdoQ29udGVudFByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFPM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFbEYsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFNbkUsTUFBTSxrQ0FBa0M7SUFBeEM7UUFDa0IsY0FBUyxHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO0lBUzVFLENBQUM7SUFQQSxnQkFBZ0IsQ0FBQyxRQUFnQixFQUFFLFFBQXFDO1FBQ3ZFLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsV0FBVyxDQUFDLFFBQWdCO1FBQzNCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7SUFD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