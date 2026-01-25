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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0TGFuZ3VhZ2VNb2RlbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixpQkFBaUIsRUFFakIsOEJBQThCLEVBQzlCLCtCQUErQixHQUMvQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHNCQUFzQixFQUN0QixzQkFBc0IsR0FFdEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDekYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQU94RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN0RyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFB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