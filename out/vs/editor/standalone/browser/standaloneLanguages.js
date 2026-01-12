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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUxhbmd1YWdlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lTGFuZ3VhZ2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFbEQsT0FBTyxLQUFLLFNBQVMsTUFBTSwyQkFBMkIsQ0FBQTtBQUN0RCxPQUFPLEVBQTJCLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFOUYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3ZFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sS0FBSyxlQUFlLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV6Rjs7R0FFRztBQUNILE1BQU0sVUFBVSxRQUFRLENBQUMsUUFBaUM7SUFDekQsd0RBQXdEO0lBQ3hELCtEQUErRDtJQUMvRCxhQUFh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