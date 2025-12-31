/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { FoldingRegions, MAX_LINE_NUMBER } from './foldingRanges.js';
const foldingContext = {};
const ID_SYNTAX_PROVIDER = 'syntax';
export class SyntaxRangeProvider {
    constructor(editorModel, providers, handleFoldingRangesChange, foldingRangesLimit, fallbackRangeProvider) {
        this.editorModel = editorModel;
        this.providers = providers;
        this.handleFoldingRangesChange = handleFoldingRangesChange;
        this.foldingRangesLimit = foldingRangesLimit;
        this.fallbackRangeProvider = fallbackRangeProvider;
        this.id = ID_SYNTAX_PROVIDER;
        this.disposables = new DisposableStore();
        if (fallbackRangeProvider) {
            this.disposables.add(fallbackRangeProvider);
        }
        for (const provider of providers) {
            if (typeof provider.onDidChange === 'function') {
                this.disposables.add(provider.onDidChange(handleFoldingRangesChange));
            }
        }
    }
    compute(cancellationToken) {
        return collectSyntaxRanges(this.providers, this.editorModel, cancellationToken).then((ranges) => {
            if (this.editorModel.isDisposed()) {
                return null;
            }
            if (ranges) {
                const res = sanitizeRanges(ranges, this.foldingRangesLimit);
                return res;
            }
            return this.fallbackRangeProvider?.compute(cancellationToken) ?? null;
        });
    }
    dispose() {
        this.disposables.dispose();
    }
}
function collectSyntaxRanges(providers, model, cancellationToken) {
    let rangeData = null;
    const promises = providers.map((provider, i) => {
        return Promise.resolve(provider.provideFoldingRanges(model, foldingContext, cancellationToken)).then((ranges) => {
            if (cancellationToken.isCancellationRequested) {
                return;
            }
            if (Array.isArray(ranges)) {
                if (!Array.isArray(rangeData)) {
                    rangeData = [];
                }
                const nLines = model.getLineCount();
                for (const r of ranges) {
                    if (r.start > 0 && r.end > r.start && r.end <= nLines) {
                        rangeData.push({ start: r.start, end: r.end, rank: i, kind: r.kind });
                    }
                }
            }
        }, onUnexpectedExternalError);
    });
    return Promise.all(promises).then((_) => {
        return rangeData;
    });
}
class RangesCollector {
    constructor(foldingRangesLimit) {
        this._startIndexes = [];
        this._endIndexes = [];
        this._nestingLevels = [];
        this._nestingLevelCounts = [];
        this._types = [];
        this._length = 0;
        this._foldingRangesLimit = foldingRangesLimit;
    }
    add(startLineNumber, endLineNumber, type, nestingLevel) {
        if (startLineNumber > MAX_LINE_NUMBER || endLineNumber > MAX_LINE_NUMBER) {
            return;
        }
        const index = this._length;
        this._startIndexes[index] = startLineNumber;
        this._endIndexes[index] = endLineNumber;
        this._nestingLevels[index] = nestingLevel;
        this._types[index] = type;
        this._length++;
        if (nestingLevel < 30) {
            this._nestingLevelCounts[nestingLevel] = (this._nestingLevelCounts[nestingLevel] || 0) + 1;
        }
    }
    toIndentRanges() {
        const limit = this._foldingRangesLimit.limit;
        if (this._length <= limit) {
            this._foldingRangesLimit.update(this._length, false);
            const startIndexes = new Uint32Array(this._length);
            const endIndexes = new Uint32Array(this._length);
            for (let i = 0; i < this._length; i++) {
                startIndexes[i] = this._startIndexes[i];
                endIndexes[i] = this._endIndexes[i];
            }
            return new FoldingRegions(startIndexes, endIndexes, this._types);
        }
        else {
            this._foldingRangesLimit.update(this._length, limit);
            let entries = 0;
            let maxLevel = this._nestingLevelCounts.length;
            for (let i = 0; i < this._nestingLevelCounts.length; i++) {
                const n = this._nestingLevelCounts[i];
                if (n) {
                    if (n + entries > limit) {
                        maxLevel = i;
                        break;
                    }
                    entries += n;
                }
            }
            const startIndexes = new Uint32Array(limit);
            const endIndexes = new Uint32Array(limit);
            const types = [];
            for (let i = 0, k = 0; i < this._length; i++) {
                const level = this._nestingLevels[i];
                if (level < maxLevel || (level === maxLevel && entries++ < limit)) {
                    startIndexes[k] = this._startIndexes[i];
                    endIndexes[k] = this._endIndexes[i];
                    types[k] = this._types[i];
                    k++;
                }
            }
            return new FoldingRegions(startIndexes, endIndexes, types);
        }
    }
}
export function sanitizeRanges(rangeData, foldingRangesLimit) {
    const sorted = rangeData.sort((d1, d2) => {
        let diff = d1.start - d2.start;
        if (diff === 0) {
            diff = d1.rank - d2.rank;
        }
        return diff;
    });
    const collector = new RangesCollector(foldingRangesLimit);
    let top = undefined;
    const previous = [];
    for (const entry of sorted) {
        if (!top) {
            top = entry;
            collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
        }
        else {
            if (entry.start > top.start) {
                if (entry.end <= top.end) {
                    previous.push(top);
                    top = entry;
                    collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                }
                else {
                    if (entry.start > top.end) {
                        do {
                            top = previous.pop();
                        } while (top && entry.start > top.end);
                        if (top) {
                            previous.push(top);
                        }
                        top = entry;
                    }
                    collector.add(entry.start, entry.end, entry.kind && entry.kind.value, previous.length);
                }
            }
        }
    }
    return collector.toIndentRanges();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3ludGF4UmFuZ2VQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2ZvbGRpbmcvYnJvd3Nlci9zeW50YXhSYW5nZVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUl0RSxPQUFPLEVBQUUsY0FBYyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBTXBFLE1BQU0sY0FBYyxHQUFtQixFQUFFLENBQUE7QUFFekMsTUFBTSxrQkFBa0IsR0FBRyxRQUFRLENBQUE7QUFFbkMsTUFBTSxPQUFPLG1CQUFtQjtJQUsvQixZQUNrQixXQUF1QixFQUN2QixTQUFpQyxFQUN6Qyx5QkFBcUMsRUFDN0Isa0JBQXdDLEVBQ3hDLHFCQUFnRDtRQUpoRCxnQkFBVyxHQUFYLFdBQVcsQ0FBWTtRQUN2QixjQUFTLEdBQVQsU0FBUyxDQUF3QjtRQUN6Qyw4QkFBeUIsR0FBekIseUJBQXlCLENBQVk7UUFDN0IsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFzQjtRQUN4QywwQkFBcUIsR0FBckIscUJBQXFCLENBQTJCO1FBVHpELE9BQUUsR0FBRyxrQkFBa0IsQ0FBQTtRQVcvQixJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDeEMsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDNUMsQ0FBQztRQUVELEtBQUssTUFBTSxRQUFRLElBQUksU0FBUyxFQUFFLENBQUM7WUFDbEMsSUFBSSxPQUFPLFFBQVEsQ0FBQyxXQUFXLEtB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