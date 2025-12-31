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
import { IMarkerService, MarkerSeverity, } from '../../../platform/markers/common/markers.js';
import { Disposable, toDisposable } from '../../../base/common/lifecycle.js';
import { OverviewRulerLane, } from '../model.js';
import { themeColorFromId } from '../../../platform/theme/common/themeService.js';
import { overviewRulerWarning, overviewRulerInfo, overviewRulerError, } from '../core/editorColorRegistry.js';
import { IModelService } from './model.js';
import { Range } from '../core/range.js';
import { Schemas } from '../../../base/common/network.js';
import { Emitter } from '../../../base/common/event.js';
import { minimapInfo, minimapWarning, minimapError, } from '../../../platform/theme/common/colorRegistry.js';
import { BidirectionalMap, ResourceMap } from '../../../base/common/map.js';
import { diffSets } from '../../../base/common/collections.js';
import { Iterable } from '../../../base/common/iterator.js';
let MarkerDecorationsService = class MarkerDecorationsService extends Disposable {
    constructor(modelService, _markerService) {
        super();
        this._markerService = _markerService;
        this._onDidChangeMarker = this._register(new Emitter());
        this.onDidChangeMarker = this._onDidChangeMarker.event;
        this._suppressedRanges = new ResourceMap();
        this._markerDecorations = new ResourceMap();
        modelService.getModels().forEach((model) => this._onModelAdded(model));
        this._register(modelService.onModelAdded(this._onModelAdded, this));
        this._register(modelService.onModelRemoved(this._onModelRemoved, this));
        this._register(this._markerService.onMarkerChanged(this._handleMarkerChange, this));
    }
    dispose() {
        super.dispose();
        this._markerDecorations.forEach((value) => value.dispose());
        this._markerDecorations.clear();
    }
    getMarker(uri, decoration) {
        const markerDecorations = this._markerDecorations.get(uri);
        return markerDecorations ? markerDecorations.getMarker(decoration) || null : null;
    }
    getLiveMarkers(uri) {
        const markerDecorations = this._markerDecorations.get(uri);
        return markerDecorations ? markerDecorations.getMarkers() : [];
    }
    addMarkerSuppression(uri, range) {
        let suppressedRanges = this._suppressedRanges.get(uri);
        if (!suppressedRanges) {
            suppressedRanges = new Set();
            this._suppressedRanges.set(uri, suppressedRanges);
        }
        suppressedRanges.add(range);
        this._handleMarkerChange([uri]);
        return toDisposable(() => {
            const suppressedRanges = this._suppressedRanges.get(uri);
            if (suppressedRanges) {
                suppressedRanges.delete(range);
                if (suppressedRanges.size === 0) {
                    this._suppressedRanges.delete(uri);
                }
                this._handleMarkerChange([uri]);
            }
        });
    }
    _handleMarkerChange(changedResources) {
        changedResources.forEach((resource) => {
            const markerDecorations = this._markerDecorations.get(resource);
            if (markerDecorations) {
                this._updateDecorations(markerDecorations);
            }
        });
    }
    _onModelAdded(model) {
        const markerDecorations = new MarkerDecorations(model);
        this._markerDecorations.set(model.uri, markerDecorations);
        this._updateDecorations(markerDecorations);
    }
    _onModelRemoved(model) {
        const markerDecorations = this._markerDecorations.get(model.uri);
        if (markerDecorations) {
            markerDecorations.dispose();
            this._markerDecorations.delete(model.uri);
        }
        // clean up markers for internal, transient models
        if (model.uri.scheme === Schemas.inMemory ||
            model.uri.scheme === Schemas.internal ||
            model.uri.scheme === Schemas.vscode) {
            this._markerService
                ?.read({ resource: model.uri })
                .map((marker) => marker.owner)
                .forEach((owner) => this._markerService.remove(owner, [model.uri]));
        }
    }
    _updateDecorations(markerDecorations) {
        // Limit to the first 500 errors/warnings
        let markers = this._markerService.read({ resource: markerDecorations.model.uri, take: 500 });
        // filter markers from suppressed ranges
        const suppressedRanges = this._suppressedRanges.get(markerDecorations.model.uri);
        if (suppressedRanges) {
            markers = markers.filter((marker) => {
                return !Iterable.some(suppressedRanges, (candidate) => Range.areIntersectingOrTouching(candidate, marker));
            });
        }
        if (markerDecorations.update(markers)) {
            this._onDidChangeMarker.fire(markerDecorations.model);
        }
    }
};
MarkerDecorationsService = __decorate([
    __param(0, IModelService),
    __param(1, IMarkerService)
], MarkerDecorationsService);
export { MarkerDecorationsService };
class MarkerDecorations extends Disposable {
    constructor(model) {
        super();
        this.model = model;
        this._map = new BidirectionalMap();
        this._register(toDisposable(() => {
            this.model.deltaDecorations([...this._map.values()], []);
            this._map.clear();
        }));
    }
    update(markers) {
        // We use the fact that marker instances are not recreated when different owners
        // update. So we can compare references to find out what changed since the last update.
        const { added, removed } = diffSets(new Set(this._map.keys()), new Set(markers));
        if (added.length === 0 && removed.length === 0) {
            return false;
        }
        const oldIds = removed.map((marker) => this._map.get(marker));
        const newDecorations = added.map((marker) => {
            return {
                range: this._createDecorationRange(this.model, marker),
                options: this._createDecorationOption(marker),
            };
        });
        const ids = this.model.deltaDecorations(oldIds, newDecorations);
        for (const removedMarker of removed) {
            this._map.delete(removedMarker);
        }
        for (let index = 0; index < ids.length; index++) {
            this._map.set(added[index], ids[index]);
        }
        return true;
    }
    getMarker(decoration) {
        return this._map.getKey(decoration.id);
    }
    getMarkers() {
        const res = [];
        this._map.forEach((id, marker) => {
            const range = this.model.getDecorationRange(id);
            if (range) {
                res.push([range, marker]);
            }
        });
        return res;
    }
    _createDecorationRange(model, rawMarker) {
        let ret = Range.lift(rawMarker);
        if (rawMarker.severity === MarkerSeverity.Hint &&
            !this._hasMarkerTag(rawMarker, 1 /* MarkerTag.Unnecessary */) &&
            !this._hasMarkerTag(rawMarker, 2 /* MarkerTag.Deprecated */)) {
            // * never render hints on multiple lines
            // * make enough space for three dots
            ret = ret.setEndPosition(ret.startLineNumber, ret.startColumn + 2);
        }
        ret = model.validateRange(ret);
        if (ret.isEmpty()) {
            const maxColumn = model.getLineLastNonWhitespaceColumn(ret.startLineNumber) ||
                model.getLineMaxColumn(ret.startLineNumber);
            if (maxColumn === 1 || ret.endColumn >= maxColumn) {
                // empty line or behind eol
                // keep the range as is, it will be rendered 1ch wide
                return ret;
            }
            const word = model.getWordAtPosition(ret.getStartPosition());
            if (word) {
                ret = new Range(ret.startLineNumber, word.startColumn, ret.endLineNumber, word.endColumn);
            }
        }
        else if (rawMarker.endColumn === Number.MAX_VALUE &&
            rawMarker.startColumn === 1 &&
            ret.startLineNumber === ret.endLineNumber) {
            const minColumn = model.getLineFirstNonWhitespaceColumn(rawMarker.startLineNumber);
            if (minColumn < ret.endColumn) {
                ret = new Range(ret.startLineNumber, minColumn, ret.endLineNumber, ret.endColumn);
                rawMarker.startColumn = minColumn;
            }
        }
        return ret;
    }
    _createDecorationOption(marker) {
        let className;
        let color = undefined;
        let zIndex;
        let inlineClassName = undefined;
        let minimap;
        switch (marker.severity) {
            case MarkerSeverity.Hint:
                if (this._hasMarkerTag(marker, 2 /* MarkerTag.Deprecated */)) {
                    className = undefined;
                }
                else if (this._hasMarkerTag(marker, 1 /* MarkerTag.Unnecessary */)) {
                    className = "squiggly-unnecessary" /* ClassName.EditorUnnecessaryDecoration */;
                }
                else {
                    className = "squiggly-hint" /* ClassName.EditorHintDecoration */;
                }
                zIndex = 0;
                break;
            case MarkerSeverity.Info:
                className = "squiggly-info" /* ClassName.EditorInfoDecoration */;
                color = themeColorFromId(overviewRulerInfo);
                zIndex = 10;
                minimap = {
                    color: themeColorFromId(minimapInfo),
                    position: 1 /* MinimapPosition.Inline */,
                };
                break;
            case MarkerSeverity.Warning:
                className = "squiggly-warning" /* ClassName.EditorWarningDecoration */;
                color = themeColorFromId(overviewRulerWarning);
                zIndex = 20;
                minimap = {
                    color: themeColorFromId(minimapWarning),
                    position: 1 /* MinimapPosition.Inline */,
                };
                break;
            case MarkerSeverity.Error:
            default:
                className = "squiggly-error" /* ClassName.EditorErrorDecoration */;
                color = themeColorFromId(overviewRulerError);
                zIndex = 30;
                minimap = {
                    color: themeColorFromId(minimapError),
                    position: 1 /* MinimapPosition.Inline */,
                };
                break;
        }
        if (marker.tags) {
            if (marker.tags.indexOf(1 /* MarkerTag.Unnecessary */) !== -1) {
                inlineClassName = "squiggly-inline-unnecessary" /* ClassName.EditorUnnecessaryInlineDecoration */;
            }
            if (marker.tags.indexOf(2 /* MarkerTag.Deprecated */) !== -1) {
                inlineClassName = "squiggly-inline-deprecated" /* ClassName.EditorDeprecatedInlineDecoration */;
            }
        }
        return {
            description: 'marker-decoration',
            stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
            className,
            showIfCollapsed: true,
            overviewRuler: {
                color,
                position: OverviewRulerLane.Right,
            },
            minimap,
            zIndex,
            inlineClassName,
        };
    }
    _hasMarkerTag(marker, tag) {
        if (marker.tags) {
            return marker.tags.indexOf(tag) >= 0;
        }
        return false;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy9tYXJrZXJEZWNvcmF0aW9uc1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGNBQWMsRUFFZCxjQUFjLEdBRWQsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXpGLE9BQU8sRUFLTixpQkFBaUIsR0FJakIsTUFBTSxhQUFhLENBQUE7QUFFcEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFakYsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixpQkFBaUIsRUFDakIsa0JBQWtCLEdBQ2xCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMxQyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sV0FBVyxFQUNYLGNBQWMsRUFDZCxZQUFZLEdBQ1osTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsV0FBVyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVwRCxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5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