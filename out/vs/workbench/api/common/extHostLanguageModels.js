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
var ExtHostLanguageModels_1;
import { AsyncIterableObject, AsyncIterableSource } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError, transformErrorForSerialization, transformErrorFromSerialization, } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { ExtensionIdentifier, ExtensionIdentifierMap, ExtensionIdentifierSet, } from '../../../platform/extensions/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { Progress } from '../../../platform/progress/common/progress.js';
import { INTERNAL_AUTH_PROVIDER_PREFIX } from '../../services/authentication/common/authentication.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostAuthentication } from './extHostAuthentication.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import * as typeConvert from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export const IExtHostLanguageModels = createDecorator('IExtHostLanguageModels');
class LanguageModelResponseStream {
    constructor(option, stream) {
        this.option = option;
        this.stream = new AsyncIterableSource();
        this.stream =
            stream ??
                new AsyncIterableSource();
    }
}
class LanguageModelResponse {
    constructor() {
        this._responseStreams = new Map();
        this._defaultStream = new AsyncIterableSource();
        this._isDone = false;
        const that = this;
        this.apiObject = {
            // result: promise,
            get stream() {
                return that._defaultStream.asyncIterable;
            },
            get text() {
                return AsyncIterableObject.map(that._defaultStream.asyncIterable, (part) => {
                    if (part instanceof extHostTypes.LanguageModelTextPart) {
                        return part.value;
                    }
                    else {
                        return undefined;
                    }
                }).coalesce();
            },
        };
    }
    *_streams() {
        if (this._responseStreams.size > 0) {
            for (const [, value] of this._responseStreams) {
                yield value.stream;
            }
        }
        else {
            yield this._defaultStream;
        }
    }
    handleFragment(fragment) {
        if (this._isDone) {
            return;
        }
        let res = this._responseStreams.get(fragment.index);
        if (!res) {
            if (this._responseStreams.size === 0) {
                // the first response claims the default response
                res = new LanguageModelResponseStream(fragment.index, this._defaultStream);
            }
            else {
                res = new LanguageModelResponseStream(fragment.index);
            }
            this._responseStreams.set(fragment.index, res);
        }
        let out;
        if (fragment.part.type === 'text') {
            out = new extHostTypes.LanguageModelTextPart(fragment.part.value);
        }
        else {
            out = new extHostTypes.LanguageModelToolCallPart(fragment.part.toolCallId, fragment.part.name, fragment.part.parameters);
        }
        res.stream.emitOne(out);
    }
    reject(err) {
        this._isDone = true;
        for (const stream of this._streams()) {
            stream.reject(err);
        }
    }
    resolve() {
        this._isDone = true;
        for (const stream of this._streams()) {
            stream.resolve();
        }
    }
}
let ExtHostLanguageModels = class ExtHostLanguageModels {
    static { ExtHostLanguageModels_1 = this; }
    static { this._idPool = 1; }
    constructor(extHostRpc, _logService, _extHostAuthentication) {
        this._logService = _logService;
        this._extHostAuthentication = _extHostAuthentication;
        this._onDidChangeModelAccess = new Emitter();
        this._onDidChangeProviders = new Emitter();
        this.onDidChangeProviders = this._onDidChangeProviders.event;
        this._languageModels = new Map();
        this._allLanguageModelData = new Map(); // these are ALL models, not just the one in this EH
        this._modelAccessList = new ExtensionIdentifierMap();
        this._pendingRequest = new Map();
        this._ignoredFileProviders = new Map();
        this._languageAccessInformationExtensions = new Set();
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadLanguageModels);
    }
    dispose() {
        this._onDidChangeModelAccess.dispose();
        this._onDidChangeProviders.dispose();
    }
    registerLanguageModel(extension, identifier, provider, metadata) {
        const handle = ExtHostLanguageModels_1._idPool++;
        this._languageModels.set(handle, {
            extension: extension.identifier,
            provider,
            languageModelId: identifier,
        });
        let auth;
        if (metadata.auth) {
            auth = {
                providerLabel: extension.displayName || extension.name,
                accountLabel: typeof metadata.auth === 'object' ? metadata.auth.label : undefined,
            };
        }
        this._proxy.$registerLanguageModelProvider(handle, `${ExtensionIdentifier.toKey(extension.identifier)}/${identifier}`, {
            extension: extension.identifier,
            id: identifier,
            vendor: metadata.vendor ?? ExtensionIdentifier.toKey(extension.identifier),
            name: metadata.name ?? '',
            family: metadata.family ?? '',
            version: metadata.version,
            maxInputTokens: metadata.maxInputTokens,
            maxOutputTokens: metadata.maxOutputTokens,
            auth,
            targetExtensions: metadata.extensions,
            isDefault: metadata.isDefault,
            isUserSelectable: metadata.isUserSelectable,
            capabilities: metadata.capabilities,
        });
        const responseReceivedListener = provider.onDidReceiveLanguageModelResponse2?.(({ extensionId, participant, tokenCount }) => {
            this._proxy.$whenLanguageModelChatRequestMade(identifier, new ExtensionIdentifier(extensionId), participant, tokenCount);
        });
        return toDisposable(() => {
            this._languageModels.delete(handle);
            this._proxy.$unregisterProvider(handle);
            responseReceivedListener?.dispose();
        });
    }
    async $startChatRequest(handle, requestId, from, messages, options, token) {
        const data = this._languageModels.get(handle);
        if (!data) {
            throw new Error('Provider not found');
        }
        const progress = new Progress(async (fragment) => {
            if (token.isCancellationRequested) {
                this._logService.warn(`[CHAT](${data.extension.value}) CANNOT send progress because the REQUEST IS CANCELLED`);
                return;
            }
            let part;
            if (fragment.part instanceof extHostTypes.LanguageModelToolCallPart) {
                part = {
                    type: 'tool_use',
                    name: fragment.part.name,
                    parameters: fragment.part.input,
                    toolCallId: fragment.part.callId,
                };
            }
            else if (fragment.part instanceof extHostTypes.LanguageModelTextPart) {
                part = { type: 'text', value: fragment.part.value };
            }
            if (!part) {
                this._logService.warn(`[CHAT](${data.extension.value}) UNKNOWN part ${JSON.stringify(fragment)}`);
                return;
            }
            this._proxy.$reportResponsePart(requestId, { index: fragment.index, part });
        });
        let value;
        try {
            if (data.provider.provideLanguageModelResponse2) {
                value = data.provider.provideLanguageModelResponse2(messages.value.map(typeConvert.LanguageModelChatMessage2.to), options, ExtensionIdentifier.toKey(from), progress, token);
            }
            else {
                value = data.provider.provideLanguageModelResponse(messages.value.map(typeConvert.LanguageModelChatMessage2.to), options, ExtensionIdentifier.toKey(from), progress, token);
            }
        }
        catch (err) {
            // synchronously failed
            throw err;
        }
        Promise.resolve(value).then(() => {
            this._proxy.$reportResponseDone(requestId, undefined);
        }, (err) => {
            this._proxy.$reportResponseDone(requestId, transformErrorForSerialization(err));
        });
    }
    //#region --- token counting
    $provideTokenLength(handle, value, token) {
        const data = this._languageModels.get(handle);
        if (!data) {
            return Promise.resolve(0);
        }
        return Promise.resolve(data.provider.provideTokenCount(value, token));
    }
    //#region --- making request
    $acceptChatModelMetadata(data) {
        if (data.added) {
            for (const { identifier, metadata } of data.added) {
                this._allLanguageModelData.set(identifier, {
                    metadata,
                    apiObjects: new ExtensionIdentifierMap(),
                });
            }
        }
        if (data.removed) {
            for (const id of data.removed) {
                // clean up
                this._allLanguageModelData.delete(id);
                // cancel pending requests for this model
                for (const [key, value] of this._pendingRequest) {
                    if (value.languageModelId === id) {
                        value.res.reject(new CancellationError());
                        this._pendingRequest.delete(key);
                    }
                }
            }
        }
        // TODO@jrieken@TylerLeonhardt - this is a temporary hack to populate the auth providers
        data.added?.forEach((added) => this._fakeAuthPopulate(added.metadata));
        this._onDidChangeProviders.fire(undefined);
    }
    async getDefaultLanguageModel(extension) {
        const defaultModelId = Iterable.find(this._allLanguageModelData.entries(), ([, value]) => !!value.metadata.isDefault)?.[0];
        if (!defaultModelId) {
            return;
        }
        return this.getLanguageModelByIdentifier(extension, defaultModelId);
    }
    async getLanguageModelByIdentifier(extension, identifier) {
        const data = this._allLanguageModelData.get(identifier);
        if (!data) {
            // model gone? is this an error on us?
            return;
        }
        // make sure auth information is correct
        if (this._isUsingAuth(extension.identifier, data.metadata)) {
            await this._fakeAuthPopulate(data.metadata);
        }
        let apiObject = data.apiObjects.get(extension.identifier);
        if (!apiObject) {
            const that = this;
            apiObject = {
                id: data.metadata.id,
                vendor: data.metadata.vendor,
                family: data.metadata.family,
                version: data.metadata.version,
                name: data.metadata.name,
                capabilities: {
                    supportsImageToText: data.metadata.capabilities?.vision ?? false,
                    supportsToolCalling: data.metadata.capabilities?.toolCalling ?? false,
                },
                maxInputTokens: data.metadata.maxInputTokens,
                countTokens(text, token) {
                    if (!that._allLanguageModelData.has(identifier)) {
                        throw extHostTypes.LanguageModelError.NotFound(identifier);
                    }
                    return that._computeTokenLength(identifier, text, token ?? CancellationToken.None);
                },
                sendRequest(messages, options, token) {
                    if (!that._allLanguageModelData.has(identifier)) {
                        throw extHostTypes.LanguageModelError.NotFound(identifier);
                    }
                    return that._sendChatRequest(extension, identifier, messages, options ?? {}, token ?? CancellationToken.None);
                },
            };
            Object.freeze(apiObject);
            data.apiObjects.set(extension.identifier, apiObject);
        }
        return apiObject;
    }
    async selectLanguageModels(extension, selector) {
        // this triggers extension activation
        const models = await this._proxy.$selectChatModels({
            ...selector,
            extension: extension.identifier,
        });
        const result = [];
        for (const identifier of models) {
            const model = await this.getLanguageModelByIdentifier(extension, identifier);
            if (model) {
                result.push(model);
            }
        }
        return result;
    }
    async _sendChatRequest(extension, languageModelId, messages, options, token) {
        const internalMessages = this._convertMessages(extension, messages);
        const from = extension.identifier;
        const metadata = this._allLanguageModelData.get(languageModelId)?.metadata;
        if (!metadata || !this._allLanguageModelData.has(languageModelId)) {
            throw extHostTypes.LanguageModelError.NotFound(`Language model '${languageModelId}' is unknown.`);
        }
        if (this._isUsingAuth(from, metadata)) {
            const success = await this._getAuthAccess(extension, { identifier: metadata.extension, displayName: metadata.auth.providerLabel }, options.justification, false);
            if (!success || !this._modelAccessList.get(from)?.has(metadata.extension)) {
                throw extHostTypes.LanguageModelError.NoPermissions(`Language model '${languageModelId}' cannot be used by '${from.value}'.`);
            }
        }
        const requestId = (Math.random() * 1e6) | 0;
        const res = new LanguageModelResponse();
        this._pendingRequest.set(requestId, { languageModelId, res });
        try {
            await this._proxy.$tryStartChatRequest(from, languageModelId, requestId, new SerializableObjectWithBuffers(internalMessages), options, token);
        }
        catch (error) {
            // error'ing here means that the request could NOT be started/made, e.g. wrong model, no access, etc, but
            // later the response can fail as well. Those failures are communicated via the stream-object
            this._pendingRequest.delete(requestId);
            throw extHostTypes.LanguageModelError.tryDeserialize(error) ?? error;
        }
        return res.apiObject;
    }
    _convertMessages(extension, messages) {
        const internalMessages = [];
        for (const message of messages) {
            if (message.role === extHostTypes.LanguageModelChatMessageRole.System) {
                checkProposedApiEnabled(extension, 'languageModelSystem');
            }
            internalMessages.push(typeConvert.LanguageModelChatMessage2.from(message));
        }
        return internalMessages;
    }
    async $acceptResponsePart(requestId, chunk) {
        const data = this._pendingRequest.get(requestId);
        if (data) {
            data.res.handleFragment(chunk);
        }
    }
    async $acceptResponseDone(requestId, error) {
        const data = this._pendingRequest.get(requestId);
        if (!data) {
            return;
        }
        this._pendingRequest.delete(requestId);
        if (error) {
            // we error the stream because that's the only way to signal
            // that the request has failed
            data.res.reject(extHostTypes.LanguageModelError.tryDeserialize(error) ??
                transformErrorFromSerialization(error));
        }
        else {
            data.res.resolve();
        }
    }
    // BIG HACK: Using AuthenticationProviders to check access to Language Models
    async _getAuthAccess(from, to, justification, silent) {
        // This needs to be done in both MainThread & ExtHost ChatProvider
        const providerId = INTERNAL_AUTH_PROVIDER_PREFIX + to.identifier.value;
        const session = await this._extHostAuthentication.getSession(from, providerId, [], {
            silent: true,
        });
        if (session) {
            this.$updateModelAccesslist([{ from: from.identifier, to: to.identifier, enabled: true }]);
            return true;
        }
        if (silent) {
            return false;
        }
        try {
            const detail = justification
                ? localize('chatAccessWithJustification', 'Justification: {1}', to.displayName, justification)
                : undefined;
            await this._extHostAuthentication.getSession(from, providerId, [], {
                forceNewSession: { detail },
            });
            this.$updateModelAccesslist([{ from: from.identifier, to: to.identifier, enabled: true }]);
            return true;
        }
        catch (err) {
            // ignore
            return false;
        }
    }
    _isUsingAuth(from, toMetadata) {
        // If the 'to' extension uses an auth check
        return (!!toMetadata.auth &&
            // And we're asking from a different extension
            !ExtensionIdentifier.equals(toMetadata.extension, from));
    }
    async _fakeAuthPopulate(metadata) {
        if (!metadata.auth) {
            return;
        }
        for (const from of this._languageAccessInformationExtensions) {
            try {
                await this._getAuthAccess(from, { identifier: metadata.extension, displayName: '' }, undefined, true);
            }
            catch (err) {
                this._logService.error('Fake Auth request failed');
                this._logService.error(err);
            }
        }
    }
    async _computeTokenLength(languageModelId, value, token) {
        const data = this._allLanguageModelData.get(languageModelId);
        if (!data) {
            throw extHostTypes.LanguageModelError.NotFound(`Language model '${languageModelId}' is unknown.`);
        }
        const local = Iterable.find(this._languageModels.values(), (candidate) => candidate.languageModelId === languageModelId);
        if (local) {
            // stay inside the EH
            return local.provider.provideTokenCount(value, token);
        }
        return this._proxy.$countTokens(languageModelId, typeof value === 'string' ? value : typeConvert.LanguageModelChatMessage2.from(value), token);
    }
    $updateModelAccesslist(data) {
        const updated = new Array();
        for (const { from, to, enabled } of data) {
            const set = this._modelAccessList.get(from) ?? new ExtensionIdentifierSet();
            const oldValue = set.has(to);
            if (oldValue !== enabled) {
                if (enabled) {
                    set.add(to);
                }
                else {
                    set.delete(to);
                }
                this._modelAccessList.set(from, set);
                const newItem = { from, to };
                updated.push(newItem);
                this._onDidChangeModelAccess.fire(newItem);
            }
        }
    }
    createLanguageModelAccessInformation(from) {
        this._languageAccessInformationExtensions.add(from);
        const that = this;
        const _onDidChangeAccess = Event.signal(Event.filter(this._onDidChangeModelAccess.event, (e) => ExtensionIdentifier.equals(e.from, from.identifier)));
        const _onDidAddRemove = Event.signal(this._onDidChangeProviders.event);
        return {
            get onDidChange() {
                return Event.any(_onDidChangeAccess, _onDidAddRemove);
            },
            canSendRequest(chat) {
                let metadata;
                out: for (const [_, value] of that._allLanguageModelData) {
                    for (const candidate of value.apiObjects.values()) {
                        if (candidate === chat) {
                            metadata = value.metadata;
                            break out;
                        }
                    }
                }
                if (!metadata) {
                    return undefined;
                }
                if (!that._isUsingAuth(from.identifier, metadata)) {
                    return true;
                }
                const list = that._modelAccessList.get(from.identifier);
                if (!list) {
                    return undefined;
                }
                return list.has(metadata.extension);
            },
        };
    }
    fileIsIgnored(extension, uri, token) {
        checkProposedApiEnabled(extension, 'chatParticipantAdditions');
        return this._proxy.$fileIsIgnored(uri, token);
    }
    async $isFileIgnored(handle, uri, token) {
        const provider = this._ignoredFileProviders.get(handle);
        if (!provider) {
            throw new Error('Unknown LanguageModelIgnoredFileProvider');
        }
        return (await provider.provideFileIgnored(URI.revive(uri), token)) ?? false;
    }
    registerIgnoredFileProvider(extension, provider) {
        checkProposedApiEnabled(extension, 'chatParticipantPrivate');
        const handle = ExtHostLanguageModels_1._idPool++;
        this._proxy.$registerFileIgnoreProvider(handle);
        this._ignoredFileProviders.set(handle, provider);
        return toDisposable(() => {
            this._proxy.$unregisterFileIgnoreProvider(handle);
            this._ignoredFileProviders.delete(handle);
        });
    }
};
ExtHostLanguageModels = ExtHostLanguageModels_1 = __decorate([
    __param(0, IExtHostRpcService),
    __param(1, ILogService),
    __param(2, IExtHostAuthentication)
], ExtHostLanguageModels);
export { ExtHostLanguageModels };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExhbmd1YWdlTW9kZWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN4RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQ04saUJBQWlCLEVBRWpCLDhCQUE4QixFQUM5QiwrQkFBK0IsR0FDL0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMzRCxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixzQkFBc0IsRUFDdEIsc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFPeEUsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RB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