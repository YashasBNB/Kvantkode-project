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
import { localize } from '../../../../nls.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../../base/common/lifecycle.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { DeferredPromise } from '../../../../base/common/async.js';
import { HasSpeechProvider, SpeechToTextInProgress, KeywordRecognitionStatus, SpeechToTextStatus, speechLanguageConfigToLanguage, SPEECH_LANGUAGE_CONFIG, TextToSpeechInProgress, TextToSpeechStatus, } from '../common/speechService.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ExtensionsRegistry } from '../../../services/extensions/common/extensionsRegistry.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
const speechProvidersExtensionPoint = ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'speechProviders',
    jsonSchema: {
        description: localize('vscode.extension.contributes.speechProvider', 'Contributes a Speech Provider'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            defaultSnippets: [{ body: { name: '', description: '' } }],
            required: ['name'],
            properties: {
                name: {
                    description: localize('speechProviderName', 'Unique name for this Speech Provider.'),
                    type: 'string',
                },
                description: {
                    description: localize('speechProviderDescription', 'A description of this Speech Provider, shown in the UI.'),
                    type: 'string',
                },
            },
        },
    },
});
let SpeechService = class SpeechService extends Disposable {
    get hasSpeechProvider() {
        return this.providerDescriptors.size > 0 || this.providers.size > 0;
    }
    constructor(logService, contextKeyService, hostService, telemetryService, configurationService, extensionService) {
        super();
        this.logService = logService;
        this.hostService = hostService;
        this.telemetryService = telemetryService;
        this.configurationService = configurationService;
        this.extensionService = extensionService;
        this._onDidChangeHasSpeechProvider = this._register(new Emitter());
        this.onDidChangeHasSpeechProvider = this._onDidChangeHasSpeechProvider.event;
        this.providers = new Map();
        this.providerDescriptors = new Map();
        //#region Speech to Text
        this._onDidStartSpeechToTextSession = this._register(new Emitter());
        this.onDidStartSpeechToTextSession = this._onDidStartSpeechToTextSession.event;
        this._onDidEndSpeechToTextSession = this._register(new Emitter());
        this.onDidEndSpeechToTextSession = this._onDidEndSpeechToTextSession.event;
        this.activeSpeechToTextSessions = 0;
        //#endregion
        //#region Text to Speech
        this._onDidStartTextToSpeechSession = this._register(new Emitter());
        this.onDidStartTextToSpeechSession = this._onDidStartTextToSpeechSession.event;
        this._onDidEndTextToSpeechSession = this._register(new Emitter());
        this.onDidEndTextToSpeechSession = this._onDidEndTextToSpeechSession.event;
        this.activeTextToSpeechSessions = 0;
        //#endregion
        //#region Keyword Recognition
        this._onDidStartKeywordRecognition = this._register(new Emitter());
        this.onDidStartKeywordRecognition = this._onDidStartKeywordRecognition.event;
        this._onDidEndKeywordRecognition = this._register(new Emitter());
        this.onDidEndKeywordRecognition = this._onDidEndKeywordRecognition.event;
        this.activeKeywordRecognitionSessions = 0;
        this.hasSpeechProviderContext = HasSpeechProvider.bindTo(contextKeyService);
        this.textToSpeechInProgress = TextToSpeechInProgress.bindTo(contextKeyService);
        this.speechToTextInProgress = SpeechToTextInProgress.bindTo(contextKeyService);
        this.handleAndRegisterSpeechExtensions();
    }
    handleAndRegisterSpeechExtensions() {
        speechProvidersExtensionPoint.setHandler((extensions, delta) => {
            const oldHasSpeechProvider = this.hasSpeechProvider;
            for (const extension of delta.removed) {
                for (const descriptor of extension.value) {
                    this.providerDescriptors.delete(descriptor.name);
                }
            }
            for (const extension of delta.added) {
                for (const descriptor of extension.value) {
                    this.providerDescriptors.set(descriptor.name, descriptor);
                }
            }
            if (oldHasSpeechProvider !== this.hasSpeechProvider) {
                this.handleHasSpeechProviderChange();
            }
        });
    }
    registerSpeechProvider(identifier, provider) {
        if (this.providers.has(identifier)) {
            throw new Error(`Speech provider with identifier ${identifier} is already registered.`);
        }
        const oldHasSpeechProvider = this.hasSpeechProvider;
        this.providers.set(identifier, provider);
        if (oldHasSpeechProvider !== this.hasSpeechProvider) {
            this.handleHasSpeechProviderChange();
        }
        return toDisposable(() => {
            const oldHasSpeechProvider = this.hasSpeechProvider;
            this.providers.delete(identifier);
            if (oldHasSpeechProvider !== this.hasSpeechProvider) {
                this.handleHasSpeechProviderChange();
            }
        });
    }
    handleHasSpeechProviderChange() {
        this.hasSpeechProviderContext.set(this.hasSpeechProvider);
        this._onDidChangeHasSpeechProvider.fire();
    }
    get hasActiveSpeechToTextSession() {
        return this.activeSpeechToTextSessions > 0;
    }
    async createSpeechToTextSession(token, context = 'speech') {
        const provider = await this.getProvider();
        const language = speechLanguageConfigToLanguage(this.configurationService.getValue(SPEECH_LANGUAGE_CONFIG));
        const session = provider.createSpeechToTextSession(token, typeof language === 'string' ? { language } : undefined);
        const sessionStart = Date.now();
        let sessionRecognized = false;
        let sessionError = false;
        let sessionContentLength = 0;
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = () => {
            this.activeSpeechToTextSessions = Math.max(0, this.activeSpeechToTextSessions - 1);
            if (!this.hasActiveSpeechToTextSession) {
                this.speechToTextInProgress.reset();
            }
            this._onDidEndSpeechToTextSession.fire();
            this.telemetryService.publicLog2('speechToTextSession', {
                context,
                sessionDuration: Date.now() - sessionStart,
                sessionRecognized,
                sessionError,
                sessionContentLength,
                sessionLanguage: language,
            });
            disposables.dispose();
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled()));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled();
        }
        disposables.add(session.onDidChange((e) => {
            switch (e.status) {
                case SpeechToTextStatus.Started:
                    this.activeSpeechToTextSessions++;
                    this.speechToTextInProgress.set(true);
                    this._onDidStartSpeechToTextSession.fire();
                    break;
                case SpeechToTextStatus.Recognizing:
                    sessionRecognized = true;
                    break;
                case SpeechToTextStatus.Recognized:
                    if (typeof e.text === 'string') {
                        sessionContentLength += e.text.length;
                    }
                    break;
                case SpeechToTextStatus.Stopped:
                    onSessionStoppedOrCanceled();
                    break;
                case SpeechToTextStatus.Error:
                    this.logService.error(`Speech provider error in speech to text session: ${e.text}`);
                    sessionError = true;
                    break;
            }
        }));
        return session;
    }
    async getProvider() {
        // Send out extension activation to ensure providers can register
        await this.extensionService.activateByEvent('onSpeech');
        const provider = Array.from(this.providers.values()).at(0);
        if (!provider) {
            throw new Error(`No Speech provider is registered.`);
        }
        else if (this.providers.size > 1) {
            this.logService.warn(`Multiple speech providers registered. Picking first one: ${provider.metadata.displayName}`);
        }
        return provider;
    }
    get hasActiveTextToSpeechSession() {
        return this.activeTextToSpeechSessions > 0;
    }
    async createTextToSpeechSession(token, context = 'speech') {
        const provider = await this.getProvider();
        const language = speechLanguageConfigToLanguage(this.configurationService.getValue(SPEECH_LANGUAGE_CONFIG));
        const session = provider.createTextToSpeechSession(token, typeof language === 'string' ? { language } : undefined);
        const sessionStart = Date.now();
        let sessionError = false;
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = (dispose) => {
            this.activeTextToSpeechSessions = Math.max(0, this.activeTextToSpeechSessions - 1);
            if (!this.hasActiveTextToSpeechSession) {
                this.textToSpeechInProgress.reset();
            }
            this._onDidEndTextToSpeechSession.fire();
            this.telemetryService.publicLog2('textToSpeechSession', {
                context,
                sessionDuration: Date.now() - sessionStart,
                sessionError,
                sessionLanguage: language,
            });
            if (dispose) {
                disposables.dispose();
            }
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled(true)));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled(true);
        }
        disposables.add(session.onDidChange((e) => {
            switch (e.status) {
                case TextToSpeechStatus.Started:
                    this.activeTextToSpeechSessions++;
                    this.textToSpeechInProgress.set(true);
                    this._onDidStartTextToSpeechSession.fire();
                    break;
                case TextToSpeechStatus.Stopped:
                    onSessionStoppedOrCanceled(false);
                    break;
                case TextToSpeechStatus.Error:
                    this.logService.error(`Speech provider error in text to speech session: ${e.text}`);
                    sessionError = true;
                    break;
            }
        }));
        return session;
    }
    get hasActiveKeywordRecognition() {
        return this.activeKeywordRecognitionSessions > 0;
    }
    async recognizeKeyword(token) {
        const result = new DeferredPromise();
        const disposables = new DisposableStore();
        disposables.add(token.onCancellationRequested(() => {
            disposables.dispose();
            result.complete(KeywordRecognitionStatus.Canceled);
        }));
        const recognizeKeywordDisposables = disposables.add(new DisposableStore());
        let activeRecognizeKeywordSession = undefined;
        const recognizeKeyword = () => {
            recognizeKeywordDisposables.clear();
            const cts = new CancellationTokenSource(token);
            recognizeKeywordDisposables.add(toDisposable(() => cts.dispose(true)));
            const currentRecognizeKeywordSession = (activeRecognizeKeywordSession =
                this.doRecognizeKeyword(cts.token).then((status) => {
                    if (currentRecognizeKeywordSession === activeRecognizeKeywordSession) {
                        result.complete(status);
                    }
                }, (error) => {
                    if (currentRecognizeKeywordSession === activeRecognizeKeywordSession) {
                        result.error(error);
                    }
                }));
        };
        disposables.add(this.hostService.onDidChangeFocus((focused) => {
            if (!focused && activeRecognizeKeywordSession) {
                recognizeKeywordDisposables.clear();
                activeRecognizeKeywordSession = undefined;
            }
            else if (!activeRecognizeKeywordSession) {
                recognizeKeyword();
            }
        }));
        if (this.hostService.hasFocus) {
            recognizeKeyword();
        }
        let status;
        try {
            status = await result.p;
        }
        finally {
            disposables.dispose();
        }
        this.telemetryService.publicLog2('keywordRecognition', {
            keywordRecognized: status === KeywordRecognitionStatus.Recognized,
        });
        return status;
    }
    async doRecognizeKeyword(token) {
        const provider = await this.getProvider();
        const session = provider.createKeywordRecognitionSession(token);
        this.activeKeywordRecognitionSessions++;
        this._onDidStartKeywordRecognition.fire();
        const disposables = new DisposableStore();
        const onSessionStoppedOrCanceled = () => {
            this.activeKeywordRecognitionSessions = Math.max(0, this.activeKeywordRecognitionSessions - 1);
            this._onDidEndKeywordRecognition.fire();
            disposables.dispose();
        };
        disposables.add(token.onCancellationRequested(() => onSessionStoppedOrCanceled()));
        if (token.isCancellationRequested) {
            onSessionStoppedOrCanceled();
        }
        disposables.add(session.onDidChange((e) => {
            if (e.status === KeywordRecognitionStatus.Stopped) {
                onSessionStoppedOrCanceled();
            }
        }));
        try {
            return (await Event.toPromise(session.onDidChange)).status;
        }
        finally {
            onSessionStoppedOrCanceled();
        }
    }
};
SpeechService = __decorate([
    __param(0, ILogService),
    __param(1, IContextKeyService),
    __param(2, IHostService),
    __param(3, ITelemetryService),
    __param(4, IConfigurationService),
    __param(5, IExtensionService)
], SpeechService);
export { SpeechService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc3BlZWNoL2Jyb3dzZXIvc3BlZWNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBRWYsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2xFLE9BQU8sRUFHTixpQkFBaUIsRUFFakIsc0JBQXNCLEVBQ3RCLHdCQUF3QixFQUN4QixrQkFBa0IsRUFDbEIsOEJBQThCLEVBQzlCLHNCQUFzQixFQUV0QixzQkFBc0IsRUFDdEIsa0JBQWtCLEdBQ2xCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDOUYsT0FBTyxF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