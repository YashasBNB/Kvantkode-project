/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../../base/common/uri.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { DisposableStore, Disposable } from '../../../../base/common/lifecycle.js';
import { createLineMatcher, ApplyToKind, getResource, } from './problemMatcher.js';
import { IMarkerData, } from '../../../../platform/markers/common/markers.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { isWindows } from '../../../../base/common/platform.js';
export var ProblemCollectorEventKind;
(function (ProblemCollectorEventKind) {
    ProblemCollectorEventKind["BackgroundProcessingBegins"] = "backgroundProcessingBegins";
    ProblemCollectorEventKind["BackgroundProcessingEnds"] = "backgroundProcessingEnds";
})(ProblemCollectorEventKind || (ProblemCollectorEventKind = {}));
var IProblemCollectorEvent;
(function (IProblemCollectorEvent) {
    function create(kind) {
        return Object.freeze({ kind });
    }
    IProblemCollectorEvent.create = create;
})(IProblemCollectorEvent || (IProblemCollectorEvent = {}));
export class AbstractProblemCollector extends Disposable {
    constructor(problemMatchers, markerService, modelService, fileService) {
        super();
        this.problemMatchers = problemMatchers;
        this.markerService = markerService;
        this.modelService = modelService;
        this.modelListeners = new DisposableStore();
        this._onDidFindFirstMatch = new Emitter();
        this.onDidFindFirstMatch = this._onDidFindFirstMatch.event;
        this._onDidFindErrors = new Emitter();
        this.onDidFindErrors = this._onDidFindErrors.event;
        this._onDidRequestInvalidateLastMarker = new Emitter();
        this.onDidRequestInvalidateLastMarker = this._onDidRequestInvalidateLastMarker.event;
        this.matchers = Object.create(null);
        this.bufferLength = 1;
        problemMatchers
            .map((elem) => createLineMatcher(elem, fileService))
            .forEach((matcher) => {
            const length = matcher.matchLength;
            if (length > this.bufferLength) {
                this.bufferLength = length;
            }
            let value = this.matchers[length];
            if (!value) {
                value = [];
                this.matchers[length] = value;
            }
            value.push(matcher);
        });
        this.buffer = [];
        this.activeMatcher = null;
        this._numberOfMatches = 0;
        this._maxMarkerSeverity = undefined;
        this.openModels = Object.create(null);
        this.applyToByOwner = new Map();
        for (const problemMatcher of problemMatchers) {
            const current = this.applyToByOwner.get(problemMatcher.owner);
            if (current === undefined) {
                this.applyToByOwner.set(problemMatcher.owner, problemMatcher.applyTo);
            }
            else {
                this.applyToByOwner.set(problemMatcher.owner, this.mergeApplyTo(current, problemMatcher.applyTo));
            }
        }
        this.resourcesToClean = new Map();
        this.markers = new Map();
        this.deliveredMarkers = new Map();
        this._register(this.modelService.onModelAdded((model) => {
            this.openModels[model.uri.toString()] = true;
        }, this, this.modelListeners));
        this._register(this.modelService.onModelRemoved((model) => {
            delete this.openModels[model.uri.toString()];
        }, this, this.modelListeners));
        this.modelService.getModels().forEach((model) => (this.openModels[model.uri.toString()] = true));
        this._onDidStateChange = new Emitter();
    }
    get onDidStateChange() {
        return this._onDidStateChange.event;
    }
    processLine(line) {
        if (this.tail) {
            const oldTail = this.tail;
            this.tail = oldTail.then(() => {
                return this.processLineInternal(line);
            });
        }
        else {
            this.tail = this.processLineInternal(line);
        }
    }
    dispose() {
        super.dispose();
        this.modelListeners.dispose();
    }
    get numberOfMatches() {
        return this._numberOfMatches;
    }
    get maxMarkerSeverity() {
        return this._maxMarkerSeverity;
    }
    tryFindMarker(line) {
        let result = null;
        if (this.activeMatcher) {
            result = this.activeMatcher.next(line);
            if (result) {
                this.captureMatch(result);
                return result;
            }
            this.clearBuffer();
            this.activeMatcher = null;
        }
        if (this.buffer.length < this.bufferLength) {
            this.buffer.push(line);
        }
        else {
            const end = this.buffer.length - 1;
            for (let i = 0; i < end; i++) {
                this.buffer[i] = this.buffer[i + 1];
            }
            this.buffer[end] = line;
        }
        result = this.tryMatchers();
        if (result) {
            this.clearBuffer();
        }
        return result;
    }
    async shouldApplyMatch(result) {
        switch (result.description.applyTo) {
            case ApplyToKind.allDocuments:
                return true;
            case ApplyToKind.openDocuments:
                return !!this.openModels[(await result.resource).toString()];
            case ApplyToKind.closedDocuments:
                return !this.openModels[(await result.resource).toString()];
            default:
                return true;
        }
    }
    mergeApplyTo(current, value) {
        if (current === value || current === ApplyToKind.allDocuments) {
            return current;
        }
        return ApplyToKind.allDocuments;
    }
    tryMatchers() {
        this.activeMatcher = null;
        const length = this.buffer.length;
        for (let startIndex = 0; startIndex < length; startIndex++) {
            const candidates = this.matchers[length - startIndex];
            if (!candidates) {
                continue;
            }
            for (const matcher of candidates) {
                const result = matcher.handle(this.buffer, startIndex);
                if (result.match) {
                    this.captureMatch(result.match);
                    if (result.continue) {
                        this.activeMatcher = matcher;
                    }
                    return result.match;
                }
            }
        }
        return null;
    }
    captureMatch(match) {
        this._numberOfMatches++;
        if (this._maxMarkerSeverity === undefined || match.marker.severity > this._maxMarkerSeverity) {
            this._maxMarkerSeverity = match.marker.severity;
        }
    }
    clearBuffer() {
        if (this.buffer.length > 0) {
            this.buffer = [];
        }
    }
    recordResourcesToClean(owner) {
        const resourceSetToClean = this.getResourceSetToClean(owner);
        this.markerService
            .read({ owner: owner })
            .forEach((marker) => resourceSetToClean.set(marker.resource.toString(), marker.resource));
    }
    recordResourceToClean(owner, resource) {
        this.getResourceSetToClean(owner).set(resource.toString(), resource);
    }
    removeResourceToClean(owner, resource) {
        const resourceSet = this.resourcesToClean.get(owner);
        resourceSet?.delete(resource);
    }
    getResourceSetToClean(owner) {
        let result = this.resourcesToClean.get(owner);
        if (!result) {
            result = new Map();
            this.resourcesToClean.set(owner, result);
        }
        return result;
    }
    cleanAllMarkers() {
        this.resourcesToClean.forEach((value, owner) => {
            this._cleanMarkers(owner, value);
        });
        this.resourcesToClean = new Map();
    }
    cleanMarkers(owner) {
        const toClean = this.resourcesToClean.get(owner);
        if (toClean) {
            this._cleanMarkers(owner, toClean);
            this.resourcesToClean.delete(owner);
        }
    }
    _cleanMarkers(owner, toClean) {
        const uris = [];
        const applyTo = this.applyToByOwner.get(owner);
        toClean.forEach((uri, uriAsString) => {
            if (applyTo === ApplyToKind.allDocuments ||
                (applyTo === ApplyToKind.openDocuments && this.openModels[uriAsString]) ||
                (applyTo === ApplyToKind.closedDocuments && !this.openModels[uriAsString])) {
                uris.push(uri);
            }
        });
        this.markerService.remove(owner, uris);
    }
    recordMarker(marker, owner, resourceAsString) {
        let markersPerOwner = this.markers.get(owner);
        if (!markersPerOwner) {
            markersPerOwner = new Map();
            this.markers.set(owner, markersPerOwner);
        }
        let markersPerResource = markersPerOwner.get(resourceAsString);
        if (!markersPerResource) {
            markersPerResource = new Map();
            markersPerOwner.set(resourceAsString, markersPerResource);
        }
        const key = IMarkerData.makeKeyOptionalMessage(marker, false);
        let existingMarker;
        if (!markersPerResource.has(key)) {
            markersPerResource.set(key, marker);
        }
        else if ((existingMarker = markersPerResource.get(key)) !== undefined &&
            existingMarker.message.length < marker.message.length &&
            isWindows) {
            // Most likely https://github.com/microsoft/vscode/issues/77475
            // Heuristic dictates that when the key is the same and message is smaller, we have hit this limitation.
            markersPerResource.set(key, marker);
        }
    }
    reportMarkers() {
        this.markers.forEach((markersPerOwner, owner) => {
            const deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
            markersPerOwner.forEach((markers, resource) => {
                this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markers, deliveredMarkersPerOwner);
            });
        });
    }
    deliverMarkersPerOwnerAndResource(owner, resource) {
        const markersPerOwner = this.markers.get(owner);
        if (!markersPerOwner) {
            return;
        }
        const deliveredMarkersPerOwner = this.getDeliveredMarkersPerOwner(owner);
        const markersPerResource = markersPerOwner.get(resource);
        if (!markersPerResource) {
            return;
        }
        this.deliverMarkersPerOwnerAndResourceResolved(owner, resource, markersPerResource, deliveredMarkersPerOwner);
    }
    deliverMarkersPerOwnerAndResourceResolved(owner, resource, markers, reported) {
        if (markers.size !== reported.get(resource)) {
            const toSet = [];
            markers.forEach((value) => toSet.push(value));
            this.markerService.changeOne(owner, URI.parse(resource), toSet);
            reported.set(resource, markers.size);
        }
    }
    getDeliveredMarkersPerOwner(owner) {
        let result = this.deliveredMarkers.get(owner);
        if (!result) {
            result = new Map();
            this.deliveredMarkers.set(owner, result);
        }
        return result;
    }
    cleanMarkerCaches() {
        this._numberOfMatches = 0;
        this._maxMarkerSeverity = undefined;
        this.markers.clear();
        this.deliveredMarkers.clear();
    }
    done() {
        this.reportMarkers();
        this.cleanAllMarkers();
    }
}
export var ProblemHandlingStrategy;
(function (ProblemHandlingStrategy) {
    ProblemHandlingStrategy[ProblemHandlingStrategy["Clean"] = 0] = "Clean";
})(ProblemHandlingStrategy || (ProblemHandlingStrategy = {}));
export class StartStopProblemCollector extends AbstractProblemCollector {
    constructor(problemMatchers, markerService, modelService, _strategy = 0 /* ProblemHandlingStrategy.Clean */, fileService) {
        super(problemMatchers, markerService, modelService, fileService);
        this._hasStarted = false;
        const ownerSet = Object.create(null);
        problemMatchers.forEach((description) => (ownerSet[description.owner] = true));
        this.owners = Object.keys(ownerSet);
        this.owners.forEach((owner) => {
            this.recordResourcesToClean(owner);
        });
    }
    async processLineInternal(line) {
        if (!this._hasStarted) {
            this._hasStarted = true;
            this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
        }
        const markerMatch = this.tryFindMarker(line);
        if (!markerMatch) {
            return;
        }
        const owner = markerMatch.description.owner;
        const resource = await markerMatch.resource;
        const resourceAsString = resource.toString();
        this.removeResourceToClean(owner, resourceAsString);
        const shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
        if (shouldApplyMatch) {
            this.recordMarker(markerMatch.marker, owner, resourceAsString);
            if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
                if (this.currentOwner && this.currentResource) {
                    this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
                }
                this.currentOwner = owner;
                this.currentResource = resourceAsString;
            }
        }
    }
}
export class WatchingProblemCollector extends AbstractProblemCollector {
    constructor(problemMatchers, markerService, modelService, fileService) {
        super(problemMatchers, markerService, modelService, fileService);
        this.lines = [];
        this.beginPatterns = [];
        this.resetCurrentResource();
        this.backgroundPatterns = [];
        this._activeBackgroundMatchers = new Set();
        this.problemMatchers.forEach((matcher) => {
            if (matcher.watching) {
                const key = generateUuid();
                this.backgroundPatterns.push({
                    key,
                    matcher: matcher,
                    begin: matcher.watching.beginsPattern,
                    end: matcher.watching.endsPattern,
                });
                this.beginPatterns.push(matcher.watching.beginsPattern.regexp);
            }
        });
        this.modelListeners.add(this.modelService.onModelRemoved((modelEvent) => {
            let markerChanged = Event.debounce(this.markerService.onMarkerChanged, (last, e) => (last ?? []).concat(e), 500, false, true)(async (markerEvent) => {
                if (!markerEvent ||
                    !markerEvent.includes(modelEvent.uri) ||
                    this.markerService.read({ resource: modelEvent.uri }).length !== 0) {
                    return;
                }
                const oldLines = Array.from(this.lines);
                for (const line of oldLines) {
                    await this.processLineInternal(line);
                }
            });
            this._register(markerChanged); // Ensures markerChanged is tracked and disposed of properly
            setTimeout(() => {
                if (markerChanged) {
                    const _markerChanged = markerChanged;
                    markerChanged = undefined;
                    _markerChanged.dispose();
                }
            }, 600);
        }));
    }
    aboutToStart() {
        for (const background of this.backgroundPatterns) {
            if (background.matcher.watching && background.matcher.watching.activeOnStart) {
                this._activeBackgroundMatchers.add(background.key);
                this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
                this.recordResourcesToClean(background.matcher.owner);
            }
        }
    }
    async processLineInternal(line) {
        if ((await this.tryBegin(line)) || this.tryFinish(line)) {
            return;
        }
        this.lines.push(line);
        const markerMatch = this.tryFindMarker(line);
        if (!markerMatch) {
            return;
        }
        const resource = await markerMatch.resource;
        const owner = markerMatch.description.owner;
        const resourceAsString = resource.toString();
        this.removeResourceToClean(owner, resourceAsString);
        const shouldApplyMatch = await this.shouldApplyMatch(markerMatch);
        if (shouldApplyMatch) {
            this.recordMarker(markerMatch.marker, owner, resourceAsString);
            if (this.currentOwner !== owner || this.currentResource !== resourceAsString) {
                this.reportMarkersForCurrentResource();
                this.currentOwner = owner;
                this.currentResource = resourceAsString;
            }
        }
    }
    forceDelivery() {
        this.reportMarkersForCurrentResource();
    }
    async tryBegin(line) {
        let result = false;
        for (const background of this.backgroundPatterns) {
            const matches = background.begin.regexp.exec(line);
            if (matches) {
                if (this._activeBackgroundMatchers.has(background.key)) {
                    continue;
                }
                this._activeBackgroundMatchers.add(background.key);
                result = true;
                this._onDidFindFirstMatch.fire();
                this.lines = [];
                this.lines.push(line);
                this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingBegins" /* ProblemCollectorEventKind.BackgroundProcessingBegins */));
                this.cleanMarkerCaches();
                this.resetCurrentResource();
                const owner = background.matcher.owner;
                const file = matches[background.begin.file];
                if (file) {
                    const resource = getResource(file, background.matcher);
                    this.recordResourceToClean(owner, await resource);
                }
                else {
                    this.recordResourcesToClean(owner);
                }
            }
        }
        return result;
    }
    tryFinish(line) {
        let result = false;
        for (const background of this.backgroundPatterns) {
            const matches = background.end.regexp.exec(line);
            if (matches) {
                if (this._numberOfMatches > 0) {
                    this._onDidFindErrors.fire();
                }
                else {
                    this._onDidRequestInvalidateLastMarker.fire();
                }
                if (this._activeBackgroundMatchers.has(background.key)) {
                    this._activeBackgroundMatchers.delete(background.key);
                    this.resetCurrentResource();
                    this._onDidStateChange.fire(IProblemCollectorEvent.create("backgroundProcessingEnds" /* ProblemCollectorEventKind.BackgroundProcessingEnds */));
                    result = true;
                    this.lines.push(line);
                    const owner = background.matcher.owner;
                    this.cleanMarkers(owner);
                    this.cleanMarkerCaches();
                }
            }
        }
        return result;
    }
    resetCurrentResource() {
        this.reportMarkersForCurrentResource();
        this.currentOwner = undefined;
        this.currentResource = undefined;
    }
    reportMarkersForCurrentResource() {
        if (this.currentOwner && this.currentResource) {
            this.deliverMarkersPerOwnerAndResource(this.currentOwner, this.currentResource);
        }
    }
    done() {
        ;
        [...this.applyToByOwner.keys()].forEach((owner) => {
            this.recordResourcesToClean(owner);
        });
        super.done();
    }
    isWatching() {
        return this.backgroundPatterns.length > 0;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvYmxlbUNvbGxlY3RvcnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90YXNrcy9jb21tb24vcHJvYmxlbUNvbGxlY3RvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFlLGVBQWUsRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUkvRixPQUFPLEVBRU4saUJBQWlCLEVBR2pCLFdBQVcsRUFFWCxXQUFXLEdBQ1gsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBRU4sV0FBVyxHQUVYLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUvRCxNQUFNLENBQU4sSUFBa0IseUJBR2pCO0FBSEQsV0FBa0IseUJBQXlCO0lBQzFDLHNGQUF5RCxDQUFBO0lBQ3pELGtGQUFxRCxDQUFBO0FBQ3RELENBQUMsRUFIaUIseUJBQXlCLEtBQXpCLHlCQUF5QixRQUcxQztBQU1ELElBQVUsc0JBQXNCLENBSS9CO0FBSkQsV0FBVSxzQkFBc0I7SUFDL0IsU0FBZ0IsTUFBTSxDQUFDLElBQStCO1FBQ3JELE9BQU8sTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDL0IsQ0FBQztJQUZlLDZCQUFNLFNBRXJCLENBQUE7QUFDRixDQUFDLEVBSlMsc0JBQXNCLEtBQXRCLHNCQUFzQixRQUkvQjtBQU1ELE1BQU0sT0FBZ0Isd0JBQXlC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