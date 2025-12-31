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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2NvbW1vbi9zZWFyY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFZN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFN0YsT0FBTyxFQUFFLHNCQUFzQixFQUFFLGdCQUFnQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBcUIzRCxNQUFNLEtBQVcsK0JBQStCLENBeUIvQztBQXpCRCxXQUFpQiwrQkFBK0I7SUFDL0MsTUFBTSxTQUFTLEdBQStCLEVBQUUsQ0FBQTtJQUVoRCxTQUFnQixRQUFRLENBQUMsUUFBa0M7UUFDMUQsSUFBSSxPQUFPLEdBQXlDLFFBQVEsQ0FBQTtRQUM1RCxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQ2IsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN4QixDQUFD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