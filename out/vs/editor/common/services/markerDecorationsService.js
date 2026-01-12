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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyRGVjb3JhdGlvbnNTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3NlcnZpY2VzL21hcmtlckRlY29yYXRpb25zU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGNBQWMsR0FFZCxNQUFNLDZDQUE2QyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxVQUFVLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFekYsT0FBTyxFQUtOLGlCQUFpQixHQUlqQixNQUFNLGFBQWEsQ0FBQTtBQUVwQixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVqRixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLGlCQUFpQixFQUNqQixrQkFBa0IsR0FDbEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzFDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUV4QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFDTixXQUFXLEVBQ1gsY0FBYyxFQUNkLFlBQVksR0FDWixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXBELElBQU0sd0JBQXdCLEdBQTlCLE1BQU0s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