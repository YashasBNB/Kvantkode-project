/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { computeIndentLevel } from '../../../common/model/utils.js';
import { FoldingRegions, MAX_LINE_NUMBER } from './foldingRanges.js';
const MAX_FOLDING_REGIONS_FOR_INDENT_DEFAULT = 5000;
const ID_INDENT_PROVIDER = 'indent';
export class IndentRangeProvider {
    constructor(editorModel, languageConfigurationService, foldingRangesLimit) {
        this.editorModel = editorModel;
        this.languageConfigurationService = languageConfigurationService;
        this.foldingRangesLimit = foldingRangesLimit;
        this.id = ID_INDENT_PROVIDER;
    }
    dispose() { }
    compute(cancelationToken) {
        const foldingRules = this.languageConfigurationService.getLanguageConfiguration(this.editorModel.getLanguageId()).foldingRules;
        const offSide = foldingRules && !!foldingRules.offSide;
        const markers = foldingRules && foldingRules.markers;
        return Promise.resolve(computeRanges(this.editorModel, offSide, markers, this.foldingRangesLimit));
    }
}
// public only for testing
export class RangesCollector {
    constructor(foldingRangesLimit) {
        this._startIndexes = [];
        this._endIndexes = [];
        this._indentOccurrences = [];
        this._length = 0;
        this._foldingRangesLimit = foldingRangesLimit;
    }
    insertFirst(startLineNumber, endLineNumber, indent) {
        if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
            return;
        }
        const index = this._length;
        this._startIndexes[index] = startLineNumber;
        this._endIndexes[index] = endLineNumber;
        this._length++;
        if (indent < 1000) {
            this._indentOccurrences[indent] = (this._indentOccurrences[indent] || 0) + 1;
        }
    }
    toIndentRanges(model) {
        const limit = this._foldingRangesLimit.limit;
        if (this._length <= limit) {
            this._foldingRangesLimit.update(this._length, false);
            // reverse and create arrays of the exact length
            const startIndexes = new Uint32Array(this._length);
            const endIndexes = new Uint32Array(this._length);
            for (let i = this._length - 1, k = 0; i >= 0; i--, k++) {
                startIndexes[k] = this._startIndexes[i];
                endIndexes[k] = this._endIndexes[i];
            }
            return new FoldingRegions(startIndexes, endIndexes);
        }
        else {
            this._foldingRangesLimit.update(this._length, limit);
            let entries = 0;
            let maxIndent = this._indentOccurrences.length;
            for (let i = 0; i < this._indentOccurrences.length; i++) {
                const n = this._indentOccurrences[i];
                if (n) {
                    if (n + entries > limit) {
                        maxIndent = i;
                        break;
                    }
                    entries += n;
                }
            }
            const tabSize = model.getOptions().tabSize;
            // reverse and create arrays of the exact length
            const startIndexes = new Uint32Array(limit);
            const endIndexes = new Uint32Array(limit);
            for (let i = this._length - 1, k = 0; i >= 0; i--) {
                const startIndex = this._startIndexes[i];
                const lineContent = model.getLineContent(startIndex);
                const indent = computeIndentLevel(lineContent, tabSize);
                if (indent < maxIndent || (indent === maxIndent && entries++ < limit)) {
                    startIndexes[k] = startIndex;
                    endIndexes[k] = this._endIndexes[i];
                    k++;
                }
            }
            return new FoldingRegions(startIndexes, endIndexes);
        }
    }
}
const foldingRangesLimitDefault = {
    limit: MAX_FOLDING_REGIONS_FOR_INDENT_DEFAULT,
    update: () => { },
};
export function computeRanges(model, offSide, markers, foldingRangesLimit = foldingRangesLimitDefault) {
    const tabSize = model.getOptions().tabSize;
    const result = new RangesCollector(foldingRangesLimit);
    let pattern = undefined;
    if (markers) {
        pattern = new RegExp(`(${markers.start.source})|(?:${markers.end.source})`);
    }
    const previousRegions = [];
    const line = model.getLineCount() + 1;
    previousRegions.push({ indent: -1, endAbove: line, line }); // sentinel, to make sure there's at least one entry
    for (let line = model.getLineCount(); line > 0; line--) {
        const lineContent = model.getLineContent(line);
        const indent = computeIndentLevel(lineContent, tabSize);
        let previous = previousRegions[previousRegions.length - 1];
        if (indent === -1) {
            if (offSide) {
                // for offSide languages, empty lines are associated to the previous block
                // note: the next block is already written to the results, so this only
                // impacts the end position of the block before
                previous.endAbove = line;
            }
            continue; // only whitespace
        }
        let m;
        if (pattern && (m = lineContent.match(pattern))) {
            // folding pattern match
            if (m[1]) {
                // start pattern match
                // discard all regions until the folding pattern
                let i = previousRegions.length - 1;
                while (i > 0 && previousRegions[i].indent !== -2) {
                    i--;
                }
                if (i > 0) {
                    previousRegions.length = i + 1;
                    previous = previousRegions[i];
                    // new folding range from pattern, includes the end line
                    result.insertFirst(line, previous.line, indent);
                    previous.line = line;
                    previous.indent = indent;
                    previous.endAbove = line;
                    continue;
                }
                else {
                    // no end marker found, treat line as a regular line
                }
            }
            else {
                // end pattern match
                previousRegions.push({ indent: -2, endAbove: line, line });
                continue;
            }
        }
        if (previous.indent > indent) {
            // discard all regions with larger indent
            do {
                previousRegions.pop();
                previous = previousRegions[previousRegions.length - 1];
            } while (previous.indent > indent);
            // new folding range
            const endLineNumber = previous.endAbove - 1;
            if (endLineNumber - line >= 1) {
                // needs at east size 1
                result.insertFirst(line, endLineNumber, indent);
            }
        }
        if (previous.indent === indent) {
            previous.endAbove = line;
        }
        else {
            // previous.indent < indent
            // new region with a bigger indent
            previousRegions.push({ indent, endAbove: line, line });
        }
    }
    return result.toIndentRanges(model);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UmFuZ2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvZm9sZGluZy9icm93c2VyL2luZGVudFJhbmdlUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxlQUFlLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUdwRSxNQUFNLHNDQUFzQyxHQUFHLElBQUksQ0FBQTtBQUVuRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQTtBQUVuQyxNQUFNLE9BQU8sbUJBQW1CO0lBRy9CLFlBQ2tCLFdBQXVCLEVBQ3ZCLDRCQUEyRCxFQUMzRCxrQkFBd0M7UUFGeEMsZ0JBQVcsR0FBWCxXQUFXLENBQVk7UUFDdkIsaUNBQTRCLEdBQTVCLDRCQUE0QixDQUErQjtRQUMzRCx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQXNCO1FBTGpELE9BQUUsR0FBRyxrQkFBa0IsQ0FBQTtJQU03QixDQUFDO0lBRUosT0FBTyxLQUFJLENBQUM7SUFFWixPQUFPLENBQUMsZ0JBQW1DO1FBQzFDLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyx3QkFBd0IsQ0FDOUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsQ0FDaEMsQ0FBQyxZQUFZLENBQUE7UUFDZCxNQUFNLE9BQU8sR0FBRyxZQUFZLElBQUksQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUE7UUFDdEQsTUFBTSxPQUFPLEdBQUcsWUFBWSxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUE7UUFDcEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUNyQixhQUFhLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUMxRSxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsMEJBQTBCO0FBQzFCLE1BQU0sT0FBTyxlQUFlO0lBTzNCLFlBQVksa0JBQXdDO1FBQ25ELElBQUksQ0FBQyxhQUFhLEdBQUcsRUFBRSxDQUFBO1FBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxFQUFFLENBQUE7UUFDNUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUE7UUFDaEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO0lBQzlDLENBQUM7SUFFTSxXQUFXLENBQUMsZUFBdUIsRUFBRSxhQUFxQixFQUFFLE1BQWM7UUFDaEYsSUFBSSxlQUFlLEdBQUcsZUFBZSxJQUFJLGFBQWEsR0FBRyxlQUFlLEVBQUUsQ0FBQztZQUMxRSxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsR0FBRyxlQUFlLENBQUE7UUFDM0MsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxhQUFhLENBQUE7UUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2QsSUFBSSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3RSxDQUFDO0lBQ0YsQ0FBQztJQUVNLGNBQWMsQ0FBQyxLQUFpQjtRQUN0QyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFBO1FBQzVDLElBQUksSUFBSSxDQUFDLE9BQU8sSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUMzQixJQUFJLENBQUMsbUJBQW1CLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFFcEQsZ0RBQWdEO1lBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNsRCxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDaEQsS0FBSyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsT0FBTyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDeEQsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQ3ZDLFVBQVUsQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3BDLENBQUM7WUFDRCxPQUFPLElBQUksY0FBYyxDQUFDLFlBQVksRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUVwRCxJQUFJLE9BQU8sR0FBRyxDQUFDLENBQUE7WUFDZixJQUFJLFNBQVMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFBO1lBQzlDLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ3pELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDcEMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDUCxJQUFJLENBQUMsR0FBRyxPQUFPLEdBQUcsS0FBSyxFQUFFLENBQUM7d0JBQ3pCLFNBQVMsR0FBRyxDQUFDLENBQUE7d0JBQ2IsTUFBSztvQkFDTixDQUFDO29CQUNELE9BQU8sSUFBSSxDQUFDLENBQUE7Z0JBQ2IsQ0FBQztZQUNGLENBQUM7WUFDRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsT0FBTyxDQUFBO1lBQzFDLGdEQUFnRDtZQUNoRCxNQUFNLFlBQVksR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMzQyxNQUFNLFVBQVUsR0FBRyxJQUFJLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUN6QyxLQUFLLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxPQUFPLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNuRCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUN4QyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUNwRCxNQUFNLE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLENBQUE7Z0JBQ3ZELElBQUksTUFBTSxHQUFHLFNBQVMsSUFBSSxDQUFDLE1BQU0sS0FBSyxTQUFTLElBQUksT0FBTyxFQUFFLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdkUsWUFBWSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQTtvQkFDNUIsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7b0JBQ25DLENBQUMsRUFBRSxDQUFBO2dCQUNKLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxJQUFJLGNBQWMsQ0FBQyxZQUFZLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFDcEQsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQVFELE1BQU0seUJBQXlCLEdBQXlCO0lBQ3ZELEtBQUssRUFBRSxzQ0FBc0M7SUFDN0MsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFFLENBQUM7Q0FDaEIsQ0FBQTtBQUVELE1BQU0sVUFBVSxhQUFhLENBQzVCLEtBQWlCLEVBQ2pCLE9BQWdCLEVBQ2hCLE9BQXdCLEVBQ3hCLHFCQUEyQyx5QkFBeUI7SUFFcEUsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLFVBQVUsRUFBRSxDQUFDLE9BQU8sQ0FBQTtJQUMxQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO0lBRXRELElBQUksT0FBTyxHQUF1QixTQUFTLENBQUE7SUFDM0MsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUNiLE9BQU8sR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxRQUFRLE9BQU8sQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUM1RSxDQUFDO0lBRUQsTUFBTSxlQUFlLEdBQXFCLEVBQUUsQ0FBQTtJQUM1QyxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsWUFBWSxFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQ3JDLGVBQWUsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBLENBQUMsb0RBQW9EO0lBRS9HLEtBQUssSUFBSSxJQUFJLEdBQUcsS0FBSyxDQUFDLFlBQVksRUFBRSxFQUFFLElBQUksR0FBRyxDQUFDLEVBQUUsSUFBSSxFQUFFLEVBQUUsQ0FBQztRQUN4RCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sTUFBTSxHQUFHLGtCQUFrQixDQUFDLFdBQVcsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN2RCxJQUFJLFFBQVEsR0FBRyxlQUFlLENBQUMsZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ25CLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ2IsMEVBQTBFO2dCQUMxRSx1RUFBdUU7Z0JBQ3ZFLCtDQUErQztnQkFDL0MsUUFBUSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUE7WUFDekIsQ0FBQztZQUNELFNBQVEsQ0FBQyxrQkFBa0I7UUFDNUIsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFBO1FBQ0wsSUFBSSxPQUFPLElBQUksQ0FBQyxDQUFDLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDakQsd0JBQXdCO1lBQ3hCLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1Ysc0JBQXNCO2dCQUN0QixnREFBZ0Q7Z0JBQ2hELElBQUksQ0FBQyxHQUFHLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO29CQUNsRCxDQUFDLEVBQUUsQ0FBQTtnQkFDSixDQUFDO2dCQUNELElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUNYLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQTtvQkFDOUIsUUFBUSxHQUFHLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFFN0Isd0RBQXdEO29CQUN4RCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO29CQUMvQyxRQUFRLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtvQkFDcEIsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUE7b0JBQ3hCLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO29CQUN4QixTQUFRO2dCQUNULENBQUM7cUJBQU0sQ0FBQztvQkFDUCxvREFBb0Q7Z0JBQ3JELENBQUM7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1Asb0JBQW9CO2dCQUNwQixlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDMUQsU0FBUTtZQUNULENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO1lBQzlCLHlDQUF5QztZQUN6QyxHQUFHLENBQUM7Z0JBQ0gsZUFBZSxDQUFDLEdBQUcsRUFBRSxDQUFBO2dCQUNyQixRQUFRLEdBQUcsZUFBZSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkQsQ0FBQyxRQUFRLFFBQVEsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFDO1lBRWxDLG9CQUFvQjtZQUNwQixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtZQUMzQyxJQUFJLGFBQWEsR0FBRyxJQUFJLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQy9CLHVCQUF1QjtnQkFDdkIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFLE1BQU0sQ0FBQyxDQUFBO1lBQ2hELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLFFBQVEsQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFBO1FBQ3pCLENBQUM7YUFBTSxDQUFDO1lBQ1AsMkJBQTJCO1lBQzNCLGtDQUFrQztZQUNsQyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUN2RCxDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sTUFBTSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUNwQyxDQUFDIn0=