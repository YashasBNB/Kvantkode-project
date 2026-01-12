/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { matchesSomeScheme, Schemas } from '../../../../base/common/network.js';
import { registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ReferencesModel } from './referencesModel.js';
function shouldIncludeLocationLink(sourceModel, loc) {
    // Always allow the location if the request comes from a document with the same scheme.
    if (loc.uri.scheme === sourceModel.uri.scheme) {
        return true;
    }
    // Otherwise filter out locations from internal schemes
    if (matchesSomeScheme(loc.uri, Schemas.walkThroughSnippet, Schemas.vscodeChatCodeBlock, Schemas.vscodeChatCodeCompareBlock)) {
        return false;
    }
    return true;
}
async function getLocationLinks(model, position, registry, recursive, provide) {
    const provider = registry.ordered(model, recursive);
    // get results
    const promises = provider.map((provider) => {
        return Promise.resolve(provide(provider, model, position)).then(undefined, (err) => {
            onUnexpectedExternalError(err);
            return undefined;
        });
    });
    const values = await Promise.all(promises);
    return coalesce(values.flat()).filter((loc) => shouldIncludeLocationLink(model, loc));
}
export function getDefinitionsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideDefinition(model, position, token);
    });
}
export function getDeclarationsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideDeclaration(model, position, token);
    });
}
export function getImplementationsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideImplementation(model, position, token);
    });
}
export function getTypeDefinitionsAtPosition(registry, model, position, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, (provider, model, position) => {
        return provider.provideTypeDefinition(model, position, token);
    });
}
export function getReferencesAtPosition(registry, model, position, compact, recursive, token) {
    return getLocationLinks(model, position, registry, recursive, async (provider, model, position) => {
        const result = (await provider.provideReferences(model, position, { includeDeclaration: true }, token))?.filter((ref) => shouldIncludeLocationLink(model, ref));
        if (!compact || !result || result.length !== 2) {
            return result;
        }
        const resultWithoutDeclaration = (await provider.provideReferences(model, position, { includeDeclaration: false }, token))?.filter((ref) => shouldIncludeLocationLink(model, ref));
        if (resultWithoutDeclaration && resultWithoutDeclaration.length === 1) {
            return resultWithoutDeclaration;
        }
        return result;
    });
}
// -- API commands ----
async function _sortedAndDeduped(callback) {
    const rawLinks = await callback();
    const model = new ReferencesModel(rawLinks, '');
    const modelLinks = model.references.map((ref) => ref.link);
    model.dispose();
    return modelLinks;
}
registerModelAndPositionCommand('_executeDefinitionProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDefinitionProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDefinitionsAtPosition(languageFeaturesService.definitionProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeTypeDefinitionProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeTypeDefinitionProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getTypeDefinitionsAtPosition(languageFeaturesService.typeDefinitionProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDeclarationProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeDeclarationProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getDeclarationsAtPosition(languageFeaturesService.declarationProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeReferenceProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeReferenceProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getReferencesAtPosition(languageFeaturesService.referenceProvider, model, position, false, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeImplementationProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, false, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
registerModelAndPositionCommand('_executeImplementationProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const promise = getImplementationsAtPosition(languageFeaturesService.implementationProvider, model, position, true, CancellationToken.None);
    return _sortedAndDeduped(() => promise);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub1N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZ290b1N5bWJvbC9icm93c2VyL2dvVG9TeW1ib2wudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQWF0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFFdEQsU0FBUyx5QkFBeUIsQ0FBQyxXQUF1QixFQUFFLEdBQWlCO0lBQzVFLHVGQUF1RjtJQUN2RixJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxLQUFLLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDL0MsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsdURBQXVEO0lBQ3ZELElBQ0MsaUJBQWlCLENBQ2hCLEdBQUcsQ0FBQyxHQUFHLEVBQ1AsT0FBTyxDQUFDLGtCQUFrQixFQUMxQixPQUFPLENBQUMsbUJBQW1CLEVBQzNCLE9BQU8sQ0FBQywwQkFBMEIsQ0FDbEMsRUFDQSxDQUFDO1FBQ0YsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsS0FBSyxVQUFVLGdCQUFn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