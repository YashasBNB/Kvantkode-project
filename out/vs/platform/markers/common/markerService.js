/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isFalsyOrEmpty, isNonEmptyArray } from '../../../base/common/arrays.js';
import { DebounceEmitter } from '../../../base/common/event.js';
import { Iterable } from '../../../base/common/iterator.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { ResourceMap, ResourceSet } from '../../../base/common/map.js';
import { Schemas } from '../../../base/common/network.js';
import { URI } from '../../../base/common/uri.js';
import { localize } from '../../../nls.js';
import { MarkerSeverity, } from './markers.js';
export const unsupportedSchemas = new Set([
    Schemas.inMemory,
    Schemas.vscodeSourceControl,
    Schemas.walkThrough,
    Schemas.walkThroughSnippet,
    Schemas.vscodeChatCodeBlock,
]);
class DoubleResourceMap {
    constructor() {
        this._byResource = new ResourceMap();
        this._byOwner = new Map();
    }
    set(resource, owner, value) {
        let ownerMap = this._byResource.get(resource);
        if (!ownerMap) {
            ownerMap = new Map();
            this._byResource.set(resource, ownerMap);
        }
        ownerMap.set(owner, value);
        let resourceMap = this._byOwner.get(owner);
        if (!resourceMap) {
            resourceMap = new ResourceMap();
            this._byOwner.set(owner, resourceMap);
        }
        resourceMap.set(resource, value);
    }
    get(resource, owner) {
        const ownerMap = this._byResource.get(resource);
        return ownerMap?.get(owner);
    }
    delete(resource, owner) {
        let removedA = false;
        let removedB = false;
        const ownerMap = this._byResource.get(resource);
        if (ownerMap) {
            removedA = ownerMap.delete(owner);
        }
        const resourceMap = this._byOwner.get(owner);
        if (resourceMap) {
            removedB = resourceMap.delete(resource);
        }
        if (removedA !== removedB) {
            throw new Error('illegal state');
        }
        return removedA && removedB;
    }
    values(key) {
        if (typeof key === 'string') {
            return this._byOwner.get(key)?.values() ?? Iterable.empty();
        }
        if (URI.isUri(key)) {
            return this._byResource.get(key)?.values() ?? Iterable.empty();
        }
        return Iterable.map(Iterable.concat(...this._byOwner.values()), (map) => map[1]);
    }
}
class MarkerStats {
    constructor(service) {
        this.errors = 0;
        this.infos = 0;
        this.warnings = 0;
        this.unknowns = 0;
        this._data = new ResourceMap();
        this._service = service;
        this._subscription = service.onMarkerChanged(this._update, this);
    }
    dispose() {
        this._subscription.dispose();
    }
    _update(resources) {
        for (const resource of resources) {
            const oldStats = this._data.get(resource);
            if (oldStats) {
                this._substract(oldStats);
            }
            const newStats = this._resourceStats(resource);
            this._add(newStats);
            this._data.set(resource, newStats);
        }
    }
    _resourceStats(resource) {
        const result = { errors: 0, warnings: 0, infos: 0, unknowns: 0 };
        // TODO this is a hack
        if (unsupportedSchemas.has(resource.scheme)) {
            return result;
        }
        for (const { severity } of this._service.read({ resource })) {
            if (severity === MarkerSeverity.Error) {
                result.errors += 1;
            }
            else if (severity === MarkerSeverity.Warning) {
                result.warnings += 1;
            }
            else if (severity === MarkerSeverity.Info) {
                result.infos += 1;
            }
            else {
                result.unknowns += 1;
            }
        }
        return result;
    }
    _substract(op) {
        this.errors -= op.errors;
        this.warnings -= op.warnings;
        this.infos -= op.infos;
        this.unknowns -= op.unknowns;
    }
    _add(op) {
        this.errors += op.errors;
        this.warnings += op.warnings;
        this.infos += op.infos;
        this.unknowns += op.unknowns;
    }
}
export class MarkerService {
    constructor() {
        this._onMarkerChanged = new DebounceEmitter({
            delay: 0,
            merge: MarkerService._merge,
        });
        this.onMarkerChanged = this._onMarkerChanged.event;
        this._data = new DoubleResourceMap();
        this._stats = new MarkerStats(this);
        this._filteredResources = new ResourceMap();
    }
    dispose() {
        this._stats.dispose();
        this._onMarkerChanged.dispose();
    }
    getStatistics() {
        return this._stats;
    }
    remove(owner, resources) {
        for (const resource of resources || []) {
            this.changeOne(owner, resource, []);
        }
    }
    changeOne(owner, resource, markerData) {
        if (isFalsyOrEmpty(markerData)) {
            // remove marker for this (owner,resource)-tuple
            const removed = this._data.delete(resource, owner);
            if (removed) {
                this._onMarkerChanged.fire([resource]);
            }
        }
        else {
            // insert marker for this (owner,resource)-tuple
            const markers = [];
            for (const data of markerData) {
                const marker = MarkerService._toMarker(owner, resource, data);
                if (marker) {
                    markers.push(marker);
                }
            }
            this._data.set(resource, owner, markers);
            this._onMarkerChanged.fire([resource]);
        }
    }
    installResourceFilter(resource, reason) {
        let reasons = this._filteredResources.get(resource);
        if (!reasons) {
            reasons = [];
            this._filteredResources.set(resource, reasons);
        }
        reasons.push(reason);
        this._onMarkerChanged.fire([resource]);
        return toDisposable(() => {
            const reasons = this._filteredResources.get(resource);
            if (!reasons) {
                return;
            }
            const reasonIndex = reasons.indexOf(reason);
            if (reasonIndex !== -1) {
                reasons.splice(reasonIndex, 1);
                if (reasons.length === 0) {
                    this._filteredResources.delete(resource);
                }
                this._onMarkerChanged.fire([resource]);
            }
        });
    }
    static _toMarker(owner, resource, data) {
        let { code, severity, message, source, startLineNumber, startColumn, endLineNumber, endColumn, relatedInformation, tags, } = data;
        if (!message) {
            return undefined;
        }
        // santize data
        startLineNumber = startLineNumber > 0 ? startLineNumber : 1;
        startColumn = startColumn > 0 ? startColumn : 1;
        endLineNumber = endLineNumber >= startLineNumber ? endLineNumber : startLineNumber;
        endColumn = endColumn > 0 ? endColumn : startColumn;
        return {
            resource,
            owner,
            code,
            severity,
            message,
            source,
            startLineNumber,
            startColumn,
            endLineNumber,
            endColumn,
            relatedInformation,
            tags,
        };
    }
    changeAll(owner, data) {
        const changes = [];
        // remove old marker
        const existing = this._data.values(owner);
        if (existing) {
            for (const data of existing) {
                const first = Iterable.first(data);
                if (first) {
                    changes.push(first.resource);
                    this._data.delete(first.resource, owner);
                }
            }
        }
        // add new markers
        if (isNonEmptyArray(data)) {
            // group by resource
            const groups = new ResourceMap();
            for (const { resource, marker: markerData } of data) {
                const marker = MarkerService._toMarker(owner, resource, markerData);
                if (!marker) {
                    // filter bad markers
                    continue;
                }
                const array = groups.get(resource);
                if (!array) {
                    groups.set(resource, [marker]);
                    changes.push(resource);
                }
                else {
                    array.push(marker);
                }
            }
            // insert all
            for (const [resource, value] of groups) {
                this._data.set(resource, owner, value);
            }
        }
        if (changes.length > 0) {
            this._onMarkerChanged.fire(changes);
        }
    }
    /**
     * Creates an information marker for filtered resources
     */
    _createFilteredMarker(resource, reasons) {
        const message = reasons.length === 1
            ? localize('filtered', 'Problems are paused because: "{0}"', reasons[0])
            : localize('filtered.network', 'Problems are paused because: "{0}" and {1} more', reasons[0], reasons.length - 1);
        return {
            owner: 'markersFilter',
            resource,
            severity: MarkerSeverity.Info,
            message,
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: 1,
            endColumn: 1,
        };
    }
    read(filter = Object.create(null)) {
        let { owner, resource, severities, take } = filter;
        if (!take || take < 0) {
            take = -1;
        }
        if (owner && resource) {
            // exactly one owner AND resource
            const reasons = this._filteredResources.get(resource);
            if (reasons?.length) {
                const infoMarker = this._createFilteredMarker(resource, reasons);
                return [infoMarker];
            }
            const data = this._data.get(resource, owner);
            if (!data) {
                return [];
            }
            const result = [];
            for (const marker of data) {
                if (take > 0 && result.length === take) {
                    break;
                }
                const reasons = this._filteredResources.get(resource);
                if (reasons?.length) {
                    result.push(this._createFilteredMarker(resource, reasons));
                }
                else if (MarkerService._accept(marker, severities)) {
                    result.push(marker);
                }
            }
            return result;
        }
        else {
            // of one resource OR owner
            const iterable = !owner && !resource ? this._data.values() : this._data.values(resource ?? owner);
            const result = [];
            const filtered = new ResourceSet();
            for (const markers of iterable) {
                for (const data of markers) {
                    if (filtered.has(data.resource)) {
                        continue;
                    }
                    if (take > 0 && result.length === take) {
                        break;
                    }
                    const reasons = this._filteredResources.get(data.resource);
                    if (reasons?.length) {
                        result.push(this._createFilteredMarker(data.resource, reasons));
                        filtered.add(data.resource);
                    }
                    else if (MarkerService._accept(data, severities)) {
                        result.push(data);
                    }
                }
            }
            return result;
        }
    }
    static _accept(marker, severities) {
        return severities === undefined || (severities & marker.severity) === marker.severity;
    }
    // --- event debounce logic
    static _merge(all) {
        const set = new ResourceMap();
        for (const array of all) {
            for (const item of array) {
                set.set(item, true);
            }
        }
        return Array.from(set.keys());
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vbWFya2Vycy9jb21tb24vbWFya2VyU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDM0QsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUtOLGNBQWMsR0FFZCxNQUFNLGNBQWMsQ0FBQTtBQUVyQixNQUFNLENBQUMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsQ0FBQztJQUN6QyxPQUFPLENBQUMsUUFBUTtJQUNoQixPQUFPLENBQUMsbUJBQW1CO0lBQzNCLE9BQU8sQ0FBQyxXQUFXO0lBQ25CLE9BQU8sQ0FBQyxrQkFBa0I7SUFDMUIsT0FBTyxDQUFDLG1CQUFtQjtDQUMzQixDQUFDLENBQUE7QUFFRixNQUFNLGlCQUFpQjtJQUF2QjtRQUNTLGdCQUFXLEdBQUcsSUFBSSxXQUFXLEVBQWtCLENBQUE7UUFDL0MsYUFBUSxHQUFHLElBQUksR0FBRyxFQUEwQixDQUFBO0lBa0RyRCxDQUFDO0lBaERBLEdBQUcs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