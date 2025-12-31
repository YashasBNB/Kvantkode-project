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
var ExtHostDiagnostics_1;
/* eslint-disable local/code-no-native-private */
import { localize } from '../../../nls.js';
import { MarkerSeverity } from '../../../platform/markers/common/markers.js';
import { URI } from '../../../base/common/uri.js';
import { MainContext, } from './extHost.protocol.js';
import { DiagnosticSeverity } from './extHostTypes.js';
import * as converter from './extHostTypeConverters.js';
import { Event, DebounceEmitter } from '../../../base/common/event.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ResourceMap } from '../../../base/common/map.js';
import { IExtHostFileSystemInfo } from './extHostFileSystemInfo.js';
export class DiagnosticCollection {
    #proxy;
    #onDidChangeDiagnostics;
    #data;
    constructor(_name, _owner, _maxDiagnosticsTotal, _maxDiagnosticsPerFile, _modelVersionIdProvider, extUri, proxy, onDidChangeDiagnostics) {
        this._name = _name;
        this._owner = _owner;
        this._maxDiagnosticsTotal = _maxDiagnosticsTotal;
        this._maxDiagnosticsPerFile = _maxDiagnosticsPerFile;
        this._modelVersionIdProvider = _modelVersionIdProvider;
        this._isDisposed = false;
        this._maxDiagnosticsTotal = Math.max(_maxDiagnosticsPerFile, _maxDiagnosticsTotal);
        this.#data = new ResourceMap((uri) => extUri.getComparisonKey(uri));
        this.#proxy = proxy;
        this.#onDidChangeDiagnostics = onDidChangeDiagnostics;
    }
    dispose() {
        if (!this._isDisposed) {
            this.#onDidChangeDiagnostics.fire([...this.#data.keys()]);
            this.#proxy?.$clear(this._owner);
            this.#data.clear();
            this._isDisposed = true;
        }
    }
    get name() {
        this._checkDisposed();
        return this._name;
    }
    set(first, diagnostics) {
        if (!first) {
            // this set-call is a clear-call
            this.clear();
            return;
        }
        // the actual implementation for #set
        this._checkDisposed();
        let toSync = [];
        if (URI.isUri(first)) {
            if (!diagnostics) {
                // remove this entry
                this.delete(first);
                return;
            }
            // update single row
            this.#data.set(first, diagnostics.slice());
            toSync = [first];
        }
        else if (Array.isArray(first)) {
            // update many rows
            toSync = [];
            let lastUri;
            // ensure stable-sort
            first = [...first].sort(DiagnosticCollection._compareIndexedTuplesByUri);
            for (const tuple of first) {
                const [uri, diagnostics] = tuple;
                if (!lastUri || uri.toString() !== lastUri.toString()) {
                    if (lastUri && this.#data.get(lastUri).length === 0) {
                        this.#data.delete(lastUri);
                    }
                    lastUri = uri;
                    toSync.push(uri);
                    this.#data.set(uri, []);
                }
                if (!diagnostics) {
                    // [Uri, undefined] means clear this
                    const currentDiagnostics = this.#data.get(uri);
                    if (currentDiagnostics) {
                        currentDiagnostics.length = 0;
                    }
                }
                else {
                    const currentDiagnostics = this.#data.get(uri);
                    currentDiagnostics?.push(...diagnostics);
                }
            }
        }
        // send event for extensions
        this.#onDidChangeDiagnostics.fire(toSync);
        // compute change and send to main side
        if (!this.#proxy) {
            return;
        }
        const entries = [];
        let totalMarkerCount = 0;
        for (const uri of toSync) {
            let marker = [];
            const diagnostics = this.#data.get(uri);
            if (diagnostics) {
                // no more than N diagnostics per file
                if (diagnostics.length > this._maxDiagnosticsPerFile) {
                    marker = [];
                    const order = [
                        DiagnosticSeverity.Error,
                        DiagnosticSeverity.Warning,
                        DiagnosticSeverity.Information,
                        DiagnosticSeverity.Hint,
                    ];
                    orderLoop: for (let i = 0; i < 4; i++) {
                        for (const diagnostic of diagnostics) {
                            if (diagnostic.severity === order[i]) {
                                const len = marker.push({
                                    ...converter.Diagnostic.from(diagnostic),
                                    modelVersionId: this._modelVersionIdProvider(uri),
                                });
                                if (len === this._maxDiagnosticsPerFile) {
                                    break orderLoop;
                                }
                            }
                        }
                    }
                    // add 'signal' marker for showing omitted errors/warnings
                    marker.push({
                        severity: MarkerSeverity.Info,
                        message: localize({ key: 'limitHit', comment: ['amount of errors/warning skipped due to limits'] }, 'Not showing {0} further errors and warnings.', diagnostics.length - this._maxDiagnosticsPerFile),
                        startLineNumber: marker[marker.length - 1].startLineNumber,
                        startColumn: marker[marker.length - 1].startColumn,
                        endLineNumber: marker[marker.length - 1].endLineNumber,
                        endColumn: marker[marker.length - 1].endColumn,
                    });
                }
                else {
                    marker = diagnostics.map((diag) => ({
                        ...converter.Diagnostic.from(diag),
                        modelVersionId: this._modelVersionIdProvider(uri),
                    }));
                }
            }
            entries.push([uri, marker]);
            totalMarkerCount += marker.length;
            if (totalMarkerCount > this._maxDiagnosticsTotal) {
                // ignore markers that are above the limit
                break;
            }
        }
        this.#proxy.$changeMany(this._owner, entries);
    }
    delete(uri) {
        this._checkDisposed();
        this.#onDidChangeDiagnostics.fire([uri]);
        this.#data.delete(uri);
        this.#proxy?.$changeMany(this._owner, [[uri, undefined]]);
    }
    clear() {
        this._checkDisposed();
        this.#onDidChangeDiagnostics.fire([...this.#data.keys()]);
        this.#data.clear();
        this.#proxy?.$clear(this._owner);
    }
    forEach(callback, thisArg) {
        this._checkDisposed();
        for (const [uri, values] of this) {
            callback.call(thisArg, uri, values, this);
        }
    }
    *[Symbol.iterator]() {
        this._checkDisposed();
        for (const uri of this.#data.keys()) {
            yield [uri, this.get(uri)];
        }
    }
    get(uri) {
        this._checkDisposed();
        const result = this.#data.get(uri);
        if (Array.isArray(result)) {
            return Object.freeze(result.slice(0));
        }
        return [];
    }
    has(uri) {
        this._checkDisposed();
        return Array.isArray(this.#data.get(uri));
    }
    _checkDisposed() {
        if (this._isDisposed) {
            throw new Error('illegal state - object is disposed');
        }
    }
    static _compareIndexedTuplesByUri(a, b) {
        if (a[0].toString() < b[0].toString()) {
            return -1;
        }
        else if (a[0].toString() > b[0].toString()) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
let ExtHostDiagnostics = class ExtHostDiagnostics {
    static { ExtHostDiagnostics_1 = this; }
    static { this._idPool = 0; }
    static { this._maxDiagnosticsPerFile = 1000; }
    static { this._maxDiagnosticsTotal = 1.1 * this._maxDiagnosticsPerFile; }
    static _mapper(last) {
        const map = new ResourceMap();
        for (const uri of last) {
            map.set(uri, uri);
        }
        return { uris: Object.freeze(Array.from(map.values())) };
    }
    constructor(mainContext, _logService, _fileSystemInfoService, _extHostDocumentsAndEditors) {
        this._logService = _logService;
        this._fileSystemInfoService = _fileSystemInfoService;
        this._extHostDocumentsAndEditors = _extHostDocumentsAndEditors;
        this._collections = new Map();
        this._onDidChangeDiagnostics = new DebounceEmitter({
            merge: (all) => all.flat(),
            delay: 50,
        });
        this.onDidChangeDiagnostics = Event.map(this._onDidChangeDiagnostics.event, ExtHostDiagnostics_1._mapper);
        this._proxy = mainContext.getProxy(MainContext.MainThreadDiagnostics);
    }
    createDiagnosticCollection(extensionId, name) {
        const { _collections, _proxy, _onDidChangeDiagnostics, _logService, _fileSystemInfoService, _extHostDocumentsAndEditors, } = this;
        const loggingProxy = new (class {
            $changeMany(owner, entries) {
                _proxy.$changeMany(owner, entries);
                _logService.trace('[DiagnosticCollection] change many (extension, owner, uris)', extensionId.value, owner, entries.length === 0 ? 'CLEARING' : entries);
            }
            $clear(owner) {
                _proxy.$clear(owner);
                _logService.trace('[DiagnosticCollection] remove all (extension, owner)', extensionId.value, owner);
            }
            dispose() {
                _proxy.dispose();
            }
        })();
        let owner;
        if (!name) {
            name = '_generated_diagnostic_collection_name_#' + ExtHostDiagnostics_1._idPool++;
            owner = name;
        }
        else if (!_collections.has(name)) {
            owner = name;
        }
        else {
            this._logService.warn(`DiagnosticCollection with name '${name}' does already exist.`);
            do {
                owner = name + ExtHostDiagnostics_1._idPool++;
            } while (_collections.has(owner));
        }
        const result = new (class extends DiagnosticCollection {
            constructor() {
                super(name, owner, ExtHostDiagnostics_1._maxDiagnosticsTotal, ExtHostDiagnostics_1._maxDiagnosticsPerFile, (uri) => _extHostDocumentsAndEditors.getDocument(uri)?.version, _fileSystemInfoService.extUri, loggingProxy, _onDidChangeDiagnostics);
                _collections.set(owner, this);
            }
            dispose() {
                super.dispose();
                _collections.delete(owner);
            }
        })();
        return result;
    }
    getDiagnostics(resource) {
        if (resource) {
            return this._getDiagnostics(resource);
        }
        else {
            const index = new Map();
            const res = [];
            for (const collection of this._collections.values()) {
                collection.forEach((uri, diagnostics) => {
                    let idx = index.get(uri.toString());
                    if (typeof idx === 'undefined') {
                        idx = res.length;
                        index.set(uri.toString(), idx);
                        res.push([uri, []]);
                    }
                    res[idx][1] = res[idx][1].concat(...diagnostics);
                });
            }
            return res;
        }
    }
    _getDiagnostics(resource) {
        let res = [];
        for (const collection of this._collections.values()) {
            if (collection.has(resource)) {
                res = res.concat(collection.get(resource));
            }
        }
        return res;
    }
    $acceptMarkersChange(data) {
        if (!this._mirrorCollection) {
            const name = '_generated_mirror';
            const collection = new DiagnosticCollection(name, name, Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, // no limits because this collection is just a mirror of "sanitized" data
            (_uri) => undefined, this._fileSystemInfoService.extUri, undefined, this._onDidChangeDiagnostics);
            this._collections.set(name, collection);
            this._mirrorCollection = collection;
        }
        for (const [uri, markers] of data) {
            this._mirrorCollection.set(URI.revive(uri), markers.map(converter.Diagnostic.to));
        }
    }
};
ExtHostDiagnostics = ExtHostDiagnostics_1 = __decorate([
    __param(1, ILogService),
    __param(2, IExtHostFileSystemInfo)
], ExtHostDiagnostics);
export { ExtHostDiagnostics };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdERpYWdub3N0aWNzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxpREFBaUQ7QUFFakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBZSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN6RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sRUFDTixXQUFXLEdBSVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUN0RCxPQUFPLEtBQUssU0FBUyxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxLQUFLLEVBQVcsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUluRSxNQUFNLE9BQU8sb0JBQW9CO0lBQ3ZCLE1BQU0sQ0FBd0M7SUFDOUMsdUJBQXVCLENBQWdDO0lBQ3ZELEtBQUssQ0FBa0M7SUFJaEQsWUFDa0IsS0FBYSxFQUNiLE1BQWMsRUFDZCxvQkFBNEIsRUFDNUIsc0JBQThCLEVBQzlCLHVCQUF5RCxFQUMxRSxNQUFlLEVBQ2YsS0FBNkMsRUFDN0Msc0JBQXNEO1FBUHJDLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixXQUFNLEdBQU4sTUFBTSxDQUFRO1FBQ2QseUJB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