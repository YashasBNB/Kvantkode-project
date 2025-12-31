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
import { parse as parseUrl } from 'url';
import { Promises } from '../../../base/common/async.js';
import { streamToBufferReadableStream } from '../../../base/common/buffer.js';
import { CancellationError, getErrorMessage } from '../../../base/common/errors.js';
import { isBoolean, isNumber } from '../../../base/common/types.js';
import { IConfigurationService } from '../../configuration/common/configuration.js';
import { INativeEnvironmentService } from '../../environment/common/environment.js';
import { getResolvedShellEnv } from '../../shell/node/shellEnv.js';
import { ILogService } from '../../log/common/log.js';
import { AbstractRequestService, } from '../common/request.js';
import { getProxyAgent } from './proxy.js';
import { createGunzip } from 'zlib';
/**
 * This service exposes the `request` API, while using the global
 * or configured proxy settings.
 */
let RequestService = class RequestService extends AbstractRequestService {
    constructor(machine, configurationService, environmentService, logService) {
        super(logService);
        this.machine = machine;
        this.configurationService = configurationService;
        this.environmentService = environmentService;
        this.configure();
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('http')) {
                this.configure();
            }
        }));
    }
    configure() {
        this.proxyUrl = this.getConfigValue('http.proxy');
        this.strictSSL = !!this.getConfigValue('http.proxyStrictSSL');
        this.authorization = this.getConfigValue('http.proxyAuthorization');
    }
    async request(options, token) {
        const { proxyUrl, strictSSL } = this;
        let shellEnv = undefined;
        try {
            shellEnv = await getResolvedShellEnv(this.configurationService, this.logService, this.environmentService.args, process.env);
        }
        catch (error) {
            if (!this.shellEnvErrorLogged) {
                this.shellEnvErrorLogged = true;
                this.logService.error(`resolving shell environment failed`, getErrorMessage(error));
            }
        }
        const env = {
            ...process.env,
            ...shellEnv,
        };
        const agent = options.agent
            ? options.agent
            : await getProxyAgent(options.url || '', env, { proxyUrl, strictSSL });
        options.agent = agent;
        options.strictSSL = strictSSL;
        if (this.authorization) {
            options.headers = {
                ...(options.headers || {}),
                'Proxy-Authorization': this.authorization,
            };
        }
        return this.logAndRequest(options, () => nodeRequest(options, token));
    }
    async resolveProxy(url) {
        return undefined; // currently not implemented in node
    }
    async lookupAuthorization(authInfo) {
        return undefined; // currently not implemented in node
    }
    async lookupKerberosAuthorization(urlStr) {
        try {
            const spnConfig = this.getConfigValue('http.proxyKerberosServicePrincipal');
            const response = await lookupKerberosAuthorization(urlStr, spnConfig, this.logService, 'RequestService#lookupKerberosAuthorization');
            return 'Negotiate ' + response;
        }
        catch (err) {
            this.logService.debug('RequestService#lookupKerberosAuthorization Kerberos authentication failed', err);
            return undefined;
        }
    }
    async loadCertificates() {
        const proxyAgent = await import('@vscode/proxy-agent');
        return proxyAgent.loadSystemCertificates({ log: this.logService });
    }
    getConfigValue(key) {
        if (this.machine === 'remote') {
            return this.configurationService.getValue(key);
        }
        const values = this.configurationService.inspect(key);
        return values.userLocalValue || values.defaultValue;
    }
};
RequestService = __decorate([
    __param(1, IConfigurationService),
    __param(2, INativeEnvironmentService),
    __param(3, ILogService)
], RequestService);
export { RequestService };
export async function lookupKerberosAuthorization(urlStr, spnConfig, logService, logPrefix) {
    const importKerberos = await import('kerberos');
    const kerberos = importKerberos.default || importKerberos;
    const url = new URL(urlStr);
    const spn = spnConfig || (process.platform === 'win32' ? `HTTP/${url.hostname}` : `HTTP@${url.hostname}`);
    logService.debug(`${logPrefix} Kerberos authentication lookup`, `proxyURL:${url}`, `spn:${spn}`);
    const client = await kerberos.initializeClient(spn);
    return client.step('');
}
async function getNodeRequest(options) {
    const endpoint = parseUrl(options.url);
    const module = endpoint.protocol === 'https:' ? await import('https') : await import('http');
    return module.request;
}
export async function nodeRequest(options, token) {
    return Promises.withAsyncBody(async (resolve, reject) => {
        const endpoint = parseUrl(options.url);
        const rawRequest = options.getRawRequest
            ? options.getRawRequest(options)
            : await getNodeRequest(options);
        const opts = {
            hostname: endpoint.hostname,
            port: endpoint.port ? parseInt(endpoint.port) : endpoint.protocol === 'https:' ? 443 : 80,
            protocol: endpoint.protocol,
            path: endpoint.path,
            method: options.type || 'GET',
            headers: options.headers,
            agent: options.agent,
            rejectUnauthorized: isBoolean(options.strictSSL) ? options.strictSSL : true,
        };
        if (options.user && options.password) {
            opts.auth = options.user + ':' + options.password;
        }
        if (options.disableCache) {
            opts.cache = 'no-store';
        }
        const req = rawRequest(opts, (res) => {
            const followRedirects = isNumber(options.followRedirects)
                ? options.followRedirects
                : 3;
            if (res.statusCode &&
                res.statusCode >= 300 &&
                res.statusCode < 400 &&
                followRedirects > 0 &&
                res.headers['location']) {
                nodeRequest({
                    ...options,
                    url: res.headers['location'],
                    followRedirects: followRedirects - 1,
                }, token).then(resolve, reject);
            }
            else {
                let stream = res;
                // Responses from Electron net module should be treated as response
                // from browser, which will apply gzip filter and decompress the response
                // using zlib before passing the result to us. Following step can be bypassed
                // in this case and proceed further.
                // Refs https://source.chromium.org/chromium/chromium/src/+/main:net/url_request/url_request_http_job.cc;l=1266-1318
                if (!options.isChromiumNetwork && res.headers['content-encoding'] === 'gzip') {
                    stream = res.pipe(createGunzip());
                }
                resolve({ res, stream: streamToBufferReadableStream(stream) });
            }
        });
        req.on('error', reject);
        // Handle timeout
        if (options.timeout) {
            // Chromium network requests do not support the `timeout` option
            if (options.isChromiumNetwork) {
                // Use Node's setTimeout for Chromium network requests
                const timeout = setTimeout(() => {
                    req.abort();
                    reject(new Error(`Request timeout after ${options.timeout}ms`));
                }, options.timeout);
                // Clear timeout when request completes
                req.on('response', () => clearTimeout(timeout));
                req.on('error', () => clearTimeout(timeout));
                req.on('abort', () => clearTimeout(timeout));
            }
            else {
                req.setTimeout(options.timeout);
            }
        }
        // Chromium will abort the request if forbidden headers are set.
        // Ref https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/cpp/header_util.cc;l=14-48;
        // for additional context.
        if (options.isChromiumNetwork) {
            req.removeHeader('Content-Length');
        }
        if (options.data) {
            if (typeof options.data === 'string') {
                req.write(options.data);
            }
        }
        req.end();
        token.onCancellationRequested(() => {
            req.abort();
            reject(new CancellationError());
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9yZXF1ZXN0L25vZGUvcmVxdWVzdFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLEtBQUssSUFBSSxRQUFRLEVBQUUsTUFBTSxLQUFLLENBQUE7QUFDdkMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3hELE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRixPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRW5FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sc0JBQXNCLEdBSXRCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFTLGFBQWEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUNqRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBYW5DOzs7R0FHRztBQUNJLElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWUsU0FBUSxzQkFBc0I7SUFRekQsWUFDa0IsT0FBMkIsRUFDSixvQkFBMkMsRUFDdkMsa0JBQTZDLEVBQzVFLFVBQXVCO1FBRXBDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtR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