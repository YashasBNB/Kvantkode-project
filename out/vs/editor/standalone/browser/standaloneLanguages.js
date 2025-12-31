/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Color } from '../../../base/common/color.js';
import { Range } from '../../common/core/range.js';
import * as languages from '../../common/languages.js';
import { ILanguageService } from '../../common/languages/language.js';
import { ILanguageConfigurationService } from '../../common/languages/languageConfigurationRegistry.js';
import { ModesRegistry } from '../../common/languages/modesRegistry.js';
import { ILanguageFeaturesService } from '../../common/services/languageFeatures.js';
import * as standaloneEnums from '../../common/standalone/standaloneEnums.js';
import { StandaloneServices } from './standaloneServices.js';
import { compile } from '../common/monarch/monarchCompile.js';
import { MonarchTokenizer } from '../common/monarch/monarchLexer.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
/**
 * Register information about a new language.
 */
export function register(language) {
    // Intentionally using the `ModesRegistry` here to avoid
    // instantiating services too quickly in the standalone editor.
    ModesRegistry.registerLanguage(language);
}
/**
 * Get the information of all the registered languages.
 */
export function getLanguages() {
    let result = [];
    result = result.concat(ModesRegistry.getLanguages());
    return result;
}
export function getEncodedLanguageId(languageId) {
    const languageService = StandaloneServices.get(ILanguageService);
    return languageService.languageIdCodec.encodeLanguageId(languageId);
}
/**
 * An event emitted when a language is associated for the first time with a text model.
 * @event
 */
export function onLanguage(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestRichLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * An event emitted when a language is associated for the first time with a text model or
 * when a language is encountered during the tokenization of another language.
 * @event
 */
export function onLanguageEncountered(languageId, callback) {
    return StandaloneServices.withServices(() => {
        const languageService = StandaloneServices.get(ILanguageService);
        const disposable = languageService.onDidRequestBasicLanguageFeatures((encounteredLanguageId) => {
            if (encounteredLanguageId === languageId) {
                // stop listening
                disposable.dispose();
                // invoke actual listener
                callback();
            }
        });
        return disposable;
    });
}
/**
 * Set the editing configuration for a language.
 */
export function setLanguageConfiguration(languageId, configuration) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set configuration for unknown language ${languageId}`);
    }
    const languageConfigurationService = StandaloneServices.get(ILanguageConfigurationService);
    return languageConfigurationService.register(languageId, configuration, 100);
}
/**
 * @internal
 */
export class EncodedTokenizationSupportAdapter {
    constructor(languageId, actual) {
        this._languageId = languageId;
        this._actual = actual;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    tokenize(line, hasEOL, state) {
        if (typeof this._actual.tokenize === 'function') {
            return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
        }
        throw new Error('Not supported!');
    }
    tokenizeEncoded(line, hasEOL, state) {
        const result = this._actual.tokenizeEncoded(line, state);
        return new languages.EncodedTokenizationResult(result.tokens, result.endState);
    }
}
/**
 * @internal
 */
export class TokenizationSupportAdapter {
    constructor(_languageId, _actual, _languageService, _standaloneThemeService) {
        this._languageId = _languageId;
        this._actual = _actual;
        this._languageService = _languageService;
        this._standaloneThemeService = _standaloneThemeService;
    }
    dispose() {
        // NOOP
    }
    getInitialState() {
        return this._actual.getInitialState();
    }
    static _toClassicTokens(tokens, language) {
        const result = [];
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[i] = new languages.Token(startIndex, t.scopes, language);
            previousStartIndex = startIndex;
        }
        return result;
    }
    static adaptTokenize(language, actual, line, state) {
        const actualResult = actual.tokenize(line, state);
        const tokens = TokenizationSupportAdapter._toClassicTokens(actualResult.tokens, language);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.TokenizationResult(tokens, endState);
    }
    tokenize(line, hasEOL, state) {
        return TokenizationSupportAdapter.adaptTokenize(this._languageId, this._actual, line, state);
    }
    _toBinaryTokens(languageIdCodec, tokens) {
        const languageId = languageIdCodec.encodeLanguageId(this._languageId);
        const tokenTheme = this._standaloneThemeService.getColorTheme().tokenTheme;
        const result = [];
        let resultLen = 0;
        let previousStartIndex = 0;
        for (let i = 0, len = tokens.length; i < len; i++) {
            const t = tokens[i];
            const metadata = tokenTheme.match(languageId, t.scopes) | 1024 /* MetadataConsts.BALANCED_BRACKETS_MASK */;
            if (resultLen > 0 && result[resultLen - 1] === metadata) {
                // same metadata
                continue;
            }
            let startIndex = t.startIndex;
            // Prevent issues stemming from a buggy external tokenizer.
            if (i === 0) {
                // Force first token to start at first index!
                startIndex = 0;
            }
            else if (startIndex < previousStartIndex) {
                // Force tokens to be after one another!
                startIndex = previousStartIndex;
            }
            result[resultLen++] = startIndex;
            result[resultLen++] = metadata;
            previousStartIndex = startIndex;
        }
        const actualResult = new Uint32Array(resultLen);
        for (let i = 0; i < resultLen; i++) {
            actualResult[i] = result[i];
        }
        return actualResult;
    }
    tokenizeEncoded(line, hasEOL, state) {
        const actualResult = this._actual.tokenize(line, state);
        const tokens = this._toBinaryTokens(this._languageService.languageIdCodec, actualResult.tokens);
        let endState;
        // try to save an object if possible
        if (actualResult.endState.equals(state)) {
            endState = state;
        }
        else {
            endState = actualResult.endState;
        }
        return new languages.EncodedTokenizationResult(tokens, endState);
    }
}
function isATokensProvider(provider) {
    return typeof provider.getInitialState === 'function';
}
function isEncodedTokensProvider(provider) {
    return 'tokenizeEncoded' in provider;
}
function isThenable(obj) {
    return obj && typeof obj.then === 'function';
}
/**
 * Change the color map that is used for token colors.
 * Supported formats (hex): #RRGGBB, $RRGGBBAA, #RGB, #RGBA
 */
export function setColorMap(colorMap) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    if (colorMap) {
        const result = [null];
        for (let i = 1, len = colorMap.length; i < len; i++) {
            result[i] = Color.fromHex(colorMap[i]);
        }
        standaloneThemeService.setColorMapOverride(result);
    }
    else {
        standaloneThemeService.setColorMapOverride(null);
    }
}
/**
 * @internal
 */
function createTokenizationSupportAdapter(languageId, provider) {
    if (isEncodedTokensProvider(provider)) {
        return new EncodedTokenizationSupportAdapter(languageId, provider);
    }
    else {
        return new TokenizationSupportAdapter(languageId, provider, StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService));
    }
}
/**
 * Register a tokens provider factory for a language. This tokenizer will be exclusive with a tokenizer
 * set using `setTokensProvider` or one created using `setMonarchTokensProvider`, but will work together
 * with a tokens provider set using `registerDocumentSemanticTokensProvider` or `registerDocumentRangeSemanticTokensProvider`.
 */
export function registerTokensProviderFactory(languageId, factory) {
    const adaptedFactory = new languages.LazyTokenizationSupport(async () => {
        const result = await Promise.resolve(factory.create());
        if (!result) {
            return null;
        }
        if (isATokensProvider(result)) {
            return createTokenizationSupportAdapter(languageId, result);
        }
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, result), StandaloneServices.get(IConfigurationService));
    });
    return languages.TokenizationRegistry.registerFactory(languageId, adaptedFactory);
}
/**
 * Set the tokens provider for a language (manual implementation). This tokenizer will be exclusive
 * with a tokenizer created using `setMonarchTokensProvider`, or with `registerTokensProviderFactory`,
 * but will work together with a tokens provider set using `registerDocumentSemanticTokensProvider`
 * or `registerDocumentRangeSemanticTokensProvider`.
 */
export function setTokensProvider(languageId, provider) {
    const languageService = StandaloneServices.get(ILanguageService);
    if (!languageService.isRegisteredLanguageId(languageId)) {
        throw new Error(`Cannot set tokens provider for unknown language ${languageId}`);
    }
    if (isThenable(provider)) {
        return registerTokensProviderFactory(languageId, { create: () => provider });
    }
    return languages.TokenizationRegistry.register(languageId, createTokenizationSupportAdapter(languageId, provider));
}
/**
 * Set the tokens provider for a language (monarch implementation). This tokenizer will be exclusive
 * with a tokenizer set using `setTokensProvider`, or with `registerTokensProviderFactory`, but will
 * work together with a tokens provider set using `registerDocumentSemanticTokensProvider` or
 * `registerDocumentRangeSemanticTokensProvider`.
 */
export function setMonarchTokensProvider(languageId, languageDef) {
    const create = (languageDef) => {
        return new MonarchTokenizer(StandaloneServices.get(ILanguageService), StandaloneServices.get(IStandaloneThemeService), languageId, compile(languageId, languageDef), StandaloneServices.get(IConfigurationService));
    };
    if (isThenable(languageDef)) {
        return registerTokensProviderFactory(languageId, { create: () => languageDef });
    }
    return languages.TokenizationRegistry.register(languageId, create(languageDef));
}
/**
 * Register a reference provider (used by e.g. reference search).
 */
export function registerReferenceProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.referenceProvider.register(languageSelector, provider);
}
/**
 * Register a rename provider (used by e.g. rename symbol).
 */
export function registerRenameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.renameProvider.register(languageSelector, provider);
}
/**
 * Register a new symbol-name provider (e.g., when a symbol is being renamed, show new possible symbol-names)
 */
export function registerNewSymbolNameProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.newSymbolNamesProvider.register(languageSelector, provider);
}
/**
 * Register a signature help provider (used by e.g. parameter hints).
 */
export function registerSignatureHelpProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.signatureHelpProvider.register(languageSelector, provider);
}
/**
 * Register a hover provider (used by e.g. editor hover).
 */
export function registerHoverProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.hoverProvider.register(languageSelector, {
        provideHover: async (model, position, token, context) => {
            const word = model.getWordAtPosition(position);
            return Promise.resolve(provider.provideHover(model, position, token, context)).then((value) => {
                if (!value) {
                    return undefined;
                }
                if (!value.range && word) {
                    value.range = new Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn);
                }
                if (!value.range) {
                    value.range = new Range(position.lineNumber, position.column, position.lineNumber, position.column);
                }
                return value;
            });
        },
    });
}
/**
 * Register a document symbol provider (used by e.g. outline).
 */
export function registerDocumentSymbolProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSymbolProvider.register(languageSelector, provider);
}
/**
 * Register a document highlight provider (used by e.g. highlight occurrences).
 */
export function registerDocumentHighlightProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentHighlightProvider.register(languageSelector, provider);
}
/**
 * Register an linked editing range provider.
 */
export function registerLinkedEditingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkedEditingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a definition provider (used by e.g. go to definition).
 */
export function registerDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.definitionProvider.register(languageSelector, provider);
}
/**
 * Register a implementation provider (used by e.g. go to implementation).
 */
export function registerImplementationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.implementationProvider.register(languageSelector, provider);
}
/**
 * Register a type definition provider (used by e.g. go to type definition).
 */
export function registerTypeDefinitionProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.typeDefinitionProvider.register(languageSelector, provider);
}
/**
 * Register a code lens provider (used by e.g. inline code lenses).
 */
export function registerCodeLensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeLensProvider.register(languageSelector, provider);
}
/**
 * Register a code action provider (used by e.g. quick fix).
 */
export function registerCodeActionProvider(languageSelector, provider, metadata) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.codeActionProvider.register(languageSelector, {
        providedCodeActionKinds: metadata?.providedCodeActionKinds,
        documentation: metadata?.documentation,
        provideCodeActions: (model, range, context, token) => {
            const markerService = StandaloneServices.get(IMarkerService);
            const markers = markerService.read({ resource: model.uri }).filter((m) => {
                return Range.areIntersectingOrTouching(m, range);
            });
            return provider.provideCodeActions(model, range, { markers, only: context.only, trigger: context.trigger }, token);
        },
        resolveCodeAction: provider.resolveCodeAction,
    });
}
/**
 * Register a formatter that can handle only entire models.
 */
export function registerDocumentFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter that can handle a range inside a model.
 */
export function registerDocumentRangeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a formatter than can do formatting as the user types.
 */
export function registerOnTypeFormattingEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.onTypeFormattingEditProvider.register(languageSelector, provider);
}
/**
 * Register a link provider that can find links in text.
 */
export function registerLinkProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.linkProvider.register(languageSelector, provider);
}
/**
 * Register a completion item provider (use by e.g. suggestions).
 */
export function registerCompletionItemProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.completionProvider.register(languageSelector, provider);
}
/**
 * Register a document color provider (used by Color Picker, Color Decorator).
 */
export function registerColorProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.colorProvider.register(languageSelector, provider);
}
/**
 * Register a folding range provider
 */
export function registerFoldingRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.foldingRangeProvider.register(languageSelector, provider);
}
/**
 * Register a declaration provider
 */
export function registerDeclarationProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.declarationProvider.register(languageSelector, provider);
}
/**
 * Register a selection range provider
 */
export function registerSelectionRangeProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.selectionRangeProvider.register(languageSelector, provider);
}
/**
 * Register a document semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register a document range semantic tokens provider. A semantic tokens provider will complement and enhance a
 * simple top-down tokenizer. Simple top-down tokenizers can be set either via `setMonarchTokensProvider`
 * or `setTokensProvider`.
 *
 * For the best user experience, register both a semantic tokens provider and a top-down tokenizer.
 */
export function registerDocumentRangeSemanticTokensProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.documentRangeSemanticTokensProvider.register(languageSelector, provider);
}
/**
 * Register an inline completions provider.
 */
export function registerInlineCompletionsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlineCompletionsProvider.register(languageSelector, provider);
}
export function registerInlineEditProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlineEditProvider.register(languageSelector, provider);
}
/**
 * Register an inlay hints provider.
 */
export function registerInlayHintsProvider(languageSelector, provider) {
    const languageFeaturesService = StandaloneServices.get(ILanguageFeaturesService);
    return languageFeaturesService.inlayHintsProvider.register(languageSelector, provider);
}
/**
 * @internal
 */
export function createMonacoLanguagesAPI() {
    return {
        register: register,
        getLanguages: getLanguages,
        onLanguage: onLanguage,
        onLanguageEncountered: onLanguageEncountered,
        getEncodedLanguageId: getEncodedLanguageId,
        // provider methods
        setLanguageConfiguration: setLanguageConfiguration,
        setColorMap: setColorMap,
        registerTokensProviderFactory: registerTokensProviderFactory,
        setTokensProvider: setTokensProvider,
        setMonarchTokensProvider: setMonarchTokensProvider,
        registerReferenceProvider: registerReferenceProvider,
        registerRenameProvider: registerRenameProvider,
        registerNewSymbolNameProvider: registerNewSymbolNameProvider,
        registerCompletionItemProvider: registerCompletionItemProvider,
        registerSignatureHelpProvider: registerSignatureHelpProvider,
        registerHoverProvider: registerHoverProvider,
        registerDocumentSymbolProvider: registerDocumentSymbolProvider,
        registerDocumentHighlightProvider: registerDocumentHighlightProvider,
        registerLinkedEditingRangeProvider: registerLinkedEditingRangeProvider,
        registerDefinitionProvider: registerDefinitionProvider,
        registerImplementationProvider: registerImplementationProvider,
        registerTypeDefinitionProvider: registerTypeDefinitionProvider,
        registerCodeLensProvider: registerCodeLensProvider,
        registerCodeActionProvider: registerCodeActionProvider,
        registerDocumentFormattingEditProvider: registerDocumentFormattingEditProvider,
        registerDocumentRangeFormattingEditProvider: registerDocumentRangeFormattingEditProvider,
        registerOnTypeFormattingEditProvider: registerOnTypeFormattingEditProvider,
        registerLinkProvider: registerLinkProvider,
        registerColorProvider: registerColorProvider,
        registerFoldingRangeProvider: registerFoldingRangeProvider,
        registerDeclarationProvider: registerDeclarationProvider,
        registerSelectionRangeProvider: registerSelectionRangeProvider,
        registerDocumentSemanticTokensProvider: registerDocumentSemanticTokensProvider,
        registerDocumentRangeSemanticTokensProvider: registerDocumentRangeSemanticTokensProvider,
        registerInlineCompletionsProvider: registerInlineCompletionsProvider,
        registerInlineEditProvider: registerInlineEditProvider,
        registerInlayHintsProvider: registerInlayHintsProvider,
        // enums
        DocumentHighlightKind: standaloneEnums.DocumentHighlightKind,
        CompletionItemKind: standaloneEnums.CompletionItemKind,
        CompletionItemTag: standaloneEnums.CompletionItemTag,
        CompletionItemInsertTextRule: standaloneEnums.CompletionItemInsertTextRule,
        SymbolKind: standaloneEnums.SymbolKind,
        SymbolTag: standaloneEnums.SymbolTag,
        IndentAction: standaloneEnums.IndentAction,
        CompletionTriggerKind: standaloneEnums.CompletionTriggerKind,
        SignatureHelpTriggerKind: standaloneEnums.SignatureHelpTriggerKind,
        InlayHintKind: standaloneEnums.InlayHintKind,
        InlineCompletionTriggerKind: standaloneEnums.InlineCompletionTriggerKind,
        InlineEditTriggerKind: standaloneEnums.InlineEditTriggerKind,
        CodeActionTriggerType: standaloneEnums.CodeActionTriggerType,
        NewSymbolNameTag: standaloneEnums.NewSymbolNameTag,
        NewSymbolNameTriggerKind: standaloneEnums.NewSymbolNameTriggerKind,
        PartialAcceptTriggerKind: standaloneEnums.PartialAcceptTriggerKind,
        HoverVerbosityAction: standaloneEnums.HoverVerbosityAction,
        // classes
        FoldingRangeKind: languages.FoldingRangeKind,
        SelectedSuggestionInfo: languages.SelectedSuggestionInfo,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZUxhbmd1YWdlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFHckQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBRWxELE9BQU8sS0FBSyxTQUFTLE1BQU0sMkJBQTJCLENBQUE7QUFDdEQsT0FBTyxFQUEyQixnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTlGLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3ZHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUd2RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNwRixPQUFPLEtBQUssZUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUMvRixPQUFPLEVBQWUsY0FBYyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFekY7O0dBRUc7QUFDSCxNQUFNLFVBQVUsUUFBUSxDQUFDLFFBQWlDO0lBQ3pELHdEQUF3RDtJQUN4RCwrREFBK0Q7SUFDL0QsYUFBYSxDQUFD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