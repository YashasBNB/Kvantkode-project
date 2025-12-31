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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL21hcmtlcnMvY29tbW9uL21hcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzNELE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFLTixjQUFjLEdBRWQsTUFBTSxjQUFjLENBQUE7QUFFckIsTUFBTSxDQUFDLE1BQU0sa0JBQWtCLEdBQUcsSUFBSSxHQUFHLENBQUM7SUFDekMsT0FBTyxDQUFDLFFBQVE7SUFDaEIsT0FBTyxDQUFDLG1CQUFtQjtJQUMzQixPQUFPLENBQUMsV0FBVztJQUNuQixPQUFPLENBQUMsa0JBQWtCO0lBQzFCLE9BQU8sQ0FBQyxtQkFBbUI7Q0FDM0IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxpQkFBaUI7SUFBdkI7UUFDUyxnQkFBVyxHQUFHLElBQUksV0FBVyxFQUFrQixDQUFBO1FBQy9DLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBMEIsQ0FBQTtJQWtEckQsQ0FBQztJQWhEQSxHQUFHLENBQUMs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