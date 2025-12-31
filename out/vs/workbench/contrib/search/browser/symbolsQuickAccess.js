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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ltYm9sc1F1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL2Jyb3dzZXIvc3ltYm9sc1F1aWNrQWNjZXNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUVOLHlCQUF5QixFQUN6QixhQUFhLEdBQ2IsTUFBTSw4REFBOEQsQ0FBQTtBQUdyRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLFdBQVcsRUFBeUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQ04sY0FBYyxFQUNkLFVBQVUsRUFDVixZQUFZLEdBQ1osTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFNbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDcEcsT0FBTyxFQUNOLFlBQVksRUFFWixXQUFXLEVBQ1gsWUFBWSxHQUNaLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FB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