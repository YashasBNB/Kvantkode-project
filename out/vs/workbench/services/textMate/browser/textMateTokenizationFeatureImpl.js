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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1hdGVUb2tlbml6YXRpb25GZWF0dXJlSW1wbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL3RleHRNYXRlVG9rZW5pemF0aW9uRmVhdHVyZUltcGwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1RixPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxNQUFNLElBQUksVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUNOLFVBQVUsRUFDViwyQkFBMkIsRUFDM0IsZUFBZSxHQUNmLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUFlLG1CQUFtQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxLQUFLLEtBQUssTUFBTSxrQ0FBa0MsQ0FBQTtBQUd6RCxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLG9CQUFvQixHQUNwQixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFB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