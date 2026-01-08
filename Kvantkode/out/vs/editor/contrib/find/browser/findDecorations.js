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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZERlY29yYXRpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9maW5kL2Jyb3dzZXIvZmluZERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBS2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBS04saUJBQWlCLEdBRWpCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQ0FBZ0MsR0FDaEMsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVwRixNQUFNLE9BQU8sZUFBZTtJQVMzQixZQUFZLE1BQXlCO1FBQ3BDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxZQUFZLEdBQUcsRUFBRSxDQUFBO1FBQ3RCLElBQUksQ0FBQyxvQ0FBb0MsR0FBRyxFQUFFLENBQUE7UUFDOUMsSUFBSSxDQUFDLHVCQUF1QixHQUFHLEVBQUUsQ0FBQTtRQUNqQyxJQUFJLENBQUMsMkJBQTJCLEdBQUcsSUFBSSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyx3QkFBd0IsR0FBRyxJQUFJLENBQUE7UUFDcEMsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBQ2pELENBQUM7SUFFTSxPQUFPO1FBQ2IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQTtRQUV0RCxJQUFJLENBQUMsWUFBWSxHQUFHLEVBQUUsQ0FBQTtRQUN0QixJ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