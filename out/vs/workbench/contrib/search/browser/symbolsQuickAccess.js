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
var SymbolsQuickAccessProvider_1;
import { localize } from '../../../../nls.js';
import { PickerQuickAccessProvider, TriggerAction, } from '../../../../platform/quickinput/browser/pickerQuickAccess.js';
import { ThrottledDelayer } from '../../../../base/common/async.js';
import { getWorkspaceSymbols, } from '../common/search.js';
import { SymbolKinds } from '../../../../editor/common/languages.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { Schemas } from '../../../../base/common/network.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IEditorService, SIDE_GROUP, ACTIVE_GROUP, } from '../../../services/editor/common/editorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { getSelectionSearchString } from '../../../../editor/contrib/find/browser/findController.js';
import { prepareQuery, scoreFuzzy2, pieceToQuery, } from '../../../../base/common/fuzzyScorer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
let SymbolsQuickAccessProvider = class SymbolsQuickAccessProvider extends PickerQuickAccessProvider {
    static { SymbolsQuickAccessProvider_1 = this; }
    static { this.PREFIX = '#'; }
    static { this.TYPING_SEARCH_DELAY = 200; } // this delay accommodates for the user typing a word and then stops typing to start searching
    static { this.TREAT_AS_GLOBAL_SYMBOL_TYPES = new Set([
        4 /* SymbolKind.Class */,
        9 /* SymbolKind.Enum */,
        0 /* SymbolKind.File */,
        10 /* SymbolKind.Interface */,
        2 /* SymbolKind.Namespace */,
        3 /* SymbolKind.Package */,
        1 /* SymbolKind.Module */,
    ]); }
    get defaultFilterValue() {
        // Prefer the word under the cursor in the active editor as default filter
        const editor = this.codeEditorService.getFocusedCodeEditor();
        if (editor) {
            return getSelectionSearchString(editor) ?? undefined;
        }
        return undefined;
    }
    constructor(labelService, openerService, editorService, configurationService, codeEditorService) {
        super(SymbolsQuickAccessProvider_1.PREFIX, {
            canAcceptInBackground: true,
            noResultsPick: {
                label: localize('noSymbolResults', 'No matching workspace symbols'),
            },
        });
        this.labelService = labelService;
        this.openerService = openerService;
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.codeEditorService = codeEditorService;
        this.delayer = this._register(new ThrottledDelayer(SymbolsQuickAccessProvider_1.TYPING_SEARCH_DELAY));
    }
    get configuration() {
        const editorConfig = this.configurationService.getValue().workbench?.editor;
        return {
            openEditorPinned: !editorConfig?.enablePreviewFromQuickOpen || !editorConfig?.enablePreview,
            openSideBySideDirection: editorConfig?.openSideBySideDirection,
        };
    }
    _getPicks(filter, disposables, token) {
        return this.getSymbolPicks(filter, undefined, token);
    }
    async getSymbolPicks(filter, options, token) {
        return this.delayer.trigger(async () => {
            if (token.isCancellationRequested) {
                return [];
            }
            return this.doGetSymbolPicks(prepareQuery(filter), options, token);
        }, options?.delay);
    }
    async doGetSymbolPicks(query, options, token) {
        // Split between symbol and container query
        let symbolQuery;
        let containerQuery;
        if (query.values && query.values.length > 1) {
            symbolQuery = pieceToQuery(query.values[0]); // symbol: only match on first part
            containerQuery = pieceToQuery(query.values.slice(1)); // container: match on all but first parts
        }
        else {
            symbolQuery = query;
        }
        // Run the workspace symbol query
        const workspaceSymbols = await getWorkspaceSymbols(symbolQuery.original, token);
        if (token.isCancellationRequested) {
            return [];
        }
        const symbolPicks = [];
        // Convert to symbol picks and apply filtering
        const openSideBySideDirection = this.configuration.openSideBySideDirection;
        for (const { symbol, provider } of workspaceSymbols) {
            // Depending on the workspace symbols filter setting, skip over symbols that:
            // - do not have a container
            // - and are not treated explicitly as global symbols (e.g. classes)
            if (options?.skipLocal &&
                !SymbolsQuickAccessProvider_1.TREAT_AS_GLOBAL_SYMBOL_TYPES.has(symbol.kind) &&
                !!symbol.containerName) {
                continue;
            }
            const symbolLabel = symbol.name;
            const symbolLabelWithIcon = `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbolLabel}`;
            const symbolLabelIconOffset = symbolLabelWithIcon.length - symbolLabel.length;
            // Score by symbol label if searching
            let symbolScore = undefined;
            let symbolMatches = undefined;
            let skipContainerQuery = false;
            if (symbolQuery.original.length > 0) {
                // First: try to score on the entire query, it is possible that
                // the symbol matches perfectly (e.g. searching for "change log"
                // can be a match on a markdown symbol "change log"). In that
                // case we want to skip the container query altogether.
                if (symbolQuery !== query) {
                    ;
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, { ...query, values: undefined /* disable multi-query support */ }, 0, symbolLabelIconOffset);
                    if (typeof symbolScore === 'number') {
                        skipContainerQuery = true; // since we consumed the query, skip any container matching
                    }
                }
                // Otherwise: score on the symbol query and match on the container later
                if (typeof symbolScore !== 'number') {
                    ;
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, symbolQuery, 0, symbolLabelIconOffset);
                    if (typeof symbolScore !== 'number') {
                        continue;
                    }
                }
            }
            const symbolUri = symbol.location.uri;
            let containerLabel = undefined;
            if (symbolUri) {
                const containerPath = this.labelService.getUriLabel(symbolUri, { relative: true });
                if (symbol.containerName) {
                    containerLabel = `${symbol.containerName} • ${containerPath}`;
                }
                else {
                    containerLabel = containerPath;
                }
            }
            // Score by container if specified and searching
            let containerScore = undefined;
            let containerMatches = undefined;
            if (!skipContainerQuery && containerQuery && containerQuery.original.length > 0) {
                if (containerLabel) {
                    ;
                    [containerScore, containerMatches] = scoreFuzzy2(containerLabel, containerQuery);
                }
                if (typeof containerScore !== 'number') {
                    continue;
                }
                if (typeof symbolScore === 'number') {
                    symbolScore += containerScore; // boost symbolScore by containerScore
                }
            }
            const deprecated = symbol.tags ? symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0 : false;
            symbolPicks.push({
                symbol,
                resource: symbolUri,
                score: symbolScore,
                label: symbolLabelWithIcon,
                ariaLabel: symbolLabel,
                highlights: deprecated
                    ? undefined
                    : {
                        label: symbolMatches,
                        description: containerMatches,
                    },
                description: containerLabel,
                strikethrough: deprecated,
                buttons: [
                    {
                        iconClass: openSideBySideDirection === 'right'
                            ? ThemeIcon.asClassName(Codicon.splitHorizontal)
                            : ThemeIcon.asClassName(Codicon.splitVertical),
                        tooltip: openSideBySideDirection === 'right'
                            ? localize('openToSide', 'Open to the Side')
                            : localize('openToBottom', 'Open to the Bottom'),
                    },
                ],
                trigger: (buttonIndex, keyMods) => {
                    this.openSymbol(provider, symbol, token, { keyMods, forceOpenSideBySide: true });
                    return TriggerAction.CLOSE_PICKER;
                },
                accept: async (keyMods, event) => this.openSymbol(provider, symbol, token, {
                    keyMods,
                    preserveFocus: event.inBackground,
                    forcePinned: event.inBackground,
                }),
            });
        }
        // Sort picks (unless disabled)
        if (!options?.skipSorting) {
            symbolPicks.sort((symbolA, symbolB) => this.compareSymbols(symbolA, symbolB));
        }
        return symbolPicks;
    }
    async openSymbol(provider, symbol, token, options) {
        // Resolve actual symbol to open for providers that can resolve
        let symbolToOpen = symbol;
        if (typeof provider.resolveWorkspaceSymbol === 'function') {
            symbolToOpen = (await provider.resolveWorkspaceSymbol(symbol, token)) || symbol;
            if (token.isCancellationRequested) {
                return;
            }
        }
        // Open HTTP(s) links with opener service
        if (symbolToOpen.location.uri.scheme === Schemas.http ||
            symbolToOpen.location.uri.scheme === Schemas.https) {
            await this.openerService.open(symbolToOpen.location.uri, {
                fromUserGesture: true,
                allowContributedOpeners: true,
            });
        }
        // Otherwise open as editor
        else {
            await this.editorService.openEditor({
                resource: symbolToOpen.location.uri,
                options: {
                    preserveFocus: options?.preserveFocus,
                    pinned: options.keyMods.ctrlCmd || options.forcePinned || this.configuration.openEditorPinned,
                    selection: symbolToOpen.location.range
                        ? Range.collapseToStart(symbolToOpen.location.range)
                        : undefined,
                },
            }, options.keyMods.alt ||
                (this.configuration.openEditorPinned && options.keyMods.ctrlCmd) ||
                options?.forceOpenSideBySide
                ? SIDE_GROUP
                : ACTIVE_GROUP);
        }
    }
    compareSymbols(symbolA, symbolB) {
        // By score
        if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
            if (symbolA.score > symbolB.score) {
                return -1;
            }
            if (symbolA.score < symbolB.score) {
                return 1;
            }
        }
        // By name
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAName = symbolA.symbol.name.toLowerCase();
            const symbolBName = symbolB.symbol.name.toLowerCase();
            const res = symbolAName.localeCompare(symbolBName);
            if (res !== 0) {
                return res;
            }
        }
        // By kind
        if (symbolA.symbol && symbolB.symbol) {
            const symbolAKind = SymbolKinds.toIcon(symbolA.symbol.kind).id;
            const symbolBKind = SymbolKinds.toIcon(symbolB.symbol.kind).id;
            return symbolAKind.localeCompare(symbolBKind);
        }
        return 0;
    }
};
SymbolsQuickAccessProvider = SymbolsQuickAccessProvider_1 = __decorate([
    __param(0, ILabelService),
    __param(1, IOpenerService),
    __param(2, IEditorService),
    __param(3, IConfigurationService),
    __param(4, ICodeEditorService)
], SymbolsQuickAccessProvider);
export { SymbolsQuickAccessProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9zeW1ib2xzUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBRU4seUJBQXlCLEVBQ3pCLGFBQWEsR0FDYixNQUFNLDhEQUE4RCxDQUFBO0FBR3JFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFDTixtQkFBbUIsR0FHbkIsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsV0FBVyxFQUF5QixNQUFNLHdDQUF3QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzdFLE9BQU8sRUFDTixjQUFjLEVBQ2QsVUFBVSxFQUNWLFlBQVksR0FDWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU1sRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sWUFBWSxFQUVaLFdBQVcsRUFDWCxZQUFZLEdBQ1osTUFBTSx3Q0FBd0MsQ0FBQTtBQUUv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