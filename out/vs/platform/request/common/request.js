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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3JlcXVlc3QvY29tbW9uL3JlcXVlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFNOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFFTixVQUFVLEdBR1YsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRTVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUE7QUEyQmpGLE1BQU0sZUFBZTtJQUdwQixZQUE2QixRQUFrQjtRQUFsQixhQUFRLEdBQVIsUUFBUSxDQUFVO0lBQUcsQ0FBQztJQUVuRCxNQUFNO1FBQ0wsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNuQixNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ25DLEtBQUssTUFBTSxHQUFHLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO2dCQUNqQyxJQUFJLEdBQUcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxlQUFlLElBQUksR0FBRyxDQUFDLFdBQVcsRUFBRSxLQUFLLHFCQUFxQixFQUFFLENBQUM7b0JBQzFGLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxPQUFPLENB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