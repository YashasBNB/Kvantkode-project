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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdERpYWdub3N0aWNzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0RGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLGlEQUFpRDtBQUVqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFlLGNBQWMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFFaEUsT0FBTyxFQUNOLFdBQVcsR0FJWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQ3RELE9BQU8sS0FBSyxTQUFTLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxFQUFFLEtBQUssRUFBVyxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBRXpELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBSW5FLE1BQU0sT0FBTyxvQkFBb0I7SUFDdkIsTUFBTSxDQUF3QztJQUM5Qyx1QkFBdUIsQ0FBZ0M7SUFDdkQsS0FBSyxDQUFrQztJQUloRCxZQUNrQixLQUFhLEVBQ2IsTUFBYyxFQUNkLG9CQUE0QixFQUM1QixzQkFBOEIsRUFDOUIsdUJBQXlELEVBQzFFLE1BQWUsRUFDZixLQUE2QyxFQUM3QyxzQkFBc0Q7UUFQckMsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFdBQU0s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