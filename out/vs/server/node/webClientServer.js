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
import { createReadStream, promises } from 'fs';
import * as path from 'path';
import * as url from 'url';
import * as cookie from 'cookie';
import * as crypto from 'crypto';
import { isEqualOrParent } from '../../base/common/extpath.js';
import { getMediaMime } from '../../base/common/mime.js';
import { isLinux } from '../../base/common/platform.js';
import { ILogService, LogLevel } from '../../platform/log/common/log.js';
import { IServerEnvironmentService } from './serverEnvironmentService.js';
import { extname, dirname, join, normalize, posix } from '../../base/common/path.js';
import { FileAccess, connectionTokenCookieName, connectionTokenQueryName, Schemas, builtinExtensionsPath, } from '../../base/common/network.js';
import { generateUuid } from '../../base/common/uuid.js';
import { IProductService } from '../../platform/product/common/productService.js';
import { asTextOrError, IRequestService } from '../../platform/request/common/request.js';
import { CancellationToken } from '../../base/common/cancellation.js';
import { URI } from '../../base/common/uri.js';
import { streamToBuffer } from '../../base/common/buffer.js';
import { isString } from '../../base/common/types.js';
import { ICSSDevelopmentService } from '../../platform/cssDev/node/cssDevService.js';
const textMimeType = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
};
/**
 * Return an error to the client.
 */
export async function serveError(req, res, errorCode, errorMessage) {
    res.writeHead(errorCode, { 'Content-Type': 'text/plain' });
    res.end(errorMessage);
}
export var CacheControl;
(function (CacheControl) {
    CacheControl[CacheControl["NO_CACHING"] = 0] = "NO_CACHING";
    CacheControl[CacheControl["ETAG"] = 1] = "ETAG";
    CacheControl[CacheControl["NO_EXPIRY"] = 2] = "NO_EXPIRY";
})(CacheControl || (CacheControl = {}));
/**
 * Serve a file at a given path or 404 if the file is missing.
 */
export async function serveFile(filePath, cacheControl, logService, req, res, responseHeaders) {
    try {
        const stat = await promises.stat(filePath); // throws an error if file doesn't exist
        if (cacheControl === 1 /* CacheControl.ETAG */) {
            // Check if file modified since
            const etag = `W/"${[stat.ino, stat.size, stat.mtime.getTime()].join('-')}"`; // weak validator (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/ETag)
            if (req.headers['if-none-match'] === etag) {
                res.writeHead(304);
                return void res.end();
            }
            responseHeaders['Etag'] = etag;
        }
        else if (cacheControl === 2 /* CacheControl.NO_EXPIRY */) {
            responseHeaders['Cache-Control'] = 'public, max-age=31536000';
        }
        else if (cacheControl === 0 /* CacheControl.NO_CACHING */) {
            responseHeaders['Cache-Control'] = 'no-store';
        }
        responseHeaders['Content-Type'] =
            textMimeType[extname(filePath)] || getMediaMime(filePath) || 'text/plain';
        res.writeHead(200, responseHeaders);
        // Data
        createReadStream(filePath).pipe(res);
    }
    catch (error) {
        if (error.code !== 'ENOENT') {
            logService.error(error);
            console.error(error.toString());
        }
        else {
            console.error(`File not found: ${filePath}`);
        }
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return void res.end('Not found');
    }
}
const APP_ROOT = dirname(FileAccess.asFileUri('').fsPath);
const STATIC_PATH = `/static`;
const CALLBACK_PATH = `/callback`;
const WEB_EXTENSION_PATH = `/web-extension-resource`;
let WebClientServer = class WebClientServer {
    constructor(_connectionToken, _basePath, _productPath, _environmentService, _logService, _requestService, _productService, _cssDevService) {
        this._connectionToken = _connectionToken;
        this._basePath = _basePath;
        this._productPath = _productPath;
        this._environmentService = _environmentService;
        this._logService = _logService;
        this._requestService = _requestService;
        this._productService = _productService;
        this._cssDevService = _cssDevService;
        this._webExtensionResourceUrlTemplate = this._productService.extensionsGallery
            ?.resourceUrlTemplate
            ? URI.parse(this._productService.extensionsGallery.resourceUrlTemplate)
            : undefined;
    }
    /**
     * Handle web resources (i.e. only needed by the web client).
     * **NOTE**: This method is only invoked when the server has web bits.
     * **NOTE**: This method is only invoked after the connection token has been validated.
     * @param parsedUrl The URL to handle, including base and product path
     * @param pathname The pathname of the URL, without base and product path
     */
    async handle(req, res, parsedUrl, pathname) {
        try {
            if (pathname.startsWith(STATIC_PATH) &&
                pathname.charCodeAt(STATIC_PATH.length) === 47 /* CharCode.Slash */) {
                return this._handleStatic(req, res, pathname.substring(STATIC_PATH.length));
            }
            if (pathname === '/') {
                return this._handleRoot(req, res, parsedUrl);
            }
            if (pathname === CALLBACK_PATH) {
                // callback support
                return this._handleCallback(res);
            }
            if (pathname.startsWith(WEB_EXTENSION_PATH) &&
                pathname.charCodeAt(WEB_EXTENSION_PATH.length) === 47 /* CharCode.Slash */) {
                // extension resource support
                return this._handleWebExtensionResource(req, res, pathname.substring(WEB_EXTENSION_PATH.length));
            }
            return serveError(req, res, 404, 'Not found.');
        }
        catch (error) {
            this._logService.error(error);
            console.error(error.toString());
            return serveError(req, res, 500, 'Internal Server Error.');
        }
    }
    /**
     * Handle HTTP requests for /static/*
     * @param resourcePath The path after /static/
     */
    async _handleStatic(req, res, resourcePath) {
        const headers = Object.create(null);
        // Strip the this._staticRoute from the path
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const filePath = join(APP_ROOT, normalizedPathname); // join also normalizes the path
        if (!isEqualOrParent(filePath, APP_ROOT, !isLinux)) {
            return serveError(req, res, 400, `Bad request.`);
        }
        return serveFile(filePath, this._environmentService.isBuilt ? 2 /* CacheControl.NO_EXPIRY */ : 1 /* CacheControl.ETAG */, this._logService, req, res, headers);
    }
    _getResourceURLTemplateAuthority(uri) {
        const index = uri.authority.indexOf('.');
        return index !== -1 ? uri.authority.substring(index + 1) : undefined;
    }
    /**
     * Handle extension resources
     * @param resourcePath The path after /web-extension-resource/
     */
    async _handleWebExtensionResource(req, res, resourcePath) {
        if (!this._webExtensionResourceUrlTemplate) {
            return serveError(req, res, 500, 'No extension gallery service configured.');
        }
        const normalizedPathname = decodeURIComponent(resourcePath); // support paths that are uri-encoded (e.g. spaces => %20)
        const path = normalize(normalizedPathname);
        const uri = URI.parse(path).with({
            scheme: this._webExtensionResourceUrlTemplate.scheme,
            authority: path.substring(0, path.indexOf('/')),
            path: path.substring(path.indexOf('/') + 1),
        });
        if (this._getResourceURLTemplateAuthority(this._webExtensionResourceUrlTemplate) !==
            this._getResourceURLTemplateAuthority(uri)) {
            return serveError(req, res, 403, 'Request Forbidden');
        }
        const headers = {};
        const setRequestHeader = (header) => {
            const value = req.headers[header];
            if (value && (isString(value) || value[0])) {
                headers[header] = isString(value) ? value : value[0];
            }
            else if (header !== header.toLowerCase()) {
                setRequestHeader(header.toLowerCase());
            }
        };
        setRequestHeader('X-Client-Name');
        setRequestHeader('X-Client-Version');
        setRequestHeader('X-Machine-Id');
        setRequestHeader('X-Client-Commit');
        const context = await this._requestService.request({
            type: 'GET',
            url: uri.toString(true),
            headers,
        }, CancellationToken.None);
        const status = context.res.statusCode || 500;
        if (status !== 200) {
            let text = null;
            try {
                text = await asTextOrError(context);
            }
            catch (error) {
                /* Ignore */
            }
            return serveError(req, res, status, text || `Request failed with status ${status}`);
        }
        const responseHeaders = Object.create(null);
        const setResponseHeader = (header) => {
            const value = context.res.headers[header];
            if (value) {
                responseHeaders[header] = value;
            }
            else if (header !== header.toLowerCase()) {
                setResponseHeader(header.toLowerCase());
            }
        };
        setResponseHeader('Cache-Control');
        setResponseHeader('Content-Type');
        res.writeHead(200, responseHeaders);
        const buffer = await streamToBuffer(context.stream);
        return void res.end(buffer.buffer);
    }
    /**
     * Handle HTTP requests for /
     */
    async _handleRoot(req, res, parsedUrl) {
        const getFirstHeader = (headerName) => {
            const val = req.headers[headerName];
            return Array.isArray(val) ? val[0] : val;
        };
        // Prefix routes with basePath for clients
        const basePath = getFirstHeader('x-forwarded-prefix') || this._basePath;
        const queryConnectionToken = parsedUrl.query[connectionTokenQueryName];
        if (typeof queryConnectionToken === 'string') {
            // We got a connection token as a query parameter.
            // We want to have a clean URL, so we strip it
            const responseHeaders = Object.create(null);
            responseHeaders['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, queryConnectionToken, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */,
            });
            const newQuery = Object.create(null);
            for (const key in parsedUrl.query) {
                if (key !== connectionTokenQueryName) {
                    newQuery[key] = parsedUrl.query[key];
                }
            }
            const newLocation = url.format({ pathname: basePath, query: newQuery });
            responseHeaders['Location'] = newLocation;
            res.writeHead(302, responseHeaders);
            return void res.end();
        }
        const replacePort = (host, port) => {
            const index = host?.indexOf(':');
            if (index !== -1) {
                host = host?.substring(0, index);
            }
            host += `:${port}`;
            return host;
        };
        const useTestResolver = !this._environmentService.isBuilt && this._environmentService.args['use-test-resolver'];
        let remoteAuthority = useTestResolver
            ? 'test+test'
            : getFirstHeader('x-original-host') || getFirstHeader('x-forwarded-host') || req.headers.host;
        if (!remoteAuthority) {
            return serveError(req, res, 400, `Bad request.`);
        }
        const forwardedPort = getFirstHeader('x-forwarded-port');
        if (forwardedPort) {
            remoteAuthority = replacePort(remoteAuthority, forwardedPort);
        }
        function asJSON(value) {
            return JSON.stringify(value).replace(/"/g, '&quot;');
        }
        let _wrapWebWorkerExtHostInIframe = undefined;
        if (this._environmentService.args['enable-smoke-test-driver']) {
            // integration tests run at a time when the built output is not yet published to the CDN
            // so we must disable the iframe wrapping because the iframe URL will give a 404
            _wrapWebWorkerExtHostInIframe = false;
        }
        if (this._logService.getLevel() === LogLevel.Trace) {
            ;
            ['x-original-host', 'x-forwarded-host', 'x-forwarded-port', 'host'].forEach((header) => {
                const value = getFirstHeader(header);
                if (value) {
                    this._logService.trace(`[WebClientServer] ${header}: ${value}`);
                }
            });
            this._logService.trace(`[WebClientServer] Request URL: ${req.url}, basePath: ${basePath}, remoteAuthority: ${remoteAuthority}`);
        }
        const staticRoute = posix.join(basePath, this._productPath, STATIC_PATH);
        const callbackRoute = posix.join(basePath, this._productPath, CALLBACK_PATH);
        const webExtensionRoute = posix.join(basePath, this._productPath, WEB_EXTENSION_PATH);
        const resolveWorkspaceURI = (defaultLocation) => defaultLocation &&
            URI.file(path.resolve(defaultLocation)).with({
                scheme: Schemas.vscodeRemote,
                authority: remoteAuthority,
            });
        const filePath = FileAccess.asFileUri(`vs/code/browser/workbench/workbench${this._environmentService.isBuilt ? '' : '-dev'}.html`).fsPath;
        const authSessionInfo = !this._environmentService.isBuilt && this._environmentService.args['github-auth']
            ? {
                id: generateUuid(),
                providerId: 'github',
                accessToken: this._environmentService.args['github-auth'],
                scopes: [['user:email'], ['repo']],
            }
            : undefined;
        const productConfiguration = {
            embedderIdentifier: 'server-distro',
            extensionsGallery: this._webExtensionResourceUrlTemplate && this._productService.extensionsGallery
                ? {
                    ...this._productService.extensionsGallery,
                    resourceUrlTemplate: this._webExtensionResourceUrlTemplate
                        .with({
                        scheme: 'http',
                        authority: remoteAuthority,
                        path: `${webExtensionRoute}/${this._webExtensionResourceUrlTemplate.authority}${this._webExtensionResourceUrlTemplate.path}`,
                    })
                        .toString(true),
                }
                : undefined,
        };
        if (!this._environmentService.isBuilt) {
            try {
                const productOverrides = JSON.parse((await promises.readFile(join(APP_ROOT, 'product.overrides.json'))).toString());
                Object.assign(productConfiguration, productOverrides);
            }
            catch (err) {
                /* Ignore Error */
            }
        }
        const workbenchWebConfiguration = {
            remoteAuthority,
            serverBasePath: basePath,
            _wrapWebWorkerExtHostInIframe,
            developmentOptions: {
                enableSmokeTestDriver: this._environmentService.args['enable-smoke-test-driver']
                    ? true
                    : undefined,
                logLevel: this._logService.getLevel(),
            },
            settingsSyncOptions: !this._environmentService.isBuilt && this._environmentService.args['enable-sync']
                ? { enabled: true }
                : undefined,
            enableWorkspaceTrust: !this._environmentService.args['disable-workspace-trust'],
            folderUri: resolveWorkspaceURI(this._environmentService.args['default-folder']),
            workspaceUri: resolveWorkspaceURI(this._environmentService.args['default-workspace']),
            productConfiguration,
            callbackRoute: callbackRoute,
        };
        const cookies = cookie.parse(req.headers.cookie || '');
        const locale = cookies['vscode.nls.locale'] ||
            req.headers['accept-language']?.split(',')[0]?.toLowerCase() ||
            'en';
        let WORKBENCH_NLS_BASE_URL;
        let WORKBENCH_NLS_URL;
        if (!locale.startsWith('en') && this._productService.nlsCoreBaseUrl) {
            WORKBENCH_NLS_BASE_URL = this._productService.nlsCoreBaseUrl;
            WORKBENCH_NLS_URL = `${WORKBENCH_NLS_BASE_URL}${this._productService.commit}/${this._productService.version}/${locale}/nls.messages.js`;
        }
        else {
            WORKBENCH_NLS_URL = ''; // fallback will apply
        }
        const values = {
            WORKBENCH_WEB_CONFIGURATION: asJSON(workbenchWebConfiguration),
            WORKBENCH_AUTH_SESSION: authSessionInfo ? asJSON(authSessionInfo) : '',
            WORKBENCH_WEB_BASE_URL: staticRoute,
            WORKBENCH_NLS_URL,
            WORKBENCH_NLS_FALLBACK_URL: `${staticRoute}/out/nls.messages.js`,
        };
        // DEV ---------------------------------------------------------------------------------------
        // DEV: This is for development and enables loading CSS via import-statements via import-maps.
        // DEV: The server needs to send along all CSS modules so that the client can construct the
        // DEV: import-map.
        // DEV ---------------------------------------------------------------------------------------
        if (this._cssDevService.isEnabled) {
            const cssModules = await this._cssDevService.getCssModules();
            values['WORKBENCH_DEV_CSS_MODULES'] = JSON.stringify(cssModules);
        }
        if (useTestResolver) {
            const bundledExtensions = [];
            for (const extensionPath of ['vscode-test-resolver', 'github-authentication']) {
                const packageJSON = JSON.parse((await promises.readFile(FileAccess.asFileUri(`${builtinExtensionsPath}/${extensionPath}/package.json`).fsPath)).toString());
                bundledExtensions.push({ extensionPath, packageJSON });
            }
            values['WORKBENCH_BUILTIN_EXTENSIONS'] = asJSON(bundledExtensions);
        }
        let data;
        try {
            const workbenchTemplate = (await promises.readFile(filePath)).toString();
            data = workbenchTemplate.replace(/\{\{([^}]+)\}\}/g, (_, key) => values[key] ?? 'undefined');
        }
        catch (e) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            return void res.end('Not found');
        }
        const webWorkerExtensionHostIframeScriptSHA = 'sha256-2Q+j4hfT09+1+imS46J2YlkCtHWQt0/BE79PXjJ0ZJ8=';
        const cspDirectives = [
            "default-src 'self';",
            "img-src 'self' https: data: blob:;",
            "media-src 'self';",
            `script-src 'self' 'unsafe-eval' ${WORKBENCH_NLS_BASE_URL ?? ''} blob: 'nonce-1nline-m4p' ${this._getScriptCspHashes(data).join(' ')} '${webWorkerExtensionHostIframeScriptSHA}' 'sha256-/r7rqQ+yrxt57sxLuQ6AMYcy/lUpvAIzHjIJt/OeLWU=' ${useTestResolver ? '' : `http://${remoteAuthority}`};`, // the sha is the same as in src/vs/workbench/services/extensions/worker/webWorkerExtensionHostIframe.html
            "child-src 'self';",
            `frame-src 'self' https://*.vscode-cdn.net data:;`,
            "worker-src 'self' data: blob:;",
            "style-src 'self' 'unsafe-inline';",
            "connect-src 'self' ws: wss: https:;",
            "font-src 'self' blob:;",
            "manifest-src 'self';",
        ].join(' ');
        const headers = {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives,
        };
        if (this._connectionToken.type !== 0 /* ServerConnectionTokenType.None */) {
            // At this point we know the client has a valid cookie
            // and we want to set it prolong it to ensure that this
            // client is valid for another 1 week at least
            headers['Set-Cookie'] = cookie.serialize(connectionTokenCookieName, this._connectionToken.value, {
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7 /* 1 week */,
            });
        }
        res.writeHead(200, headers);
        return void res.end(data);
    }
    _getScriptCspHashes(content) {
        // Compute the CSP hashes for line scripts. Uses regex
        // which means it isn't 100% good.
        const regex = /<script>([\s\S]+?)<\/script>/gim;
        const result = [];
        let match;
        while ((match = regex.exec(content))) {
            const hasher = crypto.createHash('sha256');
            // This only works on Windows if we strip `\r` from `\r\n`.
            const script = match[1].replace(/\r\n/g, '\n');
            const hash = hasher.update(Buffer.from(script)).digest().toString('base64');
            result.push(`'sha256-${hash}'`);
        }
        return result;
    }
    /**
     * Handle HTTP requests for /callback
     */
    async _handleCallback(res) {
        const filePath = FileAccess.asFileUri('vs/code/browser/workbench/callback.html').fsPath;
        const data = (await promises.readFile(filePath)).toString();
        const cspDirectives = [
            "default-src 'self';",
            "img-src 'self' https: data: blob:;",
            "media-src 'none';",
            `script-src 'self' ${this._getScriptCspHashes(data).join(' ')};`,
            "style-src 'self' 'unsafe-inline';",
            "font-src 'self' blob:;",
        ].join(' ');
        res.writeHead(200, {
            'Content-Type': 'text/html',
            'Content-Security-Policy': cspDirectives,
        });
        return void res.end(data);
    }
};
WebClientServer = __decorate([
    __param(3, IServerEnvironmentService),
    __param(4, ILogService),
    __param(5, IRequestService),
    __param(6, IProductService),
    __param(7, ICSSDevelopmentService)
], WebClientServer);
export { WebClientServer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ2xpZW50U2VydmVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvc2VydmVyL25vZGUvd2ViQ2xpZW50U2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxRQUFRLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDL0MsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFFNUIsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3BGLE9BQU8sRUFDTixVQUFVLEVBQ1YseUJBQXlCLEVBQ3pCLHdCQUF3QixFQUN4QixPQUFPLEVBQ1AscUJBQXFCLEdBQ3JCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQ3hELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUVqRixPQUFPLEVBQUUsYUFB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