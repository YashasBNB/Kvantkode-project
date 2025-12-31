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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJveHlSZXNvbHZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9wcm94eVJlc29sdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBT2hHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQWUsUUFBUSxJQUFJLGVBQWUsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTlGLE9BQU8sRUFDTixRQUFRLEVBQ1IsZUFBZSxFQUNmLG1CQUFtQixFQUNuQixjQUFjLEVBR2QsY0FBYyxFQUNkLHNCQUFzQixHQUV0QixNQUFNLHFCQUFxQixDQUFBO0FBRzVCLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFHM0MsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDOUYsT0FBTyxLQUFLLFVBQVUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVqRCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUM5QyxNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7QUFDNUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0FBQzlCLE1BQU0sR0FBRyxHQUFtQixPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDMUMsTUFBTSxHQUFHLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0FBRTFCLE1BQU0sMkJBQTJCLEdBQUcsS0FBSyxDQUFBO0FBQ3pDLE1BQU0sdUJBQXVCLEdBQUcsS0FBSyxDQUFBO0FBRXJDLE1BQU0sVUFBVSxvQkFBb0IsQ0FDbkMsZ0JBQTJDLEVBQzNDLGNBQXFDLEVBQ3JDLGdCQUF5QyxFQUN6QyxpQkFBOEIsRUFDOUIsbUJBQTZDLEVBQzdDLFFBQWdDLEVBQ2hDLFdBQTRCO0lBRTVCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFBO0lBQ3pDLE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxZQUFZLElBQUksQ0FBQyxRQUFRLENBQUE7SUFDMUUsTUFBTSx1QkFBdUIsR0FBRyxtQkFBbUIsQ0FBQTtJQUNuRCxNQUFNLHFCQUFxQixHQUFHLG1CQUFtQixDQUFBO0lBQ2pELE1BQU0scUJBQXFCLEdBQUcsR0FBRyxFQUFFLENBQ2xDLENBQUMsUUFBUTtRQUNULGNBQWM7YUFDWixnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7YUFDeEIsR0FBRyxDQUFVLDRCQUE0QixFQUFFLG1CQUFtQixDQUFDLENBQUE7SUFDbEUsTUFBTSxNQUFNLEdBQXFCO1FBQ2hDLFlBQVksRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQztRQUN6RCx3QkFBd0IsRUFBRSx3QkFBd0IsQ0FBQyxJQUFJLENBQ3RELFNBQVMsRUFDVCxnQkFBZ0IsRUFDaEIsaUJBQWlCLEVBQ2pCLG1CQUFtQixFQUNuQixjQUFjLEVBQ2QsRUFBRSxFQUNGLEVBQUUsRUFDRixRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFDeEIsdUJBQXVCLENBQ3ZCO1FBQ0QsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLHFCQUFxQixDQUFTLGNBQWMsRUFBRSxRQUFRLEVBQUUsWUFBWSxDQUFDO1FBQ3hGLGVBQWUsRUFBRSxHQUFHLEVBQUUsQ0FDckIscUJBQXFCLENBQXNCLGNBQWMsRUFBRSxRQUFRLEVBQUUsbUJBQW1CLENBQUM7WUFDekYsS0FBSztRQUNOLGdCQUFnQixFQUFFLEdBQUcsRUFBRSxDQUN0QixxQkFBcUIsQ0FBVyxjQUFjLEVBQUUsUUFBUSxFQUFFLGNBQWMsQ0FBQyxJQUFJLEVBQUU7UUFDaEYsK0JBQStCLEVBQUUsR0FBRyxFQUFFLENBQ3JDLHFCQUFxQixDQUFVLGNBQWMsRUFBRSxRQUFRLEVBQUUsNkJBQTZCLEVBQUUsSUFBSSxDQUFDO1FBQzlGLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBQ2hFLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLGFBQWEsQ0FBQyxjQUFjLEVBQUUsUUFBUSxDQUFDO1FBQ2hFLEdBQUcsRUFBRSxpQkFBaUI7UUFDdEIsV0FBVyxFQUFFLEdBQUcsRUFBRTtZQUNqQixNQUFNLEtBQUssR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMxQyxRQUFRLEtBQUssRUFBRSxDQUFDO2dCQUNmLEtBQUssZUFBZSxDQUFDLEtBQUs7b0JBQ3pCLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQTtnQkFDdEIsS0FBSyxlQUFlLENBQUMsS0FBSztvQkFDekIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO2dCQUN0QixLQUFLLGVBQWUsQ0FBQyxJQUFJO29CQUN4QixPQUFPLFFBQVEsQ0FBQyxJQUFJLENBQUE7Z0JBQ3JCLEtBQUssZUFBZSxDQUFDLE9BQU87b0JBQzNCLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQTtnQkFDeEIsS0FBSyxlQUFlLENBQUMsS0FBSztvQkFDekIsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO2dCQUN0QixLQUFLLGVBQWUsQ0FBQyxHQUFHO29CQUN2QixPQUFPLFFBQVEsQ0FBQyxHQUFHLENBQUE7Z0JBQ3BCO29CQUNDLE9BQU8sS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ3JCLENBQUM7WUFDRCxTQUFTLEtBQUssQ0FBQyxLQUFZO2dCQUMxQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ25ELE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQTtZQUN0QixDQUFDO1FBQ0YsQ0FBQztRQUNELHFCQUFxQixFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7UUFDL0IscUJBQXFCO1FBQ3JCLDBCQUEwQixFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RDLE1BQU0sUUFBUSxHQUF3QixFQUFFLENBQUE7WUFDeEMsSUFBSSxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLEVBQUUsR0FBRyxFQUFFLGlCQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQ2xFLENBQUM7WUFDRCxJQUFJLHFCQUFxQixFQUFFLENBQUM7Z0JBQzNCLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIsa0ZBQWtGLENBQ2xGLENBQUE7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQSxDQUFDLDRDQUE0QztnQkFDOUYsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3BCLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIsaUZBQWlGLEVBQ2pGLEtBQUssQ0FBQyxNQUFNLENBQ1osQ0FDRCxDQUFBO2dCQUNELFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDckIsQ0FBQztZQUNELCtFQUErRTtZQUMvRSxJQUNDLFFBQVEsQ0FBQyxXQUFXLENBQUMseUJBQXlCO2dCQUM3QyxLQUFLLENBQUMsV0FBbUIsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLEVBQ2xELENBQUM7Z0JBQ0YsaUJBQWlCLENBQUMsS0FBSyxDQUN0QixxRUFBcUUsQ0FDckUsQ0FBQTtnQkFDRCxRQUFRLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUUsS0FBSyxDQUFDLFdBQW1CLENBQUMsZ0JBQTRCLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7WUFDRCxPQUFPLENBQUMsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUMsQ0FBQztRQUNELEdBQUcsRUFBRSxPQUFPLENBQUMsR0FBRztLQUNoQixDQUFBO0lBQ0QsTUFBTSxFQUFFLHVCQUF1QixFQUFFLGVBQWUsRUFBRSxHQUFHLG1CQUFtQixDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2hGLE1BQU0sTUFBTSxHQUFJLFVBQWtCLENBQUMsT0FBTyxJQUFJLFVBQVUsQ0FBQTtJQUN4RCxNQUFNLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQTtJQUV4QyxnQkFBZ0IsQ0FDZixNQUFNLEVBQ04sY0FBYyxFQUNkLG1CQUFtQixFQUNuQixRQUFRLEVBQ1IsZUFBZSxFQUNmLFdBQVcsQ0FDWCxDQUFBO0lBRUQsTUFBTSxNQUFNLEdBQUcsb0JBQW9CLENBQUMsTUFBTSxFQUFFLHVCQUF1QixDQUFDLENBQUE7SUFDcEUsT0FBTyxzQkFBc0IsQ0FBQyxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTtBQUN4RCxDQUFDO0FBRUQsTUFBTSxhQUFhLEdBQUc7SUFDckIsZ0JBQWdCO0lBQ2hCLE1BQU07SUFDTixTQUFTO0lBQ1QsSUFBSTtJQUNKLFNBQVM7SUFDVCxTQUFTO0lBQ1QsWUFBWTtJQUNaLG1CQUFtQjtJQUNuQixZQUFZO0NBQ1osQ0FBQTtBQUVELFNBQVMsZ0JBQWdCLENBQ3hCLE1BQXdCLEVBQ3hCLGNBQXFDLEVBQ3JDLG1CQUE2QyxFQUM3QyxRQUFnQyxFQUNoQyxlQUE2RCxFQUM3RCxXQUE0QjtJQUU1QixJQUFJLENBQUUsVUFBa0IsQ0FBQyxxQkFBcUIsRUFBRSxDQUFDO1FBQ2hELE1BQU0sYUFBYSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQ3JDO1FBQUMsVUFBa0IsQ0FBQyxxQkFBcUIsR0FBRyxhQUFhLENBQUE7UUFDMUQsTUFBTSxZQUFZLEdBQUcsVUFBVSxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxhQUFhLEVBQUUsZUFBZSxDQUFDLENBQ3ZGO1FBQUMsVUFBa0IsQ0FBQyxvQkFBb0IsR0FBRyxZQUFZLENBQUE7UUFDeEQsSUFBSSxnQkFBZ0IsR0FBRyxLQUFLLENBQUE7UUFDNUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDL0IsZ0JBQWdCLEdBQUcsY0FBYztpQkFDL0IsZ0JBQWdCLENBQUMsTUFBTSxDQUFDO2lCQUN4QixHQUFHLENBQVUsZUFBZSxFQUFFLHVCQUF1QixDQUFDLENBQUE7WUFDeEQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDN0MsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDO29CQUNsRCxnQkFBZ0IsR0FBRyxjQUFjO3lCQUMvQixnQkFBZ0IsQ0FBQyxNQUFNLENBQUM7eUJBQ3hCLEdBQUcsQ0FBVSxlQUFlLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtnQkFDekQsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO1FBQ0QsNkRBQTZEO1FBQzdELFVBQVUsQ0FBQyxLQUFLLEdBQUcsS0FBSyxVQUFVLEtBQUssQ0FBQyxLQUE2QixFQUFFLElBQWtCO1lBQ3hGLFNBQVMsa0JBQWtCLENBQUMsSUFBdUM7Z0JBQ2xFLE9BQU8sSUFBSSxJQUFJLElBQUksSUFBSSxJQUFJO29CQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztvQkFDWixDQUFDLENBQUMsT0FBTyxLQUFLLEtBQUssUUFBUSxJQUFJLE9BQU8sSUFBSSxLQUFLO3dCQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQzt3QkFDYixDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ2QsQ0FBQztZQUNELHVGQUF1RjtZQUN2Rix3RkFBd0Y7WUFDeEYsTUFBTSxTQUFTLEdBQ2QsT0FBTyxLQUFLLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sSUFBSSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUNwRixNQUFNLFNBQVMsR0FBRyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQy9DLElBQUksU0FBUyxFQUFFLENBQUM7Z0JBQ2YscUJBQXFCLENBQUMsbUJBQW1CLEVBQUUsTUFBTSxDQUFDLENBQUE7WUFDbkQsQ0FBQztZQUNELE1BQU0sU0FBUyxHQUFHLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDL0MsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDZixxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUNuRCxDQUFDO1lBQ0QsTUFBTSxnQkFBZ0IsR0FBRyxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsS0FBSyxRQUFRLENBQUE7WUFDcEUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO2dCQUN0QixxQkFBcUIsQ0FBQyxtQkFBbUIsRUFBRSxnQkFBZ0IsQ0FBQyxDQUFBO1lBQzdELENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUNqRCxJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLFdBQVcsQ0FBQyxDQUFBO1lBQ3hELENBQUM7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLElBQUksU0FBUyxJQUFJLFNBQVMsSUFBSSxnQkFBZ0IsSUFBSSxTQUFTLEVBQUUsQ0FBQztnQkFDbEYsTUFBTSxRQUFRLEdBQUcsTUFBTSxZQUFZLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUNoRCx5QkFBeUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7Z0JBQ25FLE9BQU8sUUFBUSxDQUFBO1lBQ2hCLENBQUM7WUFDRCw2S0FBNks7WUFDN0ssSUFBSSxJQUFJLEVBQUUsT0FBTyxFQUFFLENBQUM7Z0JBQ25CLE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtnQkFDekMsS0FBSyxNQUFNLE1BQU0sSUFBSSxhQUFhLEVBQUUsQ0FBQztvQkFDcEMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtnQkFDdkIsQ0FBQztnQkFDRCxJQUFJLEdBQUcsRUFBRSxHQUFHLElBQUksRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUM1QixDQUFDO1lBQ0QscUVBQXFFO1lBQ3JFLE1BQU0sYUFBYSxHQUFHLEtBQUssWUFBWSxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO1lBQ3JFLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNwQyxNQUFNLFFBQVEsR0FBRyxNQUFNLFFBQVEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLGFBQWEsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5RCx5QkFBeUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDbkUsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQyxDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLHlCQUF5QixDQUNqQyxtQkFBNkMsRUFDN0MsUUFBa0IsRUFDbEIsU0FBaUI7SUFFakIsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQTtJQUNoQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUU7UUFDdEMsR0FBRztZQUNGLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2pELE9BQU8sV0FBVyxJQUFJLFNBQVMsQ0FBQTtRQUNoQyxDQUFDO0tBQ0QsQ0FBQyxDQUFBO0lBQ0YsTUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtJQUNsQyxNQUFNLENBQUMsY0FBYyxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUU7UUFDdkMsR0FBRztZQUNGLHFCQUFxQixDQUFDLG1CQUFtQixFQUFFLGNBQWMsQ0FBQyxDQUFBO1lBQzFELE9BQU8sWUFBWSxLQUFLLFNBQVMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDM0QsQ0FBQztLQUNELENBQUMsQ0FBQTtBQUNILENBQUM7QUE4Q0QsTUFBTSxlQUFlLEdBQXlCO0lBQzdDLEdBQUcsRUFBRSxDQUFDO0lBQ04sWUFBWSxFQUFFLENBQUM7SUFDZixJQUFJLEVBQUUsQ0FBQztJQUNQLElBQUksRUFBRSxDQUFDO0lBQ1AsU0FBUyxFQUFFLENBQUM7SUFDWixjQUFjLEVBQUUsQ0FBQztDQUNqQixDQUFBO0FBRUQsSUFBSSxLQUFpQyxDQUFBO0FBQ3JDLE1BQU0seUJBQXlCLEdBQUcsS0FBSyxDQUFBO0FBQ3ZDLFNBQVMscUJBQXFCLENBQzdCLG1CQUE2QyxFQUM3QyxPQUFxQztJQUVyQyxJQUFJLHlCQUF5QixJQUFJLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM5RCxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BCLENBQUM7UUFDRCxLQUFLLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN2QixtQkFBbUIsQ0FBQyxXQUFXLENBQzlCLGlCQUFpQixFQUNqQixlQUFlLENBQ2YsQ0FBQTtRQUNGLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQSxDQUFDLDZDQUE2QztRQUN2RCxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDZCxDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsb0JBQW9CLENBQUMsTUFBd0IsRUFBRSxZQUFxQztJQUM1RixTQUFTLFlBQVksQ0FBQyxNQUFXLEVBQUUsS0FBVTtRQUM1QyxNQUFNLE1BQU0sR0FBRyxNQUFNLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQTtRQUN2QyxNQUFNLENBQUMsZ0JBQWdCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDbkQsT0FBTyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksRUFBRSxZQUFZLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3JFLEtBQUssRUFBRSxZQUFZLENBQUMsS0FBSyxFQUFFLGVBQWUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLFlBQVksQ0FBQyxDQUFDO1FBQ3hFLEdBQUcsRUFBRSxZQUFZLENBQUMsR0FBRyxFQUFFLGNBQWMsQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUM7UUFDbkQsR0FBRyxFQUFFLFlBQVksQ0FBQyxHQUFHLEVBQUUsY0FBYyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztLQUNuRCxDQUFBO0FBQ0YsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLGNBQXFDLEVBQUUsUUFBaUI7SUFDOUUsT0FBTyxDQUNOLENBQUMscUJBQXFCLENBQ3JCLGNBQWMsRUFDZCxRQUFRLEVBQ1Isd0NBQXdDLEVBQ3hDLDJCQUEyQixDQUMzQixJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBVSxjQUFjLEVBQUUsUUFBUSxFQUFFLHlCQUF5QixDQUFDLENBQzFGLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxhQUFhLENBQUMsY0FBcUMsRUFBRSxRQUFpQjtJQUM5RSxPQUFPLENBQ04sQ0FBQyxDQUFDLHFCQUFxQixDQUN0QixjQUFjLEVBQ2QsUUFBUSxFQUNSLHdDQUF3QyxFQUN4QywyQkFBMkIsQ0FDM0IsSUFBSSxDQUFDLENBQUMscUJBQXFCLENBQVUsY0FBYyxFQUFFLFFBQVEsRUFBRSx5QkFBeUIsQ0FBQyxDQUMxRixDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sWUFBWSxHQUFHLElBQUksR0FBRyxFQUd6QixDQUFBO0FBQ0gsU0FBUyxzQkFBc0IsQ0FDOUIsZ0JBQXlDLEVBQ3pDLE1BQStDO0lBRS9DLE9BQU8sZ0JBQWdCLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxjQUFjLEVBQUUsRUFBRTtRQUN2RSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDckMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQTtRQUNsQyxXQUFXLENBQUMsS0FBSyxHQUFHLFNBQVMsSUFBSSxDQUNoQyxPQUFlLEVBQ2YsTUFBNEIsRUFDNUIsTUFBZTtZQUVmLElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUE7WUFDbEIsQ0FBQztZQUVELElBQUksT0FBTyxLQUFLLEtBQUssRUFBRSxDQUFDO2dCQUN2QixPQUFPLE1BQU0sQ0FBQyxHQUFHLENBQUE7WUFDbEIsQ0FBQztZQUVELElBQUksT0FBTyxLQUFLLE1BQU0sSUFBSSxPQUFPLEtBQUssT0FBTyxJQUFJLE9BQU8sS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDdkUsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQTtZQUN2QyxDQUFDO1lBRUQsTUFBTSxHQUFHLEdBQUcsY0FBYyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1lBQ2hFLElBQUksS0FBSyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDakMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNaLFlBQVksQ0FBQyxHQUFHLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEMsQ0FBQztZQUNELElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDckIsSUFBSSxPQUFPLEtBQUssUUFBUSxFQUFFLENBQUM7b0JBQzFCLE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUFBO29CQUM5QyxVQUFVLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFBO29CQUM5QixLQUFLLENBQUMsT0FBTyxDQUFDLEdBQUcsTUFBTSxDQUFBO2dCQUN4QixDQUFDO3FCQUFNLENBQUM7b0JBQ1AsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO29CQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLEdBQVEsRUFBRSxHQUFHLEdBQUcsRUFBRSxDQUFBLENBQUMsOEJBQThCO2dCQUNoRSxDQUFDO1lBQ0YsQ0FBQztZQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3RCLENBQUMsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSx3QkFBd0IsQ0FDdEMsZ0JBQTJDLEVBQzNDLGlCQUE4QixFQUM5QixtQkFBNkMsRUFDN0MsY0FBcUMsRUFDckMsc0JBQXFFLEVBQ3JFLGNBQWtELEVBQ2xELFFBQWlCLEVBQ2pCLHVCQUFnQyxFQUNoQyxRQUFnQixFQUNoQixpQkFBZ0QsRUFDaEQsS0FBK0Y7SUFFL0YsTUFBTSxNQUFNLEdBQUcsc0JBQXNCLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDL0MsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1FBQ3ZCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxHQUFHLGlCQUFpQixDQUFBO0lBQ3JELENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxLQUFLLENBQ3RCLGlEQUFpRCxFQUNqRCxZQUFZLFFBQVEsRUFBRSxFQUN0QixxQkFBcUIsaUJBQWlCLEVBQUUsRUFDeEMsMEJBQTBCLE1BQU0sRUFBRSxDQUNsQyxDQUFBO0lBQ0QsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLElBQUksTUFBTSxDQUFBO0lBQzFDLE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxNQUFNLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDaEcsYUFBYSxDQUFDLG1CQUFtQixFQUFFLFlBQVksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUMxRCxJQUFJLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUM7UUFDakcsS0FBSyxDQUFDLGlCQUFpQixHQUFHLElBQUksQ0FBQTtRQUU5QixJQUFJLENBQUM7WUFDSixNQUFNLFNBQVMsR0FBRyxxQkFBcUIsQ0FDdEMsY0FBYyxFQUNkLFFBQVEsRUFDUixvQ0FBb0MsQ0FDcEMsQ0FBQTtZQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sMkJBQTJCLENBQ2pELFFBQVEsRUFDUixTQUFTLEVBQ1QsaUJBQWlCLEVBQ2pCLHdDQUF3QyxDQUN4QyxDQUFBO1lBQ0QsT0FBTyxZQUFZLEdBQUcsUUFBUSxDQUFBO1FBQy9CLENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsaUJBQWlCLENBQUMsS0FBSyxDQUN0Qix1RUFBdUUsRUFDdkUsR0FBRyxDQUNILENBQUE7UUFDRixDQUFDO1FBRUQsSUFBSSxRQUFRLElBQUksdUJBQXVCLEVBQUUsQ0FBQztZQUN6QyxpQkFBaUIsQ0FBQyxLQUFLLENBQ3RCLCtFQUErRSxFQUMvRSxZQUFZLFFBQVEsRUFBRSxDQUN0QixDQUFBO1lBQ0QsTUFBTSxJQUFJLEdBQUcsTUFBTSxnQkFBZ0IsQ0FBQywyQkFBMkIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUN6RSxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLE9BQU8sWUFBWSxHQUFHLElBQUksQ0FBQTtZQUMzQixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDeEUsSUFBSSxlQUFlLEVBQUUsQ0FBQztRQUNyQixJQUFJLENBQUM7WUFDSixNQUFNLFVBQVUsR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDM0MsSUFBSSxVQUFVLEVBQUUsQ0FBQztnQkFDaEIsSUFBSSxLQUFLLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDOUIsaUJBQWlCLENBQUMsS0FBSyxDQUN0Qix5RkFBeUYsRUFDekYsWUFBWSxRQUFRLEVBQUUsQ0FDdEIsQ0FBQTtvQkFDRCxPQUFPLGNBQWMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDaEMsQ0FBQztxQkFBTSxDQUFDO29CQUNQLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIsc0ZBQXNGLEVBQ3RGLFlBQVksUUFBUSxFQUFFLENBQ3RCLENBQUE7b0JBQ0QsS0FBSyxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtvQkFDL0IsT0FBTyxVQUFVLENBQUE7Z0JBQ2xCLENBQUM7WUFDRixDQUFDO1lBQ0QsS0FBSyxDQUFDLGdCQUFnQixHQUFHLENBQUMsS0FBSyxDQUFDLGdCQUFnQixJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUMxRCxNQUFNLEtBQUssR0FBRyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM1RCxpQkFBaUIsQ0FBQyxLQUFLLENBQ3RCLG9FQUFvRSxFQUNwRSxZQUFZLFFBQVEsRUFBRSxFQUN0QixTQUFTLEtBQUssRUFBRSxDQUNoQixDQUFBO1lBQ0QsTUFBTSxHQUFHLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDN0IsTUFBTSxRQUFRLEdBQWE7Z0JBQzFCLE1BQU0sRUFBRSxPQUFPO2dCQUNmLElBQUksRUFBRSxHQUFHLENBQUMsUUFBUTtnQkFDbEIsSUFBSSxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUN0QixLQUFLLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ2xCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLE9BQU8sRUFBRSxLQUFLLENBQUMsZ0JBQWdCO2FBQy9CLENBQUE7WUFDRCxNQUFNLFdBQVcsR0FBRyxNQUFNLGdCQUFnQixDQUFDLG1CQUFtQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ3hFLElBQUksV0FBVyxFQUFFLENBQUM7Z0JBQ2pCLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIsa0ZBQWtGLEVBQ2xGLFlBQVksUUFBUSxFQUFFLEVBQ3RCLFNBQVMsS0FBSyxFQUFFLENBQ2hCLENBQUE7Z0JBQ0QsTUFBTSxJQUFJLEdBQ1QsUUFBUTtvQkFDUixNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsV0FBVyxDQUFDLFFBQVEsSUFBSSxXQUFXLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7Z0JBQ2xGLGNBQWMsQ0FBQyxRQUFRLENBQUMsR0FBRyxJQUFJLENBQUE7Z0JBQy9CLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztpQkFBTSxDQUFDO2dCQUNQLGlCQUFpQixDQUFDLEtBQUssQ0FDdEIscUZBQXFGLEVBQ3JGLFlBQVksUUFBUSxFQUFFLEVBQ3RCLFNBQVMsS0FBSyxFQUFFLENBQ2hCLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCxpQkFBaUIsQ0FBQyxLQUFLLENBQ3RCLG9FQUFvRSxFQUNwRSxHQUFHLENBQ0gsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsT0FBTyxTQUFTLENBQUE7QUFDakIsQ0FBQztBQXNCRCxJQUFJLGFBQWEsR0FBRyxLQUFLLENBQUE7QUFDekIsTUFBTSxrQ0FBa0MsR0FBRyxLQUFLLENBQUE7QUFDaEQsU0FBUyxhQUFhLENBQ3JCLG1CQUE2QyxFQUM3QyxZQUFzQixFQUN0QixRQUFpQjtJQUVqQixJQUFJLENBQUMsa0NBQWtDLElBQUksYUFBYSxJQUFJLENBQUMsWUFBWSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2xGLE9BQU07SUFDUCxDQUFDO0lBQ0QsYUFBYSxHQUFHLElBQUksQ0FBQTtJQUVwQixtQkFBbUIsQ0FBQyxXQUFXLENBQzlCLDRCQUE0QixFQUM1QjtRQUNDLGtCQUFrQixFQUFFLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO1FBQ3RFLGlCQUFpQixFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxPQUFPO0tBQ2hELENBQ0QsQ0FBQTtBQUNGLENBQUM7QUFhRCxTQUFTLHFCQUFxQixDQUM3QixjQUFxQyxFQUNyQyxRQUFpQixFQUNqQixHQUFXLEVBQ1gsUUFBWTtJQUVaLElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxPQUFPLGNBQWMsQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBSSxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUE7SUFDakUsQ0FBQztJQUNELE1BQU0sTUFBTSxHQUF3QyxjQUFjO1NBQ2hFLGdCQUFnQixFQUFFO1NBQ2xCLE9BQU8sQ0FBSSxHQUFHLENBQUMsQ0FBQTtJQUNqQixPQUFPLE1BQU0sRUFBRSxnQkFBZ0IsSUFBSSxNQUFNLEVBQUUsWUFBWSxJQUFJLFFBQVEsQ0FBQTtBQUNwRSxDQUFDIn0=