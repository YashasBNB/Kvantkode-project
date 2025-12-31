/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { bufferToStream, VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { ConfigurationService } from '../../../configuration/common/configurationService.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { GlobalExtensionEnablementService } from '../../../extensionManagement/common/extensionEnablementService.js';
import { IExtensionGalleryService, IExtensionManagementService, IGlobalExtensionEnablementService, } from '../../../extensionManagement/common/extensionManagement.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import product from '../../../product/common/product.js';
import { IProductService } from '../../../product/common/productService.js';
import { IRequestService } from '../../../request/common/request.js';
import { InMemoryStorageService, IStorageService } from '../../../storage/common/storage.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { ExtensionStorageService, IExtensionStorageService, } from '../../../extensionManagement/common/extensionStorage.js';
import { IgnoredExtensionsManagementService, IIgnoredExtensionsManagementService, } from '../../common/ignoredExtensions.js';
import { ALL_SYNC_RESOURCES, getDefaultIgnoredSettings, IUserDataSyncLocalStoreService, IUserDataSyncLogService, IUserDataSyncEnablementService, IUserDataSyncService, IUserDataSyncStoreManagementService, IUserDataSyncStoreService, IUserDataSyncUtilService, registerConfiguration, USER_DATA_SYNC_SCHEME, } from '../../common/userDataSync.js';
import { IUserDataSyncAccountService, UserDataSyncAccountService, } from '../../common/userDataSyncAccount.js';
import { UserDataSyncLocalStoreService } from '../../common/userDataSyncLocalStoreService.js';
import { IUserDataSyncMachinesService, UserDataSyncMachinesService, } from '../../common/userDataSyncMachines.js';
import { UserDataSyncEnablementService } from '../../common/userDataSyncEnablementService.js';
import { UserDataSyncService } from '../../common/userDataSyncService.js';
import { UserDataSyncStoreManagementService, UserDataSyncStoreService, } from '../../common/userDataSyncStoreService.js';
import { InMemoryUserDataProfilesService, IUserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
import { NullPolicyService } from '../../../policy/common/policy.js';
import { IUserDataProfileStorageService } from '../../../userDataProfile/common/userDataProfileStorageService.js';
import { TestUserDataProfileStorageService } from '../../../userDataProfile/test/common/userDataProfileStorageService.test.js';
export class UserDataSyncClient extends Disposable {
    constructor(testServer = new UserDataSyncTestServer()) {
        super();
        this.testServer = testServer;
        this.instantiationService = this._register(new TestInstantiationService());
    }
    async setUp(empty = false) {
        this._register(registerConfiguration());
        const logService = this.instantiationService.stub(ILogService, new NullLogService());
        const userRoamingDataHome = URI.file('userdata').with({ scheme: Schemas.inMemory });
        const userDataSyncHome = joinPath(userRoamingDataHome, '.sync');
        const environmentService = this.instantiationService.stub(IEnvironmentService, {
            userDataSyncHome,
            userRoamingDataHome,
            cacheHome: joinPath(userRoamingDataHome, 'cache'),
            argvResource: joinPath(userRoamingDataHome, 'argv.json'),
            sync: 'on',
        });
        this.instantiationService.stub(IProductService, {
            _serviceBrand: undefined,
            ...product,
            ...{
                'configurationSync.store': {
                    url: this.testServer.url,
                    stableUrl: this.testServer.url,
                    insidersUrl: this.testServer.url,
                    canSwitch: false,
                    authenticationProviders: { test: { scopes: [] } },
                },
            },
        });
        const fileService = this._register(new FileService(logService));
        this._register(fileService.registerProvider(Schemas.inMemory, this._register(new InMemoryFileSystemProvider())));
        this._register(fileService.registerProvider(USER_DATA_SYNC_SCHEME, this._register(new InMemoryFileSystemProvider())));
        this.instantiationService.stub(IFileService, fileService);
        const uriIdentityService = this._register(this.instantiationService.createInstance(UriIdentityService));
        this.instantiationService.stub(IUriIdentityService, uriIdentityService);
        const userDataProfilesService = this._register(new InMemoryUserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        this.instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
        const storageService = this._register(new TestStorageService(userDataProfilesService.defaultProfile));
        this.instantiationService.stub(IStorageService, this._register(storageService));
        this.instantiationService.stub(IUserDataProfileStorageService, this._register(new TestUserDataProfileStorageService(false, storageService)));
        const configurationService = this._register(new ConfigurationService(userDataProfilesService.defaultProfile.settingsResource, fileService, new NullPolicyService(), logService));
        await configurationService.initialize();
        this.instantiationService.stub(IConfigurationService, configurationService);
        this.instantiationService.stub(IRequestService, this.testServer);
        this.instantiationService.stub(IUserDataSyncLogService, logService);
        this.instantiationService.stub(ITelemetryService, NullTelemetryService);
        this.instantiationService.stub(IUserDataSyncStoreManagementService, this._register(this.instantiationService.createInstance(UserDataSyncStoreManagementService)));
        this.instantiationService.stub(IUserDataSyncStoreService, this._register(this.instantiationService.createInstance(UserDataSyncStoreService)));
        const userDataSyncAccountService = this._register(this.instantiationService.createInstance(UserDataSyncAccountService));
        await userDataSyncAccountService.updateAccount({
            authenticationProviderId: 'authenticationProviderId',
            token: 'token',
        });
        this.instantiationService.stub(IUserDataSyncAccountService, userDataSyncAccountService);
        this.instantiationService.stub(IUserDataSyncMachinesService, this._register(this.instantiationService.createInstance(UserDataSyncMachinesService)));
        this.instantiationService.stub(IUserDataSyncLocalStoreService, this._register(this.instantiationService.createInstance(UserDataSyncLocalStoreService)));
        this.instantiationService.stub(IUserDataSyncUtilService, new TestUserDataSyncUtilService());
        this.instantiationService.stub(IUserDataSyncEnablementService, this._register(this.instantiationService.createInstance(UserDataSyncEnablementService)));
        this.instantiationService.stub(IExtensionManagementService, {
            async getInstalled() {
                return [];
            },
            onDidInstallExtensions: new Emitter().event,
            onDidUninstallExtension: new Emitter().event,
        });
        this.instantiationService.stub(IGlobalExtensionEnablementService, this._register(this.instantiationService.createInstance(GlobalExtensionEnablementService)));
        this.instantiationService.stub(IExtensionStorageService, this._register(this.instantiationService.createInstance(ExtensionStorageService)));
        this.instantiationService.stub(IIgnoredExtensionsManagementService, this.instantiationService.createInstance(IgnoredExtensionsManagementService));
        this.instantiationService.stub(IExtensionGalleryService, {
            isEnabled() {
                return true;
            },
            async getCompatibleExtension() {
                return null;
            },
        });
        this.instantiationService.stub(IUserDataSyncService, this._register(this.instantiationService.createInstance(UserDataSyncService)));
        if (!empty) {
            await fileService.writeFile(userDataProfilesService.defaultProfile.settingsResource, VSBuffer.fromString(JSON.stringify({})));
            await fileService.writeFile(userDataProfilesService.defaultProfile.keybindingsResource, VSBuffer.fromString(JSON.stringify([])));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.snippetsHome, 'c.json'), VSBuffer.fromString(`{}`));
            await fileService.writeFile(joinPath(userDataProfilesService.defaultProfile.promptsHome, 'c.prompt.md'), VSBuffer.fromString(' '));
            await fileService.writeFile(userDataProfilesService.defaultProfile.tasksResource, VSBuffer.fromString(`{}`));
            await fileService.writeFile(environmentService.argvResource, VSBuffer.fromString(JSON.stringify({ locale: 'en' })));
        }
        await configurationService.reloadConfiguration();
        // `prompts` resource is disabled by default, so enable it for tests
        this.instantiationService
            .get(IUserDataSyncEnablementService)
            .setResourceEnablement("prompts" /* SyncResource.Prompts */, true);
    }
    async sync() {
        await (await this.instantiationService.get(IUserDataSyncService).createSyncTask(null)).run();
    }
    read(resource, collection) {
        return this.instantiationService
            .get(IUserDataSyncStoreService)
            .readResource(resource, null, collection);
    }
    async getResourceManifest() {
        const manifest = await this.instantiationService.get(IUserDataSyncStoreService).manifest(null);
        return manifest?.latest ?? null;
    }
    getSynchronizer(source) {
        return this.instantiationService.get(IUserDataSyncService)
            .getOrCreateActiveProfileSynchronizer(this.instantiationService.get(IUserDataProfilesService).defaultProfile, undefined)
            .enabled.find((s) => s.resource === source);
    }
}
const ALL_SERVER_RESOURCES = [...ALL_SYNC_RESOURCES, 'machines'];
export class UserDataSyncTestServer {
    get requests() {
        return this._requests;
    }
    get requestsWithAllHeaders() {
        return this._requestsWithAllHeaders;
    }
    get responses() {
        return this._responses;
    }
    reset() {
        this._requests = [];
        this._responses = [];
        this._requestsWithAllHeaders = [];
    }
    constructor(rateLimit = Number.MAX_SAFE_INTEGER, retryAfter) {
        this.rateLimit = rateLimit;
        this.retryAfter = retryAfter;
        this.url = 'http://host:3000';
        this.session = null;
        this.collections = new Map();
        this.data = new Map();
        this._requests = [];
        this._requestsWithAllHeaders = [];
        this._responses = [];
        this.manifestRef = 0;
        this.collectionCounter = 0;
    }
    async resolveProxy(url) {
        return url;
    }
    async lookupAuthorization(authInfo) {
        return undefined;
    }
    async lookupKerberosAuthorization(url) {
        return undefined;
    }
    async loadCertificates() {
        return [];
    }
    async request(options, token) {
        if (this._requests.length === this.rateLimit) {
            return this.toResponse(429, this.retryAfter ? { 'retry-after': `${this.retryAfter}` } : undefined);
        }
        const headers = {};
        if (options.headers) {
            if (options.headers['If-None-Match']) {
                headers['If-None-Match'] = options.headers['If-None-Match'];
            }
            if (options.headers['If-Match']) {
                headers['If-Match'] = options.headers['If-Match'];
            }
        }
        this._requests.push({ url: options.url, type: options.type, headers });
        this._requestsWithAllHeaders.push({
            url: options.url,
            type: options.type,
            headers: options.headers,
        });
        const requestContext = await this.doRequest(options);
        this._responses.push({ status: requestContext.res.statusCode });
        return requestContext;
    }
    async doRequest(options) {
        const versionUrl = `${this.url}/v1/`;
        const relativePath = options.url.indexOf(versionUrl) === 0 ? options.url.substring(versionUrl.length) : undefined;
        const segments = relativePath ? relativePath.split('/') : [];
        if (options.type === 'GET' && segments.length === 1 && segments[0] === 'manifest') {
            return this.getManifest(options.headers);
        }
        if (options.type === 'GET' && segments.length === 3 && segments[0] === 'resource') {
            return this.getResourceData(undefined, segments[1], segments[2] === 'latest' ? undefined : segments[2], options.headers);
        }
        if (options.type === 'POST' && segments.length === 2 && segments[0] === 'resource') {
            return this.writeData(undefined, segments[1], options.data, options.headers);
        }
        // resources in collection
        if (options.type === 'GET' &&
            segments.length === 5 &&
            segments[0] === 'collection' &&
            segments[2] === 'resource') {
            return this.getResourceData(segments[1], segments[3], segments[4] === 'latest' ? undefined : segments[4], options.headers);
        }
        if (options.type === 'POST' &&
            segments.length === 4 &&
            segments[0] === 'collection' &&
            segments[2] === 'resource') {
            return this.writeData(segments[1], segments[3], options.data, options.headers);
        }
        if (options.type === 'DELETE' && segments.length === 2 && segments[0] === 'resource') {
            return this.deleteResourceData(undefined, segments[1]);
        }
        if (options.type === 'DELETE' && segments.length === 1 && segments[0] === 'resource') {
            return this.clear(options.headers);
        }
        if (options.type === 'DELETE' && segments[0] === 'collection') {
            return this.toResponse(204);
        }
        if (options.type === 'POST' && segments.length === 1 && segments[0] === 'collection') {
            return this.createCollection();
        }
        return this.toResponse(501);
    }
    async getManifest(headers) {
        if (this.session) {
            const latest = Object.create({});
            this.data.forEach((value, key) => (latest[key] = value.ref));
            let collection = undefined;
            if (this.collectionCounter) {
                collection = {};
                for (let collectionId = 1; collectionId <= this.collectionCounter; collectionId++) {
                    const collectionData = this.collections.get(`${collectionId}`);
                    if (collectionData) {
                        const latest = Object.create({});
                        collectionData.forEach((value, key) => (latest[key] = value.ref));
                        collection[`${collectionId}`] = { latest };
                    }
                }
            }
            const manifest = { session: this.session, latest, collection };
            return this.toResponse(200, { 'Content-Type': 'application/json', etag: `${this.manifestRef++}` }, JSON.stringify(manifest));
        }
        return this.toResponse(204, { etag: `${this.manifestRef++}` });
    }
    async getResourceData(collection, resource, ref, headers = {}) {
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find((key) => key === resource);
        if (resourceKey) {
            const data = collectionData.get(resourceKey);
            if (ref && data?.ref !== ref) {
                return this.toResponse(404);
            }
            if (!data) {
                return this.toResponse(204, { etag: '0' });
            }
            if (headers['If-None-Match'] === data.ref) {
                return this.toResponse(304);
            }
            return this.toResponse(200, { etag: data.ref }, data.content || '');
        }
        return this.toResponse(204);
    }
    async writeData(collection, resource, content = '', headers = {}) {
        if (!this.session) {
            this.session = generateUuid();
        }
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find((key) => key === resource);
        if (resourceKey) {
            const data = collectionData.get(resourceKey);
            if (headers['If-Match'] !== undefined && headers['If-Match'] !== (data ? data.ref : '0')) {
                return this.toResponse(412);
            }
            const ref = `${parseInt(data?.ref || '0') + 1}`;
            collectionData.set(resourceKey, { ref, content });
            return this.toResponse(200, { etag: ref });
        }
        return this.toResponse(204);
    }
    async deleteResourceData(collection, resource, headers = {}) {
        const collectionData = collection ? this.collections.get(collection) : this.data;
        if (!collectionData) {
            return this.toResponse(501);
        }
        const resourceKey = ALL_SERVER_RESOURCES.find((key) => key === resource);
        if (resourceKey) {
            collectionData.delete(resourceKey);
            return this.toResponse(200);
        }
        return this.toResponse(404);
    }
    async createCollection() {
        const collectionId = `${++this.collectionCounter}`;
        this.collections.set(collectionId, new Map());
        return this.toResponse(200, {}, collectionId);
    }
    async clear(headers) {
        this.collections.clear();
        this.data.clear();
        this.session = null;
        this.collectionCounter = 0;
        return this.toResponse(204);
    }
    toResponse(statusCode, headers, data) {
        return {
            res: {
                headers: headers || {},
                statusCode,
            },
            stream: bufferToStream(VSBuffer.fromString(data || '')),
        };
    }
}
export class TestUserDataSyncUtilService {
    async resolveDefaultCoreIgnoredSettings() {
        return getDefaultIgnoredSettings();
    }
    async resolveUserBindings(userbindings) {
        const keys = {};
        for (const keybinding of userbindings) {
            keys[keybinding] = keybinding;
        }
        return keys;
    }
    async resolveFormattingOptions(file) {
        return { eol: '\n', insertSpaces: false, tabSize: 4 };
    }
}
class TestStorageService extends InMemoryStorageService {
    constructor(profileStorageProfile) {
        super();
        this.profileStorageProfile = profileStorageProfile;
    }
    hasScope(profile) {
        return this.profileStorageProfile.id === profile.id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jQ2xpZW50LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXNlckRhdGFTeW5jL3Rlc3QvY29tbW9uL3VzZXJEYXRhU3luY0NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzVFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBTTlELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3BILE9BQU8sRUFFTix3QkFBd0IsRUFDeEIsMkJBQTJCLEVBQzNCLGlDQUFpQyxHQUVqQyxNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURB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