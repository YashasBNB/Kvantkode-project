/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../../../common/core/range.js';
import { OverviewRulerLane, } from '../../../common/model.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { minimapFindMatch, overviewRulerFindMatchForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
export class FindDecorations {
    constructor(editor) {
        this._editor = editor;
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
        this._startPosition = this._editor.getPosition();
    }
    dispose() {
        this._editor.removeDecorations(this._allDecorations());
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
    }
    reset() {
        this._decorations = [];
        this._overviewRulerApproximateDecorations = [];
        this._findScopeDecorationIds = [];
        this._rangeHighlightDecorationId = null;
        this._highlightedDecorationId = null;
    }
    getCount() {
        return this._decorations.length;
    }
    /** @deprecated use getFindScopes to support multiple selections */
    getFindScope() {
        if (this._findScopeDecorationIds[0]) {
            return this._editor.getModel().getDecorationRange(this._findScopeDecorationIds[0]);
        }
        return null;
    }
    getFindScopes() {
        if (this._findScopeDecorationIds.length) {
            const scopes = this._findScopeDecorationIds
                .map((findScopeDecorationId) => this._editor.getModel().getDecorationRange(findScopeDecorationId))
                .filter((element) => !!element);
            if (scopes.length) {
                return scopes;
            }
        }
        return null;
    }
    getStartPosition() {
        return this._startPosition;
    }
    setStartPosition(newStartPosition) {
        this._startPosition = newStartPosition;
        this.setCurrentFindMatch(null);
    }
    _getDecorationIndex(decorationId) {
        const index = this._decorations.indexOf(decorationId);
        if (index >= 0) {
            return index + 1;
        }
        return 1;
    }
    getDecorationRangeAt(index) {
        const decorationId = index < this._decorations.length ? this._decorations[index] : null;
        if (decorationId) {
            return this._editor.getModel().getDecorationRange(decorationId);
        }
        return null;
    }
    getCurrentMatchesPosition(desiredRange) {
        const candidates = this._editor.getModel().getDecorationsInRange(desiredRange);
        for (const candidate of candidates) {
            const candidateOpts = candidate.options;
            if (candidateOpts === FindDecorations._FIND_MATCH_DECORATION ||
                candidateOpts === FindDecorations._CURRENT_FIND_MATCH_DECORATION) {
                return this._getDecorationIndex(candidate.id);
            }
        }
        // We don't know the current match position, so returns zero to show '?' in find widget
        return 0;
    }
    setCurrentFindMatch(nextMatch) {
        let newCurrentDecorationId = null;
        let matchPosition = 0;
        if (nextMatch) {
            for (let i = 0, len = this._decorations.length; i < len; i++) {
                const range = this._editor.getModel().getDecorationRange(this._decorations[i]);
                if (nextMatch.equalsRange(range)) {
                    newCurrentDecorationId = this._decorations[i];
                    matchPosition = i + 1;
                    break;
                }
            }
        }
        if (this._highlightedDecorationId !== null || newCurrentDecorationId !== null) {
            this._editor.changeDecorations((changeAccessor) => {
                if (this._highlightedDecorationId !== null) {
                    changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._FIND_MATCH_DECORATION);
                    this._highlightedDecorationId = null;
                }
                if (newCurrentDecorationId !== null) {
                    this._highlightedDecorationId = newCurrentDecorationId;
                    changeAccessor.changeDecorationOptions(this._highlightedDecorationId, FindDecorations._CURRENT_FIND_MATCH_DECORATION);
                }
                if (this._rangeHighlightDecorationId !== null) {
                    changeAccessor.removeDecoration(this._rangeHighlightDecorationId);
                    this._rangeHighlightDecorationId = null;
                }
                if (newCurrentDecorationId !== null) {
                    let rng = this._editor.getModel().getDecorationRange(newCurrentDecorationId);
                    if (rng.startLineNumber !== rng.endLineNumber && rng.endColumn === 1) {
                        const lineBeforeEnd = rng.endLineNumber - 1;
                        const lineBeforeEndMaxColumn = this._editor.getModel().getLineMaxColumn(lineBeforeEnd);
                        rng = new Range(rng.startLineNumber, rng.startColumn, lineBeforeEnd, lineBeforeEndMaxColumn);
                    }
                    this._rangeHighlightDecorationId = changeAccessor.addDecoration(rng, FindDecorations._RANGE_HIGHLIGHT_DECORATION);
                }
            });
        }
        return matchPosition;
    }
    set(findMatches, findScopes) {
        this._editor.changeDecorations((accessor) => {
            let findMatchesOptions = FindDecorations._FIND_MATCH_DECORATION;
            const newOverviewRulerApproximateDecorations = [];
            if (findMatches.length > 1000) {
                // we go into a mode where the overview ruler gets "approximate" decorations
                // the reason is that the overview ruler paints all the decorations in the file and we don't want to cause freezes
                findMatchesOptions = FindDecorations._FIND_MATCH_NO_OVERVIEW_DECORATION;
                // approximate a distance in lines where matches should be merged
                const lineCount = this._editor.getModel().getLineCount();
                const height = this._editor.getLayoutInfo().height;
                const approxPixelsPerLine = height / lineCount;
                const mergeLinesDelta = Math.max(2, Math.ceil(3 / approxPixelsPerLine));
                // merge decorations as much as possible
                let prevStartLineNumber = findMatches[0].range.startLineNumber;
                let prevEndLineNumber = findMatches[0].range.endLineNumber;
                for (let i = 1, len = findMatches.length; i < len; i++) {
                    const range = findMatches[i].range;
                    if (prevEndLineNumber + mergeLinesDelta >= range.startLineNumber) {
                        if (range.endLineNumber > prevEndLineNumber) {
                            prevEndLineNumber = range.endLineNumber;
                        }
                    }
                    else {
                        newOverviewRulerApproximateDecorations.push({
                            range: new Range(prevStartLineNumber, 1, prevEndLineNumber, 1),
                            options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION,
                        });
                        prevStartLineNumber = range.startLineNumber;
                        prevEndLineNumber = range.endLineNumber;
                    }
                }
                newOverviewRulerApproximateDecorations.push({
                    range: new Range(prevStartLineNumber, 1, prevEndLineNumber, 1),
                    options: FindDecorations._FIND_MATCH_ONLY_OVERVIEW_DECORATION,
                });
            }
            // Find matches
            const newFindMatchesDecorations = new Array(findMatches.length);
            for (let i = 0, len = findMatches.length; i < len; i++) {
                newFindMatchesDecorations[i] = {
                    range: findMatches[i].range,
                    options: findMatchesOptions,
                };
            }
            this._decorations = accessor.deltaDecorations(this._decorations, newFindMatchesDecorations);
            // Overview ruler approximate decorations
            this._overviewRulerApproximateDecorations = accessor.deltaDecorations(this._overviewRulerApproximateDecorations, newOverviewRulerApproximateDecorations);
            // Range highlight
            if (this._rangeHighlightDecorationId) {
                accessor.removeDecoration(this._rangeHighlightDecorationId);
                this._rangeHighlightDecorationId = null;
            }
            // Find scope
            if (this._findScopeDecorationIds.length) {
                this._findScopeDecorationIds.forEach((findScopeDecorationId) => accessor.removeDecoration(findScopeDecorationId));
                this._findScopeDecorationIds = [];
            }
            if (findScopes?.length) {
                this._findScopeDecorationIds = findScopes.map((findScope) => accessor.addDecoration(findScope, FindDecorations._FIND_SCOPE_DECORATION));
            }
        });
    }
    matchBeforePosition(position) {
        if (this._decorations.length === 0) {
            return null;
        }
        for (let i = this._decorations.length - 1; i >= 0; i--) {
            const decorationId = this._decorations[i];
            const r = this._editor.getModel().getDecorationRange(decorationId);
            if (!r || r.endLineNumber > position.lineNumber) {
                continue;
            }
            if (r.endLineNumber < position.lineNumber) {
                return r;
            }
            if (r.endColumn > position.column) {
                continue;
            }
            return r;
        }
        return this._editor
            .getModel()
            .getDecorationRange(this._decorations[this._decorations.length - 1]);
    }
    matchAfterPosition(position) {
        if (this._decorations.length === 0) {
            return null;
        }
        for (let i = 0, len = this._decorations.length; i < len; i++) {
            const decorationId = this._decorations[i];
            const r = this._editor.getModel().getDecorationRange(decorationId);
            if (!r || r.startLineNumber < position.lineNumber) {
                continue;
            }
            if (r.startLineNumber > position.lineNumber) {
                return r;
            }
            if (r.startColumn < position.column) {
                continue;
            }
            return r;
        }
        return this._editor.getModel().getDecorationRange(this._decorations[0]);
    }
    _allDecorations() {
        let result = [];
        result = result.concat(this._decorations);
        result = result.concat(this._overviewRulerApproximateDecorations);
        if (this._findScopeDecorationIds.length) {
            result.push(...this._findScopeDecorationIds);
        }
        if (this._rangeHighlightDecorationId) {
            result.push(this._rangeHighlightDecorationId);
        }
        return result;
    }
    static { this._CURRENT_FIND_MATCH_DECORATION = ModelDecorationOptions.register({
        description: 'current-find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 13,
        className: 'currentFindMatch',
        inlineClassName: 'currentFindMatchInline',
        showIfCollapsed: true,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center,
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */,
        },
    }); }
    static { this._FIND_MATCH_DECORATION = ModelDecorationOptions.register({
        description: 'find-match',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        zIndex: 10,
        className: 'findMatch',
        inlineClassName: 'findMatchInline',
        showIfCollapsed: true,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center,
        },
        minimap: {
            color: themeColorFromId(minimapFindMatch),
            position: 1 /* MinimapPosition.Inline */,
        },
    }); }
    static { this._FIND_MATCH_NO_OVERVIEW_DECORATION = ModelDecorationOptions.register({
        description: 'find-match-no-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'findMatch',
        showIfCollapsed: true,
    }); }
    static { this._FIND_MATCH_ONLY_OVERVIEW_DECORATION = ModelDecorationOptions.register({
        description: 'find-match-only-overview',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        overviewRuler: {
            color: themeColorFromId(overviewRulerFindMatchForeground),
            position: OverviewRulerLane.Center,
        },
    }); }
    static { this._RANGE_HIGHLIGHT_DECORATION = ModelDecorationOptions.register({
        description: 'find-range-highlight',
        stickiness: 1 /* TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges */,
        className: 'rangeHighlight',
        isWholeLine: true,
    }); }
    static { this._FIND_SCOPE_DECORATION = ModelDecorationOptions.register({
        description: 'find-scope',
        className: 'findScope',
        isWholeLine: true,
    }); }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZmluZC9icm93c2VyL2ZpbmREZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDckQsT0FBTyxFQUtOLGlCQUFpQixHQUVqQixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFDTixnQkFBZ0IsRUFDaEIsZ0NBQWdDLEdBQ2hDLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFcEYsTUFBTSxPQUFPLGVBQWU7SUFTM0IsWUFBWSxNQUF5QjtRQUNwQyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQTtRQUN0QixJQUFJLENBQUMsb0NBQW9DLEdBQUcsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQyx1QkFBdUIsR0FBRyxFQUFFLENBQUE7UUFDakMsSUFBSSxDQUFDLDJCQUEyQixHQUFHLElBQUksQ0FBQTtRQUN2QyxJQUFJLENBQUMsd0JBQXdCLEdBQUcsSUFBSSxDQUFBO1FBQ3BDLElBQUksQ0FBQyxjQUFjLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsQ0FBQTtJQUNqRCxDQUFDO0lBRU0sT0FBTztRQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDLENBQUE7UUFFdEQsSUFBSSxDQUFDLFlBQVksR0FBRyxFQUFFLENBQUE7UUFDdEIsSUFBSSxD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