/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Position } from '../core/position.js';
import { Range } from '../core/range.js';
import { InlineDecoration, ViewModelDecoration, } from '../viewModel.js';
import { filterValidationDecorations } from '../config/editorOptions.js';
export class ViewModelDecorations {
    constructor(editorId, model, configuration, linesCollection, coordinatesConverter) {
        this.editorId = editorId;
        this.model = model;
        this.configuration = configuration;
        this._linesCollection = linesCollection;
        this._coordinatesConverter = coordinatesConverter;
        this._decorationsCache = Object.create(null);
        this._cachedModelDecorationsResolver = null;
        this._cachedModelDecorationsResolverViewRange = null;
    }
    _clearCachedModelDecorationsResolver() {
        this._cachedModelDecorationsResolver = null;
        this._cachedModelDecorationsResolverViewRange = null;
    }
    dispose() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    reset() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    onModelDecorationsChanged() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    onLineMappingChanged() {
        this._decorationsCache = Object.create(null);
        this._clearCachedModelDecorationsResolver();
    }
    _getOrCreateViewModelDecoration(modelDecoration) {
        const id = modelDecoration.id;
        let r = this._decorationsCache[id];
        if (!r) {
            const modelRange = modelDecoration.range;
            const options = modelDecoration.options;
            let viewRange;
            if (options.isWholeLine) {
                const start = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.startLineNumber, 1), 0 /* PositionAffinity.Left */, false, true);
                const end = this._coordinatesConverter.convertModelPositionToViewPosition(new Position(modelRange.endLineNumber, this.model.getLineMaxColumn(modelRange.endLineNumber)), 1 /* PositionAffinity.Right */);
                viewRange = new Range(start.lineNumber, start.column, end.lineNumber, end.column);
            }
            else {
                // For backwards compatibility reasons, we want injected text before any decoration.
                // Thus, move decorations to the right.
                viewRange = this._coordinatesConverter.convertModelRangeToViewRange(modelRange, 1 /* PositionAffinity.Right */);
            }
            r = new ViewModelDecoration(viewRange, options);
            this._decorationsCache[id] = r;
        }
        return r;
    }
    getMinimapDecorationsInRange(range) {
        return this._getDecorationsInRange(range, true, false).decorations;
    }
    getDecorationsViewportData(viewRange) {
        let cacheIsValid = this._cachedModelDecorationsResolver !== null;
        cacheIsValid =
            cacheIsValid && viewRange.equalsRange(this._cachedModelDecorationsResolverViewRange);
        if (!cacheIsValid) {
            this._cachedModelDecorationsResolver = this._getDecorationsInRange(viewRange, false, false);
            this._cachedModelDecorationsResolverViewRange = viewRange;
        }
        return this._cachedModelDecorationsResolver;
    }
    getInlineDecorationsOnLine(lineNumber, onlyMinimapDecorations = false, onlyMarginDecorations = false) {
        const range = new Range(lineNumber, this._linesCollection.getViewLineMinColumn(lineNumber), lineNumber, this._linesCollection.getViewLineMaxColumn(lineNumber));
        return this._getDecorationsInRange(range, onlyMinimapDecorations, onlyMarginDecorations)
            .inlineDecorations[0];
    }
    _getDecorationsInRange(viewRange, onlyMinimapDecorations, onlyMarginDecorations) {
        const modelDecorations = this._linesCollection.getDecorationsInRange(viewRange, this.editorId, filterValidationDecorations(this.configuration.options), onlyMinimapDecorations, onlyMarginDecorations);
        const startLineNumber = viewRange.startLineNumber;
        const endLineNumber = viewRange.endLineNumber;
        const decorationsInViewport = [];
        let decorationsInViewportLen = 0;
        const inlineDecorations = [];
        for (let j = startLineNumber; j <= endLineNumber; j++) {
            inlineDecorations[j - startLineNumber] = [];
        }
        for (let i = 0, len = modelDecorations.length; i < len; i++) {
            const modelDecoration = modelDecorations[i];
            const decorationOptions = modelDecoration.options;
            if (!isModelDecorationVisible(this.model, modelDecoration)) {
                continue;
            }
            const viewModelDecoration = this._getOrCreateViewModelDecoration(modelDecoration);
            const viewRange = viewModelDecoration.range;
            decorationsInViewport[decorationsInViewportLen++] = viewModelDecoration;
            if (decorationOptions.inlineClassName) {
                const inlineDecoration = new InlineDecoration(viewRange, decorationOptions.inlineClassName, decorationOptions.inlineClassNameAffectsLetterSpacing
                    ? 3 /* InlineDecorationType.RegularAffectingLetterSpacing */
                    : 0 /* InlineDecorationType.Regular */);
                const intersectedStartLineNumber = Math.max(startLineNumber, viewRange.startLineNumber);
                const intersectedEndLineNumber = Math.min(endLineNumber, viewRange.endLineNumber);
                for (let j = intersectedStartLineNumber; j <= intersectedEndLineNumber; j++) {
                    inlineDecorations[j - startLineNumber].push(inlineDecoration);
                }
            }
            if (decorationOptions.beforeContentClassName) {
                if (startLineNumber <= viewRange.startLineNumber &&
                    viewRange.startLineNumber <= endLineNumber) {
                    const inlineDecoration = new InlineDecoration(new Range(viewRange.startLineNumber, viewRange.startColumn, viewRange.startLineNumber, viewRange.startColumn), decorationOptions.beforeContentClassName, 1 /* InlineDecorationType.Before */);
                    inlineDecorations[viewRange.startLineNumber - startLineNumber].push(inlineDecoration);
                }
            }
            if (decorationOptions.afterContentClassName) {
                if (startLineNumber <= viewRange.endLineNumber &&
                    viewRange.endLineNumber <= endLineNumber) {
                    const inlineDecoration = new InlineDecoration(new Range(viewRange.endLineNumber, viewRange.endColumn, viewRange.endLineNumber, viewRange.endColumn), decorationOptions.afterContentClassName, 2 /* InlineDecorationType.After */);
                    inlineDecorations[viewRange.endLineNumber - startLineNumber].push(inlineDecoration);
                }
            }
        }
        return {
            decorations: decorationsInViewport,
            inlineDecorations: inlineDecorations,
        };
    }
}
export function isModelDecorationVisible(model, decoration) {
    if (decoration.options.hideInCommentTokens && isModelDecorationInComment(model, decoration)) {
        return false;
    }
    if (decoration.options.hideInStringTokens && isModelDecorationInString(model, decoration)) {
        return false;
    }
    return true;
}
export function isModelDecorationInComment(model, decoration) {
    return testTokensInRange(model, decoration.range, (tokenType) => tokenType === 1 /* StandardTokenType.Comment */);
}
export function isModelDecorationInString(model, decoration) {
    return testTokensInRange(model, decoration.range, (tokenType) => tokenType === 2 /* StandardTokenType.String */);
}
/**
 * Calls the callback for every token that intersects the range.
 * If the callback returns `false`, iteration stops and `false` is returned.
 * Otherwise, `true` is returned.
 */
function testTokensInRange(model, range, callback) {
    for (let lineNumber = range.startLineNumber; lineNumber <= range.endLineNumber; lineNumber++) {
        const lineTokens = model.tokenization.getLineTokens(lineNumber);
        const isFirstLine = lineNumber === range.startLineNumber;
        const isEndLine = lineNumber === range.endLineNumber;
        let tokenIdx = isFirstLine ? lineTokens.findTokenIndexAtOffset(range.startColumn - 1) : 0;
        while (tokenIdx < lineTokens.getCount()) {
            if (isEndLine) {
                const startOffset = lineTokens.getStartOffset(tokenIdx);
                if (startOffset > range.endColumn - 1) {
                    break;
                }
            }
            const callbackResult = callback(lineTokens.getStandardTokenType(tokenIdx));
            if (!callbackResult) {
                return false;
            }
            tokenIdx++;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL3ZpZXdNb2RlbC92aWV3TW9kZWxEZWNvcmF0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBSXhDLE9BQU8sRUFFTixnQkFBZ0IsRUFFaEIsbUJBQW1CLEdBQ25CLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFjeEUsTUFBTSxPQUFPLG9CQUFvQjtJQVloQyxZQUNDLFFBQWdCLEVBQ2hCLEtBQWlCLEVBQ2pCLGFBQW1DLEVBQ25DLGVBQWdDLEVBQ2hDLG9CQUEyQztRQUUzQyxJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtRQUN4QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsYUFBYSxHQUFHLGFBQWEsQ0FBQTtRQUNsQyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsZUFBZSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxxQkFBcUIsR0FBRyxvQkFBb0IsQ0FBQTtRQUNqRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QyxJQUFJLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFBO1FBQzNDLElBQUksQ0FBQyx3Q0FBd0MsR0FBRyxJQUFJLENBQUE7SUFDckQsQ0FBQztJQUVPLG9DQUFvQztRQUMzQyxJQUFJLENBQUMsK0JBQStCLEdBQUcsSUFBSSxDQUFBO1FBQzNDLElBQUksQ0FBQyx3Q0FBd0MsR0FB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