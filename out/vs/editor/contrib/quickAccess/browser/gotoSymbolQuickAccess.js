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
var AbstractGotoSymbolQuickAccessProvider_1;
import { DeferredPromise } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { pieceToQuery, prepareQuery, scoreFuzzy2, } from '../../../../base/common/fuzzyScorer.js';
import { Disposable, DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { format, trim } from '../../../../base/common/strings.js';
import { Range } from '../../../common/core/range.js';
import { SymbolKinds, getAriaLabelForSymbol, } from '../../../common/languages.js';
import { IOutlineModelService } from '../../documentSymbols/browser/outlineModel.js';
import { AbstractEditorNavigationQuickAccessProvider, } from './editorNavigationQuickAccess.js';
import { localize } from '../../../../nls.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { findLast } from '../../../../base/common/arraysFind.js';
let AbstractGotoSymbolQuickAccessProvider = class AbstractGotoSymbolQuickAccessProvider extends AbstractEditorNavigationQuickAccessProvider {
    static { AbstractGotoSymbolQuickAccessProvider_1 = this; }
    static { this.PREFIX = '@'; }
    static { this.SCOPE_PREFIX = ':'; }
    static { this.PREFIX_BY_CATEGORY = `${this.PREFIX}${this.SCOPE_PREFIX}`; }
    constructor(_languageFeaturesService, _outlineModelService, options = Object.create(null)) {
        super(options);
        this._languageFeaturesService = _languageFeaturesService;
        this._outlineModelService = _outlineModelService;
        this.options = options;
        this.options.canAcceptInBackground = true;
    }
    provideWithoutTextEditor(picker) {
        this.provideLabelPick(picker, localize('cannotRunGotoSymbolWithoutEditor', 'To go to a symbol, first open a text editor with symbol information.'));
        return Disposable.None;
    }
    provideWithTextEditor(context, picker, token, runOptions) {
        const editor = context.editor;
        const model = this.getModel(editor);
        if (!model) {
            return Disposable.None;
        }
        // Provide symbols from model if available in registry
        if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
            return this.doProvideWithEditorSymbols(context, model, picker, token, runOptions);
        }
        // Otherwise show an entry for a model without registry
        // But give a chance to resolve the symbols at a later
        // point if possible
        return this.doProvideWithoutEditorSymbols(context, model, picker, token);
    }
    doProvideWithoutEditorSymbols(context, model, picker, token) {
        const disposables = new DisposableStore();
        // Generic pick for not having any symbol information
        this.provideLabelPick(picker, localize('cannotRunGotoSymbolWithoutSymbolProvider', 'The active text editor does not provide symbol information.'));
        (async () => {
            const result = await this.waitForLanguageSymbolRegistry(model, disposables);
            if (!result || token.isCancellationRequested) {
                return;
            }
            disposables.add(this.doProvideWithEditorSymbols(context, model, picker, token));
        })();
        return disposables;
    }
    provideLabelPick(picker, label) {
        picker.items = [{ label, index: 0, kind: 14 /* SymbolKind.String */ }];
        picker.ariaLabel = label;
    }
    async waitForLanguageSymbolRegistry(model, disposables) {
        if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
            return true;
        }
        const symbolProviderRegistryPromise = new DeferredPromise();
        // Resolve promise when registry knows model
        const symbolProviderListener = disposables.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => {
            if (this._languageFeaturesService.documentSymbolProvider.has(model)) {
                symbolProviderListener.dispose();
                symbolProviderRegistryPromise.complete(true);
            }
        }));
        // Resolve promise when we get disposed too
        disposables.add(toDisposable(() => symbolProviderRegistryPromise.complete(false)));
        return symbolProviderRegistryPromise.p;
    }
    doProvideWithEditorSymbols(context, model, picker, token, runOptions) {
        const editor = context.editor;
        const disposables = new DisposableStore();
        // Goto symbol once picked
        disposables.add(picker.onDidAccept((event) => {
            const [item] = picker.selectedItems;
            if (item && item.range) {
                this.gotoLocation(context, {
                    range: item.range.selection,
                    keyMods: picker.keyMods,
                    preserveFocus: event.inBackground,
                });
                runOptions?.handleAccept?.(item, event.inBackground);
                if (!event.inBackground) {
                    picker.hide();
                }
            }
        }));
        // Goto symbol side by side if enabled
        disposables.add(picker.onDidTriggerItemButton(({ item }) => {
            if (item && item.range) {
                this.gotoLocation(context, {
                    range: item.range.selection,
                    keyMods: picker.keyMods,
                    forceSideBySide: true,
                });
                picker.hide();
            }
        }));
        // Resolve symbols from document once and reuse this
        // request for all filtering and typing then on
        const symbolsPromise = this.getDocumentSymbols(model, token);
        // Set initial picks and update on type
        const picksCts = disposables.add(new MutableDisposable());
        const updatePickerItems = async (positionToEnclose) => {
            // Cancel any previous ask for picks and busy
            picksCts?.value?.cancel();
            picker.busy = false;
            // Create new cancellation source for this run
            picksCts.value = new CancellationTokenSource();
            // Collect symbol picks
            picker.busy = true;
            try {
                const query = prepareQuery(picker.value.substr(AbstractGotoSymbolQuickAccessProvider_1.PREFIX.length).trim());
                const items = await this.doGetSymbolPicks(symbolsPromise, query, undefined, picksCts.value.token, model);
                if (token.isCancellationRequested) {
                    return;
                }
                if (items.length > 0) {
                    picker.items = items;
                    if (positionToEnclose && query.original.length === 0) {
                        const candidate = (findLast(items, (item) => Boolean(item.type !== 'separator' &&
                            item.range &&
                            Range.containsPosition(item.range.decoration, positionToEnclose))));
                        if (candidate) {
                            picker.activeItems = [candidate];
                        }
                    }
                }
                else {
                    if (query.original.length > 0) {
                        this.provideLabelPick(picker, localize('noMatchingSymbolResults', 'No matching editor symbols'));
                    }
                    else {
                        this.provideLabelPick(picker, localize('noSymbolResults', 'No editor symbols'));
                    }
                }
            }
            finally {
                if (!token.isCancellationRequested) {
                    picker.busy = false;
                }
            }
        };
        disposables.add(picker.onDidChangeValue(() => updatePickerItems(undefined)));
        updatePickerItems(editor.getSelection()?.getPosition());
        // Reveal and decorate when active item changes
        disposables.add(picker.onDidChangeActive(() => {
            const [item] = picker.activeItems;
            if (item && item.range) {
                // Reveal
                editor.revealRangeInCenter(item.range.selection, 0 /* ScrollType.Smooth */);
                // Decorate
                this.addDecorations(editor, item.range.decoration);
            }
        }));
        return disposables;
    }
    async doGetSymbolPicks(symbolsPromise, query, options, token, model) {
        const symbols = await symbolsPromise;
        if (token.isCancellationRequested) {
            return [];
        }
        const filterBySymbolKind = query.original.indexOf(AbstractGotoSymbolQuickAccessProvider_1.SCOPE_PREFIX) === 0;
        const filterPos = filterBySymbolKind ? 1 : 0;
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
        // Convert to symbol picks and apply filtering
        let buttons;
        const openSideBySideDirection = this.options?.openSideBySideDirection?.();
        if (openSideBySideDirection) {
            buttons = [
                {
                    iconClass: openSideBySideDirection === 'right'
                        ? ThemeIcon.asClassName(Codicon.splitHorizontal)
                        : ThemeIcon.asClassName(Codicon.splitVertical),
                    tooltip: openSideBySideDirection === 'right'
                        ? localize('openToSide', 'Open to the Side')
                        : localize('openToBottom', 'Open to the Bottom'),
                },
            ];
        }
        const filteredSymbolPicks = [];
        for (let index = 0; index < symbols.length; index++) {
            const symbol = symbols[index];
            const symbolLabel = trim(symbol.name);
            const symbolLabelWithIcon = `$(${SymbolKinds.toIcon(symbol.kind).id}) ${symbolLabel}`;
            const symbolLabelIconOffset = symbolLabelWithIcon.length - symbolLabel.length;
            let containerLabel = symbol.containerName;
            if (options?.extraContainerLabel) {
                if (containerLabel) {
                    containerLabel = `${options.extraContainerLabel} • ${containerLabel}`;
                }
                else {
                    containerLabel = options.extraContainerLabel;
                }
            }
            let symbolScore = undefined;
            let symbolMatches = undefined;
            let containerScore = undefined;
            let containerMatches = undefined;
            if (query.original.length > filterPos) {
                // First: try to score on the entire query, it is possible that
                // the symbol matches perfectly (e.g. searching for "change log"
                // can be a match on a markdown symbol "change log"). In that
                // case we want to skip the container query altogether.
                let skipContainerQuery = false;
                if (symbolQuery !== query) {
                    ;
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, { ...query, values: undefined /* disable multi-query support */ }, filterPos, symbolLabelIconOffset);
                    if (typeof symbolScore === 'number') {
                        skipContainerQuery = true; // since we consumed the query, skip any container matching
                    }
                }
                // Otherwise: score on the symbol query and match on the container later
                if (typeof symbolScore !== 'number') {
                    ;
                    [symbolScore, symbolMatches] = scoreFuzzy2(symbolLabelWithIcon, symbolQuery, filterPos, symbolLabelIconOffset);
                    if (typeof symbolScore !== 'number') {
                        continue;
                    }
                }
                // Score by container if specified
                if (!skipContainerQuery && containerQuery) {
                    if (containerLabel && containerQuery.original.length > 0) {
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
            }
            const deprecated = symbol.tags && symbol.tags.indexOf(1 /* SymbolTag.Deprecated */) >= 0;
            filteredSymbolPicks.push({
                index,
                kind: symbol.kind,
                score: symbolScore,
                label: symbolLabelWithIcon,
                ariaLabel: getAriaLabelForSymbol(symbol.name, symbol.kind),
                description: containerLabel,
                highlights: deprecated
                    ? undefined
                    : {
                        label: symbolMatches,
                        description: containerMatches,
                    },
                range: {
                    selection: Range.collapseToStart(symbol.selectionRange),
                    decoration: symbol.range,
                },
                uri: model.uri,
                symbolName: symbolLabel,
                strikethrough: deprecated,
                buttons,
            });
        }
        // Sort by score
        const sortedFilteredSymbolPicks = filteredSymbolPicks.sort((symbolA, symbolB) => filterBySymbolKind
            ? this.compareByKindAndScore(symbolA, symbolB)
            : this.compareByScore(symbolA, symbolB));
        // Add separator for types
        // - @  only total number of symbols
        // - @: grouped by symbol kind
        let symbolPicks = [];
        if (filterBySymbolKind) {
            let lastSymbolKind = undefined;
            let lastSeparator = undefined;
            let lastSymbolKindCounter = 0;
            function updateLastSeparatorLabel() {
                if (lastSeparator && typeof lastSymbolKind === 'number' && lastSymbolKindCounter > 0) {
                    lastSeparator.label = format(NLS_SYMBOL_KIND_CACHE[lastSymbolKind] || FALLBACK_NLS_SYMBOL_KIND, lastSymbolKindCounter);
                }
            }
            for (const symbolPick of sortedFilteredSymbolPicks) {
                // Found new kind
                if (lastSymbolKind !== symbolPick.kind) {
                    // Update last separator with number of symbols we found for kind
                    updateLastSeparatorLabel();
                    lastSymbolKind = symbolPick.kind;
                    lastSymbolKindCounter = 1;
                    // Add new separator for new kind
                    lastSeparator = { type: 'separator' };
                    symbolPicks.push(lastSeparator);
                }
                // Existing kind, keep counting
                else {
                    lastSymbolKindCounter++;
                }
                // Add to final result
                symbolPicks.push(symbolPick);
            }
            // Update last separator with number of symbols we found for kind
            updateLastSeparatorLabel();
        }
        else if (sortedFilteredSymbolPicks.length > 0) {
            symbolPicks = [
                {
                    label: localize('symbols', 'symbols ({0})', filteredSymbolPicks.length),
                    type: 'separator',
                },
                ...sortedFilteredSymbolPicks,
            ];
        }
        return symbolPicks;
    }
    compareByScore(symbolA, symbolB) {
        if (typeof symbolA.score !== 'number' && typeof symbolB.score === 'number') {
            return 1;
        }
        else if (typeof symbolA.score === 'number' && typeof symbolB.score !== 'number') {
            return -1;
        }
        if (typeof symbolA.score === 'number' && typeof symbolB.score === 'number') {
            if (symbolA.score > symbolB.score) {
                return -1;
            }
            else if (symbolA.score < symbolB.score) {
                return 1;
            }
        }
        if (symbolA.index < symbolB.index) {
            return -1;
        }
        else if (symbolA.index > symbolB.index) {
            return 1;
        }
        return 0;
    }
    compareByKindAndScore(symbolA, symbolB) {
        const kindA = NLS_SYMBOL_KIND_CACHE[symbolA.kind] || FALLBACK_NLS_SYMBOL_KIND;
        const kindB = NLS_SYMBOL_KIND_CACHE[symbolB.kind] || FALLBACK_NLS_SYMBOL_KIND;
        // Sort by type first if scoped search
        const result = kindA.localeCompare(kindB);
        if (result === 0) {
            return this.compareByScore(symbolA, symbolB);
        }
        return result;
    }
    async getDocumentSymbols(document, token) {
        const model = await this._outlineModelService.getOrCreate(document, token);
        return token.isCancellationRequested ? [] : model.asListOfDocumentSymbols();
    }
};
AbstractGotoSymbolQuickAccessProvider = AbstractGotoSymbolQuickAccessProvider_1 = __decorate([
    __param(0, ILanguageFeaturesService),
    __param(1, IOutlineModelService)
], AbstractGotoSymbolQuickAccessProvider);
export { AbstractGotoSymbolQuickAccessProvider };
// #region NLS Helpers
const FALLBACK_NLS_SYMBOL_KIND = localize('property', 'properties ({0})');
const NLS_SYMBOL_KIND_CACHE = {
    [5 /* SymbolKind.Method */]: localize('method', 'methods ({0})'),
    [11 /* SymbolKind.Function */]: localize('function', 'functions ({0})'),
    [8 /* SymbolKind.Constructor */]: localize('_constructor', 'constructors ({0})'),
    [12 /* SymbolKind.Variable */]: localize('variable', 'variables ({0})'),
    [4 /* SymbolKind.Class */]: localize('class', 'classes ({0})'),
    [22 /* SymbolKind.Struct */]: localize('struct', 'structs ({0})'),
    [23 /* SymbolKind.Event */]: localize('event', 'events ({0})'),
    [24 /* SymbolKind.Operator */]: localize('operator', 'operators ({0})'),
    [10 /* SymbolKind.Interface */]: localize('interface', 'interfaces ({0})'),
    [2 /* SymbolKind.Namespace */]: localize('namespace', 'namespaces ({0})'),
    [3 /* SymbolKind.Package */]: localize('package', 'packages ({0})'),
    [25 /* SymbolKind.TypeParameter */]: localize('typeParameter', 'type parameters ({0})'),
    [1 /* SymbolKind.Module */]: localize('modules', 'modules ({0})'),
    [6 /* SymbolKind.Property */]: localize('property', 'properties ({0})'),
    [9 /* SymbolKind.Enum */]: localize('enum', 'enumerations ({0})'),
    [21 /* SymbolKind.EnumMember */]: localize('enumMember', 'enumeration members ({0})'),
    [14 /* SymbolKind.String */]: localize('string', 'strings ({0})'),
    [0 /* SymbolKind.File */]: localize('file', 'files ({0})'),
    [17 /* SymbolKind.Array */]: localize('array', 'arrays ({0})'),
    [15 /* SymbolKind.Number */]: localize('number', 'numbers ({0})'),
    [16 /* SymbolKind.Boolean */]: localize('boolean', 'booleans ({0})'),
    [18 /* SymbolKind.Object */]: localize('object', 'objects ({0})'),
    [19 /* SymbolKind.Key */]: localize('key', 'keys ({0})'),
    [7 /* SymbolKind.Field */]: localize('field', 'fields ({0})'),
    [13 /* SymbolKind.Constant */]: localize('constant', 'constants ({0})'),
};
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci9nb3RvU3ltYm9sUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRSxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksRUFDWixXQUFXLEdBQ1gsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNqRSxPQUFPLEVBQVUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHN0QsT0FBTyxFQUdOLFdBQVcsRUFFWCxxQkFBcUIsR0FDckIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNwRixPQUFPLEVBQ04sMkNBQTJDLEdBRzNDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBTzdDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE9BQU8sRUFBRSxRQUFRLEVB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