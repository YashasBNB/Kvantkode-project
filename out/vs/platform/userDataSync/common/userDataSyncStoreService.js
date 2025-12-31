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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jU3RvcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL2NvbW1vbi91c2VyRGF0YVN5bmNTdG9yZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDckYsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXhELE9BQU8sRUFBRSxRQUFRLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBTTNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFB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