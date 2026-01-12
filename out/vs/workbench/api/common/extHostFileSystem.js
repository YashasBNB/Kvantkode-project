/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { FileChangeType } from './extHostTypes.js';
import * as typeConverter from './extHostTypeConverters.js';
import { StateMachine, LinkComputer, } from '../../../editor/common/languages/linkComputer.js';
import { commonPrefixLength } from '../../../base/common/strings.js';
import { VSBuffer } from '../../../base/common/buffer.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
import { isMarkdownString } from '../../../base/common/htmlContent.js';
class FsLinkProvider {
    constructor() {
        this._schemes = [];
    }
    add(scheme) {
        this._stateMachine = undefined;
        this._schemes.push(scheme);
    }
    delete(scheme) {
        const idx = this._schemes.indexOf(scheme);
        if (idx >= 0) {
            this._schemes.splice(idx, 1);
            this._stateMachine = undefined;
        }
    }
    _initStateMachine() {
        if (!this._stateMachine) {
            // sort and compute common prefix with previous scheme
            // then build state transitions based on the data
            const schemes = this._schemes.sort();
            const edges = [];
            let prevScheme;
            let prevState;
            let lastState = 14 /* State.LastKnownState */;
            let nextState = 14 /* State.LastKnownState */;
            for (const scheme of schemes) {
                // skip the common prefix of the prev scheme
                // and continue with its last state
                let pos = !prevScheme ? 0 : commonPrefixLength(prevScheme, scheme);
                if (pos === 0) {
                    prevState = 1 /* State.Start */;
                }
                else {
                    prevState = nextState;
                }
                for (; pos < scheme.length; pos++) {
                    // keep creating new (next) states until the
                    // end (and the BeforeColon-state) is reached
                    if (pos + 1 === scheme.length) {
                        // Save the last state here, because we need to continue for the next scheme
                        lastState = nextState;
                        nextState = 9 /* State.BeforeColon */;
                    }
                    else {
                        nextState += 1;
                    }
                    edges.push([prevState, scheme.toUpperCase().charCodeAt(pos), nextState]);
                    edges.push([prevState, scheme.toLowerCase().charCodeAt(pos), nextState]);
                    prevState = nextState;
                }
                prevScheme = scheme;
                // Restore the last state
                nextState = lastState;
            }
            // all link must match this pattern `<scheme>:/<more>`
            edges.push([9 /* State.BeforeColon */, 58 /* CharCode.Colon */, 10 /* State.AfterColon */]);
            edges.push([10 /* State.AfterColon */, 47 /* CharCode.Slash */, 12 /* State.End */]);
            this._stateMachine = new StateMachine(edges);
        }
    }
    provideDocumentLinks(document) {
        this._initStateMachine();
        const result = [];
        const links = LinkComputer.computeLinks({
            getLineContent(lineNumber) {
                return document.lineAt(lineNumber - 1).text;
            },
            getLineCount() {
                return document.lineCount;
            },
        }, this._stateMachine);
        for (const link of links) {
            const docLink = typeConverter.DocumentLink.to(link);
            if (docLink.target) {
                result.push(docLink);
            }
        }
        return result;
    }
}
export class ExtHostFileSystem {
    constructor(mainContext, _extHostLanguageFeatures) {
        this._extHostLanguageFeatures = _extHostLanguageFeatures;
        this._linkProvider = new FsLinkProvider();
        this._fsProvider = new Map();
        this._registeredSchemes = new Set();
        this._watches = new Map();
        this._handlePool = 0;
        this._proxy = mainContext.getProxy(MainContext.MainThreadFileSystem);
    }
    dispose() {
        this._linkProviderRegistration?.dispose();
    }
    registerFileSystemProvider(extension, scheme, provider, options = {}) {
        // validate the given provider is complete
        ExtHostFileSystem._validateFileSystemProvider(provider);
        if (this._registeredSchemes.has(scheme)) {
            throw new Error(`a provider for the scheme '${scheme}' is already registered`);
        }
        //
        if (!this._linkProviderRegistration) {
            this._linkProviderRegistration = this._extHostLanguageFeatures.registerDocumentLinkProvider(extension, '*', this._linkProvider);
        }
        const handle = this._handlePool++;
        this._linkProvider.add(scheme);
        this._registeredSchemes.add(scheme);
        this._fsProvider.set(handle, provider);
        let capabilities = 2 /* files.FileSystemProviderCapabilities.FileReadWrite */;
        if (options.isCaseSensitive) {
            capabilities += 1024 /* files.FileSystemProviderCapabilities.PathCaseSensitive */;
        }
        if (options.isReadonly) {
            capabilities += 2048 /* files.FileSystemProviderCapabilities.Readonly */;
        }
        if (typeof provider.copy === 'function') {
            capabilities += 8 /* files.FileSystemProviderCapabilities.FileFolderCopy */;
        }
        if (typeof provider.open === 'function' &&
            typeof provider.close === 'function' &&
            typeof provider.read === 'function' &&
            typeof provider.write === 'function') {
            checkProposedApiEnabled(extension, 'fsChunks');
            capabilities += 4 /* files.FileSystemProviderCapabilities.FileOpenReadWriteClose */;
        }
        let readOnlyMessage;
        if (options.isReadonly &&
            isMarkdownString(options.isReadonly) &&
            options.isReadonly.value !== '') {
            readOnlyMessage = {
                value: options.isReadonly.value,
                isTrusted: options.isReadonly.isTrusted,
                supportThemeIcons: options.isReadonly.supportThemeIcons,
                supportHtml: options.isReadonly.supportHtml,
                baseUri: options.isReadonly.baseUri,
                uris: options.isReadonly.uris,
            };
        }
        this._proxy
            .$registerFileSystemProvider(handle, scheme, capabilities, readOnlyMessage)
            .catch((err) => {
            console.error(`FAILED to register filesystem provider of ${extension.identifier.value}-extension for the scheme ${scheme}`);
            console.error(err);
        });
        const subscription = provider.onDidChangeFile((event) => {
            const mapped = [];
            for (const e of event) {
                const { uri: resource, type } = e;
                if (resource.scheme !== scheme) {
                    // dropping events for wrong scheme
                    continue;
                }
                let newType;
                switch (type) {
                    case FileChangeType.Changed:
                        newType = 0 /* files.FileChangeType.UPDATED */;
                        break;
                    case FileChangeType.Created:
                        newType = 1 /* files.FileChangeType.ADDED */;
                        break;
                    case FileChangeType.Deleted:
                        newType = 2 /* files.FileChangeType.DELETED */;
                        break;
                    default:
                        throw new Error('Unknown FileChangeType');
                }
                mapped.push({ resource, type: newType });
            }
            this._proxy.$onFileSystemChange(handle, mapped);
        });
        return toDisposable(() => {
            subscription.dispose();
            this._linkProvider.delete(scheme);
            this._registeredSchemes.delete(scheme);
            this._fsProvider.delete(handle);
            this._proxy.$unregisterProvider(handle);
        });
    }
    static _validateFileSystemProvider(provider) {
        if (!provider) {
            throw new Error('MISSING provider');
        }
        if (typeof provider.watch !== 'function') {
            throw new Error('Provider does NOT implement watch');
        }
        if (typeof provider.stat !== 'function') {
            throw new Error('Provider does NOT implement stat');
        }
        if (typeof provider.readDirectory !== 'function') {
            throw new Error('Provider does NOT implement readDirectory');
        }
        if (typeof provider.createDirectory !== 'function') {
            throw new Error('Provider does NOT implement createDirectory');
        }
        if (typeof provider.readFile !== 'function') {
            throw new Error('Provider does NOT implement readFile');
        }
        if (typeof provider.writeFile !== 'function') {
            throw new Error('Provider does NOT implement writeFile');
        }
        if (typeof provider.delete !== 'function') {
            throw new Error('Provider does NOT implement delete');
        }
        if (typeof provider.rename !== 'function') {
            throw new Error('Provider does NOT implement rename');
        }
    }
    static _asIStat(stat) {
        const { type, ctime, mtime, size, permissions } = stat;
        return { type, ctime, mtime, size, permissions };
    }
    $stat(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).stat(URI.revive(resource))).then((stat) => ExtHostFileSystem._asIStat(stat));
    }
    $readdir(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).readDirectory(URI.revive(resource)));
    }
    $readFile(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).readFile(URI.revive(resource))).then((data) => VSBuffer.wrap(data));
    }
    $writeFile(handle, resource, content, opts) {
        return Promise.resolve(this._getFsProvider(handle).writeFile(URI.revive(resource), content.buffer, opts));
    }
    $delete(handle, resource, opts) {
        return Promise.resolve(this._getFsProvider(handle).delete(URI.revive(resource), opts));
    }
    $rename(handle, oldUri, newUri, opts) {
        return Promise.resolve(this._getFsProvider(handle).rename(URI.revive(oldUri), URI.revive(newUri), opts));
    }
    $copy(handle, oldUri, newUri, opts) {
        const provider = this._getFsProvider(handle);
        if (!provider.copy) {
            throw new Error('FileSystemProvider does not implement "copy"');
        }
        return Promise.resolve(provider.copy(URI.revive(oldUri), URI.revive(newUri), opts));
    }
    $mkdir(handle, resource) {
        return Promise.resolve(this._getFsProvider(handle).createDirectory(URI.revive(resource)));
    }
    $watch(handle, session, resource, opts) {
        const subscription = this._getFsProvider(handle).watch(URI.revive(resource), opts);
        this._watches.set(session, subscription);
    }
    $unwatch(_handle, session) {
        const subscription = this._watches.get(session);
        if (subscription) {
            subscription.dispose();
            this._watches.delete(session);
        }
    }
    $open(handle, resource, opts) {
        const provider = this._getFsProvider(handle);
        if (!provider.open) {
            throw new Error('FileSystemProvider does not implement "open"');
        }
        return Promise.resolve(provider.open(URI.revive(resource), opts));
    }
    $close(handle, fd) {
        const provider = this._getFsProvider(handle);
        if (!provider.close) {
            throw new Error('FileSystemProvider does not implement "close"');
        }
        return Promise.resolve(provider.close(fd));
    }
    $read(handle, fd, pos, length) {
        const provider = this._getFsProvider(handle);
        if (!provider.read) {
            throw new Error('FileSystemProvider does not implement "read"');
        }
        const data = VSBuffer.alloc(length);
        return Promise.resolve(provider.read(fd, pos, data.buffer, 0, length)).then((read) => {
            return data.slice(0, read); // don't send zeros
        });
    }
    $write(handle, fd, pos, data) {
        const provider = this._getFsProvider(handle);
        if (!provider.write) {
            throw new Error('FileSystemProvider does not implement "write"');
        }
        return Promise.resolve(provider.write(fd, pos, data.buffer, 0, data.byteLength));
    }
    _getFsProvider(handle) {
        const provider = this._fsProvider.get(handle);
        if (!provider) {
            const err = new Error();
            err.name = 'ENOPRO';
            err.message = `no provider`;
            throw err;
        }
        return provider;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RGaWxlU3lzdGVtLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUNOLFdBQVcsR0FLWCxNQUFNLHVCQUF1QixDQUFBO0FBRzlCLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDbEQsT0FBTyxLQUFLLGFBQWEsTUFBTSw0QkFBNEIsQ0FBQTtBQUUzRCxPQUFPLEVBRU4sWUFBWSxFQUNaLFlBQVksR0FFWixNQUFNLGtEQUFrRCxDQUFBO0FBQ3pELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN4RixPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFdkYsTUFBTSxjQUFjO0lBQXBCO1FBQ1MsYUFBUSxHQUFhLEVBQUUsQ0FBQTtJQTBGaEMsQ0FBQztJQXZGQSxHQUFHLENBQUMsTUFBYztRQUNqQixJQUFJLENBQUMsYUFBYSxHQUFHLFNBQVMsQ0FBQTtRQUM5QixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUMzQixDQUFDO0lBRUQsTUFBTSxDQUFDLE1BQWM7UUFDcEIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFB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