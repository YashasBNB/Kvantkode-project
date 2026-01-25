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
import { app, } from 'electron';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Event } from '../../../base/common/event.js';
import { hash } from '../../../base/common/hash.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { IEncryptionMainService } from '../../encryption/common/encryptionService.js';
import { IEnvironmentMainService } from '../../environment/electron-main/environmentMainService.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { IApplicationStorageMainService } from '../../storage/electron-main/storageMainService.js';
import { IWindowsMainService } from '../../windows/electron-main/windows.js';
export const IProxyAuthService = createDecorator('proxyAuthService');
let ProxyAuthService = class ProxyAuthService extends Disposable {
    constructor(logService, windowsMainService, encryptionMainService, applicationStorageMainService, configurationService, environmentMainService) {
        super();
        this.logService = logService;
        this.windowsMainService = windowsMainService;
        this.encryptionMainService = encryptionMainService;
        this.applicationStorageMainService = applicationStorageMainService;
        this.configurationService = configurationService;
        this.environmentMainService = environmentMainService;
        this.PROXY_CREDENTIALS_SERVICE_KEY = 'proxy-credentials://';
        this.pendingProxyResolves = new Map();
        this.currentDialog = undefined;
        this.cancelledAuthInfoHashes = new Set();
        this.sessionCredentials = new Map();
        this.registerListeners();
    }
    registerListeners() {
        const onLogin = Event.fromNodeEventEmitter(app, 'login', (event, _webContents, req, authInfo, callback) => ({
            event,
            authInfo: { ...authInfo, attempt: req.firstAuthAttempt ? 1 : 2 },
            callback,
        }));
        this._register(onLogin(this.onLogin, this));
    }
    async lookupAuthorization(authInfo) {
        return this.onLogin({ authInfo });
    }
    async onLogin({ event, authInfo, callback, }) {
        if (!authInfo.isProxy) {
            return; // only for proxy
        }
        // Signal we handle this event on our own, otherwise
        // Electron will ignore our provided credentials.
        event?.preventDefault();
        // Compute a hash over the authentication info to be used
        // with the credentials store to return the right credentials
        // given the properties of the auth request
        // (see https://github.com/microsoft/vscode/issues/109497)
        const authInfoHash = String(hash({ scheme: authInfo.scheme, host: authInfo.host, port: authInfo.port }));
        let credentials = undefined;
        let pendingProxyResolve = this.pendingProxyResolves.get(authInfoHash);
        if (!pendingProxyResolve) {
            this.logService.trace('auth#onLogin (proxy) - no pending proxy handling found, starting new');
            pendingProxyResolve = this.resolveProxyCredentials(authInfo, authInfoHash);
            this.pendingProxyResolves.set(authInfoHash, pendingProxyResolve);
            try {
                credentials = await pendingProxyResolve;
            }
            finally {
                this.pendingProxyResolves.delete(authInfoHash);
            }
        }
        else {
            this.logService.trace('auth#onLogin (proxy) - pending proxy handling found');
            credentials = await pendingProxyResolve;
        }
        // According to Electron docs, it is fine to call back without
        // username or password to signal that the authentication was handled
        // by us, even though without having credentials received:
        //
        // > If `callback` is called without a username or password, the authentication
        // > request will be cancelled and the authentication error will be returned to the
        // > page.
        callback?.(credentials?.username, credentials?.password);
        return credentials;
    }
    async resolveProxyCredentials(authInfo, authInfoHash) {
        this.logService.trace('auth#resolveProxyCredentials (proxy) - enter');
        try {
            const credentials = await this.doResolveProxyCredentials(authInfo, authInfoHash);
            if (credentials) {
                this.logService.trace('auth#resolveProxyCredentials (proxy) - got credentials');
                return credentials;
            }
            else {
                this.logService.trace('auth#resolveProxyCredentials (proxy) - did not get credentials');
            }
        }
        finally {
            this.logService.trace('auth#resolveProxyCredentials (proxy) - exit');
        }
        return undefined;
    }
    async doResolveProxyCredentials(authInfo, authInfoHash) {
        this.logService.trace('auth#doResolveProxyCredentials - enter', authInfo);
        // For testing.
        if (this.environmentMainService.extensionTestsLocationURI) {
            try {
                const decodedRealm = Buffer.from(authInfo.realm, 'base64').toString('utf-8');
                if (decodedRealm.startsWith('{')) {
                    return JSON.parse(decodedRealm);
                }
            }
            catch {
                // ignore
            }
            return undefined;
        }
        // Reply with manually supplied credentials. Fail if they are wrong.
        const newHttpProxy = (this.configurationService.getValue('http.proxy') || '').trim() ||
            (process.env['https_proxy'] ||
                process.env['HTTPS_PROXY'] ||
                process.env['http_proxy'] ||
                process.env['HTTP_PROXY'] ||
                '').trim() ||
            undefined;
        if (newHttpProxy?.indexOf('@') !== -1) {
            const uri = URI.parse(newHttpProxy);
            const i = uri.authority.indexOf('@');
            if (i !== -1) {
                if (authInfo.attempt > 1) {
                    this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - ignoring previously used config/envvar credentials');
                    return undefined; // We tried already, let the user handle it.
                }
                this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found config/envvar credentials to use');
                const credentials = uri.authority.substring(0, i);
                const j = credentials.indexOf(':');
                if (j !== -1) {
                    return {
                        username: credentials.substring(0, j),
                        password: credentials.substring(j + 1),
                    };
                }
                else {
                    return {
                        username: credentials,
                        password: '',
                    };
                }
            }
        }
        // Reply with session credentials unless we used them already.
        // In that case we need to show a login dialog again because
        // they seem invalid.
        const sessionCredentials = authInfo.attempt === 1 && this.sessionCredentials.get(authInfoHash);
        if (sessionCredentials) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found session credentials to use');
            const { username, password } = sessionCredentials;
            return { username, password };
        }
        let storedUsername;
        let storedPassword;
        try {
            // Try to find stored credentials for the given auth info
            const encryptedValue = this.applicationStorageMainService.get(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, -1 /* StorageScope.APPLICATION */);
            if (encryptedValue) {
                const credentials = JSON.parse(await this.encryptionMainService.decrypt(encryptedValue));
                storedUsername = credentials.username;
                storedPassword = credentials.password;
            }
        }
        catch (error) {
            this.logService.error(error); // handle errors by asking user for login via dialog
        }
        // Reply with stored credentials unless we used them already.
        // In that case we need to show a login dialog again because
        // they seem invalid.
        if (authInfo.attempt === 1 &&
            typeof storedUsername === 'string' &&
            typeof storedPassword === 'string') {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - found stored credentials to use');
            this.sessionCredentials.set(authInfoHash, {
                username: storedUsername,
                password: storedPassword,
            });
            return { username: storedUsername, password: storedPassword };
        }
        const previousDialog = this.currentDialog;
        const currentDialog = (this.currentDialog = (async () => {
            await previousDialog;
            const credentials = await this.showProxyCredentialsDialog(authInfo, authInfoHash, storedUsername, storedPassword);
            if (this.currentDialog === currentDialog) {
                this.currentDialog = undefined;
            }
            return credentials;
        })());
        return currentDialog;
    }
    async showProxyCredentialsDialog(authInfo, authInfoHash, storedUsername, storedPassword) {
        if (this.cancelledAuthInfoHashes.has(authInfoHash)) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - login dialog was cancelled before, not showing again');
            return undefined;
        }
        // Find suitable window to show dialog: prefer to show it in the
        // active window because any other network request will wait on
        // the credentials and we want the user to present the dialog.
        const window = this.windowsMainService.getFocusedWindow() || this.windowsMainService.getLastActiveWindow();
        if (!window) {
            this.logService.trace('auth#doResolveProxyCredentials (proxy) - exit - no opened window found to show dialog in');
            return undefined; // unexpected
        }
        this.logService.trace(`auth#doResolveProxyCredentials (proxy) - asking window ${window.id} to handle proxy login`);
        // Open proxy dialog
        const sessionCredentials = this.sessionCredentials.get(authInfoHash);
        const payload = {
            authInfo,
            username: sessionCredentials?.username ?? storedUsername, // prefer to show already used username (if any) over stored
            password: sessionCredentials?.password ?? storedPassword, // prefer to show already used password (if any) over stored
            replyChannel: `vscode:proxyAuthResponse:${generateUuid()}`,
        };
        window.sendWhenReady('vscode:openProxyAuthenticationDialog', CancellationToken.None, payload);
        // Handle reply
        const loginDialogCredentials = await new Promise((resolve) => {
            const proxyAuthResponseHandler = async (event, channel, reply /* canceled */) => {
                if (channel === payload.replyChannel) {
                    this.logService.trace(`auth#doResolveProxyCredentials - exit - received credentials from window ${window.id}`);
                    window.win?.webContents.off('ipc-message', proxyAuthResponseHandler);
                    // We got credentials from the window
                    if (reply) {
                        const credentials = { username: reply.username, password: reply.password };
                        // Update stored credentials based on `remember` flag
                        try {
                            if (reply.remember) {
                                const encryptedSerializedCredentials = await this.encryptionMainService.encrypt(JSON.stringify(credentials));
                                this.applicationStorageMainService.store(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, encryptedSerializedCredentials, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
                            }
                            else {
                                this.applicationStorageMainService.remove(this.PROXY_CREDENTIALS_SERVICE_KEY + authInfoHash, -1 /* StorageScope.APPLICATION */);
                            }
                        }
                        catch (error) {
                            this.logService.error(error); // handle gracefully
                        }
                        resolve({ username: credentials.username, password: credentials.password });
                    }
                    // We did not get any credentials from the window (e.g. cancelled)
                    else {
                        this.cancelledAuthInfoHashes.add(authInfoHash);
                        resolve(undefined);
                    }
                }
            };
            window.win?.webContents.on('ipc-message', proxyAuthResponseHandler);
        });
        // Remember credentials for the session in case
        // the credentials are wrong and we show the dialog
        // again
        this.sessionCredentials.set(authInfoHash, loginDialogCredentials);
        return loginDialogCredentials;
    }
};
ProxyAuthService = __decorate([
    __param(0, ILogService),
    __param(1, IWindowsMainService),
    __param(2, IEncryptionMainService),
    __param(3, IApplicationStorageMainService),
    __param(4, IConfigurationService),
    __param(5, IEnvironmentMainService)
], ProxyAuthService);
export { ProxyAuthService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbmF0aXZlL2VsZWN0cm9uLW1haW4vYXV0aC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sR0FBRyxHQUtILE1BQU0sVUFBVSxDQUFBO0FBQ2pCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDM0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUdyRCxPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQVk1RSxNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQW9CLGtCQUFrQixDQUFDLENBQUE7QUFNaEYsSUFBTSxnQkFBZ0IsR0FBdEIsTUFBTSxn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