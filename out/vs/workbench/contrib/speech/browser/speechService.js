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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BlZWNoU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NwZWVjaC9icm93c2VyL3NwZWVjaFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBR04saUJBQWlCLEVBRWpCLHNCQUFzQixFQUN0Qix3QkFBd0IsRUFDeEIsa0JBQWtCLEVBQ2xCLDhCQUE4QixFQUM5QixzQkFBc0IsRUFFdEIsc0JBQXNCLEVBQ3RCLGtCQUFrQixHQUNsQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1E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