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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZWxMaW5lUHJvamVjdGlvbkRhdGEuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbW9kZWxMaW5lUHJvamVjdGlvbkRhdGEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBR3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQXlDLE1BQU0sWUFBWSxDQUFBO0FBRzNGOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0F3Qkc7QUFDSCxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLFlBQ1EsZ0JBQWlDO0lBQ3hDOztPQUVHO0lBQ0ksZ0JBQThDO0lBQ3JEOzs7T0FHRztJQUNJLFlBQXNCO0lBQzdCOztPQUVHO0lBQ0kseUJBQW1DLEVBQ25DLHVCQUErQjtRQWQvQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWlCO1FBSWpDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBOEI7UUFLOUMsaUJBQVksR0FBWixZQUFZLENBQVU7UUFJdEIsOEJBQXlCLEdBQXpCLHlCQUF5QixDQUFVO1FBQ25DLDRCQUF1QixHQUF2Qix1QkFBdUIsQ0FBUTtJQUNwQyxDQUFDO0lBRUcsa0JBQWtCO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUE7SUFDaEMsQ0FBQztJQUVNLGtCQUFrQixDQUFDLGVBQXVCO1FBQ2hELElBQUksZUFBZSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE9BQU8sSUFBSSxDQUFDLHVCQUF1QixDQUFBO1FBQ3BDLENBQUM7UUFDRCxPQUFPLENBQUMsQ0FBQTtJQUNULENBQUM7SUFFTSxhQUFhLENBQUMsZUFBdUI7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