/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { streamToBuffer } from '../../../base/common/buffer.js';
import { getErrorMessage } from '../../../base/common/errors.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { localize } from '../../../nls.js';
import { Extensions, } from '../../configuration/common/configurationRegistry.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { Registry } from '../../registry/common/platform.js';
export const IRequestService = createDecorator('requestService');
class LoggableHeaders {
    constructor(original) {
        this.original = original;
    }
    toJSON() {
        if (!this.headers) {
            const headers = Object.create(null);
            for (const key in this.original) {
                if (key.toLowerCase() === 'authorization' || key.toLowerCase() === 'proxy-authorization') {
                    headers[key] = '*****';
                }
                else {
                    headers[key] = this.original[key];
                }
            }
            this.headers = headers;
        }
        return this.headers;
    }
}
export class AbstractRequestService extends Disposable {
    constructor(logService) {
        super();
        this.logService = logService;
        this.counter = 0;
    }
    async logAndRequest(options, request) {
        const prefix = `#${++this.counter}: ${options.url}`;
        this.logService.trace(`${prefix} - begin`, options.type, new LoggableHeaders(options.headers ?? {}));
        try {
            const result = await request();
            this.logService.trace(`${prefix} - end`, options.type, result.res.statusCode, result.res.headers);
            return result;
        }
        catch (error) {
            this.logService.error(`${prefix} - error`, options.type, getErrorMessage(error));
            throw error;
        }
    }
}
export function isSuccess(context) {
    return ((context.res.statusCode && context.res.statusCode >= 200 && context.res.statusCode < 300) ||
        context.res.statusCode === 1223);
}
export function hasNoContent(context) {
    return context.res.statusCode === 204;
}
export async function asText(context) {
    if (hasNoContent(context)) {
        return null;
    }
    const buffer = await streamToBuffer(context.stream);
    return buffer.toString();
}
export async function asTextOrError(context) {
    if (!isSuccess(context)) {
        throw new Error('Server returned ' + context.res.statusCode);
    }
    return asText(context);
}
export async function asJson(context) {
    if (!isSuccess(context)) {
        throw new Error('Server returned ' + context.res.statusCode);
    }
    if (hasNoContent(context)) {
        return null;
    }
    const buffer = await streamToBuffer(context.stream);
    const str = buffer.toString();
    try {
        return JSON.parse(str);
    }
    catch (err) {
        err.message += ':\n' + str;
        throw err;
    }
}
export function updateProxyConfigurationsScope(useHostProxy, useHostProxyDefault) {
    registerProxyConfigurations(useHostProxy, useHostProxyDefault);
}
export const USER_LOCAL_AND_REMOTE_SETTINGS = [
    'http.proxy',
    'http.proxyStrictSSL',
    'http.proxyKerberosServicePrincipal',
    'http.noProxy',
    'http.proxyAuthorization',
    'http.proxySupport',
    'http.systemCertificates',
    'http.experimental.systemCertificatesV2',
    'http.fetchAdditionalSupport',
];
let proxyConfiguration = [];
let previousUseHostProxy = undefined;
let previousUseHostProxyDefault = undefined;
function registerProxyConfigurations(useHostProxy = true, useHostProxyDefault = true) {
    if (previousUseHostProxy === useHostProxy &&
        previousUseHostProxyDefault === useHostProxyDefault) {
        return;
    }
    previousUseHostProxy = useHostProxy;
    previousUseHostProxyDefault = useHostProxyDefault;
    const configurationRegistry = Registry.as(Extensions.Configuration);
    const oldProxyConfiguration = proxyConfiguration;
    proxyConfiguration = [
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', 'HTTP'),
            type: 'object',
            scope: 2 /* ConfigurationScope.MACHINE */,
            properties: {
                'http.useLocalProxyConfiguration': {
                    type: 'boolean',
                    default: useHostProxyDefault,
                    markdownDescription: localize('useLocalProxy', 'Controls whether in the remote extension host the local proxy configuration should be used. This setting only applies as a remote setting during [remote development](https://aka.ms/vscode-remote).'),
                    restricted: true,
                },
            },
        },
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', 'HTTP'),
            type: 'object',
            scope: 1 /* ConfigurationScope.APPLICATION */,
            properties: {
                'http.electronFetch': {
                    type: 'boolean',
                    default: false,
                    description: localize('electronFetch', "Controls whether use of Electron's fetch implementation instead of Node.js' should be enabled. All local extensions will get Electron's fetch implementation for the global fetch API."),
                    restricted: true,
                },
            },
        },
        {
            id: 'http',
            order: 15,
            title: localize('httpConfigurationTitle', 'HTTP'),
            type: 'object',
            scope: useHostProxy ? 1 /* ConfigurationScope.APPLICATION */ : 2 /* ConfigurationScope.MACHINE */,
            properties: {
                'http.proxy': {
                    type: 'string',
                    pattern: '^(https?|socks|socks4a?|socks5h?)://([^:]*(:[^@]*)?@)?([^:]+|\\[[:0-9a-fA-F]+\\])(:\\d+)?/?$|^$',
                    markdownDescription: localize('proxy', 'The proxy setting to use. If not set, will be inherited from the `http_proxy` and `https_proxy` environment variables. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.proxyStrictSSL': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('strictSSL', 'Controls whether the proxy server certificate should be verified against the list of supplied CAs. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.proxyKerberosServicePrincipal': {
                    type: 'string',
                    markdownDescription: localize('proxyKerberosServicePrincipal', 'Overrides the principal service name for Kerberos authentication with the HTTP proxy. A default based on the proxy hostname is used when this is not set. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.noProxy': {
                    type: 'array',
                    items: { type: 'string' },
                    markdownDescription: localize('noProxy', 'Specifies domain names for which proxy settings should be ignored for HTTP/HTTPS requests. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.proxyAuthorization': {
                    type: ['null', 'string'],
                    default: null,
                    markdownDescription: localize('proxyAuthorization', 'The value to send as the `Proxy-Authorization` header for every network request. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.proxySupport': {
                    type: 'string',
                    enum: ['off', 'on', 'fallback', 'override'],
                    enumDescriptions: [
                        localize('proxySupportOff', 'Disable proxy support for extensions.'),
                        localize('proxySupportOn', 'Enable proxy support for extensions.'),
                        localize('proxySupportFallback', 'Enable proxy support for extensions, fall back to request options, when no proxy found.'),
                        localize('proxySupportOverride', 'Enable proxy support for extensions, override request options.'),
                    ],
                    default: 'override',
                    markdownDescription: localize('proxySupport', 'Use the proxy support for extensions. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.systemCertificates': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('systemCertificates', 'Controls whether CA certificates should be loaded from the OS. On Windows and macOS, a reload of the window is required after turning this off. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.experimental.systemCertificatesV2': {
                    type: 'boolean',
                    tags: ['experimental'],
                    default: false,
                    markdownDescription: localize('systemCertificatesV2', 'Controls whether experimental loading of CA certificates from the OS should be enabled. This uses a more general approach than the default implementation. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.', '`#http.useLocalProxyConfiguration#`'),
                    restricted: true,
                },
                'http.fetchAdditionalSupport': {
                    type: 'boolean',
                    default: true,
                    markdownDescription: localize('fetchAdditionalSupport', "Controls whether Node.js' fetch implementation should be extended with additional support. Currently proxy support ({1}) and system certificates ({2}) are added when the corresponding settings are enabled. When during [remote development](https://aka.ms/vscode-remote) the {0} setting is disabled this setting can be configured in the local and the remote settings separately.", '`#http.useLocalProxyConfiguration#`', '`#http.proxySupport#`', '`#http.systemCertificates#`'),
                    restricted: true,
                },
            },
        },
    ];
    configurationRegistry.updateConfigurations({
        add: proxyConfiguration,
        remove: oldProxyConfiguration,
    });
}
registerProxyConfigurations();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcmVxdWVzdC9jb21tb24vcmVxdWVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQU05RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUVOLFVBQVUsR0FHVixNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU3RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFNUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBa0IsZ0JBQWdCLENBQUMsQ0FBQTtBQTJCakYsTUFBTSxlQUFlO0lBR3BCLFlBQTZCLFFBQWtCO1FBQWxCLGFBQVEsR0FBUixRQUFRLENBQVU7SUFBRyxDQUFDO0lBRW5ELE1BQU07UUFDTCxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ25CLE1BQU0sT0FBTyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbkMsS0FBSyxNQUFNLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ2pDLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLGVBQWUsSUFBSSxHQUFHLENBQUMsV0FBVyxFQUFFLEtBQUsscUJBQXFCLEVBQUUsQ0FBQztvQkFDMUYsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLE9B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