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
var TextMateTokenizationFeature_1;
import { canASAR, importAMDNodeModule, resolveAmdNodeModulePath } from '../../../../amdX.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { equals as equalArray } from '../../../../base/common/arrays.js';
import { Color } from '../../../../base/common/color.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { FileAccess, nodeModulesAsarUnpackedPath, nodeModulesPath, } from '../../../../base/common/network.js';
import { observableFromEvent } from '../../../../base/common/observable.js';
import { isWeb } from '../../../../base/common/platform.js';
import * as resources from '../../../../base/common/resources.js';
import * as types from '../../../../base/common/types.js';
import { LazyTokenizationSupport, TokenizationRegistry, } from '../../../../editor/common/languages.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { generateTokensCSSForColorMap } from '../../../../editor/common/languages/supports/tokenization.js';
import * as nls from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IExtensionResourceLoaderService } from '../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IWorkbenchEnvironmentService } from '../../environment/common/environmentService.js';
import { TextMateTokenizationSupport } from './tokenizationSupport/textMateTokenizationSupport.js';
import { TokenizationSupportWithLineLimit } from './tokenizationSupport/tokenizationSupportWithLineLimit.js';
import { ThreadedBackgroundTokenizerFactory } from './backgroundTokenization/threadedBackgroundTokenizerFactory.js';
import { TMGrammarFactory, missingTMGrammarErrorMessage } from '../common/TMGrammarFactory.js';
import { grammarsExtPoint } from '../common/TMGrammars.js';
import { IWorkbenchThemeService, } from '../../themes/common/workbenchThemeService.js';
let TextMateTokenizationFeature = class TextMateTokenizationFeature extends Disposable {
    static { TextMateTokenizationFeature_1 = this; }
    static { this.reportTokenizationTimeCounter = { sync: 0, async: 0 }; }
    constructor(_languageService, _themeService, _extensionResourceLoaderService, _notificationService, _logService, _configurationService, _progressService, _environmentService, _instantiationService, _telemetryService) {
        super();
        this._languageService = _languageService;
        this._themeService = _themeService;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._notificationService = _notificationService;
        this._logService = _logService;
        this._configurationService = _configurationService;
        this._progressService = _progressService;
        this._environmentService = _environmentService;
        this._instantiationService = _instantiationService;
        this._telemetryService = _telemetryService;
        this._createdModes = [];
        this._encounteredLanguages = [];
        this._debugMode = false;
        this._debugModePrintFunc = () => { };
        this._grammarDefinitions = null;
        this._grammarFactory = null;
        this._tokenizersRegistrations = this._register(new DisposableStore());
        this._currentTheme = null;
        this._currentTokenColorMap = null;
        this._threadedBackgroundTokenizerFactory = this._instantiationService.createInstance(ThreadedBackgroundTokenizerFactory, (timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) => this._reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, true, isRandomSample), () => this.getAsyncTokenizationEnabled());
        this._vscodeOniguruma = null;
        this._styleElement = domStylesheets.createStyleSheet();
        this._styleElement.className = 'vscode-tokens-styles';
        grammarsExtPoint.setHandler((extensions) => this._handleGrammarsExtPoint(extensions));
        this._updateTheme(this._themeService.getColorTheme(), true);
        this._register(this._themeService.onDidColorThemeChange(() => {
            this._updateTheme(this._themeService.getColorTheme(), false);
        }));
        this._register(this._languageService.onDidRequestRichLanguageFeatures((languageId) => {
            this._createdModes.push(languageId);
        }));
    }
    getAsyncTokenizationEnabled() {
        return !!this._configurationService.getValue('editor.experimental.asyncTokenization');
    }
    getAsyncTokenizationVerification() {
        return !!this._configurationService.getValue('editor.experimental.asyncTokenizationVerification');
    }
    _handleGrammarsExtPoint(extensions) {
        this._grammarDefinitions = null;
        if (this._grammarFactory) {
            this._grammarFactory.dispose();
            this._grammarFactory = null;
        }
        this._tokenizersRegistrations.clear();
        this._grammarDefinitions = [];
        for (const extension of extensions) {
            const grammars = extension.value;
            for (const grammar of grammars) {
                const validatedGrammar = this._validateGrammarDefinition(extension, grammar);
                if (validatedGrammar) {
                    this._grammarDefinitions.push(validatedGrammar);
                    if (validatedGrammar.language) {
                        const lazyTokenizationSupport = new LazyTokenizationSupport(() => this._createTokenizationSupport(validatedGrammar.language));
                        this._tokenizersRegistrations.add(lazyTokenizationSupport);
                        this._tokenizersRegistrations.add(TokenizationRegistry.registerFactory(validatedGrammar.language, lazyTokenizationSupport));
                    }
                }
            }
        }
        this._threadedBackgroundTokenizerFactory.setGrammarDefinitions(this._grammarDefinitions);
        for (const createdMode of this._createdModes) {
            TokenizationRegistry.getOrCreate(createdMode);
        }
    }
    _validateGrammarDefinition(extension, grammar) {
        if (!validateGrammarExtensionPoint(extension.description.extensionLocation, grammar, extension.collector, this._languageService)) {
            return null;
        }
        const grammarLocation = resources.joinPath(extension.description.extensionLocation, grammar.path);
        const embeddedLanguages = Object.create(null);
        if (grammar.embeddedLanguages) {
            const scopes = Object.keys(grammar.embeddedLanguages);
            for (let i = 0, len = scopes.length; i < len; i++) {
                const scope = scopes[i];
                const language = grammar.embeddedLanguages[scope];
                if (typeof language !== 'string') {
                    // never hurts to be too careful
                    continue;
                }
                if (this._languageService.isRegisteredLanguageId(language)) {
                    embeddedLanguages[scope] =
                        this._languageService.languageIdCodec.encodeLanguageId(language);
                }
            }
        }
        const tokenTypes = Object.create(null);
        if (grammar.tokenTypes) {
            const scopes = Object.keys(grammar.tokenTypes);
            for (const scope of scopes) {
                const tokenType = grammar.tokenTypes[scope];
                switch (tokenType) {
                    case 'string':
                        tokenTypes[scope] = 2 /* StandardTokenType.String */;
                        break;
                    case 'other':
                        tokenTypes[scope] = 0 /* StandardTokenType.Other */;
                        break;
                    case 'comment':
                        tokenTypes[scope] = 1 /* StandardTokenType.Comment */;
                        break;
                }
            }
        }
        const validLanguageId = grammar.language && this._languageService.isRegisteredLanguageId(grammar.language)
            ? grammar.language
            : undefined;
        function asStringArray(array, defaultValue) {
            if (!Array.isArray(array)) {
                return defaultValue;
            }
            if (!array.every((e) => typeof e === 'string')) {
                return defaultValue;
            }
            return array;
        }
        return {
            location: grammarLocation,
            language: validLanguageId,
            scopeName: grammar.scopeName,
            embeddedLanguages: embeddedLanguages,
            tokenTypes: tokenTypes,
            injectTo: grammar.injectTo,
            balancedBracketSelectors: asStringArray(grammar.balancedBracketScopes, ['*']),
            unbalancedBracketSelectors: asStringArray(grammar.unbalancedBracketScopes, []),
            sourceExtensionId: extension.description.id,
        };
    }
    startDebugMode(printFn, onStop) {
        if (this._debugMode) {
            this._notificationService.error(nls.localize('alreadyDebugging', 'Already Logging.'));
            return;
        }
        this._debugModePrintFunc = printFn;
        this._debugMode = true;
        if (this._debugMode) {
            this._progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                buttons: [nls.localize('stop', 'Stop')],
            }, (progress) => {
                progress.report({
                    message: nls.localize('progress1', 'Preparing to log TM Grammar parsing. Press Stop when finished.'),
                });
                return this._getVSCodeOniguruma().then((vscodeOniguruma) => {
                    vscodeOniguruma.setDefaultDebugCall(true);
                    progress.report({
                        message: nls.localize('progress2', 'Now logging TM Grammar parsing. Press Stop when finished.'),
                    });
                    return new Promise((resolve, reject) => { });
                });
            }, (choice) => {
                this._getVSCodeOniguruma().then((vscodeOniguruma) => {
                    this._debugModePrintFunc = () => { };
                    this._debugMode = false;
                    vscodeOniguruma.setDefaultDebugCall(false);
                    onStop();
                });
            });
        }
    }
    _canCreateGrammarFactory() {
        // Check if extension point is ready
        return !!this._grammarDefinitions;
    }
    async _getOrCreateGrammarFactory() {
        if (this._grammarFactory) {
            return this._grammarFactory;
        }
        const [vscodeTextmate, vscodeOniguruma] = await Promise.all([
            importAMDNodeModule('vscode-textmate', 'release/main.js'),
            this._getVSCodeOniguruma(),
        ]);
        const onigLib = Promise.resolve({
            createOnigScanner: (sources) => vscodeOniguruma.createOnigScanner(sources),
            createOnigString: (str) => vscodeOniguruma.createOnigString(str),
        });
        // Avoid duplicate instantiations
        if (this._grammarFactory) {
            return this._grammarFactory;
        }
        this._grammarFactory = new TMGrammarFactory({
            logTrace: (msg) => this._logService.trace(msg),
            logError: (msg, err) => this._logService.error(msg, err),
            readFile: (resource) => this._extensionResourceLoaderService.readExtensionResource(resource),
        }, this._grammarDefinitions || [], vscodeTextmate, onigLib);
        this._updateTheme(this._themeService.getColorTheme(), true);
        return this._grammarFactory;
    }
    async _createTokenizationSupport(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return null;
        }
        if (!this._canCreateGrammarFactory()) {
            return null;
        }
        try {
            const grammarFactory = await this._getOrCreateGrammarFactory();
            if (!grammarFactory.has(languageId)) {
                return null;
            }
            const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
            const r = await grammarFactory.createGrammar(languageId, encodedLanguageId);
            if (!r.grammar) {
                return null;
            }
            const maxTokenizationLineLength = observableConfigValue('editor.maxTokenizationLineLength', languageId, -1, this._configurationService);
            const store = new DisposableStore();
            const tokenization = store.add(new TextMateTokenizationSupport(r.grammar, r.initialState, r.containsEmbeddedLanguages, (textModel, tokenStore) => this._threadedBackgroundTokenizerFactory.createBackgroundTokenizer(textModel, tokenStore, maxTokenizationLineLength), () => this.getAsyncTokenizationVerification(), (timeMs, lineLength, isRandomSample) => {
                this._reportTokenizationTime(timeMs, languageId, r.sourceExtensionId, lineLength, false, isRandomSample);
            }, true));
            store.add(tokenization.onDidEncounterLanguage((encodedLanguageId) => {
                if (!this._encounteredLanguages[encodedLanguageId]) {
                    const languageId = this._languageService.languageIdCodec.decodeLanguageId(encodedLanguageId);
                    this._encounteredLanguages[encodedLanguageId] = true;
                    this._languageService.requestBasicLanguageFeatures(languageId);
                }
            }));
            return new TokenizationSupportWithLineLimit(encodedLanguageId, tokenization, store, maxTokenizationLineLength);
        }
        catch (err) {
            if (err.message && err.message === missingTMGrammarErrorMessage) {
                // Don't log this error message
                return null;
            }
            onUnexpectedError(err);
            return null;
        }
    }
    _updateTheme(colorTheme, forceUpdate) {
        if (!forceUpdate &&
            this._currentTheme &&
            this._currentTokenColorMap &&
            equalsTokenRules(this._currentTheme.settings, colorTheme.tokenColors) &&
            equalArray(this._currentTokenColorMap, colorTheme.tokenColorMap)) {
            return;
        }
        this._currentTheme = { name: colorTheme.label, settings: colorTheme.tokenColors };
        this._currentTokenColorMap = colorTheme.tokenColorMap;
        this._grammarFactory?.setTheme(this._currentTheme, this._currentTokenColorMap);
        const colorMap = toColorMap(this._currentTokenColorMap);
        const cssRules = generateTokensCSSForColorMap(colorMap);
        this._styleElement.textContent = cssRules;
        TokenizationRegistry.setColorMap(colorMap);
        if (this._currentTheme && this._currentTokenColorMap) {
            this._threadedBackgroundTokenizerFactory.acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
    }
    async createTokenizer(languageId) {
        if (!this._languageService.isRegisteredLanguageId(languageId)) {
            return null;
        }
        const grammarFactory = await this._getOrCreateGrammarFactory();
        if (!grammarFactory.has(languageId)) {
            return null;
        }
        const encodedLanguageId = this._languageService.languageIdCodec.encodeLanguageId(languageId);
        const { grammar } = await grammarFactory.createGrammar(languageId, encodedLanguageId);
        return grammar;
    }
    _getVSCodeOniguruma() {
        if (!this._vscodeOniguruma) {
            this._vscodeOniguruma = (async () => {
                const [vscodeOniguruma, wasm] = await Promise.all([
                    importAMDNodeModule('vscode-oniguruma', 'release/main.js'),
                    this._loadVSCodeOnigurumaWASM(),
                ]);
                await vscodeOniguruma.loadWASM({
                    data: wasm,
                    print: (str) => {
                        this._debugModePrintFunc(str);
                    },
                });
                return vscodeOniguruma;
            })();
        }
        return this._vscodeOniguruma;
    }
    async _loadVSCodeOnigurumaWASM() {
        if (isWeb) {
            const response = await fetch(resolveAmdNodeModulePath('vscode-oniguruma', 'release/onig.wasm'));
            // Using the response directly only works if the server sets the MIME type 'application/wasm'.
            // Otherwise, a TypeError is thrown when using the streaming compiler.
            // We therefore use the non-streaming compiler :(.
            return await response.arrayBuffer();
        }
        else {
            const response = await fetch(canASAR && this._environmentService.isBuilt
                ? FileAccess.asBrowserUri(`${nodeModulesAsarUnpackedPath}/vscode-oniguruma/release/onig.wasm`).toString(true)
                : FileAccess.asBrowserUri(`${nodeModulesPath}/vscode-oniguruma/release/onig.wasm`).toString(true));
            return response;
        }
    }
    _reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, fromWorker, isRandomSample) {
        const key = fromWorker ? 'async' : 'sync';
        // 50 events per hour (one event has a low probability)
        if (TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] > 50) {
            // Don't flood telemetry with too many events
            return;
        }
        if (TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] === 0) {
            setTimeout(() => {
                TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key] = 0;
            }, 1000 * 60 * 60);
        }
        TextMateTokenizationFeature_1.reportTokenizationTimeCounter[key]++;
        this._telemetryService.publicLog2('editor.tokenizedLine', {
            timeMs,
            languageId,
            lineLength,
            fromWorker,
            sourceExtensionId,
            isRandomSample,
            tokenizationSetting: this.getAsyncTokenizationEnabled()
                ? this.getAsyncTokenizationVerification()
                    ? 2
                    : 1
                : 0,
        });
    }
};
TextMateTokenizationFeature = TextMateTokenizationFeature_1 = __decorate([
    __param(0, ILanguageService),
    __param(1, IWorkbenchThemeService),
    __param(2, IExtensionResourceLoaderService),
    __param(3, INotificationService),
    __param(4, ILogService),
    __param(5, IConfigurationService),
    __param(6, IProgressService),
    __param(7, IWorkbenchEnvironmentService),
    __param(8, IInstantiationService),
    __param(9, ITelemetryService)
], TextMateTokenizationFeature);
export { TextMateTokenizationFeature };
function toColorMap(colorMap) {
    const result = [null];
    for (let i = 1, len = colorMap.length; i < len; i++) {
        result[i] = Color.fromHex(colorMap[i]);
    }
    return result;
}
function equalsTokenRules(a, b) {
    if (!b || !a || b.length !== a.length) {
        return false;
    }
    for (let i = b.length - 1; i >= 0; i--) {
        const r1 = b[i];
        const r2 = a[i];
        if (r1.scope !== r2.scope) {
            return false;
        }
        const s1 = r1.settings;
        const s2 = r2.settings;
        if (s1 && s2) {
            if (s1.fontStyle !== s2.fontStyle ||
                s1.foreground !== s2.foreground ||
                s1.background !== s2.background) {
                return false;
            }
        }
        else if (!s1 || !s2) {
            return false;
        }
    }
    return true;
}
function validateGrammarExtensionPoint(extensionLocation, syntax, collector, _languageService) {
    if (syntax.language &&
        (typeof syntax.language !== 'string' ||
            !_languageService.isRegisteredLanguageId(syntax.language))) {
        collector.error(nls.localize('invalid.language', 'Unknown language in `contributes.{0}.language`. Provided value: {1}', grammarsExtPoint.name, String(syntax.language)));
        return false;
    }
    if (!syntax.scopeName || typeof syntax.scopeName !== 'string') {
        collector.error(nls.localize('invalid.scopeName', 'Expected string in `contributes.{0}.scopeName`. Provided value: {1}', grammarsExtPoint.name, String(syntax.scopeName)));
        return false;
    }
    if (!syntax.path || typeof syntax.path !== 'string') {
        collector.error(nls.localize('invalid.path.0', 'Expected string in `contributes.{0}.path`. Provided value: {1}', grammarsExtPoint.name, String(syntax.path)));
        return false;
    }
    if (syntax.injectTo &&
        (!Array.isArray(syntax.injectTo) || syntax.injectTo.some((scope) => typeof scope !== 'string'))) {
        collector.error(nls.localize('invalid.injectTo', 'Invalid value in `contributes.{0}.injectTo`. Must be an array of language scope names. Provided value: {1}', grammarsExtPoint.name, JSON.stringify(syntax.injectTo)));
        return false;
    }
    if (syntax.embeddedLanguages && !types.isObject(syntax.embeddedLanguages)) {
        collector.error(nls.localize('invalid.embeddedLanguages', 'Invalid value in `contributes.{0}.embeddedLanguages`. Must be an object map from scope name to language. Provided value: {1}', grammarsExtPoint.name, JSON.stringify(syntax.embeddedLanguages)));
        return false;
    }
    if (syntax.tokenTypes && !types.isObject(syntax.tokenTypes)) {
        collector.error(nls.localize('invalid.tokenTypes', 'Invalid value in `contributes.{0}.tokenTypes`. Must be an object map from scope name to token type. Provided value: {1}', grammarsExtPoint.name, JSON.stringify(syntax.tokenTypes)));
        return false;
    }
    const grammarLocation = resources.joinPath(extensionLocation, syntax.path);
    if (!resources.isEqualOrParent(grammarLocation, extensionLocation)) {
        collector.warn(nls.localize('invalid.path.1', "Expected `contributes.{0}.path` ({1}) to be included inside extension's folder ({2}). This might make the extension non-portable.", grammarsExtPoint.name, grammarLocation.path, extensionLocation.path));
    }
    return true;
}
function observableConfigValue(key, languageId, defaultValue, configurationService) {
    return observableFromEvent((handleChange) => configurationService.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration(key, { overrideIdentifier: languageId })) {
            handleChange(e);
        }
    }), () => configurationService.getValue(key, { overrideIdentifier: languageId }) ?? defaultValue);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvdGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlSW1wbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQzVGLE9BQU8sS0FBSyxjQUFjLE1BQU0sNENBQTRDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRixPQUFPLEVBQ04sVUFBVSxFQUNWLDJCQUEyQixFQUMzQixlQUFlLEdBQ2YsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzQyxPQUFPLEVBQWUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEtBQUssS0FBSyxNQUFNLGtDQUFrQyxDQUFBO0FBR3pELE9BQU8sRUFFTix1QkFBdUIsRUFDdkIsb0JBQW9CLEdBQ3BCLE1BQU0sd0NBQXdDLENBQUE7QUFDL0MsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDM0csT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxnRkFBZ0YsQ0FBQTtBQUNoSSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBTTdGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzVHLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSw0QkFBNEIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlGLE9BQU8sRUFBMkIsZ0JBQWdCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQU1uRixPQUFPLEVBR04sc0JBQXNCLEdBQ3RCLE1BQU0sOENBQThDLENBQUE7QUFHOUMsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFDWixTQUFRLFVBQVU7O2FBR0gsa0NBQTZCLEdBQUcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQUFBeEIsQ0FBd0I7SUE2QnBFLFlBQ21CLGdCQUFtRCxFQUM3QyxhQUFzRCxFQUU5RSwrQkFBaUYsRUFDM0Qsb0JBQTJELEVBQ3BFLFdBQXlDLEVBQy9CLHFCQUE2RCxFQUNsRSxnQkFBbUQsRUFFckUsbUJBQWtFLEVBQzNDLHFCQUE2RCxFQUNqRSxpQkFBcUQ7UUFFeEUsS0FBSyxFQUFFLENBQUE7UUFiNEIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUM1QixrQkFBYSxHQUFiLGFBQWEsQ0FBd0I7UUFFN0Qsb0NBQStCLEdBQS9CLCtCQUErQixDQUFpQztRQUMxQyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ25ELGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2QsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNqRCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBRXBELHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBOEI7UUFDMUIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUNoRCxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBckN4RCxrQkFBYSxHQUFhLEVBQUUsQ0FBQTtRQUM1QiwwQkFBcUIsR0FBYyxFQUFFLENBQUE7UUFFOUMsZUFBVSxHQUFZLEtBQUssQ0FBQTtRQUMzQix3QkFBbUIsR0FBMEIsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFBO1FBRXJELHdCQUFtQixHQUFxQyxJQUFJLENBQUE7UUFDNUQsb0JBQWUsR0FBNEIsSUFBSSxDQUFBO1FBQ3RDLDZCQUF3QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1FBQ3pFLGtCQUFhLEdBQXFCLElBQUksQ0FBQTtRQUN0QywwQkFBcUIsR0FBb0IsSUFBSSxDQUFBO1FBQ3BDLHdDQUFtQyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQy9GLGtDQUFrQyxFQUNsQyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxFQUFFLENBQ3JFLElBQUksQ0FBQyx1QkFBdUIsQ0FDM0IsTUFBTSxFQUNOLFVBQVUsRUFDVixpQkFBaUIsRUFDakIsVUFBVSxFQUNWLElBQUksRUFDSixjQUFjLENBQ2QsRUFDRixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLEVBQUUsQ0FDeEMsQ0FBQTtRQXdYTyxxQkFBZ0IsR0FBc0QsSUFBSSxDQUFBO1FBdFdqRixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3RELElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLHNCQUFzQixDQUFBO1FBRXJELGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLHVCQUF1QixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7UUFFckYsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxHQUFHLEVBQUU7WUFDN0MsSUFBSSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQ0FBZ0MsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFO1lBQ3JFLElBQUksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQ3BDLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sMkJBQTJCO1FBQ2xDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQVUsdUNBQXVDLENBQUMsQ0FBQTtJQUMvRixDQUFDO0lBRU8sZ0NBQWdDO1FBQ3ZDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQzNDLG1EQUFtRCxDQUNuRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUM5QixVQUFxRTtRQUVyRSxJQUFJLENBQUMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO1FBQy9CLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDOUIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7UUFDNUIsQ0FBQztRQUNELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUVyQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO1FBQzdCLEtBQUssTUFBTSxTQUFTLElBQUksVUFBVSxFQUFFLENBQUM7WUFDcEMsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQTtZQUNoQyxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO2dCQUNoQyxNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQzVFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQztvQkFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO29CQUMvQyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsRUFBRSxDQUFDO3dCQUMvQixNQUFNLHVCQUF1QixHQUFHLElBQUksdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQ2hFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFTLENBQUMsQ0FDM0QsQ0FBQTt3QkFDRCxJQUFJLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7d0JBQzFELElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxHQUFHLENBQ2hDLG9CQUFvQixDQUFDLGVBQWUsQ0FDbkMsZ0JBQWdCLENBQUMsUUFBUSxFQUN6Qix1QkFBdUIsQ0FDdkIsQ0FDRCxDQUFBO29CQUNGLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLHFCQUFxQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRXhGLEtBQUssTUFBTSxXQUFXLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzlDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM5QyxDQUFDO0lBQ0YsQ0FBQztJQUVPLDBCQUEwQixDQUNqQyxTQUF5RCxFQUN6RCxPQUFnQztRQUVoQyxJQUNDLENBQUMsNkJBQTZCLENBQzdCLFNBQVMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQ3ZDLE9BQU8sRUFDUCxTQUFTLENBQUMsU0FBUyxFQUNuQixJQUFJLENBQUMsZ0JBQWdCLENBQ3JCLEVBQ0EsQ0FBQztZQUNGLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUVELE1BQU0sZUFBZSxHQUFHLFNBQVMsQ0FBQyxRQUFRLENBQ3pDLFNBQVMsQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEVBQ3ZDLE9BQU8sQ0FBQyxJQUFJLENBQ1osQ0FBQTtRQUVELE1BQU0saUJBQWlCLEdBQStCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekUsSUFBSSxPQUFPLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUMvQixNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3JELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDbkQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN2QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2pELElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQ2xDLGdDQUFnQztvQkFDaEMsU0FBUTtnQkFDVCxDQUFDO2dCQUNELElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7b0JBQzVELGlCQUFpQixDQUFDLEtBQUssQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDbEUsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxVQUFVLEdBQXVCLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDMUQsSUFBSSxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7WUFDOUMsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQztnQkFDNUIsTUFBTSxTQUFTLEdBQUcsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDM0MsUUFBUSxTQUFTLEVBQUUsQ0FBQztvQkFDbkIsS0FBSyxRQUFRO3dCQUNaLFVBQVUsQ0FBQyxLQUFLLENBQUMsbUNBQTJCLENBQUE7d0JBQzVDLE1BQUs7b0JBQ04sS0FBSyxPQUFPO3dCQUNYLFVBQVUsQ0FBQyxLQUFLLENBQUMsa0NBQTBCLENBQUE7d0JBQzNDLE1BQUs7b0JBQ04sS0FBSyxTQUFTO3dCQUNiLFVBQVUsQ0FBQyxLQUFLLENBQUMsb0NBQTRCLENBQUE7d0JBQzdDLE1BQUs7Z0JBQ1AsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxlQUFlLEdBQ3BCLE9BQU8sQ0FBQyxRQUFRLElBQUksSUFBSSxDQUFDLGdCQUFnQixDQUFDLHNCQUFzQixDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7WUFDakYsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRO1lBQ2xCLENBQUMsQ0FBQyxTQUFTLENBQUE7UUFFYixTQUFTLGFBQWEsQ0FBQyxLQUFjLEVBQUUsWUFBc0I7WUFDNUQsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsT0FBTyxZQUFZLENBQUE7WUFDcEIsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsRUFBRSxDQUFDO2dCQUNoRCxPQUFPLFlBQVksQ0FBQTtZQUNwQixDQUFDO1lBQ0QsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBRUQsT0FBTztZQUNOLFFBQVEsRUFBRSxlQUFlO1lBQ3pCLFFBQVEsRUFBRSxlQUFlO1lBQ3pCLFNBQVMsRUFBRSxPQUFPLENBQUMsU0FBUztZQUM1QixpQkFBaUIsRUFBRSxpQkFBaUI7WUFDcEMsVUFBVSxFQUFFLFVBQVU7WUFDdEIsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1lBQzFCLHdCQUF3QixFQUFFLGFBQWEsQ0FBQyxPQUFPLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUM3RSwwQkFBMEIsRUFBRSxhQUFhLENBQUMsT0FBTyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUM5RSxpQkFBaUIsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLEVBQUU7U0FDM0MsQ0FBQTtJQUNGLENBQUM7SUFFTSxjQUFjLENBQUMsT0FBOEIsRUFBRSxNQUFrQjtRQUN2RSxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQyxDQUFBO1lBQ3JGLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLG1CQUFtQixHQUFHLE9BQU8sQ0FBQTtRQUNsQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksQ0FBQTtRQUV0QixJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUNqQztnQkFDQyxRQUFRLHdDQUErQjtnQkFDdkMsT0FBTyxFQUFFLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUM7YUFDdkMsRUFDRCxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUNaLFFBQVEsQ0FBQyxNQUFNLENBQUM7b0JBQ2YsT0FBTyxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQ3BCLFdBQVcsRUFDWCxnRUFBZ0UsQ0FDaEU7aUJBQ0QsQ0FBQyxDQUFBO2dCQUVGLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsZUFBZSxFQUFFLEVBQUU7b0JBQzFELGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDekMsUUFBUSxDQUFDLE1BQU0sQ0FBQzt3QkFDZixPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FDcEIsV0FBVyxFQUNYLDJEQUEyRCxDQUMzRDtxQkFDRCxDQUFDLENBQUE7b0JBQ0YsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRSxHQUFFLENBQUMsQ0FBQyxDQUFBO2dCQUNsRCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsRUFDRCxDQUFDLE1BQU0sRUFBRSxFQUFFO2dCQUNWLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLGVBQWUsRUFBRSxFQUFFO29CQUNuRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsR0FBRyxFQUFFLEdBQUUsQ0FBQyxDQUFBO29CQUNuQyxJQUFJLENBQUMsVUFBVSxHQUFHLEtBQUssQ0FBQTtvQkFDdkIsZUFBZSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFBO29CQUMxQyxNQUFNLEVBQUUsQ0FBQTtnQkFDVCxDQUFDLENBQUMsQ0FBQTtZQUNILENBQUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyx3QkFBd0I7UUFDL0Isb0NBQW9DO1FBQ3BDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNsQyxDQUFDO0lBQ08sS0FBSyxDQUFDLDBCQUEwQjtRQUN2QyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLEdBQUcsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO1lBQzNELG1CQUFtQixDQUFtQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQztZQUMzRixJQUFJLENBQUMsbUJBQW1CLEVBQUU7U0FDMUIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxPQUFPLEdBQXNCLE9BQU8sQ0FBQyxPQUFPLENBQUM7WUFDbEQsaUJBQWlCLEVBQUUsQ0FBQyxPQUFpQixFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDO1lBQ3BGLGdCQUFnQixFQUFFLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDO1NBQ3hFLENBQUMsQ0FBQTtRQUVGLGlDQUFpQztRQUNqQyxJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUMxQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7UUFDNUIsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxnQkFBZ0IsQ0FDMUM7WUFDQyxRQUFRLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQztZQUN0RCxRQUFRLEVBQUUsQ0FBQyxHQUFXLEVBQUUsR0FBUSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO1lBQ3JFLFFBQVEsRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFLENBQzNCLElBQUksQ0FBQywrQkFBK0IsQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQUM7U0FDckUsRUFDRCxJQUFJLENBQUMsbUJBQW1CLElBQUksRUFBRSxFQUM5QixjQUFjLEVBQ2QsT0FBTyxDQUNQLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsYUFBYSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFM0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFTyxLQUFLLENBQUMsMEJBQTBCLENBQ3ZDLFVBQWtCO1FBRWxCLElBQUksQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUMvRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLHdCQUF3QixFQUFFLEVBQUUsQ0FBQztZQUN0QyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLGNBQWMsR0FBRyxNQUFNLElBQUksQ0FBQywwQkFBMEIsRUFBRSxDQUFBO1lBQzlELElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztZQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUM1RixNQUFNLENBQUMsR0FBRyxNQUFNLGNBQWMsQ0FBQyxhQUFhLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUE7WUFDM0UsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDaEIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsTUFBTSx5QkFBeUIsR0FBRyxxQkFBcUIsQ0FDdEQsa0NBQWtDLEVBQ2xDLFVBQVUsRUFDVixDQUFDLENBQUMsRUFDRixJQUFJLENBQUMscUJBQXFCLENBQzFCLENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBQ25DLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQzdCLElBQUksMkJBQTJCLENBQzlCLENBQUMsQ0FBQyxPQUFPLEVBQ1QsQ0FBQyxDQUFDLFlBQVksRUFDZCxDQUFDLENBQUMseUJBQXlCLEVBQzNCLENBQUMsU0FBUyxFQUFFLFVBQVUsRUFBRSxFQUFFLENBQ3pCLElBQUksQ0FBQyxtQ0FBbUMsQ0FBQyx5QkFBeUIsQ0FDakUsU0FBUyxFQUNULFVBQVUsRUFDVix5QkFBeUIsQ0FDekIsRUFDRixHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUUsRUFDN0MsQ0FBQyxNQUFNLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxFQUFFO2dCQUN0QyxJQUFJLENBQUMsdUJBQXVCLENBQzNCLE1BQU0sRUFDTixVQUFVLEVBQ1YsQ0FBQyxDQUFDLGlCQUFpQixFQUNuQixVQUFVLEVBQ1YsS0FBSyxFQUNMLGNBQWMsQ0FDZCxDQUFBO1lBQ0YsQ0FBQyxFQUNELElBQUksQ0FDSixDQUNELENBQUE7WUFDRCxLQUFLLENBQUMsR0FBRyxDQUNSLFlBQVksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLEVBQUU7Z0JBQ3pELElBQUksQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO29CQUNwRCxNQUFNLFVBQVUsR0FDZixJQUFJLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLGdCQUFnQixDQUFDLGlCQUFpQixDQUFDLENBQUE7b0JBQzFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLElBQUksQ0FBQTtvQkFDcEQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLDRCQUE0QixDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUMvRCxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtZQUVELE9BQU8sSUFBSSxnQ0FBZ0MsQ0FDMUMsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixLQUFLLEVBQ0wseUJBQXlCLENBQ3pCLENBQUE7UUFDRixDQUFDO1FBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztZQUNkLElBQUksR0FBRyxDQUFDLE9BQU8sSUFBSSxHQUFHLENBQUMsT0FBTyxLQUFLLDRCQUE0QixFQUFFLENBQUM7Z0JBQ2pFLCtCQUErQjtnQkFDL0IsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1lBQ0QsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDdEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO0lBQ0YsQ0FBQztJQUVPLFlBQVksQ0FBQyxVQUFnQyxFQUFFLFdBQW9CO1FBQzFFLElBQ0MsQ0FBQyxXQUFXO1lBQ1osSUFBSSxDQUFDLGFBQWE7WUFDbEIsSUFBSSxDQUFDLHFCQUFxQjtZQUMxQixnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3JFLFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsVUFBVSxDQUFDLGFBQWEsQ0FBQyxFQUMvRCxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsYUFBYSxHQUFHLEVBQUUsSUFBSSxFQUFFLFVBQVUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNqRixJQUFJLENBQUMscUJBQXFCLEdBQUcsVUFBVSxDQUFDLGFBQWEsQ0FBQTtRQUVyRCxJQUFJLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sUUFBUSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMscUJBQXFCLENBQUMsQ0FBQTtRQUN2RCxNQUFNLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsYUFBYSxDQUFDLFdBQVcsR0FBRyxRQUFRLENBQUE7UUFDekMsb0JBQW9CLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBRTFDLElBQUksSUFBSSxDQUFDLGFBQWEsSUFBSSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsbUNBQW1DLENBQUMsV0FBVyxDQUNuRCxJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMscUJBQXFCLENBQzFCLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxlQUFlLENBQUMsVUFBa0I7UUFDOUMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQy9ELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sY0FBYyxHQUFHLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixFQUFFLENBQUE7UUFDOUQsSUFBSSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUYsTUFBTSxFQUFFLE9BQU8sRUFBRSxHQUFHLE1BQU0sY0FBYyxDQUFDLGFBQWEsQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQTtRQUNyRixPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFHTyxtQkFBbUI7UUFDMUIsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzVCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxDQUFDLEtBQUssSUFBSSxFQUFFO2dCQUNuQyxNQUFNLENBQUMsZUFBZSxFQUFFLElBQUksQ0FBQyxHQUFHLE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQztvQkFDakQsbUJBQW1CLENBQ2xCLGtCQUFrQixFQUNsQixpQkFBaUIsQ0FDakI7b0JBQ0QsSUFBSSxDQUFDLHdCQUF3QixFQUFFO2lCQUMvQixDQUFDLENBQUE7Z0JBQ0YsTUFBTSxlQUFlLENBQUMsUUFBUSxDQUFDO29CQUM5QixJQUFJLEVBQUUsSUFBSTtvQkFDVixLQUFLLEVBQUUsQ0FBQyxHQUFXLEVBQUUsRUFBRTt3QkFDdEIsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFBO29CQUM5QixDQUFDO2lCQUNELENBQUMsQ0FBQTtnQkFDRixPQUFPLGVBQWUsQ0FBQTtZQUN2QixDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ0wsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGdCQUFnQixDQUFBO0lBQzdCLENBQUM7SUFFTyxLQUFLLENBQUMsd0JBQXdCO1FBQ3JDLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FDM0Isd0JBQXdCLENBQUMsa0JBQWtCLEVBQUUsbUJBQW1CLENBQUMsQ0FDakUsQ0FBQTtZQUNELDhGQUE4RjtZQUM5RixzRUFBc0U7WUFDdEUsa0RBQWtEO1lBQ2xELE9BQU8sTUFBTSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLFFBQVEsR0FBRyxNQUFNLEtBQUssQ0FDM0IsT0FBTyxJQUFJLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxPQUFPO2dCQUMxQyxDQUFDLENBQUMsVUFBVSxDQUFDLFlBQVksQ0FDdkIsR0FBRywyQkFBMkIscUNBQXFDLENBQ25FLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztnQkFDakIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQ3ZCLEdBQUcsZUFBZSxxQ0FBcUMsQ0FDdkQsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQ2xCLENBQUE7WUFDRCxPQUFPLFFBQVEsQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUM5QixNQUFjLEVBQ2QsVUFBa0IsRUFDbEIsaUJBQXFDLEVBQ3JDLFVBQWtCLEVBQ2xCLFVBQW1CLEVBQ25CLGNBQXVCO1FBRXZCLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFFekMsdURBQXVEO1FBQ3ZELElBQUksNkJBQTJCLENBQUMsNkJBQTZCLENBQUMsR0FBRyxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUM7WUFDekUsNkNBQTZDO1lBQzdDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSw2QkFBMkIsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMxRSxVQUFVLENBQ1QsR0FBRyxFQUFFO2dCQUNKLDZCQUEyQixDQUFDLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNuRSxDQUFDLEVBQ0QsSUFBSSxHQUFHLEVBQUUsR0FBRyxFQUFFLENBQ2QsQ0FBQTtRQUNGLENBQUM7UUFDRCw2QkFBMkIsQ0FBQyw2QkFBNkIsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFBO1FBRWhFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBbUQvQixzQkFBc0IsRUFBRTtZQUN6QixNQUFNO1lBQ04sVUFBVTtZQUNWLFVBQVU7WUFDVixVQUFVO1lBQ1YsaUJBQWlCO1lBQ2pCLGNBQWM7WUFDZCxtQkFBbUIsRUFBRSxJQUFJLENBQUMsMkJBQTJCLEVBQUU7Z0JBQ3RELENBQUMsQ0FBQyxJQUFJLENBQUMsZ0NBQWdDLEVBQUU7b0JBQ3hDLENBQUMsQ0FBQyxDQUFDO29CQUNILENBQUMsQ0FBQyxDQUFDO2dCQUNKLENBQUMsQ0FBQyxDQUFDO1NBQ0osQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUE5aEJXLDJCQUEyQjtJQWtDckMsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLHNCQUFzQixDQUFBO0lBQ3RCLFdBQUEsK0JBQStCLENBQUE7SUFFL0IsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLFdBQVcsQ0FBQTtJQUNYLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLDRCQUE0QixDQUFBO0lBRTVCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtHQTdDUCwyQkFBMkIsQ0EraEJ2Qzs7QUFFRCxTQUFTLFVBQVUsQ0FBQyxRQUFrQjtJQUNyQyxNQUFNLE1BQU0sR0FBWSxDQUFDLElBQUssQ0FBQyxDQUFBO0lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLEdBQUcsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUNyRCxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FDeEIsQ0FBZ0MsRUFDaEMsQ0FBZ0M7SUFFaEMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN2QyxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUN4QyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDZixJQUFJLEVBQUUsQ0FBQyxLQUFLLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQzNCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxRQUFRLENBQUE7UUFDdEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFFBQVEsQ0FBQTtRQUN0QixJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUNkLElBQ0MsRUFBRSxDQUFDLFNBQVMsS0FBSyxFQUFFLENBQUMsU0FBUztnQkFDN0IsRUFBRSxDQUFDLFVBQVUsS0FBSyxFQUFFLENBQUMsVUFBVTtnQkFDL0IsRUFBRSxDQUFDLFVBQVUsS0FBSyxFQUFFLENBQUMsVUFBVSxFQUM5QixDQUFDO2dCQUNGLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNGLENBQUM7YUFBTSxJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVELFNBQVMsNkJBQTZCLENBQ3JDLGlCQUFzQixFQUN0QixNQUErQixFQUMvQixTQUFvQyxFQUNwQyxnQkFBa0M7SUFFbEMsSUFDQyxNQUFNLENBQUMsUUFBUTtRQUNmLENBQUMsT0FBTyxNQUFNLENBQUMsUUFBUSxLQUFLLFFBQVE7WUFDbkMsQ0FBQyxnQkFBZ0IsQ0FBQyxzQkFBc0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsRUFDMUQsQ0FBQztRQUNGLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxrQkFBa0IsRUFDbEIscUVBQXFFLEVBQ3JFLGdCQUFnQixDQUFDLElBQUksRUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FDdkIsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUksT0FBTyxNQUFNLENBQUMsU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQy9ELFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxtQkFBbUIsRUFDbkIscUVBQXFFLEVBQ3JFLGdCQUFnQixDQUFDLElBQUksRUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FDeEIsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksT0FBTyxNQUFNLENBQUMsSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3JELFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxnQkFBZ0IsRUFDaEIsZ0VBQWdFLEVBQ2hFLGdCQUFnQixDQUFDLElBQUksRUFDckIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FDbkIsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsSUFDQyxNQUFNLENBQUMsUUFBUTtRQUNmLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsRUFDOUYsQ0FBQztRQUNGLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxrQkFBa0IsRUFDbEIsNEdBQTRHLEVBQzVHLGdCQUFnQixDQUFDLElBQUksRUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQy9CLENBQ0QsQ0FBQTtRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELElBQUksTUFBTSxDQUFDLGlCQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1FBQzNFLFNBQVMsQ0FBQyxLQUFLLENBQ2QsR0FBRyxDQUFDLFFBQVEsQ0FDWCwyQkFBMkIsRUFDM0IsOEhBQThILEVBQzlILGdCQUFnQixDQUFDLElBQUksRUFDckIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsQ0FDeEMsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxNQUFNLENBQUMsVUFBVSxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztRQUM3RCxTQUFTLENBQUMsS0FBSyxDQUNkLEdBQUcsQ0FBQyxRQUFRLENBQ1gsb0JBQW9CLEVBQ3BCLHlIQUF5SCxFQUN6SCxnQkFBZ0IsQ0FBQyxJQUFJLEVBQ3JCLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUNqQyxDQUNELENBQUE7UUFDRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxNQUFNLGVBQWUsR0FBRyxTQUFTLENBQUMsUUFBUSxDQUFDLGlCQUFpQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxRSxJQUFJLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxlQUFlLEVBQUUsaUJBQWlCLENBQUMsRUFBRSxDQUFDO1FBQ3BFLFNBQVMsQ0FBQyxJQUFJLENBQ2IsR0FBRyxDQUFDLFFBQVEsQ0FDWCxnQkFBZ0IsRUFDaEIsbUlBQW1JLEVBQ25JLGdCQUFnQixDQUFDLElBQUksRUFDckIsZUFBZSxDQUFDLElBQUksRUFDcEIsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUNELENBQUE7SUFDRixDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUE7QUFDWixDQUFDO0FBRUQsU0FBUyxxQkFBcUIsQ0FDN0IsR0FBVyxFQUNYLFVBQWtCLEVBQ2xCLFlBQWUsRUFDZixvQkFBMkM7SUFFM0MsT0FBTyxtQkFBbUIsQ0FDekIsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNoQixvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25ELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsRUFBRSxFQUFFLGtCQUFrQixFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNyRSxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUMsQ0FBQyxFQUNILEdBQUcsRUFBRSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBSSxHQUFHLEVBQUUsRUFBRSxrQkFBa0IsRUFBRSxVQUFVLEVBQUUsQ0FBQyxJQUFJLFlBQVksQ0FDL0YsQ0FBQTtBQUNGLENBQUMifQ==