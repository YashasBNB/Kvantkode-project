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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ29Ub1N5bWJvbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2dvdG9TeW1ib2wvYnJvd3Nlci9nb1RvU3ltYm9sLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0UsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFhdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBRXRELFNBQVMseUJBQXlCLENBQUMsV0FBdUIsRUFBRSxHQUFpQjtJQUM1RSx1RkFBdUY7SUFDdkYsSUFBSSxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sS0FBSyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQy9DLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELHVEQUF1RDtJQUN2RCxJQUNDLGlCQUFpQixDQUNoQixHQUFHLENBQUMsR0FBRyxFQUNQLE9BQU8sQ0FBQyxrQkFBa0IsRUFDMUIsT0FBTyxDQUFDLG1CQUFtQixFQUMzQixPQUFPLENBQUMsMEJBQTBCLENBQ2xDLEVBQ0EsQ0FBQztRQUNGLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELEtBQUssVUFBVSxnQkFBZ0IsQ0FD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