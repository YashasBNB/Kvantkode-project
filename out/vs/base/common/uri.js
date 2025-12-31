/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as paths from './path.js';
import { isWindows } from './platform.js';
const _schemePattern = /^\w[\w\d+.-]*$/;
const _singleSlashStart = /^\//;
const _doubleSlashStart = /^\/\//;
function _validateUri(ret, _strict) {
    // scheme, must be set
    if (!ret.scheme && _strict) {
        throw new Error(`[UriError]: Scheme is missing: {scheme: "", authority: "${ret.authority}", path: "${ret.path}", query: "${ret.query}", fragment: "${ret.fragment}"}`);
    }
    // scheme, https://tools.ietf.org/html/rfc3986#section-3.1
    // ALPHA *( ALPHA / DIGIT / "+" / "-" / "." )
    if (ret.scheme && !_schemePattern.test(ret.scheme)) {
        throw new Error('[UriError]: Scheme contains illegal characters.');
    }
    // path, http://tools.ietf.org/html/rfc3986#section-3.3
    // If a URI contains an authority component, then the path component
    // must either be empty or begin with a slash ("/") character.  If a URI
    // does not contain an authority component, then the path cannot begin
    // with two slash characters ("//").
    if (ret.path) {
        if (ret.authority) {
            if (!_singleSlashStart.test(ret.path)) {
                throw new Error('[UriError]: If a URI contains an authority component, then the path component must either be empty or begin with a slash ("/") character');
            }
        }
        else {
            if (_doubleSlashStart.test(ret.path)) {
                throw new Error('[UriError]: If a URI does not contain an authority component, then the path cannot begin with two slash characters ("//")');
            }
        }
    }
}
// for a while we allowed uris *without* schemes and this is the migration
// for them, e.g. an uri without scheme and without strict-mode warns and falls
// back to the file-scheme. that should cause the least carnage and still be a
// clear warning
function _schemeFix(scheme, _strict) {
    if (!scheme && !_strict) {
        return 'file';
    }
    return scheme;
}
// implements a bit of https://tools.ietf.org/html/rfc3986#section-5
function _referenceResolution(scheme, path) {
    // the slash-character is our 'default base' as we don't
    // support constructing URIs relative to other URIs. This
    // also means that we alter and potentially break paths.
    // see https://tools.ietf.org/html/rfc3986#section-5.1.4
    switch (scheme) {
        case 'https':
        case 'http':
        case 'file':
            if (!path) {
                path = _slash;
            }
            else if (path[0] !== _slash) {
                path = _slash + path;
            }
            break;
    }
    return path;
}
const _empty = '';
const _slash = '/';
const _regexp = /^(([^:/?#]+?):)?(\/\/([^/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?/;
/**
 * Uniform Resource Identifier (URI) http://tools.ietf.org/html/rfc3986.
 * This class is a simple parser which creates the basic component parts
 * (http://tools.ietf.org/html/rfc3986#section-3) with minimal validation
 * and encoding.
 *
 * ```txt
 *       foo://example.com:8042/over/there?name=ferret#nose
 *       \_/   \______________/\_________/ \_________/ \__/
 *        |           |            |            |        |
 *     scheme     authority       path        query   fragment
 *        |   _____________________|__
 *       / \ /                        \
 *       urn:example:animal:ferret:nose
 * ```
 */
export class URI {
    static isUri(thing) {
        if (thing instanceof URI) {
            return true;
        }
        if (!thing) {
            return false;
        }
        return (typeof thing.authority === 'string' &&
            typeof thing.fragment === 'string' &&
            typeof thing.path === 'string' &&
            typeof thing.query === 'string' &&
            typeof thing.scheme === 'string' &&
            typeof thing.fsPath === 'string' &&
            typeof thing.with === 'function' &&
            typeof thing.toString === 'function');
    }
    /**
     * @internal
     */
    constructor(schemeOrData, authority, path, query, fragment, _strict = false) {
        if (typeof schemeOrData === 'object') {
            this.scheme = schemeOrData.scheme || _empty;
            this.authority = schemeOrData.authority || _empty;
            this.path = schemeOrData.path || _empty;
            this.query = schemeOrData.query || _empty;
            this.fragment = schemeOrData.fragment || _empty;
            // no validation because it's this URI
            // that creates uri components.
            // _validateUri(this);
        }
        else {
            this.scheme = _schemeFix(schemeOrData, _strict);
            this.authority = authority || _empty;
            this.path = _referenceResolution(this.scheme, path || _empty);
            this.query = query || _empty;
            this.fragment = fragment || _empty;
            _validateUri(this, _strict);
        }
    }
    // ---- filesystem path -----------------------
    /**
     * Returns a string representing the corresponding file system path of this URI.
     * Will handle UNC paths, normalizes windows drive letters to lower-case, and uses the
     * platform specific path separator.
     *
     * * Will *not* validate the path for invalid characters and semantics.
     * * Will *not* look at the scheme of this URI.
     * * The result shall *not* be used for display purposes but for accessing a file on disk.
     *
     *
     * The *difference* to `URI#path` is the use of the platform specific separator and the handling
     * of UNC paths. See the below sample of a file-uri with an authority (UNC path).
     *
     * ```ts
        const u = URI.parse('file://server/c$/folder/file.txt')
        u.authority === 'server'
        u.path === '/shares/c$/file.txt'
        u.fsPath === '\\server\c$\folder\file.txt'
    ```
     *
     * Using `URI#path` to read a file (using fs-apis) would not be enough because parts of the path,
     * namely the server name, would be missing. Therefore `URI#fsPath` exists - it's sugar to ease working
     * with URIs that represent files on disk (`file` scheme).
     */
    get fsPath() {
        // if (this.scheme !== 'file') {
        // 	console.warn(`[UriError] calling fsPath with scheme ${this.scheme}`);
        // }
        return uriToFsPath(this, false);
    }
    // ---- modify to new -------------------------
    with(change) {
        if (!change) {
            return this;
        }
        let { scheme, authority, path, query, fragment } = change;
        if (scheme === undefined) {
            scheme = this.scheme;
        }
        else if (scheme === null) {
            scheme = _empty;
        }
        if (authority === undefined) {
            authority = this.authority;
        }
        else if (authority === null) {
            authority = _empty;
        }
        if (path === undefined) {
            path = this.path;
        }
        else if (path === null) {
            path = _empty;
        }
        if (query === undefined) {
            query = this.query;
        }
        else if (query === null) {
            query = _empty;
        }
        if (fragment === undefined) {
            fragment = this.fragment;
        }
        else if (fragment === null) {
            fragment = _empty;
        }
        if (scheme === this.scheme &&
            authority === this.authority &&
            path === this.path &&
            query === this.query &&
            fragment === this.fragment) {
            return this;
        }
        return new Uri(scheme, authority, path, query, fragment);
    }
    // ---- parse & validate ------------------------
    /**
     * Creates a new URI from a string, e.g. `http://www.example.com/some/path`,
     * `file:///usr/home`, or `scheme:with/path`.
     *
     * @param value A string which represents an URI (see `URI#toString`).
     */
    static parse(value, _strict = false) {
        const match = _regexp.exec(value);
        if (!match) {
            return new Uri(_empty, _empty, _empty, _empty, _empty);
        }
        return new Uri(match[2] || _empty, percentDecode(match[4] || _empty), percentDecode(match[5] || _empty), percentDecode(match[7] || _empty), percentDecode(match[9] || _empty), _strict);
    }
    /**
     * Creates a new URI from a file system path, e.g. `c:\my\files`,
     * `/usr/home`, or `\\server\share\some\path`.
     *
     * The *difference* between `URI#parse` and `URI#file` is that the latter treats the argument
     * as path, not as stringified-uri. E.g. `URI.file(path)` is **not the same as**
     * `URI.parse('file://' + path)` because the path might contain characters that are
     * interpreted (# and ?). See the following sample:
     * ```ts
    const good = URI.file('/coding/c#/project1');
    good.scheme === 'file';
    good.path === '/coding/c#/project1';
    good.fragment === '';
    const bad = URI.parse('file://' + '/coding/c#/project1');
    bad.scheme === 'file';
    bad.path === '/coding/c'; // path is now broken
    bad.fragment === '/project1';
    ```
     *
     * @param path A file system path (see `URI#fsPath`)
     */
    static file(path) {
        let authority = _empty;
        // normalize to fwd-slashes on windows,
        // on other systems bwd-slashes are valid
        // filename character, eg /f\oo/ba\r.txt
        if (isWindows) {
            path = path.replace(/\\/g, _slash);
        }
        // check for authority as used in UNC shares
        // or use the path as given
        if (path[0] === _slash && path[1] === _slash) {
            const idx = path.indexOf(_slash, 2);
            if (idx === -1) {
                authority = path.substring(2);
                path = _slash;
            }
            else {
                authority = path.substring(2, idx);
                path = path.substring(idx) || _slash;
            }
        }
        return new Uri('file', authority, path, _empty, _empty);
    }
    /**
     * Creates new URI from uri components.
     *
     * Unless `strict` is `true` the scheme is defaults to be `file`. This function performs
     * validation and should be used for untrusted uri components retrieved from storage,
     * user input, command arguments etc
     */
    static from(components, strict) {
        const result = new Uri(components.scheme, components.authority, components.path, components.query, components.fragment, strict);
        return result;
    }
    /**
     * Join a URI path with path fragments and normalizes the resulting path.
     *
     * @param uri The input URI.
     * @param pathFragment The path fragment to add to the URI path.
     * @returns The resulting URI.
     */
    static joinPath(uri, ...pathFragment) {
        if (!uri.path) {
            throw new Error(`[UriError]: cannot call joinPath on URI without path`);
        }
        let newPath;
        if (isWindows && uri.scheme === 'file') {
            newPath = URI.file(paths.win32.join(uriToFsPath(uri, true), ...pathFragment)).path;
        }
        else {
            newPath = paths.posix.join(uri.path, ...pathFragment);
        }
        return uri.with({ path: newPath });
    }
    // ---- printing/externalize ---------------------------
    /**
     * Creates a string representation for this URI. It's guaranteed that calling
     * `URI.parse` with the result of this function creates an URI which is equal
     * to this URI.
     *
     * * The result shall *not* be used for display purposes but for externalization or transport.
     * * The result will be encoded using the percentage encoding and encoding happens mostly
     * ignore the scheme-specific encoding rules.
     *
     * @param skipEncoding Do not encode the result, default is `false`
     */
    toString(skipEncoding = false) {
        return _asFormatted(this, skipEncoding);
    }
    toJSON() {
        return this;
    }
    static revive(data) {
        if (!data) {
            return data;
        }
        else if (data instanceof URI) {
            return data;
        }
        else {
            const result = new Uri(data);
            result._formatted = data.external ?? null;
            result._fsPath =
                data._sep === _pathSepMarker ? (data.fsPath ?? null) : null;
            return result;
        }
    }
    [Symbol.for('debug.description')]() {
        return `URI(${this.toString()})`;
    }
}
export function isUriComponents(thing) {
    if (!thing || typeof thing !== 'object') {
        return false;
    }
    return (typeof thing.scheme === 'string' &&
        (typeof thing.authority === 'string' ||
            typeof thing.authority === 'undefined') &&
        (typeof thing.path === 'string' ||
            typeof thing.path === 'undefined') &&
        (typeof thing.query === 'string' ||
            typeof thing.query === 'undefined') &&
        (typeof thing.fragment === 'string' ||
            typeof thing.fragment === 'undefined'));
}
const _pathSepMarker = isWindows ? 1 : undefined;
// This class exists so that URI is compatible with vscode.Uri (API).
class Uri extends URI {
    constructor() {
        super(...arguments);
        this._formatted = null;
        this._fsPath = null;
    }
    get fsPath() {
        if (!this._fsPath) {
            this._fsPath = uriToFsPath(this, false);
        }
        return this._fsPath;
    }
    toString(skipEncoding = false) {
        if (!skipEncoding) {
            if (!this._formatted) {
                this._formatted = _asFormatted(this, false);
            }
            return this._formatted;
        }
        else {
            // we don't cache that
            return _asFormatted(this, true);
        }
    }
    toJSON() {
        // eslint-disable-next-line local/code-no-dangerous-type-assertions
        const res = {
            $mid: 1 /* MarshalledId.Uri */,
        };
        // cached state
        if (this._fsPath) {
            res.fsPath = this._fsPath;
            res._sep = _pathSepMarker;
        }
        if (this._formatted) {
            res.external = this._formatted;
        }
        //--- uri components
        if (this.path) {
            res.path = this.path;
        }
        // TODO
        // this isn't correct and can violate the UriComponents contract but
        // this is part of the vscode.Uri API and we shouldn't change how that
        // works anymore
        if (this.scheme) {
            res.scheme = this.scheme;
        }
        if (this.authority) {
            res.authority = this.authority;
        }
        if (this.query) {
            res.query = this.query;
        }
        if (this.fragment) {
            res.fragment = this.fragment;
        }
        return res;
    }
}
// reserved characters: https://tools.ietf.org/html/rfc3986#section-2.2
const encodeTable = {
    [58 /* CharCode.Colon */]: '%3A', // gen-delims
    [47 /* CharCode.Slash */]: '%2F',
    [63 /* CharCode.QuestionMark */]: '%3F',
    [35 /* CharCode.Hash */]: '%23',
    [91 /* CharCode.OpenSquareBracket */]: '%5B',
    [93 /* CharCode.CloseSquareBracket */]: '%5D',
    [64 /* CharCode.AtSign */]: '%40',
    [33 /* CharCode.ExclamationMark */]: '%21', // sub-delims
    [36 /* CharCode.DollarSign */]: '%24',
    [38 /* CharCode.Ampersand */]: '%26',
    [39 /* CharCode.SingleQuote */]: '%27',
    [40 /* CharCode.OpenParen */]: '%28',
    [41 /* CharCode.CloseParen */]: '%29',
    [42 /* CharCode.Asterisk */]: '%2A',
    [43 /* CharCode.Plus */]: '%2B',
    [44 /* CharCode.Comma */]: '%2C',
    [59 /* CharCode.Semicolon */]: '%3B',
    [61 /* CharCode.Equals */]: '%3D',
    [32 /* CharCode.Space */]: '%20',
};
function encodeURIComponentFast(uriComponent, isPath, isAuthority) {
    let res = undefined;
    let nativeEncodePos = -1;
    for (let pos = 0; pos < uriComponent.length; pos++) {
        const code = uriComponent.charCodeAt(pos);
        // unreserved characters: https://tools.ietf.org/html/rfc3986#section-2.3
        if ((code >= 97 /* CharCode.a */ && code <= 122 /* CharCode.z */) ||
            (code >= 65 /* CharCode.A */ && code <= 90 /* CharCode.Z */) ||
            (code >= 48 /* CharCode.Digit0 */ && code <= 57 /* CharCode.Digit9 */) ||
            code === 45 /* CharCode.Dash */ ||
            code === 46 /* CharCode.Period */ ||
            code === 95 /* CharCode.Underline */ ||
            code === 126 /* CharCode.Tilde */ ||
            (isPath && code === 47 /* CharCode.Slash */) ||
            (isAuthority && code === 91 /* CharCode.OpenSquareBracket */) ||
            (isAuthority && code === 93 /* CharCode.CloseSquareBracket */) ||
            (isAuthority && code === 58 /* CharCode.Colon */)) {
            // check if we are delaying native encode
            if (nativeEncodePos !== -1) {
                res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
                nativeEncodePos = -1;
            }
            // check if we write into a new string (by default we try to return the param)
            if (res !== undefined) {
                res += uriComponent.charAt(pos);
            }
        }
        else {
            // encoding needed, we need to allocate a new string
            if (res === undefined) {
                res = uriComponent.substr(0, pos);
            }
            // check with default table first
            const escaped = encodeTable[code];
            if (escaped !== undefined) {
                // check if we are delaying native encode
                if (nativeEncodePos !== -1) {
                    res += encodeURIComponent(uriComponent.substring(nativeEncodePos, pos));
                    nativeEncodePos = -1;
                }
                // append escaped variant to result
                res += escaped;
            }
            else if (nativeEncodePos === -1) {
                // use native encode only when needed
                nativeEncodePos = pos;
            }
        }
    }
    if (nativeEncodePos !== -1) {
        res += encodeURIComponent(uriComponent.substring(nativeEncodePos));
    }
    return res !== undefined ? res : uriComponent;
}
function encodeURIComponentMinimal(path) {
    let res = undefined;
    for (let pos = 0; pos < path.length; pos++) {
        const code = path.charCodeAt(pos);
        if (code === 35 /* CharCode.Hash */ || code === 63 /* CharCode.QuestionMark */) {
            if (res === undefined) {
                res = path.substr(0, pos);
            }
            res += encodeTable[code];
        }
        else {
            if (res !== undefined) {
                res += path[pos];
            }
        }
    }
    return res !== undefined ? res : path;
}
/**
 * Compute `fsPath` for the given uri
 */
export function uriToFsPath(uri, keepDriveLetterCasing) {
    let value;
    if (uri.authority && uri.path.length > 1 && uri.scheme === 'file') {
        // unc path: file://shares/c$/far/boo
        value = `//${uri.authority}${uri.path}`;
    }
    else if (uri.path.charCodeAt(0) === 47 /* CharCode.Slash */ &&
        ((uri.path.charCodeAt(1) >= 65 /* CharCode.A */ && uri.path.charCodeAt(1) <= 90 /* CharCode.Z */) ||
            (uri.path.charCodeAt(1) >= 97 /* CharCode.a */ && uri.path.charCodeAt(1) <= 122 /* CharCode.z */)) &&
        uri.path.charCodeAt(2) === 58 /* CharCode.Colon */) {
        if (!keepDriveLetterCasing) {
            // windows drive letter: file:///c:/far/boo
            value = uri.path[1].toLowerCase() + uri.path.substr(2);
        }
        else {
            value = uri.path.substr(1);
        }
    }
    else {
        // other path
        value = uri.path;
    }
    if (isWindows) {
        value = value.replace(/\//g, '\\');
    }
    return value;
}
/**
 * Create the external version of a uri
 */
function _asFormatted(uri, skipEncoding) {
    const encoder = !skipEncoding ? encodeURIComponentFast : encodeURIComponentMinimal;
    let res = '';
    let { scheme, authority, path, query, fragment } = uri;
    if (scheme) {
        res += scheme;
        res += ':';
    }
    if (authority || scheme === 'file') {
        res += _slash;
        res += _slash;
    }
    if (authority) {
        let idx = authority.indexOf('@');
        if (idx !== -1) {
            // <user>@<auth>
            const userinfo = authority.substr(0, idx);
            authority = authority.substr(idx + 1);
            idx = userinfo.lastIndexOf(':');
            if (idx === -1) {
                res += encoder(userinfo, false, false);
            }
            else {
                // <user>:<pass>@<auth>
                res += encoder(userinfo.substr(0, idx), false, false);
                res += ':';
                res += encoder(userinfo.substr(idx + 1), false, true);
            }
            res += '@';
        }
        authority = authority.toLowerCase();
        idx = authority.lastIndexOf(':');
        if (idx === -1) {
            res += encoder(authority, false, true);
        }
        else {
            // <auth>:<port>
            res += encoder(authority.substr(0, idx), false, true);
            res += authority.substr(idx);
        }
    }
    if (path) {
        // lower-case windows drive letters in /C:/fff or C:/fff
        if (path.length >= 3 &&
            path.charCodeAt(0) === 47 /* CharCode.Slash */ &&
            path.charCodeAt(2) === 58 /* CharCode.Colon */) {
            const code = path.charCodeAt(1);
            if (code >= 65 /* CharCode.A */ && code <= 90 /* CharCode.Z */) {
                path = `/${String.fromCharCode(code + 32)}:${path.substr(3)}`; // "/c:".length === 3
            }
        }
        else if (path.length >= 2 && path.charCodeAt(1) === 58 /* CharCode.Colon */) {
            const code = path.charCodeAt(0);
            if (code >= 65 /* CharCode.A */ && code <= 90 /* CharCode.Z */) {
                path = `${String.fromCharCode(code + 32)}:${path.substr(2)}`; // "/c:".length === 3
            }
        }
        // encode the rest of the path
        res += encoder(path, true, false);
    }
    if (query) {
        res += '?';
        res += encoder(query, false, false);
    }
    if (fragment) {
        res += '#';
        res += !skipEncoding ? encodeURIComponentFast(fragment, false, false) : fragment;
    }
    return res;
}
// --- decode
function decodeURIComponentGraceful(str) {
    try {
        return decodeURIComponent(str);
    }
    catch {
        if (str.length > 3) {
            return str.substr(0, 3) + decodeURIComponentGraceful(str.substr(3));
        }
        else {
            return str;
        }
    }
}
const _rEncodedAsHex = /(%[0-9A-Za-z][0-9A-Za-z])+/g;
function percentDecode(str) {
    if (!str.match(_rEncodedAsHex)) {
        return str;
    }
    return str.replace(_rEncodedAsHex, (match) => decodeURIComponentGraceful(match));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9jb21tb24vdXJpLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sS0FBSyxLQUFLLE1BQU0sV0FBVyxDQUFBO0FBQ2xDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFekMsTUFBTSxjQUFjLEdBQUcsZ0JBQWdCLENBQUE7QUFDdkMsTUFBTSxpQkFBaUIsR0FBRyxLQUFLLENBQUE7QUFDL0IsTUFBTSxpQkFBaUIsR0FBRyxPQUFPLENBQUE7QUFFakMsU0FBUyxZQUFZLENBQUMsR0FBUSxFQUFFLE9BQWlCO0lBQ2hELHNCQUFzQjtJQUN0QixJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUM1QixNQUFNLElBQUksS0FBSyxDQUNkLDJEQUEyRCxHQUFHLENBQUMsU0FBUyxhQUFhLEdBQUcsQ0FBQyxJQUFJLGNBQWMsR0FBRyxDQUFDLEtBQUssaUJBQWlCLEdBQUcsQ0FBQyxRQUFRLElBQUksQ0FDckosQ0FBQTtJQUNGLENBQUM7SUFFRCwwREFBMEQ7SUFDMUQsNkNBQTZDO0lBQzdDLElBQUksR0FBRyxDQUFDLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDcEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxpREFBaUQsQ0FBQyxDQUFBO0lBQ25FLENBQUM7SUFFRCx1REFBdUQ7SUFDdkQsb0VBQW9FO0lBQ3BFLHdFQUF3RTtJQUN4RSxzRUFBc0U7SUFDdEUsb0NBQW9DO0lBQ3BDLElBQUksR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBQ2QsSUFBSSxHQUFHLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLGlCQUFpQixD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