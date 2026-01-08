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
import { createCancelablePromise, timeout } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { getErrorMessage, isCancellationError } from '../../../base/common/errors.js';
import { Emitter, Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { Mimes } from '../../../base/common/mime.js';
import { isWeb } from '../../../base/common/platform.js';
import { joinPath, relativePath } from '../../../base/common/resources.js';
import { isObject, isString } from '../../../base/common/types.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { IFileService } from '../../files/common/files.js';
import { IProductService } from '../../product/common/productService.js';
import { asJson, asText, asTextOrError, hasNoContent, IRequestService, isSuccess, isSuccess as isSuccessContext, } from '../../request/common/request.js';
import { getServiceMachineId } from '../../externalServices/common/serviceMachineId.js';
import { IStorageService } from '../../storage/common/storage.js';
import { HEADER_EXECUTION_ID, HEADER_OPERATION_ID, IUserDataSyncLogService, IUserDataSyncStoreManagementService, SYNC_SERVICE_URL_TYPE, UserDataSyncStoreError, } from './userDataSync.js';
const CONFIGURATION_SYNC_STORE_KEY = 'configurationSync.store';
const SYNC_PREVIOUS_STORE = 'sync.previous.store';
const DONOT_MAKE_REQUESTS_UNTIL_KEY = 'sync.donot-make-requests-until';
const USER_SESSION_ID_KEY = 'sync.user-session-id';
const MACHINE_SESSION_ID_KEY = 'sync.machine-session-id';
const REQUEST_SESSION_LIMIT = 100;
const REQUEST_SESSION_INTERVAL = 1000 * 60 * 5; /* 5 minutes */
let AbstractUserDataSyncStoreManagementService = class AbstractUserDataSyncStoreManagementService extends Disposable {
    get userDataSyncStore() {
        return this._userDataSyncStore;
    }
    get userDataSyncStoreType() {
        return this.storageService.get(SYNC_SERVICE_URL_TYPE, -1 /* StorageScope.APPLICATION */);
    }
    set userDataSyncStoreType(type) {
        this.storageService.store(SYNC_SERVICE_URL_TYPE, type, -1 /* StorageScope.APPLICATION */, isWeb ? 0 /* StorageTarget.USER */ : 1 /* StorageTarget.MACHINE */);
    }
    constructor(productService, configurationService, storageService) {
        super();
        this.productService = productService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this._onDidChangeUserDataSyncStore = this._register(new Emitter());
        this.onDidChangeUserDataSyncStore = this._onDidChangeUserDataSyncStore.event;
        this.updateUserDataSyncStore();
        const disposable = this._register(new DisposableStore());
        this._register(Event.filter(storageService.onDidChangeValue(-1 /* StorageScope.APPLICATION */, SYNC_SERVICE_URL_TYPE, disposable), () => this.userDataSyncStoreType !== this.userDataSyncStore?.type, disposable)(() => this.updateUserDataSyncStore()));
    }
    updateUserDataSyncStore() {
        this._userDataSyncStore = this.toUserDataSyncStore(this.productService[CONFIGURATION_SYNC_STORE_KEY]);
        this._onDidChangeUserDataSyncStore.fire();
    }
    toUserDataSyncStore(configurationSyncStore) {
        if (!configurationSyncStore) {
            return undefined;
        }
        // Check for web overrides for backward compatibility while reading previous store
        configurationSyncStore =
            isWeb && configurationSyncStore.web
                ? { ...configurationSyncStore, ...configurationSyncStore.web }
                : configurationSyncStore;
        if (isString(configurationSyncStore.url) &&
            isObject(configurationSyncStore.authenticationProviders) &&
            Object.keys(configurationSyncStore.authenticationProviders).every((authenticationProviderId) => Array.isArray(configurationSyncStore.authenticationProviders[authenticationProviderId].scopes))) {
            const syncStore = configurationSyncStore;
            const canSwitch = !!syncStore.canSwitch;
            const defaultType = syncStore.url === syncStore.insidersUrl ? 'insiders' : 'stable';
            const type = (canSwitch ? this.userDataSyncStoreType : undefined) || defaultType;
            const url = type === 'insiders'
                ? syncStore.insidersUrl
                : type === 'stable'
                    ? syncStore.stableUrl
                    : syncStore.url;
            return {
                url: URI.parse(url),
                type,
                defaultType,
                defaultUrl: URI.parse(syncStore.url),
                stableUrl: URI.parse(syncStore.stableUrl),
                insidersUrl: URI.parse(syncStore.insidersUrl),
                canSwitch,
                authenticationProviders: Object.keys(syncStore.authenticationProviders).reduce((result, id) => {
                    result.push({ id, scopes: syncStore.authenticationProviders[id].scopes });
                    return result;
                }, []),
            };
        }
        return undefined;
    }
};
AbstractUserDataSyncStoreManagementService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService),
    __param(2, IStorageService)
], AbstractUserDataSyncStoreManagementService);
export { AbstractUserDataSyncStoreManagementService };
let UserDataSyncStoreManagementService = class UserDataSyncStoreManagementService extends AbstractUserDataSyncStoreManagementService {
    constructor(productService, configurationService, storageService) {
        super(productService, configurationService, storageService);
        const previousConfigurationSyncStore = this.storageService.get(SYNC_PREVIOUS_STORE, -1 /* StorageScope.APPLICATION */);
        if (previousConfigurationSyncStore) {
            this.previousConfigurationSyncStore = JSON.parse(previousConfigurationSyncStore);
        }
        const syncStore = this.productService[CONFIGURATION_SYNC_STORE_KEY];
        if (syncStore) {
            this.storageService.store(SYNC_PREVIOUS_STORE, JSON.stringify(syncStore), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(SYNC_PREVIOUS_STORE, -1 /* StorageScope.APPLICATION */);
        }
    }
    async switch(type) {
        if (type !== this.userDataSyncStoreType) {
            this.userDataSyncStoreType = type;
            this.updateUserDataSyncStore();
        }
    }
    async getPreviousUserDataSyncStore() {
        return this.toUserDataSyncStore(this.previousConfigurationSyncStore);
    }
};
UserDataSyncStoreManagementService = __decorate([
    __param(0, IProductService),
    __param(1, IConfigurationService),
    __param(2, IStorageService)
], UserDataSyncStoreManagementService);
export { UserDataSyncStoreManagementService };
let UserDataSyncStoreClient = class UserDataSyncStoreClient extends Disposable {
    get donotMakeRequestsUntil() {
        return this._donotMakeRequestsUntil;
    }
    constructor(userDataSyncStoreUrl, productService, requestService, logService, environmentService, fileService, storageService) {
        super();
        this.requestService = requestService;
        this.logService = logService;
        this.storageService = storageService;
        this._onTokenFailed = this._register(new Emitter());
        this.onTokenFailed = this._onTokenFailed.event;
        this._onTokenSucceed = this._register(new Emitter());
        this.onTokenSucceed = this._onTokenSucceed.event;
        this._donotMakeRequestsUntil = undefined;
        this._onDidChangeDonotMakeRequestsUntil = this._register(new Emitter());
        this.onDidChangeDonotMakeRequestsUntil = this._onDidChangeDonotMakeRequestsUntil.event;
        this.resetDonotMakeRequestsUntilPromise = undefined;
        this.updateUserDataSyncStoreUrl(userDataSyncStoreUrl);
        this.commonHeadersPromise = getServiceMachineId(environmentService, fileService, storageService).then((uuid) => {
            const headers = {
                'X-Client-Name': `${productService.applicationName}${isWeb ? '-web' : ''}`,
                'X-Client-Version': productService.version,
            };
            if (productService.commit) {
                headers['X-Client-Commit'] = productService.commit;
            }
            return headers;
        });
        /* A requests session that limits requests per sessions */
        this.session = new RequestsSession(REQUEST_SESSION_LIMIT, REQUEST_SESSION_INTERVAL, this.requestService, this.logService);
        this.initDonotMakeRequestsUntil();
        this._register(toDisposable(() => {
            if (this.resetDonotMakeRequestsUntilPromise) {
                this.resetDonotMakeRequestsUntilPromise.cancel();
                this.resetDonotMakeRequestsUntilPromise = undefined;
            }
        }));
    }
    setAuthToken(token, type) {
        this.authToken = { token, type };
    }
    updateUserDataSyncStoreUrl(userDataSyncStoreUrl) {
        this.userDataSyncStoreUrl = userDataSyncStoreUrl
            ? joinPath(userDataSyncStoreUrl, 'v1')
            : undefined;
    }
    initDonotMakeRequestsUntil() {
        const donotMakeRequestsUntil = this.storageService.getNumber(DONOT_MAKE_REQUESTS_UNTIL_KEY, -1 /* StorageScope.APPLICATION */);
        if (donotMakeRequestsUntil && Date.now() < donotMakeRequestsUntil) {
            this.setDonotMakeRequestsUntil(new Date(donotMakeRequestsUntil));
        }
    }
    setDonotMakeRequestsUntil(donotMakeRequestsUntil) {
        if (this._donotMakeRequestsUntil?.getTime() !== donotMakeRequestsUntil?.getTime()) {
            this._donotMakeRequestsUntil = donotMakeRequestsUntil;
            if (this.resetDonotMakeRequestsUntilPromise) {
                this.resetDonotMakeRequestsUntilPromise.cancel();
                this.resetDonotMakeRequestsUntilPromise = undefined;
            }
            if (this._donotMakeRequestsUntil) {
                this.storageService.store(DONOT_MAKE_REQUESTS_UNTIL_KEY, this._donotMakeRequestsUntil.getTime(), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                this.resetDonotMakeRequestsUntilPromise = createCancelablePromise((token) => timeout(this._donotMakeRequestsUntil.getTime() - Date.now(), token).then(() => this.setDonotMakeRequestsUntil(undefined)));
                this.resetDonotMakeRequestsUntilPromise.then(null, (e) => null /* ignore error */);
            }
            else {
                this.storageService.remove(DONOT_MAKE_REQUESTS_UNTIL_KEY, -1 /* StorageScope.APPLICATION */);
            }
            this._onDidChangeDonotMakeRequestsUntil.fire();
        }
    }
    // #region Collection
    async getAllCollections(headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.userDataSyncStoreUrl, 'collection').toString();
        headers = { ...headers };
        headers['Content-Type'] = 'application/json';
        const context = await this.request(url, { type: 'GET', headers }, [], CancellationToken.None);
        return (await asJson(context))?.map(({ id }) => id) || [];
    }
    async createCollection(headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.userDataSyncStoreUrl, 'collection').toString();
        headers = { ...headers };
        headers['Content-Type'] = Mimes.text;
        const context = await this.request(url, { type: 'POST', headers }, [], CancellationToken.None);
        const collectionId = await asTextOrError(context);
        if (!collectionId) {
            throw new UserDataSyncStoreError('Server did not return the collection id', url, "NoCollection" /* UserDataSyncErrorCode.NoCollection */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
        }
        return collectionId;
    }
    async deleteCollection(collection, headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = collection
            ? joinPath(this.userDataSyncStoreUrl, 'collection', collection).toString()
            : joinPath(this.userDataSyncStoreUrl, 'collection').toString();
        headers = { ...headers };
        await this.request(url, { type: 'DELETE', headers }, [], CancellationToken.None);
    }
    // #endregion
    // #region Resource
    async getAllResourceRefs(resource, collection) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const uri = this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource);
        const headers = {};
        const context = await this.request(uri.toString(), { type: 'GET', headers }, [], CancellationToken.None);
        const result = (await asJson(context)) || [];
        return result.map(({ url, created }) => ({
            ref: relativePath(uri, uri.with({ path: url })),
            created: created * 1000 /* Server returns in seconds */,
        }));
    }
    async resolveResourceContent(resource, ref, collection, headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource), ref).toString();
        headers = { ...headers };
        headers['Cache-Control'] = 'no-cache';
        const context = await this.request(url, { type: 'GET', headers }, [], CancellationToken.None);
        const content = await asTextOrError(context);
        return content;
    }
    async deleteResource(resource, ref, collection) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = ref !== null
            ? joinPath(this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource), ref).toString()
            : this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource).toString();
        const headers = {};
        await this.request(url, { type: 'DELETE', headers }, [], CancellationToken.None);
    }
    async deleteResources() {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.userDataSyncStoreUrl, 'resource').toString();
        const headers = { 'Content-Type': Mimes.text };
        await this.request(url, { type: 'DELETE', headers }, [], CancellationToken.None);
    }
    async readResource(resource, oldValue, collection, headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource), 'latest').toString();
        headers = { ...headers };
        // Disable caching as they are cached by synchronisers
        headers['Cache-Control'] = 'no-cache';
        if (oldValue) {
            headers['If-None-Match'] = oldValue.ref;
        }
        const context = await this.request(url, { type: 'GET', headers }, [304], CancellationToken.None);
        let userData = null;
        if (context.res.statusCode === 304) {
            userData = oldValue;
        }
        if (userData === null) {
            const ref = context.res.headers['etag'];
            if (!ref) {
                throw new UserDataSyncStoreError('Server did not return the ref', url, "NoRef" /* UserDataSyncErrorCode.NoRef */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
            }
            const content = await asTextOrError(context);
            if (!content && context.res.statusCode === 304) {
                throw new UserDataSyncStoreError('Empty response', url, "EmptyResponse" /* UserDataSyncErrorCode.EmptyResponse */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
            }
            userData = { ref, content };
        }
        return userData;
    }
    async writeResource(resource, data, ref, collection, headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = this.getResourceUrl(this.userDataSyncStoreUrl, collection, resource).toString();
        headers = { ...headers };
        headers['Content-Type'] = Mimes.text;
        if (ref) {
            headers['If-Match'] = ref;
        }
        const context = await this.request(url, { type: 'POST', data, headers }, [], CancellationToken.None);
        const newRef = context.res.headers['etag'];
        if (!newRef) {
            throw new UserDataSyncStoreError('Server did not return the ref', url, "NoRef" /* UserDataSyncErrorCode.NoRef */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
        }
        return newRef;
    }
    // #endregion
    async manifest(oldValue, headers = {}) {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.userDataSyncStoreUrl, 'manifest').toString();
        headers = { ...headers };
        headers['Content-Type'] = 'application/json';
        if (oldValue) {
            headers['If-None-Match'] = oldValue.ref;
        }
        const context = await this.request(url, { type: 'GET', headers }, [304], CancellationToken.None);
        let manifest = null;
        if (context.res.statusCode === 304) {
            manifest = oldValue;
        }
        if (!manifest) {
            const ref = context.res.headers['etag'];
            if (!ref) {
                throw new UserDataSyncStoreError('Server did not return the ref', url, "NoRef" /* UserDataSyncErrorCode.NoRef */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
            }
            const content = await asTextOrError(context);
            if (!content && context.res.statusCode === 304) {
                throw new UserDataSyncStoreError('Empty response', url, "EmptyResponse" /* UserDataSyncErrorCode.EmptyResponse */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
            }
            if (content) {
                manifest = { ...JSON.parse(content), ref };
            }
        }
        const currentSessionId = this.storageService.get(USER_SESSION_ID_KEY, -1 /* StorageScope.APPLICATION */);
        if (currentSessionId && manifest && currentSessionId !== manifest.session) {
            // Server session is different from client session so clear cached session.
            this.clearSession();
        }
        if (manifest === null && currentSessionId) {
            // server session is cleared so clear cached session.
            this.clearSession();
        }
        if (manifest) {
            // update session
            this.storageService.store(USER_SESSION_ID_KEY, manifest.session, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        return manifest;
    }
    async clear() {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        await this.deleteCollection();
        await this.deleteResources();
        // clear cached session.
        this.clearSession();
    }
    async getActivityData() {
        if (!this.userDataSyncStoreUrl) {
            throw new Error('No settings sync store url configured.');
        }
        const url = joinPath(this.userDataSyncStoreUrl, 'download').toString();
        const headers = {};
        const context = await this.request(url, { type: 'GET', headers }, [], CancellationToken.None);
        if (!isSuccess(context)) {
            throw new UserDataSyncStoreError('Server returned ' + context.res.statusCode, url, "EmptyResponse" /* UserDataSyncErrorCode.EmptyResponse */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
        }
        if (hasNoContent(context)) {
            throw new UserDataSyncStoreError('Empty response', url, "EmptyResponse" /* UserDataSyncErrorCode.EmptyResponse */, context.res.statusCode, context.res.headers[HEADER_OPERATION_ID]);
        }
        return context.stream;
    }
    getResourceUrl(userDataSyncStoreUrl, collection, resource) {
        return collection
            ? joinPath(userDataSyncStoreUrl, 'collection', collection, 'resource', resource)
            : joinPath(userDataSyncStoreUrl, 'resource', resource);
    }
    clearSession() {
        this.storageService.remove(USER_SESSION_ID_KEY, -1 /* StorageScope.APPLICATION */);
        this.storageService.remove(MACHINE_SESSION_ID_KEY, -1 /* StorageScope.APPLICATION */);
    }
    async request(url, options, successCodes, token) {
        if (!this.authToken) {
            throw new UserDataSyncStoreError('No Auth Token Available', url, "Unauthorized" /* UserDataSyncErrorCode.Unauthorized */, undefined, undefined);
        }
        if (this._donotMakeRequestsUntil && Date.now() < this._donotMakeRequestsUntil.getTime()) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of too many requests (429).`, url, "TooManyRequestsAndRetryAfter" /* UserDataSyncErrorCode.TooManyRequestsAndRetryAfter */, undefined, undefined);
        }
        this.setDonotMakeRequestsUntil(undefined);
        const commonHeaders = await this.commonHeadersPromise;
        options.headers = {
            ...(options.headers || {}),
            ...commonHeaders,
            'X-Account-Type': this.authToken.type,
            authorization: `Bearer ${this.authToken.token}`,
        };
        // Add session headers
        this.addSessionHeaders(options.headers);
        this.logService.trace('Sending request to server', {
            url,
            type: options.type,
            headers: { ...options.headers, ...{ authorization: undefined } },
        });
        let context;
        try {
            context = await this.session.request(url, options, token);
        }
        catch (e) {
            if (!(e instanceof UserDataSyncStoreError)) {
                let code = "RequestFailed" /* UserDataSyncErrorCode.RequestFailed */;
                const errorMessage = getErrorMessage(e).toLowerCase();
                // Request timed out
                if (errorMessage.includes('xhr timeout')) {
                    code = "RequestTimeout" /* UserDataSyncErrorCode.RequestTimeout */;
                }
                // Request protocol not supported
                else if (errorMessage.includes('protocol') && errorMessage.includes('not supported')) {
                    code = "RequestProtocolNotSupported" /* UserDataSyncErrorCode.RequestProtocolNotSupported */;
                }
                // Request path not escaped
                else if (errorMessage.includes('request path contains unescaped characters')) {
                    code = "RequestPathNotEscaped" /* UserDataSyncErrorCode.RequestPathNotEscaped */;
                }
                // Request header not an object
                else if (errorMessage.includes('headers must be an object')) {
                    code = "RequestHeadersNotObject" /* UserDataSyncErrorCode.RequestHeadersNotObject */;
                }
                // Request canceled
                else if (isCancellationError(e)) {
                    code = "RequestCanceled" /* UserDataSyncErrorCode.RequestCanceled */;
                }
                e = new UserDataSyncStoreError(`Connection refused for the request '${url}'.`, url, code, undefined, undefined);
            }
            this.logService.info('Request failed', url);
            throw e;
        }
        const operationId = context.res.headers[HEADER_OPERATION_ID];
        const requestInfo = {
            url,
            status: context.res.statusCode,
            'execution-id': options.headers[HEADER_EXECUTION_ID],
            'operation-id': operationId,
        };
        const isSuccess = isSuccessContext(context) ||
            (context.res.statusCode && successCodes.includes(context.res.statusCode));
        let failureMessage = '';
        if (isSuccess) {
            this.logService.trace('Request succeeded', requestInfo);
        }
        else {
            failureMessage = (await asText(context)) || '';
            this.logService.info('Request failed', requestInfo, failureMessage);
        }
        if (context.res.statusCode === 401 || context.res.statusCode === 403) {
            this.authToken = undefined;
            if (context.res.statusCode === 401) {
                this._onTokenFailed.fire("Unauthorized" /* UserDataSyncErrorCode.Unauthorized */);
                throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of Unauthorized (401).`, url, "Unauthorized" /* UserDataSyncErrorCode.Unauthorized */, context.res.statusCode, operationId);
            }
            if (context.res.statusCode === 403) {
                this._onTokenFailed.fire("Forbidden" /* UserDataSyncErrorCode.Forbidden */);
                throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because the access is forbidden (403).`, url, "Forbidden" /* UserDataSyncErrorCode.Forbidden */, context.res.statusCode, operationId);
            }
        }
        this._onTokenSucceed.fire();
        if (context.res.statusCode === 404) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because the requested resource is not found (404).`, url, "NotFound" /* UserDataSyncErrorCode.NotFound */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 405) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because the requested endpoint is not found (405). ${failureMessage}`, url, "MethodNotFound" /* UserDataSyncErrorCode.MethodNotFound */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 409) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of Conflict (409). There is new data for this resource. Make the request again with latest data.`, url, "Conflict" /* UserDataSyncErrorCode.Conflict */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 410) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because the requested resource is not longer available (410).`, url, "Gone" /* UserDataSyncErrorCode.Gone */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 412) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of Precondition Failed (412). There is new data for this resource. Make the request again with latest data.`, url, "PreconditionFailed" /* UserDataSyncErrorCode.PreconditionFailed */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 413) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of too large payload (413).`, url, "TooLarge" /* UserDataSyncErrorCode.TooLarge */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 426) {
            throw new UserDataSyncStoreError(`${options.type} request '${url}' failed with status Upgrade Required (426). Please upgrade the client and try again.`, url, "UpgradeRequired" /* UserDataSyncErrorCode.UpgradeRequired */, context.res.statusCode, operationId);
        }
        if (context.res.statusCode === 429) {
            const retryAfter = context.res.headers['retry-after'];
            if (retryAfter) {
                this.setDonotMakeRequestsUntil(new Date(Date.now() + parseInt(retryAfter) * 1000));
                throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of too many requests (429).`, url, "TooManyRequestsAndRetryAfter" /* UserDataSyncErrorCode.TooManyRequestsAndRetryAfter */, context.res.statusCode, operationId);
            }
            else {
                throw new UserDataSyncStoreError(`${options.type} request '${url}' failed because of too many requests (429).`, url, "RemoteTooManyRequests" /* UserDataSyncErrorCode.TooManyRequests */, context.res.statusCode, operationId);
            }
        }
        if (!isSuccess) {
            throw new UserDataSyncStoreError('Server returned ' + context.res.statusCode, url, "Unknown" /* UserDataSyncErrorCode.Unknown */, context.res.statusCode, operationId);
        }
        return context;
    }
    addSessionHeaders(headers) {
        let machineSessionId = this.storageService.get(MACHINE_SESSION_ID_KEY, -1 /* StorageScope.APPLICATION */);
        if (machineSessionId === undefined) {
            machineSessionId = generateUuid();
            this.storageService.store(MACHINE_SESSION_ID_KEY, machineSessionId, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
        }
        headers['X-Machine-Session-Id'] = machineSessionId;
        const userSessionId = this.storageService.get(USER_SESSION_ID_KEY, -1 /* StorageScope.APPLICATION */);
        if (userSessionId !== undefined) {
            headers['X-User-Session-Id'] = userSessionId;
        }
    }
};
UserDataSyncStoreClient = __decorate([
    __param(1, IProductService),
    __param(2, IRequestService),
    __param(3, IUserDataSyncLogService),
    __param(4, IEnvironmentService),
    __param(5, IFileService),
    __param(6, IStorageService)
], UserDataSyncStoreClient);
export { UserDataSyncStoreClient };
let UserDataSyncStoreService = class UserDataSyncStoreService extends UserDataSyncStoreClient {
    constructor(userDataSyncStoreManagementService, productService, requestService, logService, environmentService, fileService, storageService) {
        super(userDataSyncStoreManagementService.userDataSyncStore?.url, productService, requestService, logService, environmentService, fileService, storageService);
        this._register(userDataSyncStoreManagementService.onDidChangeUserDataSyncStore(() => this.updateUserDataSyncStoreUrl(userDataSyncStoreManagementService.userDataSyncStore?.url)));
    }
};
UserDataSyncStoreService = __decorate([
    __param(0, IUserDataSyncStoreManagementService),
    __param(1, IProductService),
    __param(2, IRequestService),
    __param(3, IUserDataSyncLogService),
    __param(4, IEnvironmentService),
    __param(5, IFileService),
    __param(6, IStorageService)
], UserDataSyncStoreService);
export { UserDataSyncStoreService };
export class RequestsSession {
    constructor(limit, interval /* in ms */, requestService, logService) {
        this.limit = limit;
        this.interval = interval;
        this.requestService = requestService;
        this.logService = logService;
        this.requests = [];
        this.startTime = undefined;
    }
    request(url, options, token) {
        if (this.isExpired()) {
            this.reset();
        }
        options.url = url;
        if (this.requests.length >= this.limit) {
            this.logService.info('Too many requests', ...this.requests);
            throw new UserDataSyncStoreError(`Too many requests. Only ${this.limit} requests allowed in ${this.interval / (1000 * 60)} minutes.`, url, "LocalTooManyRequests" /* UserDataSyncErrorCode.LocalTooManyRequests */, undefined, undefined);
        }
        this.startTime = this.startTime || new Date();
        this.requests.push(url);
        return this.requestService.request(options, token);
    }
    isExpired() {
        return (this.startTime !== undefined &&
            new Date().getTime() - this.startTime.getTime() > this.interval);
    }
    reset() {
        this.requests = [];
        this.startTime = undefined;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU3RvcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS91c2VyRGF0YVN5bmMvY29tbW9uL3VzZXJEYXRhU3luY1N0b3JlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25HLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFNM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFB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