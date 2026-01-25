/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { EditorResourceAccessor, SideBySideEditor } from '../../../common/editor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { Range } from '../../../../editor/common/core/range.js';
import { isNumber } from '../../../../base/common/types.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { compare } from '../../../../base/common/strings.js';
import { groupBy } from '../../../../base/common/arrays.js';
export var WorkspaceSymbolProviderRegistry;
(function (WorkspaceSymbolProviderRegistry) {
    const _supports = [];
    function register(provider) {
        let support = provider;
        if (support) {
            _supports.push(support);
        }
        return {
            dispose() {
                if (support) {
                    const idx = _supports.indexOf(support);
                    if (idx >= 0) {
                        _supports.splice(idx, 1);
                        support = undefined;
                    }
                }
            },
        };
    }
    WorkspaceSymbolProviderRegistry.register = register;
    function all() {
        return _supports.slice(0);
    }
    WorkspaceSymbolProviderRegistry.all = all;
})(WorkspaceSymbolProviderRegistry || (WorkspaceSymbolProviderRegistry = {}));
export class WorkspaceSymbolItem {
    constructor(symbol, provider) {
        this.symbol = symbol;
        this.provider = provider;
    }
}
export async function getWorkspaceSymbols(query, token = CancellationToken.None) {
    const all = [];
    const promises = WorkspaceSymbolProviderRegistry.all().map(async (provider) => {
        try {
            const value = await provider.provideWorkspaceSymbols(query, token);
            if (!value) {
                return;
            }
            for (const symbol of value) {
                all.push(new WorkspaceSymbolItem(symbol, provider));
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    });
    await Promise.all(promises);
    if (token.isCancellationRequested) {
        return [];
    }
    // de-duplicate entries
    function compareItems(a, b) {
        let res = compare(a.symbol.name, b.symbol.name);
        if (res === 0) {
            res = a.symbol.kind - b.symbol.kind;
        }
        if (res === 0) {
            res = compare(a.symbol.location.uri.toString(), b.symbol.location.uri.toString());
        }
        if (res === 0) {
            if (a.symbol.location.range && b.symbol.location.range) {
                if (!Range.areIntersecting(a.symbol.location.range, b.symbol.location.range)) {
                    res = Range.compareRangesUsingStarts(a.symbol.location.range, b.symbol.location.range);
                }
            }
            else if (a.provider.resolveWorkspaceSymbol && !b.provider.resolveWorkspaceSymbol) {
                res = -1;
            }
            else if (!a.provider.resolveWorkspaceSymbol && b.provider.resolveWorkspaceSymbol) {
                res = 1;
            }
        }
        if (res === 0) {
            res = compare(a.symbol.containerName ?? '', b.symbol.containerName ?? '');
        }
        return res;
    }
    return groupBy(all, compareItems)
        .map((group) => group[0])
        .flat();
}
/**
 * Helper to return all opened editors with resources not belonging to the currently opened workspace.
 */
export function getOutOfWorkspaceEditorResources(accessor) {
    const editorService = accessor.get(IEditorService);
    const contextService = accessor.get(IWorkspaceContextService);
    const fileService = accessor.get(IFileService);
    const resources = editorService.editors
        .map((editor) => EditorResourceAccessor.getOriginalUri(editor, {
        supportSideBySide: SideBySideEditor.PRIMARY,
    }))
        .filter((resource) => !!resource &&
        !contextService.isInsideWorkspace(resource) &&
        fileService.hasProvider(resource));
    return resources;
}
// Supports patterns of <path><#|:|(><line><#|:|,><col?><:?>
const LINE_COLON_PATTERN = /\s?[#:\(](?:line )?(\d*)(?:[#:,](\d*))?\)?:?\s*$/;
export function extractRangeFromFilter(filter, unless) {
    // Ignore when the unless character not the first character or is before the line colon pattern
    if (!filter ||
        unless?.some((value) => {
            const unlessCharPos = filter.indexOf(value);
            return (unlessCharPos === 0 ||
                (unlessCharPos > 0 && !LINE_COLON_PATTERN.test(filter.substring(unlessCharPos + 1))));
        })) {
        return undefined;
    }
    let range = undefined;
    // Find Line/Column number from search value using RegExp
    const patternMatch = LINE_COLON_PATTERN.exec(filter);
    if (patternMatch) {
        const startLineNumber = parseInt(patternMatch[1] ?? '', 10);
        // Line Number
        if (isNumber(startLineNumber)) {
            range = {
                startLineNumber: startLineNumber,
                startColumn: 1,
                endLineNumber: startLineNumber,
                endColumn: 1,
            };
            // Column Number
            const startColumn = parseInt(patternMatch[2] ?? '', 10);
            if (isNumber(startColumn)) {
                range = {
                    startLineNumber: range.startLineNumber,
                    startColumn: startColumn,
                    endLineNumber: range.endLineNumber,
                    endColumn: startColumn,
                };
            }
        }
        // User has typed "something:" or "something#" without a line number, in this case treat as start of file
        else if (patternMatch[1] === '') {
            range = {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: 1,
                endColumn: 1,
            };
        }
    }
    if (patternMatch && range) {
        return {
            filter: filter.substr(0, patternMatch.index), // clear range suffix from search value
            range,
        };
    }
    return undefined;
}
export var SearchUIState;
(function (SearchUIState) {
    SearchUIState[SearchUIState["Idle"] = 0] = "Idle";
    SearchUIState[SearchUIState["Searching"] = 1] = "Searching";
    SearchUIState[SearchUIState["SlowSearch"] = 2] = "SlowSearch";
})(SearchUIState || (SearchUIState = {}));
export const SearchStateKey = new RawContextKey('searchState', SearchUIState.Idle);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvY29tbW9uL3NlYXJjaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVk3RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU3RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNwRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFM0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFxQjNELE1BQU0sS0FBVywrQkFBK0IsQ0F5Qi9DO0FBekJELFdBQWlCLCtCQUErQjtJQUMvQyxNQUFNLFNBQVMsR0FBK0IsRUFBRSxDQUFBO0lBRWhELFNBQWdCLFFBQVEsQ0FBQyxRQUFrQztRQUMxRCxJQUFJLE9BQU8sR0FBeUMsUUFBUSxDQUFBO1FBQzVELElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3hC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