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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmlld01vZGVsRGVjb3JhdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vdmlld01vZGVsL3ZpZXdNb2RlbERlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFJeEMsT0FBTyxFQUVOLGdCQUFnQixFQUVoQixtQkFBbUIsR0FDbkIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQWN4RSxNQUFNLE9BQU8sb0JBQW9CO0lBWWhDLFlBQ0MsUUFBZ0IsRUFDaEIsS0FBaUIsRUFDakIsYUFBbUMsRUFDbkMsZUFBZ0MsRUFDaEMsb0JBQTJDO1FBRTNDLElBQUksQ0FBQyxRQUFRLEdBQUcsUUFBUSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxhQUFhLEdBQUcsYUFBYSxDQUFBO1FBQ2xDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7UUFDdkMsSUFBSSxDQUFDLHFCQUFxQixHQUFHLG9CQUFvQixDQUFBO1FBQ2pELElBQUksQ0FBQyxpQkFBaUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzVDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLENBQUE7UUFDM0MsSUFBSSxDQUFDLHdDQUF3QyxHQUFHLElBQUksQ0FBQTtJQUNyRCxDQUFDO0lBRU8sb0NBQW9DO1FBQzNDLElBQUksQ0FBQywrQkFBK0IsR0FBRyxJQUFJLENBQUE7UUFDM0MsSUFBSSxDQUFDLHdDQUF3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