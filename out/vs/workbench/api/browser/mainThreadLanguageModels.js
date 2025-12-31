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
import { AsyncIterableSource, DeferredPromise } from '../../../base/common/async.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { transformErrorForSerialization, transformErrorFromSerialization, } from '../../../base/common/errors.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { resizeImage } from '../../contrib/chat/browser/imageUtils.js';
import { ILanguageModelIgnoredFilesService } from '../../contrib/chat/common/ignoredFiles.js';
import { ILanguageModelStatsService } from '../../contrib/chat/common/languageModelStats.js';
import { ILanguageModelsService, } from '../../contrib/chat/common/languageModels.js';
import { IAuthenticationAccessService } from '../../services/authentication/browser/authenticationAccessService.js';
import { IAuthenticationService, INTERNAL_AUTH_PROVIDER_PREFIX, } from '../../services/authentication/common/authentication.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { IExtensionService } from '../../services/extensions/common/extensions.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { LanguageModelError } from '../common/extHostTypes.js';
let MainThreadLanguageModels = class MainThreadLanguageModels {
    constructor(extHostContext, _chatProviderService, _languageModelStatsService, _logService, _authenticationService, _authenticationAccessService, _extensionService, _ignoredFilesService) {
        this._chatProviderService = _chatProviderService;
        this._languageModelStatsService = _languageModelStatsService;
        this._logService = _logService;
        this._authenticationService = _authenticationService;
        this._authenticationAccessService = _authenticationAccessService;
        this._extensionService = _extensionService;
        this._ignoredFilesService = _ignoredFilesService;
        this._store = new DisposableStore();
        this._providerRegistrations = new DisposableMap();
        this._pendingProgress = new Map();
        this._ignoredFileProviderRegistrations = new DisposableMap();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostChatProvider);
        this._proxy.$acceptChatModelMetadata({
            added: _chatProviderService
                .getLanguageModelIds()
                .map((id) => ({ identifier: id, metadata: _chatProviderService.lookupLanguageModel(id) })),
        });
        this._store.add(_chatProviderService.onDidChangeLanguageModels(this._proxy.$acceptChatModelMetadata, this._proxy));
    }
    dispose() {
        this._providerRegistrations.dispose();
        this._ignoredFileProviderRegistrations.dispose();
        this._store.dispose();
    }
    $registerLanguageModelProvider(handle, identifier, metadata) {
        const dipsosables = new DisposableStore();
        dipsosables.add(this._chatProviderService.registerLanguageModelChat(identifier, {
            metadata,
            sendChatRequest: async (messages, from, options, token) => {
                const requestId = (Math.random() * 1e6) | 0;
                const defer = new DeferredPromise();
                const stream = new AsyncIterableSource();
                try {
                    this._pendingProgress.set(requestId, { defer, stream });
                    await Promise.all(messages
                        .flatMap((msg) => msg.content)
                        .filter((part) => part.type === 'image_url')
                        .map(async (part) => {
                        part.value.data = VSBuffer.wrap(await resizeImage(part.value.data.buffer));
                    }));
                    await this._proxy.$startChatRequest(handle, requestId, from, new SerializableObjectWithBuffers(messages), options, token);
                }
                catch (err) {
                    this._pendingProgress.delete(requestId);
                    throw err;
                }
                return {
                    result: defer.p,
                    stream: stream.asyncIterable,
                };
            },
            provideTokenCount: (str, token) => {
                return this._proxy.$provideTokenLength(handle, str, token);
            },
        }));
        if (metadata.auth) {
            dipsosables.add(this._registerAuthenticationProvider(metadata.extension, metadata.auth));
        }
        this._providerRegistrations.set(handle, dipsosables);
    }
    async $reportResponsePart(requestId, chunk) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response PART', Boolean(data), requestId, chunk);
        if (data) {
            data.stream.emitOne(chunk);
        }
    }
    async $reportResponseDone(requestId, err) {
        const data = this._pendingProgress.get(requestId);
        this._logService.trace('[LM] report response DONE', Boolean(data), requestId, err);
        if (data) {
            this._pendingProgress.delete(requestId);
            if (err) {
                const error = LanguageModelError.tryDeserialize(err) ?? transformErrorFromSerialization(err);
                data.stream.reject(error);
                data.defer.error(error);
            }
            else {
                data.stream.resolve();
                data.defer.complete(undefined);
            }
        }
    }
    $unregisterProvider(handle) {
        this._providerRegistrations.deleteAndDispose(handle);
    }
    $selectChatModels(selector) {
        return this._chatProviderService.selectLanguageModels(selector);
    }
    $whenLanguageModelChatRequestMade(identifier, extensionId, participant, tokenCount) {
        this._languageModelStatsService.update(identifier, extensionId, participant, tokenCount);
    }
    async $tryStartChatRequest(extension, providerId, requestId, messages, options, token) {
        this._logService.trace('[CHAT] request STARTED', extension.value, requestId);
        let response;
        try {
            response = await this._chatProviderService.sendChatRequest(providerId, extension, messages.value, options, token);
        }
        catch (err) {
            this._logService.error('[CHAT] request FAILED', extension.value, requestId, err);
            throw err;
        }
        // !!! IMPORTANT !!!
        // This method must return before the response is done (has streamed all parts)
        // and because of that we consume the stream without awaiting
        // !!! IMPORTANT !!!
        const streaming = (async () => {
            try {
                for await (const part of response.stream) {
                    this._logService.trace('[CHAT] request PART', extension.value, requestId, part);
                    await this._proxy.$acceptResponsePart(requestId, part);
                }
                this._logService.trace('[CHAT] request DONE', extension.value, requestId);
            }
            catch (err) {
                this._logService.error('[CHAT] extension request ERRORED in STREAM', err, extension.value, requestId);
                this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
            }
        })();
        // When the response is done (signaled via its result) we tell the EH
        Promise.allSettled([response.result, streaming]).then(() => {
            this._logService.debug('[CHAT] extension request DONE', extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, undefined);
        }, (err) => {
            this._logService.error('[CHAT] extension request ERRORED', err, extension.value, requestId);
            this._proxy.$acceptResponseDone(requestId, transformErrorForSerialization(err));
        });
    }
    $countTokens(provider, value, token) {
        return this._chatProviderService.computeTokenLength(provider, value, token);
    }
    _registerAuthenticationProvider(extension, auth) {
        // This needs to be done in both MainThread & ExtHost ChatProvider
        const authProviderId = INTERNAL_AUTH_PROVIDER_PREFIX + extension.value;
        // Only register one auth provider per extension
        if (this._authenticationService.getProviderIds().includes(authProviderId)) {
            return Disposable.None;
        }
        const accountLabel = auth.accountLabel ?? localize('languageModelsAccountId', 'Language Models');
        const disposables = new DisposableStore();
        this._authenticationService.registerAuthenticationProvider(authProviderId, new LanguageModelAccessAuthProvider(authProviderId, auth.providerLabel, accountLabel));
        disposables.add(toDisposable(() => {
            this._authenticationService.unregisterAuthenticationProvider(authProviderId);
        }));
        disposables.add(this._authenticationAccessService.onDidChangeExtensionSessionAccess(async (e) => {
            const allowedExtensions = this._authenticationAccessService.readAllowedExtensions(authProviderId, accountLabel);
            const accessList = [];
            for (const allowedExtension of allowedExtensions) {
                const from = await this._extensionService.getExtension(allowedExtension.id);
                if (from) {
                    accessList.push({
                        from: from.identifier,
                        to: extension,
                        enabled: allowedExtension.allowed ?? true,
                    });
                }
            }
            this._proxy.$updateModelAccesslist(accessList);
        }));
        return disposables;
    }
    $fileIsIgnored(uri, token) {
        return this._ignoredFilesService.fileIsIgnored(URI.revive(uri), token);
    }
    $registerFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.set(handle, this._ignoredFilesService.registerIgnoredFileProvider({
            isFileIgnored: async (uri, token) => this._proxy.$isFileIgnored(handle, uri, token),
        }));
    }
    $unregisterFileIgnoreProvider(handle) {
        this._ignoredFileProviderRegistrations.deleteAndDispose(handle);
    }
};
MainThreadLanguageModels = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageModels),
    __param(1, ILanguageModelsService),
    __param(2, ILanguageModelStatsService),
    __param(3, ILogService),
    __param(4, IAuthenticationService),
    __param(5, IAuthenticationAccessService),
    __param(6, IExtensionService),
    __param(7, ILanguageModelIgnoredFilesService)
], MainThreadLanguageModels);
export { MainThreadLanguageModels };
// The fake AuthenticationProvider that will be used to gate access to the Language Model. There will be one per provider.
class LanguageModelAccessAuthProvider {
    constructor(id, label, _accountLabel) {
        this.id = id;
        this.label = label;
        this._accountLabel = _accountLabel;
        this.supportsMultipleAccounts = false;
        // Important for updating the UI
        this._onDidChangeSessions = new Emitter();
        this.onDidChangeSessions = this._onDidChangeSessions.event;
    }
    async getSessions(scopes) {
        // If there are no scopes and no session that means no extension has requested a session yet
        // and the user is simply opening the Account menu. In that case, we should not return any "sessions".
        if (scopes === undefined && !this._session) {
            return [];
        }
        if (this._session) {
            return [this._session];
        }
        return [await this.createSession(scopes || [])];
    }
    async createSession(scopes) {
        this._session = this._createFakeSession(scopes);
        this._onDidChangeSessions.fire({ added: [this._session], changed: [], removed: [] });
        return this._session;
    }
    removeSession(sessionId) {
        if (this._session) {
            this._onDidChangeSessions.fire({ added: [], changed: [], removed: [this._session] });
            this._session = undefined;
        }
        return Promise.resolve();
    }
    _createFakeSession(scopes) {
        return {
            id: 'fake-session',
            account: {
                id: this.id,
                label: this._accountLabel,
            },
            accessToken: 'fake-access-token',
            scopes,
        };
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRMYW5ndWFnZU1vZGVscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDcEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXpELE9BQU8sRUFFTiw4QkFBOEIsRUFDOUIsK0JBQStCLEdBQy9CLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUUxQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzVGLE9BQU8sRUFNTixzQkFBc0IsR0FDdEIsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUNuSCxPQUFPLEVBSU4sc0JBQXNCLEVBQ3RCLDZCQUE2QixHQUM3QixNQUFNLHdE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