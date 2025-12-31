/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../base/common/assert.js';
import { Position } from './core/position.js';
import { InjectedTextCursorStops } from './model.js';
/**
 * *input*:
 * ```
 * xxxxxxxxxxxxxxxxxxxxxxxxxxx
 * ```
 *
 * -> Applying injections `[i...i]`, *inputWithInjections*:
 * ```
 * xxxxxx[iiiiiiiiii]xxxxxxxxxxxxxxxxx[ii]xxxx
 * ```
 *
 * -> breaking at offsets `|` in `xxxxxx[iiiiiii|iii]xxxxxxxxxxx|xxxxxx[ii]xxxx|`:
 * ```
 * xxxxxx[iiiiiii
 * iii]xxxxxxxxxxx
 * xxxxxx[ii]xxxx
 * ```
 *
 * -> applying wrappedTextIndentLength, *output*:
 * ```
 * xxxxxx[iiiiiii
 *    iii]xxxxxxxxxxx
 *    xxxxxx[ii]xxxx
 * ```
 */
export class ModelLineProjectionData {
    constructor(injectionOffsets, 
    /**
     * `injectionOptions.length` must equal `injectionOffsets.length`
     */
    injectionOptions, 
    /**
     * Refers to offsets after applying injections to the source.
     * The last break offset indicates the length of the source after applying injections.
     */
    breakOffsets, 
    /**
     * Refers to offsets after applying injections
     */
    breakOffsetsVisibleColumn, wrappedTextIndentLength) {
        this.injectionOffsets = injectionOffsets;
        this.injectionOptions = injectionOptions;
        this.breakOffsets = breakOffsets;
        this.breakOffsetsVisibleColumn = breakOffsetsVisibleColumn;
        this.wrappedTextIndentLength = wrappedTextIndentLength;
    }
    getOutputLineCount() {
        return this.breakOffsets.length;
    }
    getMinOutputOffset(outputLineIndex) {
        if (outputLineIndex > 0) {
            return this.wrappedTextIndentLength;
        }
        return 0;
    }
    getLineLength(outputLineIndex) {
        // These offsets refer to model text with injected text.
        const startOffset = outputLineIndex > 0 ? this.breakOffsets[outputLineIndex - 1] : 0;
        const endOffset = this.breakOffsets[outputLineIndex];
        let lineLength = endOffset - startOffset;
        if (outputLineIndex > 0) {
            lineLength += this.wrappedTextIndentLength;
        }
        return lineLength;
    }
    getMaxOutputOffset(outputLineIndex) {
        return this.getLineLength(outputLineIndex);
    }
    translateToInputOffset(outputLineIndex, outputOffset) {
        if (outputLineIndex > 0) {
            outputOffset = Math.max(0, outputOffset - this.wrappedTextIndentLength);
        }
        const offsetInInputWithInjection = outputLineIndex === 0 ? outputOffset : this.breakOffsets[outputLineIndex - 1] + outputOffset;
        let offsetInInput = offsetInInputWithInjection;
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (offsetInInput > this.injectionOffsets[i]) {
                    if (offsetInInput < this.injectionOffsets[i] + this.injectionOptions[i].content.length) {
                        // `inputOffset` is within injected text
                        offsetInInput = this.injectionOffsets[i];
                    }
                    else {
                        offsetInInput -= this.injectionOptions[i].content.length;
                    }
                }
                else {
                    break;
                }
            }
        }
        return offsetInInput;
    }
    translateToOutputPosition(inputOffset, affinity = 2 /* PositionAffinity.None */) {
        let inputOffsetInInputWithInjection = inputOffset;
        if (this.injectionOffsets !== null) {
            for (let i = 0; i < this.injectionOffsets.length; i++) {
                if (inputOffset < this.injectionOffsets[i]) {
                    break;
                }
                if (affinity !== 1 /* PositionAffinity.Right */ && inputOffset === this.injectionOffsets[i]) {
                    break;
                }
                inputOffsetInInputWithInjection += this.injectionOptions[i].content.length;
            }
        }
        return this.offsetInInputWithInjectionsToOutputPosition(inputOffsetInInputWithInjection, affinity);
    }
    offsetInInputWithInjectionsToOutputPosition(offsetInInputWithInjections, affinity = 2 /* PositionAffinity.None */) {
        let low = 0;
        let high = this.breakOffsets.length - 1;
        let mid = 0;
        let midStart = 0;
        while (low <= high) {
            mid = (low + (high - low) / 2) | 0;
            const midStop = this.breakOffsets[mid];
            midStart = mid > 0 ? this.breakOffsets[mid - 1] : 0;
            if (affinity === 0 /* PositionAffinity.Left */) {
                if (offsetInInputWithInjections <= midStart) {
                    high = mid - 1;
                }
                else if (offsetInInputWithInjections > midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
            else {
                if (offsetInInputWithInjections < midStart) {
                    high = mid - 1;
                }
                else if (offsetInInputWithInjections >= midStop) {
                    low = mid + 1;
                }
                else {
                    break;
                }
            }
        }
        let outputOffset = offsetInInputWithInjections - midStart;
        if (mid > 0) {
            outputOffset += this.wrappedTextIndentLength;
        }
        return new OutputPosition(mid, outputOffset);
    }
    normalizeOutputPosition(outputLineIndex, outputOffset, affinity) {
        if (this.injectionOffsets !== null) {
            const offsetInInputWithInjections = this.outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset);
            const normalizedOffsetInUnwrappedLine = this.normalizeOffsetInInputWithInjectionsAroundInjections(offsetInInputWithInjections, affinity);
            if (normalizedOffsetInUnwrappedLine !== offsetInInputWithInjections) {
                // injected text caused a change
                return this.offsetInInputWithInjectionsToOutputPosition(normalizedOffsetInUnwrappedLine, affinity);
            }
        }
        if (affinity === 0 /* PositionAffinity.Left */) {
            if (outputLineIndex > 0 && outputOffset === this.getMinOutputOffset(outputLineIndex)) {
                return new OutputPosition(outputLineIndex - 1, this.getMaxOutputOffset(outputLineIndex - 1));
            }
        }
        else if (affinity === 1 /* PositionAffinity.Right */) {
            const maxOutputLineIndex = this.getOutputLineCount() - 1;
            if (outputLineIndex < maxOutputLineIndex &&
                outputOffset === this.getMaxOutputOffset(outputLineIndex)) {
                return new OutputPosition(outputLineIndex + 1, this.getMinOutputOffset(outputLineIndex + 1));
            }
        }
        return new OutputPosition(outputLineIndex, outputOffset);
    }
    outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset) {
        if (outputLineIndex > 0) {
            outputOffset = Math.max(0, outputOffset - this.wrappedTextIndentLength);
        }
        const result = (outputLineIndex > 0 ? this.breakOffsets[outputLineIndex - 1] : 0) + outputOffset;
        return result;
    }
    normalizeOffsetInInputWithInjectionsAroundInjections(offsetInInputWithInjections, affinity) {
        const injectedText = this.getInjectedTextAtOffset(offsetInInputWithInjections);
        if (!injectedText) {
            return offsetInInputWithInjections;
        }
        if (affinity === 2 /* PositionAffinity.None */) {
            if (offsetInInputWithInjections ===
                injectedText.offsetInInputWithInjections + injectedText.length &&
                hasRightCursorStop(this.injectionOptions[injectedText.injectedTextIndex].cursorStops)) {
                return injectedText.offsetInInputWithInjections + injectedText.length;
            }
            else {
                let result = injectedText.offsetInInputWithInjections;
                if (hasLeftCursorStop(this.injectionOptions[injectedText.injectedTextIndex].cursorStops)) {
                    return result;
                }
                let index = injectedText.injectedTextIndex - 1;
                while (index >= 0 &&
                    this.injectionOffsets[index] === this.injectionOffsets[injectedText.injectedTextIndex]) {
                    if (hasRightCursorStop(this.injectionOptions[index].cursorStops)) {
                        break;
                    }
                    result -= this.injectionOptions[index].content.length;
                    if (hasLeftCursorStop(this.injectionOptions[index].cursorStops)) {
                        break;
                    }
                    index--;
                }
                return result;
            }
        }
        else if (affinity === 1 /* PositionAffinity.Right */ ||
            affinity === 4 /* PositionAffinity.RightOfInjectedText */) {
            let result = injectedText.offsetInInputWithInjections + injectedText.length;
            let index = injectedText.injectedTextIndex;
            // traverse all injected text that touch each other
            while (index + 1 < this.injectionOffsets.length &&
                this.injectionOffsets[index + 1] === this.injectionOffsets[index]) {
                result += this.injectionOptions[index + 1].content.length;
                index++;
            }
            return result;
        }
        else if (affinity === 0 /* PositionAffinity.Left */ ||
            affinity === 3 /* PositionAffinity.LeftOfInjectedText */) {
            // affinity is left
            let result = injectedText.offsetInInputWithInjections;
            let index = injectedText.injectedTextIndex;
            // traverse all injected text that touch each other
            while (index - 1 >= 0 &&
                this.injectionOffsets[index - 1] === this.injectionOffsets[index]) {
                result -= this.injectionOptions[index - 1].content.length;
                index--;
            }
            return result;
        }
        assertNever(affinity);
    }
    getInjectedText(outputLineIndex, outputOffset) {
        const offset = this.outputPositionToOffsetInInputWithInjections(outputLineIndex, outputOffset);
        const injectedText = this.getInjectedTextAtOffset(offset);
        if (!injectedText) {
            return null;
        }
        return {
            options: this.injectionOptions[injectedText.injectedTextIndex],
        };
    }
    getInjectedTextAtOffset(offsetInInputWithInjections) {
        const injectionOffsets = this.injectionOffsets;
        const injectionOptions = this.injectionOptions;
        if (injectionOffsets !== null) {
            let totalInjectedTextLengthBefore = 0;
            for (let i = 0; i < injectionOffsets.length; i++) {
                const length = injectionOptions[i].content.length;
                const injectedTextStartOffsetInInputWithInjections = injectionOffsets[i] + totalInjectedTextLengthBefore;
                const injectedTextEndOffsetInInputWithInjections = injectionOffsets[i] + totalInjectedTextLengthBefore + length;
                if (injectedTextStartOffsetInInputWithInjections > offsetInInputWithInjections) {
                    // Injected text starts later.
                    break; // All later injected texts have an even larger offset.
                }
                if (offsetInInputWithInjections <= injectedTextEndOffsetInInputWithInjections) {
                    // Injected text ends after or with the given position (but also starts with or before it).
                    return {
                        injectedTextIndex: i,
                        offsetInInputWithInjections: injectedTextStartOffsetInInputWithInjections,
                        length,
                    };
                }
                totalInjectedTextLengthBefore += length;
            }
        }
        return undefined;
    }
}
function hasRightCursorStop(cursorStop) {
    if (cursorStop === null || cursorStop === undefined) {
        return true;
    }
    return cursorStop === InjectedTextCursorStops.Right || cursorStop === InjectedTextCursorStops.Both;
}
function hasLeftCursorStop(cursorStop) {
    if (cursorStop === null || cursorStop === undefined) {
        return true;
    }
    return cursorStop === InjectedTextCursorStops.Left || cursorStop === InjectedTextCursorStops.Both;
}
export class InjectedText {
    constructor(options) {
        this.options = options;
    }
}
export class OutputPosition {
    constructor(outputLineIndex, outputOffset) {
        this.outputLineIndex = outputLineIndex;
        this.outputOffset = outputOffset;
    }
    toString() {
        return `${this.outputLineIndex}:${this.outputOffset}`;
    }
    toPosition(baseLineNumber) {
        return new Position(baseLineNumber + this.outputLineIndex, this.outputOffset + 1);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbkRhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsTGluZVByb2plY3Rpb25EYXRhLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUd6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHVCQUF1QixFQUF5QyxNQUFNLFlBQVksQ0FBQTtBQUczRjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBd0JHO0FBQ0gsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQyxZQUNRLGdCQUFpQztJQUN4Qzs7T0FFRztJQUNJLGdCQUE4QztJQUNyRDs7O09BR0c7SUFDSSxZQUFzQjtJQUM3Qjs7T0FFRztJQUNJLHlCQUFtQyxFQUNuQyx1QkFBK0I7UUFkL0IscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFpQjtRQUlqQyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQThCO1FBSzlDLGlCQUFZLEdBQVosWUFBWSxDQUFVO1FBSXRCLDhCQUF5QixHQUF6Qix5QkFBeUIsQ0FBVTtRQUNuQyw0QkFBdUIsR0FBdkIsdUJBQXVCLENBQVE7SUFDcEMsQ0FBQztJQUVHLGtCQUFrQjtRQUN4QixPQUFPLElBQUksQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFBO0lBQ2hDLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxlQUF1QjtRQUNoRCxJQUFJLGVBQWUsR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtRQUNwQyxDQUFDO1FBQ0QsT0FBTyxDQUFDLENBQUE7SUFDVCxDQUFDO0lBRU0sYUFBYSxDQUFDLGVBQXVCO1FBQzNDLHdEQUF3RDtRQUN4RCxNQUFN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