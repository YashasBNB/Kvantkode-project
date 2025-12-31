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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZW50UmFuZ2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9pbmRlbnRSYW5nZVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBSWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFHcEUsTUFBTSxzQ0FBc0MsR0FBRyxJQUFJLENBQUE7QUFFbkQsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUE7QUFFbkMsTUFBTSxPQUFPLG1CQUFtQjtJQUcvQixZQUNrQixXQUF1QixFQUN2Qiw0QkFBMkQsRUFDM0Qsa0JBQXdDO1FBRnhDLGdCQUFXLEdBQVgsV0FBVyxDQUFZO1FBQ3ZCLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBK0I7UUFDM0QsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUxqRCxPQUFFLEdBQUcsa0JBQWtCLENBQUE7SUFNN0IsQ0FBQztJQUVKLE9BQU8sS0FBSSxDQUFDO0lBRVosT0FBTyxDQUFDLGdCQUFtQztRQUMxQyxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsd0JBQXdCLENBQzlFLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLENBQ2hDLENBQUMsWUFBWSxDQUFBO1FBQ2QsTUFBTSxPQUFPLEdBQUcsWUFBWSxJQUFJLENBQUMsQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFBO1FBQ3RELE1BQU0sT0FBTyxHQUFHLFlBQVksSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFBO1FBQ3BELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FDckIsYUFBYSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsT0FB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