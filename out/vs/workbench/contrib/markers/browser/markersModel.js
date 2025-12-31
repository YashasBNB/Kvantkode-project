/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isNonEmptyArray } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { hash } from '../../../../base/common/hash.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { basename, extUri } from '../../../../base/common/resources.js';
import { splitLines } from '../../../../base/common/strings.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IMarkerData, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { unsupportedSchemas } from '../../../../platform/markers/common/markerService.js';
export function compareMarkersByUri(a, b) {
    return extUri.compare(a.resource, b.resource);
}
function compareResourceMarkers(a, b) {
    const [firstMarkerOfA] = a.markers;
    const [firstMarkerOfB] = b.markers;
    let res = 0;
    if (firstMarkerOfA && firstMarkerOfB) {
        res = MarkerSeverity.compare(firstMarkerOfA.marker.severity, firstMarkerOfB.marker.severity);
    }
    if (res === 0) {
        res = a.path.localeCompare(b.path) || a.name.localeCompare(b.name);
    }
    return res;
}
export class ResourceMarkers {
    constructor(id, resource) {
        this.id = id;
        this.resource = resource;
        this._markersMap = new ResourceMap();
        this._total = 0;
        this.path = this.resource.fsPath;
        this.name = basename(this.resource);
    }
    get markers() {
        if (!this._cachedMarkers) {
            this._cachedMarkers = [...this._markersMap.values()]
                .flat()
                .sort(ResourceMarkers._compareMarkers);
        }
        return this._cachedMarkers;
    }
    has(uri) {
        return this._markersMap.has(uri);
    }
    set(uri, marker) {
        this.delete(uri);
        if (isNonEmptyArray(marker)) {
            this._markersMap.set(uri, marker);
            this._total += marker.length;
            this._cachedMarkers = undefined;
        }
    }
    delete(uri) {
        const array = this._markersMap.get(uri);
        if (array) {
            this._total -= array.length;
            this._cachedMarkers = undefined;
            this._markersMap.delete(uri);
        }
    }
    get total() {
        return this._total;
    }
    static _compareMarkers(a, b) {
        return (MarkerSeverity.compare(a.marker.severity, b.marker.severity) ||
            extUri.compare(a.resource, b.resource) ||
            Range.compareRangesUsingStarts(a.marker, b.marker));
    }
}
export class Marker {
    get resource() {
        return this.marker.resource;
    }
    get range() {
        return this.marker;
    }
    get lines() {
        if (!this._lines) {
            this._lines = splitLines(this.marker.message);
        }
        return this._lines;
    }
    constructor(id, marker, relatedInformation = []) {
        this.id = id;
        this.marker = marker;
        this.relatedInformation = relatedInformation;
    }
    toString() {
        return JSON.stringify({
            ...this.marker,
            resource: this.marker.resource.path,
            relatedInformation: this.relatedInformation.length
                ? this.relatedInformation.map((r) => ({ ...r.raw, resource: r.raw.resource.path }))
                : undefined,
        }, null, '\t');
    }
}
export class MarkerTableItem extends Marker {
    constructor(marker, sourceMatches, codeMatches, messageMatches, fileMatches) {
        super(marker.id, marker.marker, marker.relatedInformation);
        this.sourceMatches = sourceMatches;
        this.codeMatches = codeMatches;
        this.messageMatches = messageMatches;
        this.fileMatches = fileMatches;
    }
}
export class RelatedInformation {
    constructor(id, marker, raw) {
        this.id = id;
        this.marker = marker;
        this.raw = raw;
    }
}
export class MarkersModel {
    get resourceMarkers() {
        if (!this.cachedSortedResources) {
            this.cachedSortedResources = [...this.resourcesByUri.values()].sort(compareResourceMarkers);
        }
        return this.cachedSortedResources;
    }
    constructor() {
        this.cachedSortedResources = undefined;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._total = 0;
        this.resourcesByUri = new Map();
    }
    reset() {
        const removed = new Set();
        for (const resourceMarker of this.resourcesByUri.values()) {
            removed.add(resourceMarker);
        }
        this.resourcesByUri.clear();
        this._total = 0;
        this._onDidChange.fire({
            removed,
            added: new Set(),
            updated: new Set(),
        });
    }
    get total() {
        return this._total;
    }
    getResourceMarkers(resource) {
        return this.resourcesByUri.get(extUri.getComparisonKey(resource, true)) ?? null;
    }
    setResourceMarkers(resourcesMarkers) {
        const change = { added: new Set(), removed: new Set(), updated: new Set() };
        for (const [resource, rawMarkers] of resourcesMarkers) {
            if (unsupportedSchemas.has(resource.scheme)) {
                continue;
            }
            const key = extUri.getComparisonKey(resource, true);
            let resourceMarkers = this.resourcesByUri.get(key);
            if (isNonEmptyArray(rawMarkers)) {
                // update, add
                if (!resourceMarkers) {
                    const resourceMarkersId = this.id(resource.toString());
                    resourceMarkers = new ResourceMarkers(resourceMarkersId, resource.with({ fragment: null }));
                    this.resourcesByUri.set(key, resourceMarkers);
                    change.added.add(resourceMarkers);
                }
                else {
                    change.updated.add(resourceMarkers);
                }
                const markersCountByKey = new Map();
                const markers = rawMarkers.map((rawMarker) => {
                    const key = IMarkerData.makeKey(rawMarker);
                    const index = markersCountByKey.get(key) || 0;
                    markersCountByKey.set(key, index + 1);
                    const markerId = this.id(resourceMarkers.id, key, index, rawMarker.resource.toString());
                    let relatedInformation = undefined;
                    if (rawMarker.relatedInformation) {
                        relatedInformation = rawMarker.relatedInformation.map((r, index) => new RelatedInformation(this.id(markerId, r.resource.toString(), r.startLineNumber, r.startColumn, r.endLineNumber, r.endColumn, index), rawMarker, r));
                    }
                    return new Marker(markerId, rawMarker, relatedInformation);
                });
                this._total -= resourceMarkers.total;
                resourceMarkers.set(resource, markers);
                this._total += resourceMarkers.total;
            }
            else if (resourceMarkers) {
                // clear
                this._total -= resourceMarkers.total;
                resourceMarkers.delete(resource);
                this._total += resourceMarkers.total;
                if (resourceMarkers.total === 0) {
                    this.resourcesByUri.delete(key);
                    change.removed.add(resourceMarkers);
                }
                else {
                    change.updated.add(resourceMarkers);
                }
            }
        }
        this.cachedSortedResources = undefined;
        if (change.added.size || change.removed.size || change.updated.size) {
            this._onDidChange.fire(change);
        }
    }
    id(...values) {
        return `${hash(values)}`;
    }
    dispose() {
        this._onDidChange.dispose();
        this.resourcesByUri.clear();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc01vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9icm93c2VyL21hcmtlcnNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFL0QsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFFTixXQUFXLEVBRVgsY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFJekYsTUFBTSxVQUFVLG1CQUFtQixDQUFDLENBQVUsRUFBRSxDQUFVO0lBQ3pELE9BQU8sTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtBQUM5QyxDQUFDO0FBRUQsU0FBUyxzQkFBc0IsQ0FBQyxDQUFrQixFQUFFLENBQWtCO0lBQ3JFLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQ2xDLE1BQU0sQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQ2xDLElBQUksR0FBRyxH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