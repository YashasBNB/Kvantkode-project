/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore, isDisposable } from '../../../../base/common/lifecycle.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { IModelService } from '../../../common/services/model.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class CodeLensModel {
    constructor() {
        this.lenses = [];
    }
    static { this.Empty = new CodeLensModel(); }
    dispose() {
        this._store?.dispose();
    }
    get isDisposed() {
        return this._store?.isDisposed ?? false;
    }
    add(list, provider) {
        if (isDisposable(list)) {
            this._store ??= new DisposableStore();
            this._store.add(list);
        }
        for (const symbol of list.lenses) {
            this.lenses.push({ symbol, provider });
        }
    }
}
export async function getCodeLensModel(registry, model, token) {
    const provider = registry.ordered(model);
    const providerRanks = new Map();
    const result = new CodeLensModel();
    const promises = provider.map(async (provider, i) => {
        providerRanks.set(provider, i);
        try {
            const list = await Promise.resolve(provider.provideCodeLenses(model, token));
            if (list) {
                result.add(list, provider);
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    });
    await Promise.all(promises);
    if (token.isCancellationRequested) {
        result.dispose();
        return CodeLensModel.Empty;
    }
    result.lenses = result.lenses.sort((a, b) => {
        // sort by lineNumber, provider-rank, and column
        if (a.symbol.range.startLineNumber < b.symbol.range.startLineNumber) {
            return -1;
        }
        else if (a.symbol.range.startLineNumber > b.symbol.range.startLineNumber) {
            return 1;
        }
        else if (providerRanks.get(a.provider) < providerRanks.get(b.provider)) {
            return -1;
        }
        else if (providerRanks.get(a.provider) > providerRanks.get(b.provider)) {
            return 1;
        }
        else if (a.symbol.range.startColumn < b.symbol.range.startColumn) {
            return -1;
        }
        else if (a.symbol.range.startColumn > b.symbol.range.startColumn) {
            return 1;
        }
        else {
            return 0;
        }
    });
    return result;
}
CommandsRegistry.registerCommand('_executeCodeLensProvider', function (accessor, ...args) {
    let [uri, itemResolveCount] = args;
    assertType(URI.isUri(uri));
    assertType(typeof itemResolveCount === 'number' || !itemResolveCount);
    const { codeLensProvider } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(uri);
    if (!model) {
        throw illegalArgument();
    }
    const result = [];
    const disposables = new DisposableStore();
    return getCodeLensModel(codeLensProvider, model, CancellationToken.None)
        .then((value) => {
        disposables.add(value);
        const resolve = [];
        for (const item of value.lenses) {
            if (itemResolveCount === undefined ||
                itemResolveCount === null ||
                Boolean(item.symbol.command)) {
                result.push(item.symbol);
            }
            else if (itemResolveCount-- > 0 && item.provider.resolveCodeLens) {
                resolve.push(Promise.resolve(item.provider.resolveCodeLens(model, item.symbol, CancellationToken.None)).then((symbol) => result.push(symbol || item.symbol)));
            }
        }
        return Promise.all(resolve);
    })
        .then(() => {
        return result;
    })
        .finally(() => {
        // make sure to return results, then (on next tick)
        // dispose the results
        setTimeout(() => disposables.dispose(), 100);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZWxlbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlbGVucy9icm93c2VyL2NvZGVsZW5zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBT3ZGLE1BQU0sT0FBTyxhQUFhO0lBQTFCO1FBR0MsV0FBTSxHQUFtQixFQUFFLENBQUE7SUFxQjVCLENBQUM7YUF2QmdCLFVBQUssR0FBRyxJQUFJLGFBQWEsRUFBRSxBQUF0QixDQUFzQjtJQU0zQyxPQUFPO1FBQ04sSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQTtJQUN2QixDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxJQUFJLENBQUMsTUFBTSxFQUFFLFVBQVUsSUFBSSxLQUFLLENBQUE7SUFDeEMsQ0FBQztJQUVELEdBQUcsQ0FBQyxJQUFrQixFQUFFLFFBQTBCO1FBQ2pELElBQUksWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFD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