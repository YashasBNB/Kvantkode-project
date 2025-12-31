/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../common/services/model.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { assertType } from '../../../../base/common/types.js';
import { encodeSemanticTokensDto } from '../../../common/services/semanticTokensDto.js';
import { Range } from '../../../common/core/range.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export function isSemanticTokens(v) {
    return v && !!v.data;
}
export function isSemanticTokensEdits(v) {
    return v && Array.isArray(v.edits);
}
export class DocumentSemanticTokensResult {
    constructor(provider, tokens, error) {
        this.provider = provider;
        this.tokens = tokens;
        this.error = error;
    }
}
export function hasDocumentSemanticTokensProvider(registry, model) {
    return registry.has(model);
}
function getDocumentSemanticTokensProviders(registry, model) {
    const groups = registry.orderedGroups(model);
    return groups.length > 0 ? groups[0] : [];
}
export async function getDocumentSemanticTokens(registry, model, lastProvider, lastResultId, token) {
    const providers = getDocumentSemanticTokensProviders(registry, model);
    // Get tokens from all providers at the same time.
    const results = await Promise.all(providers.map(async (provider) => {
        let result;
        let error = null;
        try {
            result = await provider.provideDocumentSemanticTokens(model, provider === lastProvider ? lastResultId : null, token);
        }
        catch (err) {
            error = err;
            result = null;
        }
        if (!result || (!isSemanticTokens(result) && !isSemanticTokensEdits(result))) {
            result = null;
        }
        return new DocumentSemanticTokensResult(provider, result, error);
    }));
    // Try to return the first result with actual tokens or
    // the first result which threw an error (!!)
    for (const result of results) {
        if (result.error) {
            throw result.error;
        }
        if (result.tokens) {
            return result;
        }
    }
    // Return the first result, even if it doesn't have tokens
    if (results.length > 0) {
        return results[0];
    }
    return null;
}
function _getDocumentSemanticTokensProviderHighestGroup(registry, model) {
    const result = registry.orderedGroups(model);
    return result.length > 0 ? result[0] : null;
}
class DocumentRangeSemanticTokensResult {
    constructor(provider, tokens) {
        this.provider = provider;
        this.tokens = tokens;
    }
}
export function hasDocumentRangeSemanticTokensProvider(providers, model) {
    return providers.has(model);
}
function getDocumentRangeSemanticTokensProviders(providers, model) {
    const groups = providers.orderedGroups(model);
    return groups.length > 0 ? groups[0] : [];
}
export async function getDocumentRangeSemanticTokens(registry, model, range, token) {
    const providers = getDocumentRangeSemanticTokensProviders(registry, model);
    // Get tokens from all providers at the same time.
    const results = await Promise.all(providers.map(async (provider) => {
        let result;
        try {
            result = await provider.provideDocumentRangeSemanticTokens(model, range, token);
        }
        catch (err) {
            onUnexpectedExternalError(err);
            result = null;
        }
        if (!result || !isSemanticTokens(result)) {
            result = null;
        }
        return new DocumentRangeSemanticTokensResult(provider, result);
    }));
    // Try to return the first result with actual tokens
    for (const result of results) {
        if (result.tokens) {
            return result;
        }
    }
    // Return the first result, even if it doesn't have tokens
    if (results.length > 0) {
        return results[0];
    }
    return null;
}
CommandsRegistry.registerCommand('_provideDocumentSemanticTokensLegend', async (accessor, ...args) => {
    const [uri] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const providers = _getDocumentSemanticTokensProviderHighestGroup(documentSemanticTokensProvider, model);
    if (!providers) {
        // there is no provider => fall back to a document range semantic tokens provider
        return accessor
            .get(ICommandService)
            .executeCommand('_provideDocumentRangeSemanticTokensLegend', uri);
    }
    return providers[0].getLegend();
});
CommandsRegistry.registerCommand('_provideDocumentSemanticTokens', async (accessor, ...args) => {
    const [uri] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    if (!hasDocumentSemanticTokensProvider(documentSemanticTokensProvider, model)) {
        // there is no provider => fall back to a document range semantic tokens provider
        return accessor
            .get(ICommandService)
            .executeCommand('_provideDocumentRangeSemanticTokens', uri, model.getFullModelRange());
    }
    const r = await getDocumentSemanticTokens(documentSemanticTokensProvider, model, null, null, CancellationToken.None);
    if (!r) {
        return undefined;
    }
    const { provider, tokens } = r;
    if (!tokens || !isSemanticTokens(tokens)) {
        return undefined;
    }
    const buff = encodeSemanticTokensDto({
        id: 0,
        type: 'full',
        data: tokens.data,
    });
    if (tokens.resultId) {
        provider.releaseDocumentSemanticTokens(tokens.resultId);
    }
    return buff;
});
CommandsRegistry.registerCommand('_provideDocumentRangeSemanticTokensLegend', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(uri instanceof URI);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentRangeSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const providers = getDocumentRangeSemanticTokensProviders(documentRangeSemanticTokensProvider, model);
    if (providers.length === 0) {
        // no providers
        return undefined;
    }
    if (providers.length === 1) {
        // straight forward case, just a single provider
        return providers[0].getLegend();
    }
    if (!range || !Range.isIRange(range)) {
        // if no range is provided, we cannot support multiple providers
        // as we cannot fall back to the one which would give results
        // => return the first legend for backwards compatibility and print a warning
        console.warn(`provideDocumentRangeSemanticTokensLegend might be out-of-sync with provideDocumentRangeSemanticTokens unless a range argument is passed in`);
        return providers[0].getLegend();
    }
    const result = await getDocumentRangeSemanticTokens(documentRangeSemanticTokensProvider, model, Range.lift(range), CancellationToken.None);
    if (!result) {
        return undefined;
    }
    return result.provider.getLegend();
});
CommandsRegistry.registerCommand('_provideDocumentRangeSemanticTokens', async (accessor, ...args) => {
    const [uri, range] = args;
    assertType(uri instanceof URI);
    assertType(Range.isIRange(range));
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        return undefined;
    }
    const { documentRangeSemanticTokensProvider } = accessor.get(ILanguageFeaturesService);
    const result = await getDocumentRangeSemanticTokens(documentRangeSemanticTokensProvider, model, Range.lift(range), CancellationToken.None);
    if (!result || !result.tokens) {
        // there is no provider or it didn't return tokens
        return undefined;
    }
    return encodeSemanticTokensDto({
        id: 0,
        type: 'full',
        data: result.tokens.data,
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zZW1hbnRpY1Rva2Vucy9jb21tb24vZ2V0U2VtYW50aWNUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBU3BELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTdELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV2RixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsQ0FBdUM7SUFDdkUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFrQixDQUFFLENBQUMsSUFBSSxDQUFBO0FBQ3ZDLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLENBQXVDO0lBRXZDLE9BQU8sQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQXVCLENBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUMxRCxDQUFDO0FBRUQsTUFBTSxPQUFPLDRCQUE0QjtJQUN4QyxZQUNpQixRQUF3QyxFQUN4QyxNQUFtRCxFQUNuRCxLQUFVO1FBRlYs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