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
import { raceCancellation } from '../../../base/common/async.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { ISpeechService, TextToSpeechStatus, } from '../../contrib/speech/common/speechService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadSpeech = class MainThreadSpeech {
    constructor(extHostContext, speechService, logService) {
        this.speechService = speechService;
        this.logService = logService;
        this.providerRegistrations = new Map();
        this.speechToTextSessions = new Map();
        this.textToSpeechSessions = new Map();
        this.keywordRecognitionSessions = new Map();
        this.proxy = extHostContext.getProxy(ExtHostContext.ExtHostSpeech);
    }
    $registerProvider(handle, identifier, metadata) {
        this.logService.trace('[Speech] extension registered provider', metadata.extension.value);
        const registration = this.speechService.registerSpeechProvider(identifier, {
            metadata,
            createSpeechToTextSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None,
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createSpeechToTextSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.speechToTextSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelSpeechToTextSession(session);
                    this.speechToTextSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event,
                };
            },
            createTextToSpeechSession: (token, options) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None,
                        synthesize: async () => { },
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createTextToSpeechSession(handle, session, options?.language);
                const onDidChange = disposables.add(new Emitter());
                this.textToSpeechSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelTextToSpeechSession(session);
                    this.textToSpeechSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event,
                    synthesize: async (text) => {
                        await this.proxy.$synthesizeSpeech(session, text);
                        await raceCancellation(Event.toPromise(Event.filter(onDidChange.event, (e) => e.status === TextToSpeechStatus.Stopped)), token);
                    },
                };
            },
            createKeywordRecognitionSession: (token) => {
                if (token.isCancellationRequested) {
                    return {
                        onDidChange: Event.None,
                    };
                }
                const disposables = new DisposableStore();
                const session = Math.random();
                this.proxy.$createKeywordRecognitionSession(handle, session);
                const onDidChange = disposables.add(new Emitter());
                this.keywordRecognitionSessions.set(session, { onDidChange });
                disposables.add(token.onCancellationRequested(() => {
                    this.proxy.$cancelKeywordRecognitionSession(session);
                    this.keywordRecognitionSessions.delete(session);
                    disposables.dispose();
                }));
                return {
                    onDidChange: onDidChange.event,
                };
            },
        });
        this.providerRegistrations.set(handle, {
            dispose: () => {
                registration.dispose();
            },
        });
    }
    $unregisterProvider(handle) {
        const registration = this.providerRegistrations.get(handle);
        if (registration) {
            registration.dispose();
            this.providerRegistrations.delete(handle);
        }
    }
    $emitSpeechToTextEvent(session, event) {
        const providerSession = this.speechToTextSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitTextToSpeechEvent(session, event) {
        const providerSession = this.textToSpeechSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    $emitKeywordRecognitionEvent(session, event) {
        const providerSession = this.keywordRecognitionSessions.get(session);
        providerSession?.onDidChange.fire(event);
    }
    dispose() {
        this.providerRegistrations.forEach((disposable) => disposable.dispose());
        this.providerRegistrations.clear();
        this.speechToTextSessions.forEach((session) => session.onDidChange.dispose());
        this.speechToTextSessions.clear();
        this.textToSpeechSessions.forEach((session) => session.onDidChange.dispose());
        this.textToSpeechSessions.clear();
        this.keywordRecognitionSessions.forEach((session) => session.onDidChange.dispose());
        this.keywordRecognitionSessions.clear();
    }
};
MainThreadSpeech = __decorate([
    extHostNamedCustomer(MainContext.MainThreadSpeech),
    __param(1, ISpeechService),
    __param(2, ILogService)
], MainThreadSpeech);
export { MainThreadSpeech };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFNwZWVjaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTcGVlY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTixjQUFjLEVBRWQsV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUdOLGNBQWMsRUFHZCxrQkFBa0IsR0FDbEIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFldEQsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxnQkFBZ0I7SUFTNUIsWUFDQyxjQUErQixFQUNmLGFBQThDLEVBQ2pELFVBQXdDO1FBRHBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUNoQyxlQUFVLEdBQVYsVUFBVSxDQUFhO1FBVHJDLDBCQUFxQixHQUFHLElBQUksR0FBRyxFQUF1QixDQUFBO1FBRXRELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFBO1FBQzdELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUErQixDQUFBO1FBQzdELCtCQUEwQixHQUFHLElBQUksR0FBRyxFQUFxQyxDQUFBO1FBT3pGLElBQUksQ0FBQyxLQUFLLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsYUFBYSxD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