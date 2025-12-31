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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXV0aC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL25hdGl2ZS9lbGVjdHJvbi1tYWluL2F1dGgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLEdBQUcsR0FLSCxNQUFNLFVBQVUsQ0FBQTtBQUNqQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzNELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFHckQsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFZNUUsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBTWhGLElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlC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