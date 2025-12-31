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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmV0d29yay5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL25ldHdvcmsudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxhQUFhLENBQUE7QUFDckMsT0FBTyxLQUFLLFFBQVEsTUFBTSxlQUFlLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG9CQUFvQixFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDOUIsT0FBTyxLQUFLLEtBQUssTUFBTSxXQUFXLENBQUE7QUFFbEMsTUFBTSxLQUFXLE9BQU8sQ0FpSXZCO0FBaklELFdBQWlCLE9BQU87SUFDdkI7OztPQUdHO0lBQ1UsZ0JBQVEsR0FBRyxVQUFVLENBQUE7SUFFbEM7O09BRUc7SUFDVSxjQUFNLEdBQUcsUUFBUSxDQUFBO0lBRTlCOztPQUVHO0lBQ1UsZ0JBQVEsR0FBRyxTQUFTLENBQUE7SUFFakM7O09BRUc7SUFDVSxtQkFBVyxHQUFHLGFBQWEsQ0FBQTtJQUV4Qzs7T0FFRztJQUNVLDBCQUFrQixHQUFHLG9CQUFvQixDQUFBO0lBRXpDLFlBQUksR0FBRyxNQUFNLENBQUE7SUFFYixhQUFLLEdBQUcsT0FBTyxDQUFBO0lBRWYsWUFBSSxHQUFHLE1BQU0sQ0FBQTtJQUViLGNBQU0sR0FBRyxRQUFRLENBQUE7SUFFakIsZ0JBQVEsR0FBRyxVQUFVLENBQUE7SUFFckIsWUFBSSxHQUFHLE1BQU0sQ0FBQTtJQUViLGVBQU8sR0FBRyxTQUFTLENBQUE7SUFFbkIsb0JBQVksR0FBRyxlQUFlLENBQUE7SUFFOUIsNEJBQW9CLEdBQUcsd0JBQXdCLENBQUE7SUFFL0MsbUNBQTJCLEdBQUcsZ0NBQWdDLENBQUE7SUFFOUQsc0JBQWMsR0FBRyxpQkFB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