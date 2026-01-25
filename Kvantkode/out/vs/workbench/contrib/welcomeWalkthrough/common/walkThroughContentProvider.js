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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Fsa1Rocm91Z2hDb250ZW50UHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVXYWxrdGhyb3VnaC9jb21tb24vd2Fsa1Rocm91Z2hDb250ZW50UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQU8zRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVsRixPQUFPLEtBQUssTUFBTSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQU1uRSxNQUFNLGtDQUFrQztJQUF4QztRQUNrQixjQUFTLEdBQUcsSUFBSSxHQUFHLEVBQXVDLENBQUE7SUFTNUUsQ0FBQztJQVBBLGdCQUFnQixDQUFDLFFBQWdCLEVBQUUsUUFBcUM7UUFDdkUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRCxXQUFXLENBQUMsUUFBZ0I7UUFDM0IsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0NBQ0Q7QUFDRCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxJQUFJLGtDQUFrQyxFQUFFLENBQUE7QUFFbEYsTUFBTSxDQUFDLEtBQUssVUFBVSxlQUFlLENBQ3BDLG9CQUEyQyxFQUMzQyxRQUFhO0lBRWIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNyQixNQUFNLElBQUksS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDckIsTUFBTSxJQUFJLEtBQUssQ0FBQywrQkFBK0IsQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFFRCxNQUFNLFFBQVEsR0FBRywwQkFBMEIsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO0lBQ3ZFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMsMkNBQTJDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQzdFLENBQUM7SUFFRCxPQUFPLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUNyRCxDQUFDO0FBRU0sSUFBTSxpQ0FBaUMsR0FBdkMsTUFBTSxpQ0FBaUM7YUFHN0IsT0FBRSxHQUFHLHFEQUFxRCxBQUF4RCxDQUF3RDtJQUkxRSxZQUNvQix3QkFBNEQsRUFDN0QsZUFBa0QsRUFDckQsWUFBNEMsRUFDcEMsb0JBQTREO1FBSC9DLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBbUI7UUFDNUMsb0JBQWUsR0FBZixlQUFlLENBQWtCO1FBQ3BDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFONUUsVUFBSyxHQUFHLElBQUksR0FBRyxFQUF1QyxDQUFBO1FBUTdELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDakcsQ0FBQztJQUVPLEtBQUssQ0FBQyw2QkFBNkIsQ0FBQyxRQUFhO1FBQ3hELElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ2pELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNkLE9BQU8sR0FBRyxlQUFlLENBQUMsSUFBSSxDQUFDLG9CQUFvQixFQUFFLFFBQVEsQ0FBQztpQkFDNUQsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQztpQkFDbkQsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDdkQsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBQzdDLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTSxLQUFLLENBQUMsa0JBQWtCLENBQUMsUUFBYTtRQUM1QyxNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RixJQUFJLGVBQWUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNyQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDVCxNQUFNLFFBQVEsR0FBRyxJQUFJLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUE7WUFDN0MsUUFBUSxDQUFDLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBc0IsRUFBRSxFQUFFO2dCQUN0RCxDQUFDLEVBQUUsQ0FBQTtnQkFDSCxNQUFNLFVBQVUsR0FDZixPQUFPLElBQUksS0FBSyxRQUFRO29CQUN2QixDQUFDLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFO29CQUM5RCxDQUFDLENBQUMsRUFBRSxDQUFBO2dCQUNOLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3JFLHdIQUF3SDtnQkFDeEgsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQzFDLElBQUksRUFDSixpQkFBaUIsRUFDakIsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQzNDLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ2IsZUFBZSxHQUFHLEtBQUssQ0FBQTtnQkFDeEIsQ0FBQztnQkFDRCxPQUFPLEVBQUUsQ0FBQTtZQUNWLENBQUMsQ0FBQTtZQUNELE1BQU0sVUFBVSxHQUFHLE9BQU8sQ0FBQyxNQUFNLDZCQUFxQixDQUFDLFVBQVUsQ0FBQTtZQUNqRSxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDM0MsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxTQUFTLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNqRixNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsZUFBZSxDQUFDLEtBQUssMENBQWtDLENBQUE7WUFDbkYsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFDRCxPQUFPLGVBQWUsQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUN4QyxDQUFDOztBQTNEVyxpQ0FBaUM7SUFRM0MsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtHQVhYLGlDQUFpQyxDQTREN0MifQ==