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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0U2VtYW50aWNUb2tlbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3NlbWFudGljVG9rZW5zL2NvbW1vbi9nZXRTZW1hbnRpY1Rva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFTcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFN0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDdkYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXJELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxDQUF1QztJQUN2RSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQWtCLENBQUUsQ0FBQyxJQUFJLENBQUE7QUFDdkMsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsQ0FBdUM7SUFFdkMsT0FBTyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBdUIsQ0FBRSxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBQzFELENBQUM7QUFFRCxNQUFNLE9BQU8sNEJBQTRCO0lBQ3hDLFlBQ2lCLFFBQXdDLEVBQ3hD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