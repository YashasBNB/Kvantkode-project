/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as errors from './errors.js';
import * as platform from './platform.js';
import { equalsIgnoreCase, startsWithIgnoreCase } from './strings.js';
import { URI } from './uri.js';
import * as paths from './path.js';
export var Schemas;
(function (Schemas) {
    /**
     * A schema that is used for models that exist in memory
     * only and that have no correspondence on a server or such.
     */
    Schemas.inMemory = 'inmemory';
    /**
     * A schema that is used for setting files
     */
    Schemas.vscode = 'vscode';
    /**
     * A schema that is used for internal private files
     */
    Schemas.internal = 'private';
    /**
     * A walk-through document.
     */
    Schemas.walkThrough = 'walkThrough';
    /**
     * An embedded code snippet.
     */
    Schemas.walkThroughSnippet = 'walkThroughSnippet';
    Schemas.http = 'http';
    Schemas.https = 'https';
    Schemas.file = 'file';
    Schemas.mailto = 'mailto';
    Schemas.untitled = 'untitled';
    Schemas.data = 'data';
    Schemas.command = 'command';
    Schemas.vscodeRemote = 'vscode-remote';
    Schemas.vscodeRemoteResource = 'vscode-remote-resource';
    Schemas.vscodeManagedRemoteResource = 'vscode-managed-remote-resource';
    Schemas.vscodeUserData = 'vscode-userdata';
    Schemas.vscodeCustomEditor = 'vscode-custom-editor';
    Schemas.vscodeNotebookCell = 'vscode-notebook-cell';
    Schemas.vscodeNotebookCellMetadata = 'vscode-notebook-cell-metadata';
    Schemas.vscodeNotebookCellMetadataDiff = 'vscode-notebook-cell-metadata-diff';
    Schemas.vscodeNotebookCellOutput = 'vscode-notebook-cell-output';
    Schemas.vscodeNotebookCellOutputDiff = 'vscode-notebook-cell-output-diff';
    Schemas.vscodeNotebookMetadata = 'vscode-notebook-metadata';
    Schemas.vscodeInteractiveInput = 'vscode-interactive-input';
    Schemas.vscodeSettings = 'vscode-settings';
    Schemas.vscodeWorkspaceTrust = 'vscode-workspace-trust';
    Schemas.vscodeTerminal = 'vscode-terminal';
    /** Scheme used for code blocks in chat. */
    Schemas.vscodeChatCodeBlock = 'vscode-chat-code-block';
    /** Scheme used for LHS of code compare (aka diff) blocks in chat. */
    Schemas.vscodeChatCodeCompareBlock = 'vscode-chat-code-compare-block';
    /** Scheme used for the chat input editor. */
    Schemas.vscodeChatSesssion = 'vscode-chat-editor';
    /**
     * Scheme used internally for webviews that aren't linked to a resource (i.e. not custom editors)
     */
    Schemas.webviewPanel = 'webview-panel';
    /**
     * Scheme used for loading the wrapper html and script in webviews.
     */
    Schemas.vscodeWebview = 'vscode-webview';
    /**
     * Scheme used for extension pages
     */
    Schemas.extension = 'extension';
    /**
     * Scheme used as a replacement of `file` scheme to load
     * files with our custom protocol handler (desktop only).
     */
    Schemas.vscodeFileResource = 'vscode-file';
    /**
     * Scheme used for temporary resources
     */
    Schemas.tmp = 'tmp';
    /**
     * Scheme used vs live share
     */
    Schemas.vsls = 'vsls';
    /**
     * Scheme used for the Source Control commit input's text document
     */
    Schemas.vscodeSourceControl = 'vscode-scm';
    /**
     * Scheme used for input box for creating comments.
     */
    Schemas.commentsInput = 'comment';
    /**
     * Scheme used for special rendering of settings in the release notes
     */
    Schemas.codeSetting = 'code-setting';
    /**
     * Scheme used for output panel resources
     */
    Schemas.outputChannel = 'output';
    /**
     * Scheme used for the accessible view
     */
    Schemas.accessibleView = 'accessible-view';
})(Schemas || (Schemas = {}));
export function matchesScheme(target, scheme) {
    if (URI.isUri(target)) {
        return equalsIgnoreCase(target.scheme, scheme);
    }
    else {
        return startsWithIgnoreCase(target, scheme + ':');
    }
}
export function matchesSomeScheme(target, ...schemes) {
    return schemes.some((scheme) => matchesScheme(target, scheme));
}
export const connectionTokenCookieName = 'vscode-tkn';
export const connectionTokenQueryName = 'tkn';
class RemoteAuthoritiesImpl {
    constructor() {
        this._hosts = Object.create(null);
        this._ports = Object.create(null);
        this._connectionTokens = Object.create(null);
        this._preferredWebSchema = 'http';
        this._delegate = null;
        this._serverRootPath = '/';
    }
    setPreferredWebSchema(schema) {
        this._preferredWebSchema = schema;
    }
    setDelegate(delegate) {
        this._delegate = delegate;
    }
    setServerRootPath(product, serverBasePath) {
        this._serverRootPath = paths.posix.join(serverBasePath ?? '/', getServerProductSegment(product));
    }
    getServerRootPath() {
        return this._serverRootPath;
    }
    get _remoteResourcesPath() {
        return paths.posix.join(this._serverRootPath, Schemas.vscodeRemoteResource);
    }
    set(authority, host, port) {
        this._hosts[authority] = host;
        this._ports[authority] = port;
    }
    setConnectionToken(authority, connectionToken) {
        this._connectionTokens[authority] = connectionToken;
    }
    getPreferredWebSchema() {
        return this._preferredWebSchema;
    }
    rewrite(uri) {
        if (this._delegate) {
            try {
                return this._delegate(uri);
            }
            catch (err) {
                errors.onUnexpectedError(err);
                return uri;
            }
        }
        const authority = uri.authority;
        let host = this._hosts[authority];
        if (host && host.indexOf(':') !== -1 && host.indexOf('[') === -1) {
            host = `[${host}]`;
        }
        const port = this._ports[authority];
        const connectionToken = this._connectionTokens[authority];
        let query = `path=${encodeURIComponent(uri.path)}`;
        if (typeof connectionToken === 'string') {
            query += `&${connectionTokenQueryName}=${encodeURIComponent(connectionToken)}`;
        }
        return URI.from({
            scheme: platform.isWeb ? this._preferredWebSchema : Schemas.vscodeRemoteResource,
            authority: `${host}:${port}`,
            path: this._remoteResourcesPath,
            query,
        });
    }
}
export const RemoteAuthorities = new RemoteAuthoritiesImpl();
export function getServerProductSegment(product) {
    return `${product.quality ?? 'oss'}-${product.commit ?? 'dev'}`;
}
export const builtinExtensionsPath = 'vs/../../extensions';
export const nodeModulesPath = 'vs/../../node_modules';
export const nodeModulesAsarPath = 'vs/../../node_modules.asar';
export const nodeModulesAsarUnpackedPath = 'vs/../../node_modules.asar.unpacked';
export const VSCODE_AUTHORITY = 'vscode-app';
class FileAccessImpl {
    static { this.FALLBACK_AUTHORITY = VSCODE_AUTHORITY; }
    /**
     * Returns a URI to use in contexts where the browser is responsible
     * for loading (e.g. fetch()) or when used within the DOM.
     *
     * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
     */
    asBrowserUri(resourcePath) {
        const uri = this.toUri(resourcePath);
        return this.uriToBrowserUri(uri);
    }
    /**
     * Returns a URI to use in contexts where the browser is responsible
     * for loading (e.g. fetch()) or when used within the DOM.
     *
     * **Note:** use `dom.ts#asCSSUrl` whenever the URL is to be used in CSS context.
     */
    uriToBrowserUri(uri) {
        // Handle remote URIs via `RemoteAuthorities`
        if (uri.scheme === Schemas.vscodeRemote) {
            return RemoteAuthorities.rewrite(uri);
        }
        // Convert to `vscode-file` resource..
        if (
        // ...only ever for `file` resources
        uri.scheme === Schemas.file &&
            // ...and we run in native environments
            (platform.isNative ||
                // ...or web worker extensions on desktop
                platform.webWorkerOrigin ===
                    `${Schemas.vscodeFileResource}://${FileAccessImpl.FALLBACK_AUTHORITY}`)) {
            return uri.with({
                scheme: Schemas.vscodeFileResource,
                // We need to provide an authority here so that it can serve
                // as origin for network and loading matters in chromium.
                // If the URI is not coming with an authority already, we
                // add our own
                authority: uri.authority || FileAccessImpl.FALLBACK_AUTHORITY,
                query: null,
                fragment: null,
            });
        }
        return uri;
    }
    /**
     * Returns the `file` URI to use in contexts where node.js
     * is responsible for loading.
     */
    asFileUri(resourcePath) {
        const uri = this.toUri(resourcePath);
        return this.uriToFileUri(uri);
    }
    /**
     * Returns the `file` URI to use in contexts where node.js
     * is responsible for loading.
     */
    uriToFileUri(uri) {
        // Only convert the URI if it is `vscode-file:` scheme
        if (uri.scheme === Schemas.vscodeFileResource) {
            return uri.with({
                scheme: Schemas.file,
                // Only preserve the `authority` if it is different from
                // our fallback authority. This ensures we properly preserve
                // Windows UNC paths that come with their own authority.
                authority: uri.authority !== FileAccessImpl.FALLBACK_AUTHORITY ? uri.authority : null,
                query: null,
                fragment: null,
            });
        }
        return uri;
    }
    toUri(uriOrModule) {
        if (URI.isUri(uriOrModule)) {
            return uriOrModule;
        }
        if (globalThis._VSCODE_FILE_ROOT) {
            const rootUriOrPath = globalThis._VSCODE_FILE_ROOT;
            // File URL (with scheme)
            if (/^\w[\w\d+.-]*:\/\//.test(rootUriOrPath)) {
                return URI.joinPath(URI.parse(rootUriOrPath, true), uriOrModule);
            }
            // File Path (no scheme)
            const modulePath = paths.join(rootUriOrPath, uriOrModule);
            return URI.file(modulePath);
        }
        throw new Error('Cannot determine URI for module id!');
    }
}
export const FileAccess = new FileAccessImpl();
export const CacheControlheaders = Object.freeze({
    'Cache-Control': 'no-cache, no-store',
});
export const DocumentPolicyheaders = Object.freeze({
    'Document-Policy': 'include-js-call-stacks-in-crash-reports',
});
export var COI;
(function (COI) {
    const coiHeaders = new Map([
        ['1', { 'Cross-Origin-Opener-Policy': 'same-origin' }],
        ['2', { 'Cross-Origin-Embedder-Policy': 'require-corp' }],
        [
            '3',
            {
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'require-corp',
            },
        ],
    ]);
    COI.CoopAndCoep = Object.freeze(coiHeaders.get('3'));
    const coiSearchParamName = 'vscode-coi';
    /**
     * Extract desired headers from `vscode-coi` invocation
     */
    function getHeadersFromQuery(url) {
        let params;
        if (typeof url === 'string') {
            params = new URL(url).searchParams;
        }
        else if (url instanceof URL) {
            params = url.searchParams;
        }
        else if (URI.isUri(url)) {
            params = new URL(url.toString(true)).searchParams;
        }
        const value = params?.get(coiSearchParamName);
        if (!value) {
            return undefined;
        }
        return coiHeaders.get(value);
    }
    COI.getHeadersFromQuery = getHeadersFromQuery;
    /**
     * Add the `vscode-coi` query attribute based on wanting `COOP` and `COEP`. Will be a noop when `crossOriginIsolated`
     * isn't enabled the current context
     */
    function addSearchParam(urlOrSearch, coop, coep) {
        if (!globalThis.crossOriginIsolated) {
            // depends on the current context being COI
            return;
        }
        const value = coop && coep ? '3' : coep ? '2' : '1';
        if (urlOrSearch instanceof URLSearchParams) {
            urlOrSearch.set(coiSearchParamName, value);
        }
        else {
            ;
            urlOrSearch[coiSearchParamName] = value;
        }
    }
    COI.addSearchParam = addSearchParam;
})(COI || (COI = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vbmV0d29yay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssTUFBTSxNQUFNLGFBQWEsQ0FBQTtBQUNyQyxPQUFPLEtBQUssUUFBUSxNQUFNLGVBQWUsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLFVBQVUsQ0FBQTtBQUM5QixPQUFPLEtBQUssS0FBSyxNQUFNLFdBQVcsQ0FBQTtBQUVsQyxNQUFNLEtBQVcsT0FBTyxDQWlJdkI7QUFqSUQsV0FBaUIsT0FBTztJQUN2Qjs7O09BR0c7SUFDVSxnQkFBUSxHQUFHLFVBQVUsQ0FBQTtJQUVsQzs7T0FFRztJQUNVLGNBQU0sR0FBRyxRQUFRLENBQUE7SUFFOUI7O09BRUc7SUFDVSxnQkFBUSxHQUFHLFNBQVMsQ0FBQTtJQUVqQzs7T0FFRztJQUNVLG1CQUFXLEdBQUcsYUFBYSxDQUFBO0lBRXhDOztPQUVHO0lBQ1UsMEJBQWtCLEdBQUcsb0JBQW9CLENBQUE7SUFFekMsWUFBSSxHQUFHLE1BQU0sQ0FBQTtJQUViLGFBQUssR0FBRyxPQUFPLENBQUE7SUFFZixZQUFJLEdBQUcsTUFBTSxDQUFBO0lBRWIsY0FBTSxHQUFHLFFBQVEsQ0FBQTtJQUVqQixnQkFBUSxHQUFHLFVBQVUsQ0FBQTtJQUVyQixZQUFJLEdBQUcsTUFBTSxDQUFBO0lBRWIsZUFBTyxHQUFHLFNBQVMsQ0FBQTtJQUVuQixvQkFBWSxHQUFHLGVBQWUsQ0FBQTtJQUU5Qiw0QkFBb0IsR0FBRyx3QkFBd0IsQ0FBQTtJQUUvQyxtQ0FBMkIsR0FBRyxnQ0FBZ0MsQ0FBQTtJQUU5RCxzQkFBYyxHQUFHLGlCQUFpQixDQUFBO0lBRWxDLDBCQUFrQixHQUFHLHNCQUFzQixDQUFBO0lBRTNDLDBCQUFrQixHQUFHLHNCQUFzQixDQUFBO0lBQzNDLGtDQUEwQixHQUFHLCtCQUErQixDQUFBO0lBQzVELHNDQUE4QixHQUFHLG9DQUFvQyxDQUFBO0lBQ3JFLGdDQUF3QixHQUFHLDZCQUE2QixDQUFBO0lBQ3hELG9DQUE0QixHQUFHLGtDQUFrQyxDQUFBO0lBQ2pFLDhCQUFzQixHQUFHLDBCQUEwQixDQUFBO0lBQ25ELDhCQUFzQixHQUFHLDBCQUEwQixDQUFBO0lBRW5ELHNCQUFjLEdBQUcsaUJBQWlCLENBQUE7SUFFbEMsNEJBQW9CLEdBQUcsd0JBQXdCLENBQUE7SUFFL0Msc0JBQWMsR0FBRyxpQkFBaUIsQ0FBQTtJQUUvQywyQ0FBMkM7SUFDOUIsMkJBQW1CLEdBQUcsd0JBQXdCLENBQUE7SUFFM0QscUVBQXFFO0lBQ3hELGtDQUEwQixHQUFHLGdDQUFnQyxDQUFBO0lBRTFFLDZDQUE2QztJQUNoQywwQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQTtJQUV0RDs7T0FFRztJQUNVLG9CQUFZLEdBQUcsZUFBZSxDQUFBO0lBRTNDOztPQUVHO0lBQ1UscUJBQWEsR0FBRyxnQkFBZ0IsQ0FBQTtJQUU3Qzs7T0FFRztJQUNVLGlCQUFTLEdBQUcsV0FBVyxDQUFBO0lBRXBDOzs7T0FHRztJQUNVLDBCQUFrQixHQUFHLGFBQWEsQ0FBQTtJQUUvQzs7T0FFRztJQUNVLFdBQUcsR0FBRyxLQUFLLENBQUE7SUFFeEI7O09BRUc7SUFDVSxZQUFJLEdBQUcsTUFBTSxDQUFBO0lBRTFCOztPQUVHO0lBQ1UsMkJBQW1CLEdBQUcsWUFBWSxDQUFBO0lBRS9DOztPQUVHO0lBQ1UscUJBQWEsR0FBRyxTQUFTLENBQUE7SUFFdEM7O09BRUc7SUFDVSxtQkFBVyxHQUFHLGNBQWMsQ0FBQTtJQUV6Qzs7T0FFRztJQUNVLHFCQUFhLEdBQUcsUUFBUSxDQUFBO0lBRXJDOztPQUVHO0lBQ1Usc0JBQWMsR0FBRyxpQkFBaUIsQ0FBQTtBQUNoRCxDQUFDLEVBaklnQixPQUFPLEtBQVAsT0FBTyxRQWlJdkI7QUFFRCxNQUFNLFVBQVUsYUFBYSxDQUFDLE1BQW9CLEVBQUUsTUFBYztJQUNqRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztRQUN2QixPQUFPLGdCQUFnQixDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDL0MsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUE7SUFDbEQsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsTUFBb0IsRUFBRSxHQUFHLE9BQWlCO0lBQzNFLE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO0FBQy9ELENBQUM7QUFFRCxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxZQUFZLENBQUE7QUFDckQsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQUcsS0FBSyxDQUFBO0FBRTdDLE1BQU0scUJBQXFCO0lBQTNCO1FBQ2tCLFdBQU0sR0FBZ0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6RSxXQUFNLEdBQWdELE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekUsc0JBQWlCLEdBQ2pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDWix3QkFBbUIsR0FBcUIsTUFBTSxDQUFBO1FBQzlDLGNBQVMsR0FBK0IsSUFBSSxDQUFBO1FBQzVDLG9CQUFlLEdBQVcsR0FBRyxDQUFBO0lBaUV0QyxDQUFDO0lBL0RBLHFCQUFxQixDQUFDLE1BQXdCO1FBQzdDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxNQUFNLENBQUE7SUFDbEMsQ0FBQztJQUVELFdBQVcsQ0FBQyxRQUEyQjtRQUN0QyxJQUFJLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQTtJQUMxQixDQUFDO0lBRUQsaUJBQWlCLENBQ2hCLE9BQThDLEVBQzlDLGNBQWtDO1FBRWxDLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsY0FBYyxJQUFJLEdBQUcsRUFBRSx1QkFBdUIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFFRCxpQkFBaUI7UUFDaEIsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFRCxJQUFZLG9CQUFvQjtRQUMvQixPQUFPLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsT0FBTyxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVELEdBQUcsQ0FBQyxTQUFpQixFQUFFLElBQVksRUFBRSxJQUFZO1FBQ2hELElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQzdCLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQzlCLENBQUM7SUFFRCxrQkFBa0IsQ0FBQyxTQUFpQixFQUFFLGVBQXVCO1FBQzVELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxlQUFlLENBQUE7SUFDcEQsQ0FBQztJQUVELHFCQUFxQjtRQUNwQixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQVE7UUFDZixJQUFJLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUM7Z0JBQ0osT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQzNCLENBQUM7WUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO2dCQUNkLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDN0IsT0FBTyxHQUFHLENBQUE7WUFDWCxDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUE7UUFDL0IsSUFBSSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqQyxJQUFJLElBQUksSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxJQUFJLEdBQUcsSUFBSSxJQUFJLEdBQUcsQ0FBQTtRQUNuQixDQUFDO1FBQ0QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDekQsSUFBSSxLQUFLLEdBQUcsUUFBUSxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQTtRQUNsRCxJQUFJLE9BQU8sZUFBZSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3pDLEtBQUssSUFBSSxJQUFJLHdCQUF3QixJQUFJLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxFQUFFLENBQUE7UUFDL0UsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztZQUNmLE1BQU0sRUFBRSxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxvQkFBb0I7WUFDaEYsU0FBUyxFQUFFLEdBQUcsSUFBSSxJQUFJLElBQUksRUFBRTtZQUM1QixJQUFJLEVBQUUsSUFBSSxDQUFDLG9CQUFvQjtZQUMvQixLQUFLO1NBQ0wsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxxQkFBcUIsRUFBRSxDQUFBO0FBRTVELE1BQU0sVUFBVSx1QkFBdUIsQ0FBQyxPQUE4QztJQUNyRixPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sSUFBSSxLQUFLLElBQUksT0FBTyxDQUFDLE1BQU0sSUFBSSxLQUFLLEVBQUUsQ0FBQTtBQUNoRSxDQUFDO0FBaUNELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFvQixxQkFBcUIsQ0FBQTtBQUMzRSxNQUFNLENBQUMsTUFBTSxlQUFlLEdBQW9CLHVCQUF1QixDQUFBO0FBQ3ZFLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFvQiw0QkFBNEIsQ0FBQTtBQUNoRixNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBb0IscUNBQXFDLENBQUE7QUFFakcsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsWUFBWSxDQUFBO0FBRTVDLE1BQU0sY0FBYzthQUNLLHVCQUFrQixHQUFHLGdCQUFnQixDQUFBO0lBRTdEOzs7OztPQUtHO0lBQ0gsWUFBWSxDQUFDLFlBQWtDO1FBQzlDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7UUFDcEMsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILGVBQWUsQ0FBQyxHQUFRO1FBQ3ZCLDZDQUE2QztRQUM3QyxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3pDLE9BQU8saUJBQWlCLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFFRCxzQ0FBc0M7UUFDdEM7UUFDQyxvQ0FBb0M7UUFDcEMsR0FBRyxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSTtZQUMzQix1Q0FBdUM7WUFDdkMsQ0FBQyxRQUFRLENBQUMsUUFBUTtnQkFDakIseUNBQXlDO2dCQUN6QyxRQUFRLENBQUMsZUFBZTtvQkFDdkIsR0FBRyxPQUFPLENBQUMsa0JBQWtCLE1BQU0sY0FBYyxDQUFDLGtCQUFrQixFQUFFLENBQUMsRUFDeEUsQ0FBQztZQUNGLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQztnQkFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjtnQkFDbEMsNERBQTREO2dCQUM1RCx5REFBeUQ7Z0JBQ3pELHlEQUF5RDtnQkFDekQsY0FBYztnQkFDZCxTQUFTLEVBQUUsR0FBRyxDQUFDLFNBQVMsSUFBSSxjQUFjLENBQUMsa0JBQWtCO2dCQUM3RCxLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFRDs7O09BR0c7SUFDSCxTQUFTLENBQUMsWUFBa0M7UUFDM0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQTtRQUNwQyxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILFlBQVksQ0FBQyxHQUFRO1FBQ3BCLHNEQUFzRDtRQUN0RCxJQUFJLEdBQUcsQ0FBQyxNQUFNLEtBQUssT0FBTyxDQUFDLGtCQUFrQixFQUFFLENBQUM7WUFDL0MsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUNmLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSTtnQkFDcEIsd0RBQXdEO2dCQUN4RCw0REFBNEQ7Z0JBQzVELHdEQUF3RDtnQkFDeEQsU0FBUyxFQUFFLEdBQUcsQ0FBQyxTQUFTLEtBQUssY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJO2dCQUNyRixLQUFLLEVBQUUsSUFBSTtnQkFDWCxRQUFRLEVBQUUsSUFBSTthQUNkLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxPQUFPLEdBQUcsQ0FBQTtJQUNYLENBQUM7SUFFTyxLQUFLLENBQUMsV0FBeUI7UUFDdEMsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7WUFDNUIsT0FBTyxXQUFXLENBQUE7UUFDbkIsQ0FBQztRQUVELElBQUksVUFBVSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDbEMsTUFBTSxhQUFhLEdBQUcsVUFBVSxDQUFDLGlCQUFpQixDQUFBO1lBRWxELHlCQUF5QjtZQUN6QixJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxPQUFPLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLEVBQUUsV0FBVyxDQUFDLENBQUE7WUFDakUsQ0FBQztZQUVELHdCQUF3QjtZQUN4QixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxXQUFXLENBQUMsQ0FBQTtZQUN6RCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDNUIsQ0FBQztRQUVELE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtJQUN2RCxDQUFDOztBQUdGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO0FBRTlDLE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUEyQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3hFLGVBQWUsRUFBRSxvQkFBb0I7Q0FDckMsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQTJCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDMUUsaUJBQWlCLEVBQUUseUNBQXlDO0NBQzVELENBQUMsQ0FBQTtBQUVGLE1BQU0sS0FBVyxHQUFHLENBd0RuQjtBQXhERCxXQUFpQixHQUFHO0lBQ25CLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUFtRDtRQUM1RSxDQUFDLEdBQUcsRUFBRSxFQUFFLDRCQUE0QixFQUFFLGFBQWEsRUFBRSxDQUFDO1FBQ3RELENBQUMsR0FBRyxFQUFFLEVBQUUsOEJBQThCLEVBQUUsY0FBYyxFQUFFLENBQUM7UUFDekQ7WUFDQyxHQUFHO1lBQ0g7Z0JBQ0MsNEJBQTRCLEVBQUUsYUFBYTtnQkFDM0MsOEJBQThCLEVBQUUsY0FBYzthQUM5QztTQUNEO0tBQ0QsQ0FBQyxDQUFBO0lBRVcsZUFBVyxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBRTdELE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUFBO0lBRXZDOztPQUVHO0lBQ0gsU0FBZ0IsbUJBQW1CLENBQUMsR0FBdUI7UUFDMUQsSUFBSSxNQUFtQyxDQUFBO1FBQ3ZDLElBQUksT0FBTyxHQUFHLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDN0IsTUFBTSxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksQ0FBQTtRQUNuQyxDQUFDO2FBQU0sSUFBSSxHQUFHLFlBQVksR0FBRyxFQUFFLENBQUM7WUFDL0IsTUFBTSxHQUFHLEdBQUcsQ0FBQyxZQUFZLENBQUE7UUFDMUIsQ0FBQzthQUFNLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLE1BQU0sR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO1FBQ2xELENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxNQUFNLEVBQUUsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDN0MsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sVUFBVSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBZGUsdUJBQW1CLHNCQWNsQyxDQUFBO0lBRUQ7OztPQUdHO0lBQ0gsU0FBZ0IsY0FBYyxDQUM3QixXQUFxRCxFQUNyRCxJQUFhLEVBQ2IsSUFBYTtRQUViLElBQUksQ0FBTyxVQUFXLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztZQUM1QywyQ0FBMkM7WUFDM0MsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDbkQsSUFBSSxXQUFXLFlBQVksZUFBZSxFQUFFLENBQUM7WUFDNUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMzQyxDQUFDO2FBQU0sQ0FBQztZQUNQLENBQUM7WUFBeUIsV0FBWSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsS0FBSyxDQUFBO1FBQ25FLENBQUM7SUFDRixDQUFDO0lBZmUsa0JBQWMsaUJBZTdCLENBQUE7QUFDRixDQUFDLEVBeERnQixHQUFHLEtBQUgsR0FBRyxRQXdEbkIifQ==