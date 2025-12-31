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
import { binarySearch2, equals } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { LinkedList } from '../../../../base/common/linkedList.js';
import { compare } from '../../../../base/common/strings.js';
import { URI } from '../../../../base/common/uri.js';
import { Range } from '../../../common/core/range.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IMarkerService, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { isEqual } from '../../../../base/common/resources.js';
export class MarkerCoordinate {
    constructor(marker, index, total) {
        this.marker = marker;
        this.index = index;
        this.total = total;
    }
}
let MarkerList = class MarkerList {
    constructor(resourceFilter, _markerService, _configService) {
        this._markerService = _markerService;
        this._configService = _configService;
        this._onDidChange = new Emitter();
        this.onDidChange = this._onDidChange.event;
        this._dispoables = new DisposableStore();
        this._markers = [];
        this._nextIdx = -1;
        if (URI.isUri(resourceFilter)) {
            this._resourceFilter = (uri) => uri.toString() === resourceFilter.toString();
        }
        else if (resourceFilter) {
            this._resourceFilter = resourceFilter;
        }
        const compareOrder = this._configService.getValue('problems.sortOrder');
        const compareMarker = (a, b) => {
            let res = compare(a.resource.toString(), b.resource.toString());
            if (res === 0) {
                if (compareOrder === 'position') {
                    res =
                        Range.compareRangesUsingStarts(a, b) || MarkerSeverity.compare(a.severity, b.severity);
                }
                else {
                    res =
                        MarkerSeverity.compare(a.severity, b.severity) || Range.compareRangesUsingStarts(a, b);
                }
            }
            return res;
        };
        const updateMarker = () => {
            let newMarkers = this._markerService.read({
                resource: URI.isUri(resourceFilter) ? resourceFilter : undefined,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning | MarkerSeverity.Info,
            });
            if (typeof resourceFilter === 'function') {
                newMarkers = newMarkers.filter((m) => this._resourceFilter(m.resource));
            }
            newMarkers.sort(compareMarker);
            if (equals(newMarkers, this._markers, (a, b) => a.resource.toString() === b.resource.toString() &&
                a.startLineNumber === b.startLineNumber &&
                a.startColumn === b.startColumn &&
                a.endLineNumber === b.endLineNumber &&
                a.endColumn === b.endColumn &&
                a.severity === b.severity &&
                a.message === b.message)) {
                return false;
            }
            this._markers = newMarkers;
            return true;
        };
        updateMarker();
        this._dispoables.add(_markerService.onMarkerChanged((uris) => {
            if (!this._resourceFilter || uris.some((uri) => this._resourceFilter(uri))) {
                if (updateMarker()) {
                    this._nextIdx = -1;
                    this._onDidChange.fire();
                }
            }
        }));
    }
    dispose() {
        this._dispoables.dispose();
        this._onDidChange.dispose();
    }
    matches(uri) {
        if (!this._resourceFilter && !uri) {
            return true;
        }
        if (!this._resourceFilter || !uri) {
            return false;
        }
        return this._resourceFilter(uri);
    }
    get selected() {
        const marker = this._markers[this._nextIdx];
        return marker && new MarkerCoordinate(marker, this._nextIdx + 1, this._markers.length);
    }
    _initIdx(model, position, fwd) {
        let idx = this._markers.findIndex((marker) => isEqual(marker.resource, model.uri));
        if (idx < 0) {
            // ignore model, position because this will be a different file
            idx = binarySearch2(this._markers.length, (idx) => compare(this._markers[idx].resource.toString(), model.uri.toString()));
            if (idx < 0) {
                idx = ~idx;
            }
            if (fwd) {
                this._nextIdx = idx;
            }
            else {
                this._nextIdx = (this._markers.length + idx - 1) % this._markers.length;
            }
        }
        else {
            // find marker for file
            let found = false;
            let wentPast = false;
            for (let i = idx; i < this._markers.length; i++) {
                let range = Range.lift(this._markers[i]);
                if (range.isEmpty()) {
                    const word = model.getWordAtPosition(range.getStartPosition());
                    if (word) {
                        range = new Range(range.startLineNumber, word.startColumn, range.startLineNumber, word.endColumn);
                    }
                }
                if (position &&
                    (range.containsPosition(position) || position.isBeforeOrEqual(range.getStartPosition()))) {
                    this._nextIdx = i;
                    found = true;
                    wentPast = !range.containsPosition(position);
                    break;
                }
                if (this._markers[i].resource.toString() !== model.uri.toString()) {
                    break;
                }
            }
            if (!found) {
                // after the last change
                this._nextIdx = fwd ? 0 : this._markers.length - 1;
            }
            else if (wentPast && !fwd) {
                // we went past and have to go one back
                this._nextIdx -= 1;
            }
        }
        if (this._nextIdx < 0) {
            this._nextIdx = this._markers.length - 1;
        }
    }
    resetIndex() {
        this._nextIdx = -1;
    }
    move(fwd, model, position) {
        if (this._markers.length === 0) {
            return false;
        }
        const oldIdx = this._nextIdx;
        if (this._nextIdx === -1) {
            this._initIdx(model, position, fwd);
        }
        else if (fwd) {
            this._nextIdx = (this._nextIdx + 1) % this._markers.length;
        }
        else if (!fwd) {
            this._nextIdx = (this._nextIdx - 1 + this._markers.length) % this._markers.length;
        }
        if (oldIdx !== this._nextIdx) {
            return true;
        }
        return false;
    }
    find(uri, position) {
        let idx = this._markers.findIndex((marker) => marker.resource.toString() === uri.toString());
        if (idx < 0) {
            return undefined;
        }
        for (; idx < this._markers.length; idx++) {
            if (Range.containsPosition(this._markers[idx], position)) {
                return new MarkerCoordinate(this._markers[idx], idx + 1, this._markers.length);
            }
        }
        return undefined;
    }
};
MarkerList = __decorate([
    __param(1, IMarkerService),
    __param(2, IConfigurationService)
], MarkerList);
export { MarkerList };
export const IMarkerNavigationService = createDecorator('IMarkerNavigationService');
let MarkerNavigationService = class MarkerNavigationService {
    constructor(_markerService, _configService) {
        this._markerService = _markerService;
        this._configService = _configService;
        this._provider = new LinkedList();
    }
    registerProvider(provider) {
        const remove = this._provider.unshift(provider);
        return toDisposable(() => remove());
    }
    getMarkerList(resource) {
        for (const provider of this._provider) {
            const result = provider.getMarkerList(resource);
            if (result) {
                return result;
            }
        }
        // default
        return new MarkerList(resource, this._markerService, this._configService);
    }
};
MarkerNavigationService = __decorate([
    __param(0, IMarkerService),
    __param(1, IConfigurationService)
], MarkerNavigationService);
registerSingleton(IMarkerNavigationService, MarkerNavigationService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyTmF2aWdhdGlvblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9nb3RvRXJyb3IvYnJvd3Nlci9tYXJrZXJOYXZpZ2F0aW9uU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZUFBZSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVyRCxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixjQUFjLEVBQ2QsY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRTlELE1BQU0sT0FBTyxnQkFBZ0I7SUFDNUIsWUFDVSxNQUFlLEVBQ2YsS0FBYSxFQUNiLEtBQWE7UUFGYixXQUFNLEdBQU4sTUFBTSxDQUFTO1FBQ2YsVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUNiLFVB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