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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ290b1N5bWJvbFF1aWNrQWNjZXNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9xdWlja0FjY2Vzcy9icm93c2VyL2dvdG9TeW1ib2xRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFFTixZQUFZLEVBQ1osWUFBWSxFQUNaLFdBQVcsR0FDWCxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2pFLE9BQU8sRUFBVSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUc3RCxPQUFPLEVBR04sV0FBVyxFQUVYLHFCQUFxQixHQUNyQixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3BGLE9BQU8sRUFDTiwyQ0FBMkMsR0FHM0MsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFPN0MsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7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