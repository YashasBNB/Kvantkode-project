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
import { IUriIdentityService } from './uriIdentity.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { IFileService, } from '../../files/common/files.js';
import { ExtUri, normalizePath } from '../../../base/common/resources.js';
import { SkipList } from '../../../base/common/skipList.js';
import { Event } from '../../../base/common/event.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
class Entry {
    static { this._clock = 0; }
    constructor(uri) {
        this.uri = uri;
        this.time = Entry._clock++;
    }
    touch() {
        this.time = Entry._clock++;
        return this;
    }
}
let UriIdentityService = class UriIdentityService {
    constructor(_fileService) {
        this._fileService = _fileService;
        this._dispooables = new DisposableStore();
        this._limit = 2 ** 16;
        const schemeIgnoresPathCasingCache = new Map();
        // assume path casing matters unless the file system provider spec'ed the opposite.
        // for all other cases path casing matters, e.g for
        // * virtual documents
        // * in-memory uris
        // * all kind of "private" schemes
        const ignorePathCasing = (uri) => {
            let ignorePathCasing = schemeIgnoresPathCasingCache.get(uri.scheme);
            if (ignorePathCasing === undefined) {
                // retrieve once and then case per scheme until a change happens
                ignorePathCasing =
                    _fileService.hasProvider(uri) &&
                        !this._fileService.hasCapability(uri, 1024 /* FileSystemProviderCapabilities.PathCaseSensitive */);
                schemeIgnoresPathCasingCache.set(uri.scheme, ignorePathCasing);
            }
            return ignorePathCasing;
        };
        this._dispooables.add(Event.any(_fileService.onDidChangeFileSystemProviderRegistrations, _fileService.onDidChangeFileSystemProviderCapabilities)((e) => {
            // remove from cache
            schemeIgnoresPathCasingCache.delete(e.scheme);
        }));
        this.extUri = new ExtUri(ignorePathCasing);
        this._canonicalUris = new SkipList((a, b) => this.extUri.compare(a, b, true), this._limit);
    }
    dispose() {
        this._dispooables.dispose();
        this._canonicalUris.clear();
    }
    asCanonicalUri(uri) {
        // (1) normalize URI
        if (this._fileService.hasProvider(uri)) {
            uri = normalizePath(uri);
        }
        // (2) find the uri in its canonical form or use this uri to define it
        const item = this._canonicalUris.get(uri);
        if (item) {
            return item.touch().uri.with({ fragment: uri.fragment });
        }
        // this uri is first and defines the canonical form
        this._canonicalUris.set(uri, new Entry(uri));
        this._checkTrim();
        return uri;
    }
    _checkTrim() {
        if (this._canonicalUris.size < this._limit) {
            return;
        }
        // get all entries, sort by time (MRU) and re-initalize
        // the uri cache and the entry clock. this is an expensive
        // operation and should happen rarely
        const entries = [...this._canonicalUris.entries()].sort((a, b) => {
            if (a[1].time < b[1].time) {
                return 1;
            }
            else if (a[1].time > b[1].time) {
                return -1;
            }
            else {
                return 0;
            }
        });
        Entry._clock = 0;
        this._canonicalUris.clear();
        const newSize = this._limit * 0.5;
        for (let i = 0; i < newSize; i++) {
            this._canonicalUris.set(entries[i][0], entries[i][1].touch());
        }
    }
};
UriIdentityService = __decorate([
    __param(0, IFileService)
], UriIdentityService);
export { UriIdentityService };
registerSingleton(IUriIdentityService, UriIdentityService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXJpSWRlbnRpdHlTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdXJpSWRlbnRpdHkvY29tbW9uL3VyaUlkZW50aXR5U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV0RCxPQUFPLEVBQXFCLGlCQUFpQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDL0YsT0FBTyxFQUNOLFlBQVksR0FJWixNQUFNLDZCQUE2QixDQUFBO0FBQ3BDLE9BQU8sRUFBRSxNQUFNLEVBQVcsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFbkUsTUFBTSxLQUFLO2FBQ0gsV0FBTSxHQUFHLENBQUMsQUFBSixDQUFJO0lBRWpCLFlBQXFCLEdBQVE7UUFBUixRQUFHLEdBQUgsR0FBRyxDQUFLO1FBRDdCLFNBQUksR0FBVyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7SUFDRyxDQUFDO0lBQ2pDLEtBQUs7UUFDSixJQUFJLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUMxQixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7O0FBR0ssSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7SUFTOUIsWUFBMEIsWUFBMkM7UUFBMUIsaUJBQVksR0FBWixZQUFZLENBQWM7UUFKcEQsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXBDLFdBQU0sR0FBRyxD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