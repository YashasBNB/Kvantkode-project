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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEZpbGVTeXN0ZW0uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RmlsZVN5c3RlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFDTixXQUFXLEdBS1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUc5QixPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ2xELE9BQU8sS0FBSyxhQUFhLE1BQU0sNEJBQTRCLENBQUE7QUFFM0QsT0FBTyxFQUVOLFlBQVksRUFDWixZQUFZLEdBRVosTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFekQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFtQixnQkFBZ0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRXZGLE1BQU0sY0FBYztJQUFwQjtRQUNTLGFBQVEsR0FBYSxFQUFFLENBQUE7SUEwRmhDLENBQUM7SUF2RkEsR0FBRyxDQUFDLE1BQWM7UUFDakIsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUE7UUFDOUIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0IsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFjO1FBQ3BCLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FB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