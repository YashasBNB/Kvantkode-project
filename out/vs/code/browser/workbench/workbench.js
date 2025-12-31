/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isStandalone } from '../../../base/browser/browser.js';
import { mainWindow } from '../../../base/browser/window.js';
import { VSBuffer, decodeBase64, encodeBase64 } from '../../../base/common/buffer.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { parse } from '../../../base/common/marshalling.js';
import { Schemas } from '../../../base/common/network.js';
import { posix } from '../../../base/common/path.js';
import { isEqual } from '../../../base/common/resources.js';
import { ltrim } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import product from '../../../platform/product/common/product.js';
import { isFolderToOpen, isWorkspaceToOpen } from '../../../platform/window/common/window.js';
import { create } from '../../../workbench/workbench.web.main.internal.js';
class TransparentCrypto {
    async seal(data) {
        return data;
    }
    async unseal(data) {
        return data;
    }
}
var AESConstants;
(function (AESConstants) {
    AESConstants["ALGORITHM"] = "AES-GCM";
    AESConstants[AESConstants["KEY_LENGTH"] = 256] = "KEY_LENGTH";
    AESConstants[AESConstants["IV_LENGTH"] = 12] = "IV_LENGTH";
})(AESConstants || (AESConstants = {}));
class NetworkError extends Error {
    constructor(inner) {
        super(inner.message);
        this.name = inner.name;
        this.stack = inner.stack;
    }
}
class ServerKeyedAESCrypto {
    /**
     * Gets whether the algorithm is supported; requires a secure context
     */
    static supported() {
        return !!crypto.subtle;
    }
    constructor(authEndpoint) {
        this.authEndpoint = authEndpoint;
    }
    async seal(data) {
        // Get a new key and IV on every change, to avoid the risk of reusing the same key and IV pair with AES-GCM
        // (see also: https://developer.mozilla.org/en-US/docs/Web/API/AesGcmParams#properties)
        const iv = mainWindow.crypto.getRandomValues(new Uint8Array(12 /* AESConstants.IV_LENGTH */));
        // crypto.getRandomValues isn't a good-enough PRNG to generate crypto keys, so we need to use crypto.subtle.generateKey and export the key instead
        const clientKeyObj = await mainWindow.crypto.subtle.generateKey({ name: "AES-GCM" /* AESConstants.ALGORITHM */, length: 256 /* AESConstants.KEY_LENGTH */ }, true, ['encrypt', 'decrypt']);
        const clientKey = new Uint8Array(await mainWindow.crypto.subtle.exportKey('raw', clientKeyObj));
        const key = await this.getKey(clientKey);
        const dataUint8Array = new TextEncoder().encode(data);
        const cipherText = await mainWindow.crypto.subtle.encrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv }, key, dataUint8Array);
        // Base64 encode the result and store the ciphertext, the key, and the IV in localStorage
        // Note that the clientKey and IV don't need to be secret
        const result = new Uint8Array([...clientKey, ...iv, ...new Uint8Array(cipherText)]);
        return encodeBase64(VSBuffer.wrap(result));
    }
    async unseal(data) {
        // encrypted should contain, in order: the key (32-byte), the IV for AES-GCM (12-byte) and the ciphertext (which has the GCM auth tag at the end)
        // Minimum length must be 44 (key+IV length) + 16 bytes (1 block encrypted with AES - regardless of key size)
        const dataUint8Array = decodeBase64(data);
        if (dataUint8Array.byteLength < 60) {
            throw Error('Invalid length for the value for credentials.crypto');
        }
        const keyLength = 256 /* AESConstants.KEY_LENGTH */ / 8;
        const clientKey = dataUint8Array.slice(0, keyLength);
        const iv = dataUint8Array.slice(keyLength, keyLength + 12 /* AESConstants.IV_LENGTH */);
        const cipherText = dataUint8Array.slice(keyLength + 12 /* AESConstants.IV_LENGTH */);
        // Do the decryption and parse the result as JSON
        const key = await this.getKey(clientKey.buffer);
        const decrypted = await mainWindow.crypto.subtle.decrypt({ name: "AES-GCM" /* AESConstants.ALGORITHM */, iv: iv.buffer }, key, cipherText.buffer);
        return new TextDecoder().decode(new Uint8Array(decrypted));
    }
    /**
     * Given a clientKey, returns the CryptoKey object that is used to encrypt/decrypt the data.
     * The actual key is (clientKey XOR serverKey)
     */
    async getKey(clientKey) {
        if (!clientKey || clientKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
            throw Error('Invalid length for clientKey');
        }
        const serverKey = await this.getServerKeyPart();
        const keyData = new Uint8Array(256 /* AESConstants.KEY_LENGTH */ / 8);
        for (let i = 0; i < keyData.byteLength; i++) {
            keyData[i] = clientKey[i] ^ serverKey[i];
        }
        return mainWindow.crypto.subtle.importKey('raw', keyData, {
            name: "AES-GCM" /* AESConstants.ALGORITHM */,
            length: 256 /* AESConstants.KEY_LENGTH */,
        }, true, ['encrypt', 'decrypt']);
    }
    async getServerKeyPart() {
        if (this.serverKey) {
            return this.serverKey;
        }
        let attempt = 0;
        let lastError;
        while (attempt <= 3) {
            try {
                const res = await fetch(this.authEndpoint, { credentials: 'include', method: 'POST' });
                if (!res.ok) {
                    throw new Error(res.statusText);
                }
                const serverKey = new Uint8Array(await res.arrayBuffer());
                if (serverKey.byteLength !== 256 /* AESConstants.KEY_LENGTH */ / 8) {
                    throw Error(`The key retrieved by the server is not ${256 /* AESConstants.KEY_LENGTH */} bit long.`);
                }
                this.serverKey = serverKey;
                return this.serverKey;
            }
            catch (e) {
                lastError = e instanceof Error ? e : new Error(String(e));
                attempt++;
                // exponential backoff
                await new Promise((resolve) => setTimeout(resolve, attempt * attempt * 100));
            }
        }
        if (lastError) {
            throw new NetworkError(lastError);
        }
        throw new Error('Unknown error');
    }
}
export class LocalStorageSecretStorageProvider {
    constructor(crypto) {
        this.crypto = crypto;
        this.storageKey = 'secrets.provider';
        this.type = 'persisted';
        this.secretsPromise = this.load();
    }
    async load() {
        const record = this.loadAuthSessionFromElement();
        const encrypted = localStorage.getItem(this.storageKey);
        if (encrypted) {
            try {
                const decrypted = JSON.parse(await this.crypto.unseal(encrypted));
                return { ...record, ...decrypted };
            }
            catch (err) {
                // TODO: send telemetry
                console.error('Failed to decrypt secrets from localStorage', err);
                if (!(err instanceof NetworkError)) {
                    localStorage.removeItem(this.storageKey);
                }
            }
        }
        return record;
    }
    loadAuthSessionFromElement() {
        let authSessionInfo;
        const authSessionElement = mainWindow.document.getElementById('vscode-workbench-auth-session');
        const authSessionElementAttribute = authSessionElement
            ? authSessionElement.getAttribute('data-settings')
            : undefined;
        if (authSessionElementAttribute) {
            try {
                authSessionInfo = JSON.parse(authSessionElementAttribute);
            }
            catch (error) {
                /* Invalid session is passed. Ignore. */
            }
        }
        if (!authSessionInfo) {
            return {};
        }
        const record = {};
        // Settings Sync Entry
        record[`${product.urlProtocol}.loginAccount`] = JSON.stringify(authSessionInfo);
        // Auth extension Entry
        if (authSessionInfo.providerId !== 'github') {
            console.error(`Unexpected auth provider: ${authSessionInfo.providerId}. Expected 'github'.`);
            return record;
        }
        const authAccount = JSON.stringify({
            extensionId: 'vscode.github-authentication',
            key: 'github.auth',
        });
        record[authAccount] = JSON.stringify(authSessionInfo.scopes.map((scopes) => ({
            id: authSessionInfo.id,
            scopes,
            accessToken: authSessionInfo.accessToken,
        })));
        return record;
    }
    async get(key) {
        const secrets = await this.secretsPromise;
        return secrets[key];
    }
    async set(key, value) {
        const secrets = await this.secretsPromise;
        secrets[key] = value;
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async delete(key) {
        const secrets = await this.secretsPromise;
        delete secrets[key];
        this.secretsPromise = Promise.resolve(secrets);
        this.save();
    }
    async save() {
        try {
            const encrypted = await this.crypto.seal(JSON.stringify(await this.secretsPromise));
            localStorage.setItem(this.storageKey, encrypted);
        }
        catch (err) {
            console.error(err);
        }
    }
}
class LocalStorageURLCallbackProvider extends Disposable {
    static { this.REQUEST_ID = 0; }
    static { this.QUERY_KEYS = [
        'scheme',
        'authority',
        'path',
        'query',
        'fragment',
    ]; }
    constructor(_callbackRoute) {
        super();
        this._callbackRoute = _callbackRoute;
        this._onCallback = this._register(new Emitter());
        this.onCallback = this._onCallback.event;
        this.pendingCallbacks = new Set();
        this.lastTimeChecked = Date.now();
        this.checkCallbacksTimeout = undefined;
    }
    create(options = {}) {
        const id = ++LocalStorageURLCallbackProvider.REQUEST_ID;
        const queryParams = [`vscode-reqid=${id}`];
        for (const key of LocalStorageURLCallbackProvider.QUERY_KEYS) {
            const value = options[key];
            if (value) {
                queryParams.push(`vscode-${key}=${encodeURIComponent(value)}`);
            }
        }
        // TODO@joao remove eventually
        // https://github.com/microsoft/vscode-dev/issues/62
        // https://github.com/microsoft/vscode/blob/159479eb5ae451a66b5dac3c12d564f32f454796/extensions/github-authentication/src/githubServer.ts#L50-L50
        if (!(options.authority === 'vscode.github-authentication' && options.path === '/dummy')) {
            const key = `vscode-web.url-callbacks[${id}]`;
            localStorage.removeItem(key);
            this.pendingCallbacks.add(id);
            this.startListening();
        }
        return URI.parse(mainWindow.location.href).with({
            path: this._callbackRoute,
            query: queryParams.join('&'),
        });
    }
    startListening() {
        if (this.onDidChangeLocalStorageDisposable) {
            return;
        }
        const fn = () => this.onDidChangeLocalStorage();
        mainWindow.addEventListener('storage', fn);
        this.onDidChangeLocalStorageDisposable = {
            dispose: () => mainWindow.removeEventListener('storage', fn),
        };
    }
    stopListening() {
        this.onDidChangeLocalStorageDisposable?.dispose();
        this.onDidChangeLocalStorageDisposable = undefined;
    }
    // this fires every time local storage changes, but we
    // don't want to check more often than once a second
    async onDidChangeLocalStorage() {
        const ellapsed = Date.now() - this.lastTimeChecked;
        if (ellapsed > 1000) {
            this.checkCallbacks();
        }
        else if (this.checkCallbacksTimeout === undefined) {
            this.checkCallbacksTimeout = setTimeout(() => {
                this.checkCallbacksTimeout = undefined;
                this.checkCallbacks();
            }, 1000 - ellapsed);
        }
    }
    checkCallbacks() {
        let pendingCallbacks;
        for (const id of this.pendingCallbacks) {
            const key = `vscode-web.url-callbacks[${id}]`;
            const result = localStorage.getItem(key);
            if (result !== null) {
                try {
                    this._onCallback.fire(URI.revive(JSON.parse(result)));
                }
                catch (error) {
                    console.error(error);
                }
                pendingCallbacks = pendingCallbacks ?? new Set(this.pendingCallbacks);
                pendingCallbacks.delete(id);
                localStorage.removeItem(key);
            }
        }
        if (pendingCallbacks) {
            this.pendingCallbacks = pendingCallbacks;
            if (this.pendingCallbacks.size === 0) {
                this.stopListening();
            }
        }
        this.lastTimeChecked = Date.now();
    }
}
class WorkspaceProvider {
    static { this.QUERY_PARAM_EMPTY_WINDOW = 'ew'; }
    static { this.QUERY_PARAM_FOLDER = 'folder'; }
    static { this.QUERY_PARAM_WORKSPACE = 'workspace'; }
    static { this.QUERY_PARAM_PAYLOAD = 'payload'; }
    static create(config) {
        let foundWorkspace = false;
        let workspace;
        let payload = Object.create(null);
        const query = new URL(document.location.href).searchParams;
        query.forEach((value, key) => {
            switch (key) {
                // Folder
                case WorkspaceProvider.QUERY_PARAM_FOLDER:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = {
                            folderUri: URI.from({
                                scheme: Schemas.vscodeRemote,
                                path: value,
                                authority: config.remoteAuthority,
                            }),
                        };
                    }
                    else {
                        workspace = { folderUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Workspace
                case WorkspaceProvider.QUERY_PARAM_WORKSPACE:
                    if (config.remoteAuthority && value.startsWith(posix.sep)) {
                        // when connected to a remote and having a value
                        // that is a path (begins with a `/`), assume this
                        // is a vscode-remote resource as simplified URL.
                        workspace = {
                            workspaceUri: URI.from({
                                scheme: Schemas.vscodeRemote,
                                path: value,
                                authority: config.remoteAuthority,
                            }),
                        };
                    }
                    else {
                        workspace = { workspaceUri: URI.parse(value) };
                    }
                    foundWorkspace = true;
                    break;
                // Empty
                case WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW:
                    workspace = undefined;
                    foundWorkspace = true;
                    break;
                // Payload
                case WorkspaceProvider.QUERY_PARAM_PAYLOAD:
                    try {
                        payload = parse(value); // use marshalling#parse() to revive potential URIs
                    }
                    catch (error) {
                        console.error(error); // possible invalid JSON
                    }
                    break;
            }
        });
        // If no workspace is provided through the URL, check for config
        // attribute from server
        if (!foundWorkspace) {
            if (config.folderUri) {
                workspace = { folderUri: URI.revive(config.folderUri) };
            }
            else if (config.workspaceUri) {
                workspace = { workspaceUri: URI.revive(config.workspaceUri) };
            }
        }
        return new WorkspaceProvider(workspace, payload, config);
    }
    constructor(workspace, payload, config) {
        this.workspace = workspace;
        this.payload = payload;
        this.config = config;
        this.trusted = true;
    }
    async open(workspace, options) {
        if (options?.reuse && !options.payload && this.isSame(this.workspace, workspace)) {
            return true; // return early if workspace and environment is not changing and we are reusing window
        }
        const targetHref = this.createTargetUrl(workspace, options);
        if (targetHref) {
            if (options?.reuse) {
                mainWindow.location.href = targetHref;
                return true;
            }
            else {
                let result;
                if (isStandalone()) {
                    result = mainWindow.open(targetHref, '_blank', 'toolbar=no'); // ensures to open another 'standalone' window!
                }
                else {
                    result = mainWindow.open(targetHref);
                }
                return !!result;
            }
        }
        return false;
    }
    createTargetUrl(workspace, options) {
        // Empty
        let targetHref = undefined;
        if (!workspace) {
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_EMPTY_WINDOW}=true`;
        }
        // Folder
        else if (isFolderToOpen(workspace)) {
            const queryParamFolder = this.encodeWorkspacePath(workspace.folderUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_FOLDER}=${queryParamFolder}`;
        }
        // Workspace
        else if (isWorkspaceToOpen(workspace)) {
            const queryParamWorkspace = this.encodeWorkspacePath(workspace.workspaceUri);
            targetHref = `${document.location.origin}${document.location.pathname}?${WorkspaceProvider.QUERY_PARAM_WORKSPACE}=${queryParamWorkspace}`;
        }
        // Append payload if any
        if (options?.payload) {
            targetHref += `&${WorkspaceProvider.QUERY_PARAM_PAYLOAD}=${encodeURIComponent(JSON.stringify(options.payload))}`;
        }
        return targetHref;
    }
    encodeWorkspacePath(uri) {
        if (this.config.remoteAuthority && uri.scheme === Schemas.vscodeRemote) {
            // when connected to a remote and having a folder
            // or workspace for that remote, only use the path
            // as query value to form shorter, nicer URLs.
            // however, we still need to `encodeURIComponent`
            // to ensure to preserve special characters, such
            // as `+` in the path.
            return encodeURIComponent(`${posix.sep}${ltrim(uri.path, posix.sep)}`).replaceAll('%2F', '/');
        }
        return encodeURIComponent(uri.toString(true));
    }
    isSame(workspaceA, workspaceB) {
        if (!workspaceA || !workspaceB) {
            return workspaceA === workspaceB; // both empty
        }
        if (isFolderToOpen(workspaceA) && isFolderToOpen(workspaceB)) {
            return isEqual(workspaceA.folderUri, workspaceB.folderUri); // same workspace
        }
        if (isWorkspaceToOpen(workspaceA) && isWorkspaceToOpen(workspaceB)) {
            return isEqual(workspaceA.workspaceUri, workspaceB.workspaceUri); // same workspace
        }
        return false;
    }
    hasRemote() {
        if (this.workspace) {
            if (isFolderToOpen(this.workspace)) {
                return this.workspace.folderUri.scheme === Schemas.vscodeRemote;
            }
            if (isWorkspaceToOpen(this.workspace)) {
                return this.workspace.workspaceUri.scheme === Schemas.vscodeRemote;
            }
        }
        return true;
    }
}
function readCookie(name) {
    const cookies = document.cookie.split('; ');
    for (const cookie of cookies) {
        if (cookie.startsWith(name + '=')) {
            return cookie.substring(name.length + 1);
        }
    }
    return undefined;
}
;
(function () {
    // Find config by checking for DOM
    const configElement = mainWindow.document.getElementById('vscode-workbench-web-configuration');
    const configElementAttribute = configElement
        ? configElement.getAttribute('data-settings')
        : undefined;
    if (!configElement || !configElementAttribute) {
        throw new Error('Missing web configuration element');
    }
    const config = JSON.parse(configElementAttribute);
    const secretStorageKeyPath = readCookie('vscode-secret-key-path');
    const secretStorageCrypto = secretStorageKeyPath && ServerKeyedAESCrypto.supported()
        ? new ServerKeyedAESCrypto(secretStorageKeyPath)
        : new TransparentCrypto();
    // Create workbench
    create(mainWindow.document.body, {
        ...config,
        windowIndicator: config.windowIndicator ?? {
            label: '$(remote)',
            tooltip: `${product.nameShort} Web`,
        },
        settingsSyncOptions: config.settingsSyncOptions
            ? { enabled: config.settingsSyncOptions.enabled }
            : undefined,
        workspaceProvider: WorkspaceProvider.create(config),
        urlCallbackProvider: new LocalStorageURLCallbackProvider(config.callbackRoute),
        secretStorageProvider: config.remoteAuthority && !secretStorageKeyPath
            ? undefined /* with a remote without embedder-preferred storage, store on the remote */
            : new LocalStorageSecretStorageProvider(secretStorageCrypto),
    });
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2JlbmNoLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvY29kZS9icm93c2VyL3dvcmtiZW5jaC93b3JrYmVuY2gudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLE9BQU8sTUFBTSw2Q0FBNkMsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsY0FBYyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFRN0YsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBTzFFLE1BQU0saUJBQWlCO0lBQ3RCLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWTtRQUN0QixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVk7UUFDeEIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0Q7QUFFRCxJQUFXLFlBSVY7QUFKRCxXQUFXLFlBQVk7SUFDdEIscUNBQXFCLENBQUE7SUFDckIsNkRBQWdCLENBQUE7SUFDaEIsMERBQWMsQ0FBQTtBQUNmLENBQUMsRUFKVSxZQUFZLEtBQVosWUFBWSxRQUl0QjtBQUVELE1BQU0sWUFBYSxTQUFRLEtBQUs7SUFDL0IsWUFBWSxLQUFZO1FBQ3ZCLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDcEIsSUFBSSxDQUFDLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtJQUN6QixDQUFDO0NBQ0Q7QUFFRCxNQUFNLG9CQUFvQjtJQUd6Qjs7T0FFRztJQUNILE1BQU0sQ0FBQyxTQUFTO1FBQ2YsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQTtJQUN2QixDQUFDO0lBRUQsWUFBNkIsWUFBb0I7UUFBcEIsaUJBQVksR0FBWixZQUFZLENBQVE7SUFBRyxDQUFDO0lBRXJELEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBWTtRQUN0QiwyR0FBMkc7UUFDM0csdUZBQXVGO1FBQ3ZGLE1BQU0sRUFBRSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksVUFBVSxpQ0FBd0IsQ0FBQyxDQUFBO1FBQ3BGLGtKQUFrSjtRQUNsSixNQUFNLFlBQVksR0FBRyxNQUFNLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FDOUQsRUFBRSxJQUFJLEVBQUUsc0NBQStCLEVBQUUsTUFBTSxFQUFFLGlDQUFnQyxFQUFFLEVBQ25GLElBQUksRUFDSixDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsQ0FDdEIsQ0FBQTtRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sR0FBRyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUN4QyxNQUFNLGNBQWMsR0FBRyxJQUFJLFdBQVcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLFVBQVUsR0FBZ0IsTUFBTSxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQ3JFLEVBQUUsSUFBSSxFQUFFLHNDQUErQixFQUFFLEVBQUUsRUFBRSxFQUM3QyxHQUFHLEVBQ0gsY0FBYyxDQUNkLENBQUE7UUFFRCx5RkFBeUY7UUFDekYseURBQXlEO1FBQ3pELE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLENBQUMsR0FBRyxTQUFTLEVBQUUsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDbkYsT0FBTyxZQUFZLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLElBQVk7UUFDeEIsaUpBQWlKO1FBQ2pKLDZHQUE2RztRQUM3RyxNQUFNLGNBQWMsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFekMsSUFBSSxjQUFjLENBQUMsVUFBVSxHQUFHLEVBQUUsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sS0FBSyxDQUFDLHFEQUFxRCxDQUFDLENBQUE7UUFDbkUsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLG9DQUEwQixDQUFDLENBQUE7UUFDN0MsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDcEQsTUFBTSxFQUFFLEdBQUcsY0FBYyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsU0FBUyxrQ0FBeUIsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sVUFBVSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUMsU0FBUyxrQ0FBeUIsQ0FBQyxDQUFBO1FBRTNFLGlEQUFpRDtRQUNqRCxNQUFNLEdBQUcsR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9DLE1BQU0sU0FBUyxHQUFHLE1BQU0sVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUN2RCxFQUFFLElBQUksRUFBRSxzQ0FBK0IsRUFBRSxFQUFFLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUN4RCxHQUFHLEVBQ0gsVUFBVSxDQUFDLE1BQU0sQ0FDakIsQ0FBQTtRQUVELE9BQU8sSUFBSSxXQUFXLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxVQUFVLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0ssS0FBSyxDQUFDLE1BQU0sQ0FBQyxTQUFxQjtRQUN6QyxJQUFJLENBQUMsU0FBUyxJQUFJLFNBQVMsQ0FBQyxVQUFVLEtBQUssb0NBQTBCLENBQUMsRUFBRSxDQUFDO1lBQ3hFLE1BQU0sS0FBSyxDQUFDLDhCQUE4QixDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7UUFDL0MsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsb0NBQTBCLENBQUMsQ0FBQyxDQUFBO1FBRTNELEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDLENBQUUsR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFFLENBQUE7UUFDM0MsQ0FBQztRQUVELE9BQU8sVUFBVSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUN4QyxLQUFLLEVBQ0wsT0FBTyxFQUNQO1lBQ0MsSUFBSSxFQUFFLHNDQUErQjtZQUNyQyxNQUFNLEVBQUUsaUNBQWdDO1NBQ3hDLEVBQ0QsSUFBSSxFQUNKLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUN0QixDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0I7UUFDN0IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDZixJQUFJLFNBQTRCLENBQUE7UUFFaEMsT0FBTyxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sR0FBRyxHQUFHLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFBO2dCQUN0RixJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUNiLE1BQU0sSUFBSSxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNoQyxDQUFDO2dCQUVELE1BQU0sU0FBUyxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7Z0JBQ3pELElBQUksU0FBUyxDQUFDLFVBQVUsS0FBSyxvQ0FBMEIsQ0FBQyxFQUFFLENBQUM7b0JBQzFELE1BQU0sS0FBSyxDQUFDLDBDQUEwQyxpQ0FBdUIsWUFBWSxDQUFDLENBQUE7Z0JBQzNGLENBQUM7Z0JBRUQsSUFBSSxDQUFDLFNBQVMsR0FBRyxTQUFTLENBQUE7Z0JBRTFCLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQTtZQUN0QixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWixTQUFTLEdBQUcsQ0FBQyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDekQsT0FBTyxFQUFFLENBQUE7Z0JBRVQsc0JBQXNCO2dCQUN0QixNQUFNLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLE9BQU8sR0FBRyxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUM3RSxDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLElBQUksWUFBWSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7UUFFRCxNQUFNLElBQUksS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxpQ0FBaUM7SUFPN0MsWUFBNkIsTUFBNEI7UUFBNUIsV0FBTSxHQUFOLE1BQU0sQ0FBc0I7UUFOeEMsZUFBVSxHQUFHLGtCQUFrQixDQUFBO1FBSWhELFNBQUksR0FBMEMsV0FBVyxDQUFBO1FBR3hELElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ2xDLENBQUM7SUFFTyxLQUFLLENBQUMsSUFBSTtRQUNqQixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtRQUVoRCxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUN2RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDO2dCQUNKLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFBO2dCQUVqRSxPQUFPLEVBQUUsR0FBRyxNQUFNLEVBQUUsR0FBRyxTQUFTLEVBQUUsQ0FBQTtZQUNuQyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDZCx1QkFBdUI7Z0JBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkNBQTZDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2pFLElBQUksQ0FBQyxDQUFDLEdBQUcsWUFBWSxZQUFZLENBQUMsRUFBRSxDQUFDO29CQUNwQyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQTtnQkFDekMsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sMEJBQTBCO1FBQ2pDLElBQUksZUFBaUYsQ0FBQTtRQUNyRixNQUFNLGtCQUFrQixHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLCtCQUErQixDQUFDLENBQUE7UUFDOUYsTUFBTSwyQkFBMkIsR0FBRyxrQkFBa0I7WUFDckQsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7WUFDbEQsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtRQUNaLElBQUksMkJBQTJCLEVBQUUsQ0FBQztZQUNqQyxJQUFJLENBQUM7Z0JBQ0osZUFBZSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtZQUMxRCxDQUFDO1lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztnQkFDaEIsd0NBQXdDO1lBQ3pDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUEyQixFQUFFLENBQUE7UUFFekMsc0JBQXNCO1FBQ3RCLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxXQUFXLGVBQWUsQ0FBQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFL0UsdUJBQXVCO1FBQ3ZCLElBQUksZUFBZSxDQUFDLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUM3QyxPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixlQUFlLENBQUMsVUFBVSxzQkFBc0IsQ0FBQyxDQUFBO1lBQzVGLE9BQU8sTUFBTSxDQUFBO1FBQ2QsQ0FBQztRQUVELE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7WUFDbEMsV0FBVyxFQUFFLDhCQUE4QjtZQUMzQyxHQUFHLEVBQUUsYUFBYTtTQUNsQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDbkMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDdkMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxFQUFFO1lBQ3RCLE1BQU07WUFDTixXQUFXLEVBQUUsZUFBZSxDQUFDLFdBQVc7U0FDeEMsQ0FBQyxDQUFDLENBQ0gsQ0FBQTtRQUVELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBVztRQUNwQixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxjQUFjLENBQUE7UUFFekMsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDcEIsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQWE7UUFDbkMsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFBO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxLQUFLLENBQUE7UUFDcEIsSUFBSSxDQUFDLGNBQWMsR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNaLENBQUM7SUFFRCxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQVc7UUFDdkIsTUFBTSxPQUFPLEdBQUcsTUFBTSxJQUFJLENBQUMsY0FBYyxDQUFBO1FBQ3pDLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLElBQUksQ0FBQyxjQUFjLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUM5QyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDWixDQUFDO0lBRU8sS0FBSyxDQUFDLElBQUk7UUFDakIsSUFBSSxDQUFDO1lBQ0osTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUE7WUFDbkYsWUFBWSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuQixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVO2FBQ3hDLGVBQVUsR0FBRyxDQUFDLEFBQUosQ0FBSTthQUVkLGVBQVUsR0FBK0Q7UUFDdkYsUUFBUTtRQUNSLFdBQVc7UUFDWCxNQUFNO1FBQ04sT0FBTztRQUNQLFVBQVU7S0FDVixBQU53QixDQU14QjtJQVVELFlBQTZCLGNBQXNCO1FBQ2xELEtBQUssRUFBRSxDQUFBO1FBRHFCLG1CQUFjLEdBQWQsY0FBYyxDQUFRO1FBUmxDLGdCQUFXLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBTyxDQUFDLENBQUE7UUFDeEQsZUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFBO1FBRXBDLHFCQUFnQixHQUFHLElBQUksR0FBRyxFQUFVLENBQUE7UUFDcEMsb0JBQWUsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUE7UUFDNUIsMEJBQXFCLEdBQXdCLFNBQVMsQ0FBQTtJQUs5RCxDQUFDO0lBRUQsTUFBTSxDQUFDLFVBQWtDLEVBQUU7UUFDMUMsTUFBTSxFQUFFLEdBQUcsRUFBRSwrQkFBK0IsQ0FBQyxVQUFVLENBQUE7UUFDdkQsTUFBTSxXQUFXLEdBQWEsQ0FBQyxnQkFBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVwRCxLQUFLLE1BQU0sR0FBRyxJQUFJLCtCQUErQixDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQzlELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUUxQixJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLFdBQVcsQ0FBQyxJQUFJLENBQUMsVUFBVSxHQUFHLElBQUksa0JBQWtCLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1lBQy9ELENBQUM7UUFDRixDQUFDO1FBRUQsOEJBQThCO1FBQzlCLG9EQUFvRDtRQUNwRCxpSkFBaUo7UUFDakosSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsS0FBSyw4QkFBOEIsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDMUYsTUFBTSxHQUFHLEdBQUcsNEJBQTRCLEVBQUUsR0FBRyxDQUFBO1lBQzdDLFlBQVksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUE7WUFFNUIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUM3QixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUE7UUFDdEIsQ0FBQztRQUVELE9BQU8sR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQztZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLGNBQWM7WUFDekIsS0FBSyxFQUFFLFdBQVcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1NBQzVCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksSUFBSSxDQUFDLGlDQUFpQyxFQUFFLENBQUM7WUFDNUMsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUMvQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsU0FBUyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzFDLElBQUksQ0FBQyxpQ0FBaUMsR0FBRztZQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUM7U0FDNUQsQ0FBQTtJQUNGLENBQUM7SUFFTyxhQUFhO1FBQ3BCLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUNqRCxJQUFJLENBQUMsaUNBQWlDLEdBQUcsU0FBUyxDQUFBO0lBQ25ELENBQUM7SUFFRCxzREFBc0Q7SUFDdEQsb0RBQW9EO0lBQzVDLEtBQUssQ0FBQyx1QkFBdUI7UUFDcEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUE7UUFFbEQsSUFBSSxRQUFRLEdBQUcsSUFBSSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ3RCLENBQUM7YUFBTSxJQUFJLElBQUksQ0FBQyxxQkFBcUIsS0FBSyxTQUFTLEVBQUUsQ0FBQztZQUNyRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtnQkFDNUMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLFNBQVMsQ0FBQTtnQkFDdEMsSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFBO1lBQ3RCLENBQUMsRUFBRSxJQUFJLEdBQUcsUUFBUSxDQUFDLENBQUE7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFTyxjQUFjO1FBQ3JCLElBQUksZ0JBQXlDLENBQUE7UUFFN0MsS0FBSyxNQUFNLEVBQUUsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN4QyxNQUFNLEdBQUcsR0FBRyw0QkFBNEIsRUFBRSxHQUFHLENBQUE7WUFDN0MsTUFBTSxNQUFNLEdBQUcsWUFBWSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV4QyxJQUFJLE1BQU0sS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxDQUFDO29CQUNKLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RELENBQUM7Z0JBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztvQkFDaEIsT0FBTyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQTtnQkFDckIsQ0FBQztnQkFFRCxnQkFBZ0IsR0FBRyxnQkFBZ0IsSUFBSSxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtnQkFDckUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUMzQixZQUFZLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzdCLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxnQkFBZ0IsQ0FBQTtZQUV4QyxJQUFJLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtZQUNyQixDQUFDO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQ2xDLENBQUM7O0FBR0YsTUFBTSxpQkFBaUI7YUFDUCw2QkFBd0IsR0FBRyxJQUFJLEFBQVAsQ0FBTzthQUMvQix1QkFBa0IsR0FBRyxRQUFRLEFBQVgsQ0FBVzthQUM3QiwwQkFBcUIsR0FBRyxXQUFXLEFBQWQsQ0FBYzthQUVuQyx3QkFBbUIsR0FBRyxTQUFTLEFBQVosQ0FBWTtJQUU5QyxNQUFNLENBQUMsTUFBTSxDQUNaLE1BR0M7UUFFRCxJQUFJLGNBQWMsR0FBRyxLQUFLLENBQUE7UUFDMUIsSUFBSSxTQUFxQixDQUFBO1FBQ3pCLElBQUksT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFakMsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUE7UUFDMUQsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsRUFBRTtZQUM1QixRQUFRLEdBQUcsRUFBRSxDQUFDO2dCQUNiLFNBQVM7Z0JBQ1QsS0FBSyxpQkFBaUIsQ0FBQyxrQkFBa0I7b0JBQ3hDLElBQUksTUFBTSxDQUFDLGVBQWUsSUFBSSxLQUFLLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO3dCQUMzRCxnREFBZ0Q7d0JBQ2hELGtEQUFrRDt3QkFDbEQsaURBQWlEO3dCQUNqRCxTQUFTLEdBQUc7NEJBQ1gsU0FBUyxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUM7Z0NBQ25CLE1BQU0sRUFBRSxPQUFPLENBQUMsWUFBWTtnQ0FDNUIsSUFBSSxFQUFFLEtBQUs7Z0NBQ1gsU0FBUyxFQUFFLE1BQU0sQ0FBQyxlQUFlOzZCQUNqQyxDQUFDO3lCQUNGLENBQUE7b0JBQ0YsQ0FBQzt5QkFBTSxDQUFDO3dCQUNQLFNBQVMsR0FBRyxFQUFFLFNBQVMsRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUE7b0JBQzVDLENBQUM7b0JBQ0QsY0FBYyxHQUFHLElBQUksQ0FBQTtvQkFDckIsTUFBSztnQkFFTixZQUFZO2dCQUNaLEtBQUssaUJBQWlCLENBQUMscUJBQXFCO29CQUMzQyxJQUFJLE1BQU0sQ0FBQyxlQUFlLElBQUksS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQzt3QkFDM0QsZ0RBQWdEO3dCQUNoRCxrREFBa0Q7d0JBQ2xELGlEQUFpRDt3QkFDakQsU0FBUyxHQUFHOzRCQUNYLFlBQVksRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDO2dDQUN0QixNQUFNLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0NBQzVCLElBQUksRUFBRSxLQUFLO2dDQUNYLFNBQVMsRUFBRSxNQUFNLENBQUMsZUFBZTs2QkFDakMsQ0FBQzt5QkFDRixDQUFBO29CQUNGLENBQUM7eUJBQU0sQ0FBQzt3QkFDUCxTQUFTLEdBQUcsRUFBRSxZQUFZLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFBO29CQUMvQyxDQUFDO29CQUNELGNBQWMsR0FBRyxJQUFJLENBQUE7b0JBQ3JCLE1BQUs7Z0JBRU4sUUFBUTtnQkFDUixLQUFLLGlCQUFpQixDQUFDLHdCQUF3QjtvQkFDOUMsU0FBUyxHQUFHLFNBQVMsQ0FBQTtvQkFDckIsY0FBYyxHQUFHLElBQUksQ0FBQTtvQkFDckIsTUFBSztnQkFFTixVQUFVO2dCQUNWLEtBQUssaUJBQWlCLENBQUMsbUJBQW1CO29CQUN6QyxJQUFJLENBQUM7d0JBQ0osT0FBTyxHQUFHLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLG1EQUFtRDtvQkFDM0UsQ0FBQztvQkFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO3dCQUNoQixPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsd0JBQXdCO29CQUM5QyxDQUFDO29CQUNELE1BQUs7WUFDUCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7UUFFRixnRUFBZ0U7UUFDaEUsd0JBQXdCO1FBQ3hCLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUNyQixJQUFJLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDdEIsU0FBUyxHQUFHLEVBQUUsU0FBUyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUE7WUFDeEQsQ0FBQztpQkFBTSxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDaEMsU0FBUyxHQUFHLEVBQUUsWUFBWSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUE7WUFDOUQsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksaUJBQWlCLENBQUMsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBSUQsWUFDVSxTQUFxQixFQUNyQixPQUFlLEVBQ1AsTUFBcUM7UUFGN0MsY0FBUyxHQUFULFNBQVMsQ0FBWTtRQUNyQixZQUFPLEdBQVAsT0FBTyxDQUFRO1FBQ1AsV0FBTSxHQUFOLE1BQU0sQ0FBK0I7UUFMOUMsWUFBTyxHQUFHLElBQUksQ0FBQTtJQU1wQixDQUFDO0lBRUosS0FBSyxDQUFDLElBQUksQ0FDVCxTQUFxQixFQUNyQixPQUErQztRQUUvQyxJQUFJLE9BQU8sRUFBRSxLQUFLLElBQUksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ2xGLE9BQU8sSUFBSSxDQUFBLENBQUMsc0ZBQXNGO1FBQ25HLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMzRCxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLElBQUksT0FBTyxFQUFFLEtBQUssRUFBRSxDQUFDO2dCQUNwQixVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksR0FBRyxVQUFVLENBQUE7Z0JBQ3JDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksTUFBTSxDQUFBO2dCQUNWLElBQUksWUFBWSxFQUFFLEVBQUUsQ0FBQztvQkFDcEIsTUFBTSxHQUFHLFVBQVUsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsRUFBRSxZQUFZLENBQUMsQ0FBQSxDQUFDLCtDQUErQztnQkFDN0csQ0FBQztxQkFBTSxDQUFDO29CQUNQLE1BQU0sR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNyQyxDQUFDO2dCQUVELE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUNoQixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsU0FBcUIsRUFDckIsT0FBK0M7UUFFL0MsUUFBUTtRQUNSLElBQUksVUFBVSxHQUF1QixTQUFTLENBQUE7UUFDOUMsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2hCLFVBQVUsR0FBRyxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsTUFBTSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsUUFBUSxJQUFJLGlCQUFpQixDQUFDLHdCQUF3QixPQUFPLENBQUE7UUFDM0gsQ0FBQztRQUVELFNBQVM7YUFDSixJQUFJLGNBQWMsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3BDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUN0RSxVQUFVLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxrQkFBa0IsSUFBSSxnQkFBZ0IsRUFBRSxDQUFBO1FBQ3BJLENBQUM7UUFFRCxZQUFZO2FBQ1AsSUFBSSxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO1lBQ3ZDLE1BQU0sbUJBQW1CLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtZQUM1RSxVQUFVLEdBQUcsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLFFBQVEsSUFBSSxpQkFBaUIsQ0FBQyxxQkFBcUIsSUFBSSxtQkFBbUIsRUFBRSxDQUFBO1FBQzFJLENBQUM7UUFFRCx3QkFBd0I7UUFDeEIsSUFBSSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUM7WUFDdEIsVUFBVSxJQUFJLElBQUksaUJBQWlCLENBQUMsbUJBQW1CLElBQUksa0JBQWtCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsRUFBRSxDQUFBO1FBQ2pILENBQUM7UUFFRCxPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRU8sbUJBQW1CLENBQUMsR0FBUTtRQUNuQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsZUFBZSxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hFLGlEQUFpRDtZQUNqRCxrREFBa0Q7WUFDbEQsOENBQThDO1lBQzlDLGlEQUFpRDtZQUNqRCxpREFBaUQ7WUFDakQsc0JBQXNCO1lBRXRCLE9BQU8sa0JBQWtCLENBQUMsR0FBRyxLQUFLLENBQUMsR0FBRyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUM5RixDQUFDO1FBRUQsT0FBTyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDOUMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxVQUFzQixFQUFFLFVBQXNCO1FBQzVELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQyxPQUFPLFVBQVUsS0FBSyxVQUFVLENBQUEsQ0FBQyxhQUFhO1FBQy9DLENBQUM7UUFFRCxJQUFJLGNBQWMsQ0FBQyxVQUFVLENBQUMsSUFBSSxjQUFjLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUM5RCxPQUFPLE9BQU8sQ0FBQyxVQUFVLENBQUMsU0FBUyxFQUFFLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQSxDQUFDLGlCQUFpQjtRQUM3RSxDQUFDO1FBRUQsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsSUFBSSxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDO1lBQ3BFLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBLENBQUMsaUJBQWlCO1FBQ25GLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxTQUFTO1FBQ1IsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDcEIsSUFBSSxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3BDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUE7WUFDaEUsQ0FBQztZQUVELElBQUksaUJBQWlCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZDLE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxLQUFLLE9BQU8sQ0FBQyxZQUFZLENBQUE7WUFDbkUsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7O0FBR0YsU0FBUyxVQUFVLENBQUMsSUFBWTtJQUMvQixNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMzQyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzlCLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN6QyxDQUFDO0lBQ0YsQ0FBQztJQUVELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxDQUFDO0FBQUEsQ0FBQztJQUNELGtDQUFrQztJQUNsQyxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO0lBQzlGLE1BQU0sc0JBQXNCLEdBQUcsYUFBYTtRQUMzQyxDQUFDLENBQUMsYUFBYSxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUM7UUFDN0MsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNaLElBQUksQ0FBQyxhQUFhLElBQUksQ0FBQyxzQkFBc0IsRUFBRSxDQUFDO1FBQy9DLE1BQU0sSUFBSSxLQUFLLENBQUMsbUNBQW1DLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBQ0QsTUFBTSxNQUFNLEdBSVIsSUFBSSxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBO0lBQ3RDLE1BQU0sb0JBQW9CLEdBQUcsVUFBVSxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDakUsTUFBTSxtQkFBbUIsR0FDeEIsb0JBQW9CLElBQUksb0JBQW9CLENBQUMsU0FBUyxFQUFFO1FBQ3ZELENBQUMsQ0FBQyxJQUFJLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDO1FBQ2hELENBQUMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUE7SUFFM0IsbUJBQW1CO0lBQ25CLE1BQU0sQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRTtRQUNoQyxHQUFHLE1BQU07UUFDVCxlQUFlLEVBQUUsTUFBTSxDQUFDLGVBQWUsSUFBSTtZQUMxQyxLQUFLLEVBQUUsV0FBVztZQUNsQixPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUMsU0FBUyxNQUFNO1NBQ25DO1FBQ0QsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLG1CQUFtQjtZQUM5QyxDQUFDLENBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLG1CQUFtQixDQUFDLE9BQU8sRUFBRTtZQUNqRCxDQUFDLENBQUMsU0FBUztRQUNaLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDbkQsbUJBQW1CLEVBQUUsSUFBSSwrQkFBK0IsQ0FBQyxNQUFNLENBQUMsYUFBYSxDQUFDO1FBQzlFLHFCQUFxQixFQUNwQixNQUFNLENBQUMsZUFBZSxJQUFJLENBQUMsb0JBQW9CO1lBQzlDLENBQUMsQ0FBQyxTQUFTLENBQUMsMkVBQTJFO1lBQ3ZGLENBQUMsQ0FBQyxJQUFJLGlDQUFpQyxDQUFDLG1CQUFtQixDQUFDO0tBQzlELENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxFQUFFLENBQUEifQ==