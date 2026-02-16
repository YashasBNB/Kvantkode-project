/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { LogLevel as LogServiceLevel } from '../../../platform/log/common/log.js';
import { LogLevel, createHttpPatch, createProxyResolver, createTlsPatch, createNetPatch, loadSystemCertificates, } from '@vscode/proxy-agent';
import { createRequire } from 'node:module';
import { lookupKerberosAuthorization } from '../../../platform/request/node/requestService.js';
import * as proxyAgent from '@vscode/proxy-agent';
const require = createRequire(import.meta.url);
const http = require('http');
const https = require('https');
const tls = require('tls');
const net = require('net');
const systemCertificatesV2Default = false;
const useElectronFetchDefault = false;
export function connectProxyResolver(extHostWorkspace, configProvider, extensionService, extHostLogService, mainThreadTelemetry, initData, disposables) {
    const isRemote = initData.remote.isRemote;
    const useHostProxyDefault = initData.environment.useHostProxy ?? !isRemote;
    const fallbackToLocalKerberos = useHostProxyDefault;
    const loadLocalCertificates = useHostProxyDefault;
    const isUseHostProxyEnabled = () => !isRemote ||
        configProvider
            .getConfiguration('http')
            .get('useLocalProxyConfiguration', useHostProxyDefault);
    const params = {
        resolveProxy: (url) => extHostWorkspace.resolveProxy(url),
        lookupProxyAuthorization: lookupProxyAuthorization.bind(undefined, extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, {}, {}, initData.remote.isRemote, fallbackToLocalKerberos),
        getProxyURL: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxy'),
        getProxySupport: () => getExtHostConfigValue(configProvider, isRemote, 'http.proxySupport') ||
            'off',
        getNoProxyConfig: () => getExtHostConfigValue(configProvider, isRemote, 'http.noProxy') || [],
        isAdditionalFetchSupportEnabled: () => getExtHostConfigValue(configProvider, isRemote, 'http.fetchAdditionalSupport', true),
        addCertificatesV1: () => certSettingV1(configProvider, isRemote),
        addCertificatesV2: () => certSettingV2(configProvider, isRemote),
        log: extHostLogService,
        getLogLevel: () => {
            const level = extHostLogService.getLevel();
            switch (level) {
                case LogServiceLevel.Trace:
                    return LogLevel.Trace;
                case LogServiceLevel.Debug:
                    return LogLevel.Debug;
                case LogServiceLevel.Info:
                    return LogLevel.Info;
                case LogServiceLevel.Warning:
                    return LogLevel.Warning;
                case LogServiceLevel.Error:
                    return LogLevel.Error;
                case LogServiceLevel.Off:
                    return LogLevel.Off;
                default:
                    return never(level);
            }
            function never(level) {
                extHostLogService.error('Unknown log level', level);
                return LogLevel.Debug;
            }
        },
        proxyResolveTelemetry: () => { },
        isUseHostProxyEnabled,
        loadAdditionalCertificates: async () => {
            const promises = [];
            if (initData.remote.isRemote) {
                promises.push(loadSystemCertificates({ log: extHostLogService }));
            }
            if (loadLocalCertificates) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading certificates from main process');
                const certs = extHostWorkspace.loadCertificates(); // Loading from main process to share cache.
                certs.then((certs) => extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loaded certificates from main process', certs.length));
                promises.push(certs);
            }
            // Using https.globalAgent because it is shared with proxy.test.ts and mutable.
            if (initData.environment.extensionTestsLocationURI &&
                https.globalAgent.testCertificates?.length) {
                extHostLogService.trace('ProxyResolver#loadAdditionalCertificates: Loading test certificates');
                promises.push(Promise.resolve(https.globalAgent.testCertificates));
            }
            return (await Promise.all(promises)).flat();
        },
        env: process.env,
    };
    const { resolveProxyWithRequest, resolveProxyURL } = createProxyResolver(params);
    const target = proxyAgent.default || proxyAgent;
    target.resolveProxyURL = resolveProxyURL;
    patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables);
    const lookup = createPatchedModules(params, resolveProxyWithRequest);
    return configureModuleLoading(extensionService, lookup);
}
const unsafeHeaders = [
    'content-length',
    'host',
    'trailer',
    'te',
    'upgrade',
    'cookie2',
    'keep-alive',
    'transfer-encoding',
    'set-cookie',
];
function patchGlobalFetch(params, configProvider, mainThreadTelemetry, initData, resolveProxyURL, disposables) {
    if (!globalThis.__vscodeOriginalFetch) {
        const originalFetch = globalThis.fetch;
        globalThis.__vscodeOriginalFetch = originalFetch;
        const patchedFetch = proxyAgent.createFetchPatch(params, originalFetch, resolveProxyURL);
        globalThis.__vscodePatchedFetch = patchedFetch;
        let useElectronFetch = false;
        if (!initData.remote.isRemote) {
            useElectronFetch = configProvider
                .getConfiguration('http')
                .get('electronFetch', useElectronFetchDefault);
            disposables.add(configProvider.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('http.electronFetch')) {
                    useElectronFetch = configProvider
                        .getConfiguration('http')
                        .get('electronFetch', useElectronFetchDefault);
                }
            }));
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
        globalThis.fetch = async function fetch(input, init) {
            function getRequestProperty(name) {
                return init && name in init
                    ? init[name]
                    : typeof input === 'object' && 'cache' in input
                        ? input[name]
                        : undefined;
            }
            // Limitations: https://github.com/electron/electron/pull/36733#issuecomment-1405615494
            // net.fetch fails on manual redirect: https://github.com/electron/electron/issues/43715
            const urlString = typeof input === 'string' ? input : 'cache' in input ? input.url : input.toString();
            const isDataUrl = urlString.startsWith('data:');
            if (isDataUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'data');
            }
            const isBlobUrl = urlString.startsWith('blob:');
            if (isBlobUrl) {
                recordFetchFeatureUse(mainThreadTelemetry, 'blob');
            }
            const isManualRedirect = getRequestProperty('redirect') === 'manual';
            if (isManualRedirect) {
                recordFetchFeatureUse(mainThreadTelemetry, 'manualRedirect');
            }
            const integrity = getRequestProperty('integrity');
            if (integrity) {
                recordFetchFeatureUse(mainThreadTelemetry, 'integrity');
            }
            if (!useElectronFetch || isDataUrl || isBlobUrl || isManualRedirect || integrity) {
                const response = await patchedFetch(input, init);
                monitorResponseProperties(mainThreadTelemetry, response, urlString);
                return response;
            }
            // Unsupported headers: https://source.chromium.org/chromium/chromium/src/+/main:services/network/public/cpp/header_util.cc;l=32;drc=ee7299f8961a1b05a3554efcc496b6daa0d7f6e1
            if (init?.headers) {
                const headers = new Headers(init.headers);
                for (const header of unsafeHeaders) {
                    headers.delete(header);
                }
                init = { ...init, headers };
            }
            // Support for URL: https://github.com/electron/electron/issues/43712
            const electronInput = input instanceof URL ? input.toString() : input;
            const electron = require('electron');
            const response = await electron.net.fetch(electronInput, init);
            monitorResponseProperties(mainThreadTelemetry, response, urlString);
            return response;
        };
    }
}
function monitorResponseProperties(mainThreadTelemetry, response, urlString) {
    const originalUrl = response.url;
    Object.defineProperty(response, 'url', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'url');
            return originalUrl || urlString;
        },
    });
    const originalType = response.type;
    Object.defineProperty(response, 'type', {
        get() {
            recordFetchFeatureUse(mainThreadTelemetry, 'typeProperty');
            return originalType !== 'default' ? originalType : 'basic';
        },
    });
}
const fetchFeatureUse = {
    url: 0,
    typeProperty: 0,
    data: 0,
    blob: 0,
    integrity: 0,
    manualRedirect: 0,
};
let timer;
const enableFeatureUseTelemetry = false;
function recordFetchFeatureUse(mainThreadTelemetry, feature) {
    if (enableFeatureUseTelemetry && !fetchFeatureUse[feature]++) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
            mainThreadTelemetry.$publicLog2('fetchFeatureUse', fetchFeatureUse);
        }, 10000); // collect additional features for 10 seconds
        timer.unref();
    }
}
function createPatchedModules(params, resolveProxy) {
    function mergeModules(module, patch) {
        const target = module.default || module;
        target.__vscodeOriginal = Object.assign({}, target);
        return Object.assign(target, patch);
    }
    return {
        http: mergeModules(http, createHttpPatch(params, http, resolveProxy)),
        https: mergeModules(https, createHttpPatch(params, https, resolveProxy)),
        net: mergeModules(net, createNetPatch(params, net)),
        tls: mergeModules(tls, createTlsPatch(params, tls)),
    };
}
function certSettingV1(configProvider, isRemote) {
    return (!getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates'));
}
function certSettingV2(configProvider, isRemote) {
    return (!!getExtHostConfigValue(configProvider, isRemote, 'http.experimental.systemCertificatesV2', systemCertificatesV2Default) && !!getExtHostConfigValue(configProvider, isRemote, 'http.systemCertificates'));
}
const modulesCache = new Map();
function configureModuleLoading(extensionService, lookup) {
    return extensionService.getExtensionPathIndex().then((extensionPaths) => {
        const node_module = require('module');
        const original = node_module._load;
        node_module._load = function load(request, parent, isMain) {
            if (request === 'net') {
                return lookup.net;
            }
            if (request === 'tls') {
                return lookup.tls;
            }
            if (request !== 'http' && request !== 'https' && request !== 'undici') {
                return original.apply(this, arguments);
            }
            const ext = extensionPaths.findSubstr(URI.file(parent.filename));
            let cache = modulesCache.get(ext);
            if (!cache) {
                modulesCache.set(ext, (cache = {}));
            }
            if (!cache[request]) {
                if (request === 'undici') {
                    const undici = original.apply(this, arguments);
                    proxyAgent.patchUndici(undici);
                    cache[request] = undici;
                }
                else {
                    const mod = lookup[request];
                    cache[request] = { ...mod }; // Copy to work around #93167.
                }
            }
            return cache[request];
        };
    });
}
async function lookupProxyAuthorization(extHostWorkspace, extHostLogService, mainThreadTelemetry, configProvider, proxyAuthenticateCache, basicAuthCache, isRemote, fallbackToLocalKerberos, proxyURL, proxyAuthenticate, state) {
    const cached = proxyAuthenticateCache[proxyURL];
    if (proxyAuthenticate) {
        proxyAuthenticateCache[proxyURL] = proxyAuthenticate;
    }
    extHostLogService.trace('ProxyResolver#lookupProxyAuthorization callback', `proxyURL:${proxyURL}`, `proxyAuthenticate:${proxyAuthenticate}`, `proxyAuthenticateCache:${cached}`);
    const header = proxyAuthenticate || cached;
    const authenticate = Array.isArray(header) ? header : typeof header === 'string' ? [header] : [];
    sendTelemetry(mainThreadTelemetry, authenticate, isRemote);
    if (authenticate.some((a) => /^(Negotiate|Kerberos)( |$)/i.test(a)) && !state.kerberosRequested) {
        state.kerberosRequested = true;
        try {
            const spnConfig = getExtHostConfigValue(configProvider, isRemote, 'http.proxyKerberosServicePrincipal');
            const response = await lookupKerberosAuthorization(proxyURL, spnConfig, extHostLogService, 'ProxyResolver#lookupProxyAuthorization');
            return 'Negotiate ' + response;
        }
        catch (err) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication failed', err);
        }
        if (isRemote && fallbackToLocalKerberos) {
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Kerberos authentication lookup on host', `proxyURL:${proxyURL}`);
            const auth = await extHostWorkspace.lookupKerberosAuthorization(proxyURL);
            if (auth) {
                return 'Negotiate ' + auth;
            }
        }
    }
    const basicAuthHeader = authenticate.find((a) => /^Basic( |$)/i.test(a));
    if (basicAuthHeader) {
        try {
            const cachedAuth = basicAuthCache[proxyURL];
            if (cachedAuth) {
                if (state.basicAuthCacheUsed) {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication deleting cached credentials', `proxyURL:${proxyURL}`);
                    delete basicAuthCache[proxyURL];
                }
                else {
                    extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication using cached credentials', `proxyURL:${proxyURL}`);
                    state.basicAuthCacheUsed = true;
                    return cachedAuth;
                }
            }
            state.basicAuthAttempt = (state.basicAuthAttempt || 0) + 1;
            const realm = / realm="([^"]+)"/i.exec(basicAuthHeader)?.[1];
            extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication lookup', `proxyURL:${proxyURL}`, `realm:${realm}`);
            const url = new URL(proxyURL);
            const authInfo = {
                scheme: 'basic',
                host: url.hostname,
                port: Number(url.port),
                realm: realm || '',
                isProxy: true,
                attempt: state.basicAuthAttempt,
            };
            const credentials = await extHostWorkspace.lookupAuthorization(authInfo);
            if (credentials) {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
                const auth = 'Basic ' +
                    Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                basicAuthCache[proxyURL] = auth;
                return auth;
            }
            else {
                extHostLogService.debug('ProxyResolver#lookupProxyAuthorization Basic authentication received no credentials', `proxyURL:${proxyURL}`, `realm:${realm}`);
            }
        }
        catch (err) {
            extHostLogService.error('ProxyResolver#lookupProxyAuthorization Basic authentication failed', err);
        }
    }
    return undefined;
}
let telemetrySent = false;
const enableProxyAuthenticationTelemetry = false;
function sendTelemetry(mainThreadTelemetry, authenticate, isRemote) {
    if (!enableProxyAuthenticationTelemetry || telemetrySent || !authenticate.length) {
        return;
    }
    telemetrySent = true;
    mainThreadTelemetry.$publicLog2('proxyAuthenticationRequest', {
        authenticationType: authenticate.map((a) => a.split(' ')[0]).join(','),
        extensionHostType: isRemote ? 'remote' : 'local',
    });
}
function getExtHostConfigValue(configProvider, isRemote, key, fallback) {
    if (isRemote) {
        return configProvider.getConfiguration().get(key) ?? fallback;
    }
    const values = configProvider
        .getConfiguration()
        .inspect(key);
    return values?.globalLocalValue ?? values?.defaultValue ?? fallback;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL3Byb3h5UmVzb2x2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFPaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBZSxRQUFRLElBQUksZUFBZSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFOUYsT0FBTyxFQUNOLFFBQVEsRUFDUixlQUFlLEVBQ2YsbUJBQW1CLEVBQ25CLGNBQWMsRUFHZCxjQUFjLEVBQ2Qsc0JBQXNCLEdBRXRCLE1BQU0scUJBQXFCLENBQUE7QUFHNUIsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUczQyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM5RixPQUFPLEtBQUssVUFBVSxNQUFNLHFCQUFxQixDQUFBO0FBRWpELE1BQU0sT0FBTyxHQUFHLGFBQWEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0FBQzlDLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUM1QixNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7QUFDOUIsTUFBTSxHQUFHLEdBQW1CLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUMxQyxNQUFNLEdBQUcsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7QUFFMUIsTUFBTSwyQkFBMkIsR0FBRyxLQUFLLENBQUE7QUFDekMsTUFBTSx1QkFBdUIsR0FBRyxLQUFLLENBQUE7QUFFckMsTUFBTSxVQUFVLG9CQUFvQixDQUNuQyxnQkFBMkMsRUFDM0MsY0FBcUMsRUFD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