/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Position } from '../../../common/core/position.js';
import { Range } from '../../../common/core/range.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
export class InlayHintAnchor {
    constructor(range, direction) {
        this.range = range;
        this.direction = direction;
    }
}
export class InlayHintItem {
    constructor(hint, anchor, provider) {
        this.hint = hint;
        this.anchor = anchor;
        this.provider = provider;
        this._isResolved = false;
    }
    with(delta) {
        const result = new InlayHintItem(this.hint, delta.anchor, this.provider);
        result._isResolved = this._isResolved;
        result._currentResolve = this._currentResolve;
        return result;
    }
    async resolve(token) {
        if (typeof this.provider.resolveInlayHint !== 'function') {
            return;
        }
        if (this._currentResolve) {
            // wait for an active resolve operation and try again
            // when that's done.
            await this._currentResolve;
            if (token.isCancellationRequested) {
                return;
            }
            return this.resolve(token);
        }
        if (!this._isResolved) {
            this._currentResolve = this._doResolve(token).finally(() => (this._currentResolve = undefined));
        }
        await this._currentResolve;
    }
    async _doResolve(token) {
        try {
            const newHint = await Promise.resolve(this.provider.resolveInlayHint(this.hint, token));
            this.hint.tooltip = newHint?.tooltip ?? this.hint.tooltip;
            this.hint.label = newHint?.label ?? this.hint.label;
            this.hint.textEdits = newHint?.textEdits ?? this.hint.textEdits;
            this._isResolved = true;
        }
        catch (err) {
            onUnexpectedExternalError(err);
            this._isResolved = false;
        }
    }
}
export class InlayHintsFragments {
    static { this._emptyInlayHintList = Object.freeze({ dispose() { }, hints: [] }); }
    static async create(registry, model, ranges, token) {
        const data = [];
        const promises = registry
            .ordered(model)
            .reverse()
            .map((provider) => ranges.map(async (range) => {
            try {
                const result = await provider.provideInlayHints(model, range, token);
                if (result?.hints.length || provider.onDidChangeInlayHints) {
                    data.push([result ?? InlayHintsFragments._emptyInlayHintList, provider]);
                }
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
        }));
        await Promise.all(promises.flat());
        if (token.isCancellationRequested || model.isDisposed()) {
            throw new CancellationError();
        }
        return new InlayHintsFragments(ranges, data, model);
    }
    constructor(ranges, data, model) {
        this._disposables = new DisposableStore();
        this.ranges = ranges;
        this.provider = new Set();
        const items = [];
        for (const [list, provider] of data) {
            this._disposables.add(list);
            this.provider.add(provider);
            for (const hint of list.hints) {
                // compute the range to which the item should be attached to
                const position = model.validatePosition(hint.position);
                let direction = 'before';
                const wordRange = InlayHintsFragments._getRangeAtPosition(model, position);
                let range;
                if (wordRange.getStartPosition().isBefore(position)) {
                    range = Range.fromPositions(wordRange.getStartPosition(), position);
                    direction = 'after';
                }
                else {
                    range = Range.fromPositions(position, wordRange.getEndPosition());
                    direction = 'before';
                }
                items.push(new InlayHintItem(hint, new InlayHintAnchor(range, direction), provider));
            }
        }
        this.items = items.sort((a, b) => Position.compare(a.hint.position, b.hint.position));
    }
    dispose() {
        this._disposables.dispose();
    }
    static _getRangeAtPosition(model, position) {
        const line = position.lineNumber;
        const word = model.getWordAtPosition(position);
        if (word) {
            // always prefer the word range
            return new Range(line, word.startColumn, line, word.endColumn);
        }
        model.tokenization.tokenizeIfCheap(line);
        const tokens = model.tokenization.getLineTokens(line);
        const offset = position.column - 1;
        const idx = tokens.findTokenIndexAtOffset(offset);
        let start = tokens.getStartOffset(idx);
        let end = tokens.getEndOffset(idx);
        if (end - start === 1) {
            // single character token, when at its end try leading/trailing token instead
            if (start === offset && idx > 1) {
                // leading token
                start = tokens.getStartOffset(idx - 1);
                end = tokens.getEndOffset(idx - 1);
            }
            else if (end === offset && idx < tokens.getCount() - 1) {
                // trailing token
                start = tokens.getStartOffset(idx + 1);
                end = tokens.getEndOffset(idx + 1);
            }
        }
        return new Range(line, start + 1, line, end + 1);
    }
}
export function asCommandLink(command) {
    return URI.from({
        scheme: Schemas.command,
        path: command.id,
        query: command.arguments && encodeURIComponent(JSON.stringify(command.arguments)),
    }).toString();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGF5SGludHMvYnJvd3Nlci9pbmxheUhpbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBSXJELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsTUFBTSxPQUFPLGVBQWU7SUFDM0IsWUFDVSxLQUFZLEVBQ1osU0FBNkI7UUFEN0IsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLGNBQVMsR0FBVCxTQUFTLENBQW9CO0lBQ3BDLENBQUM7Q0FDSjtBQUVELE1BQU0sT0FBTyxhQUFhO0lBSXpCLFlBQ1UsSUFBZSxFQUNmLE1BQXVCLEVBQ3ZCLFFBQTRCO1FBRjVCLFNBQUksR0FBSixJQUFJLENBQVc7UUFDZixXQUFNLEdBQU4sTUFBTSxDQUFpQjtRQUN2QixhQUFRLEdBQVIsUUFBUSxDQUFvQjtRQU45QixnQkFBVyxHQUFZLEtBQUssQ0FBQTtJQU9qQyxDQUFDO0lBRUosSUFBSSxDQUFDLEtBQWtDO1FBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEUsTUFBTSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFBO1FBQ3JDLE1BQU0sQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQTtRQUM3QyxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQXdCO1FBQ3JDLElBQUksT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLGdCQUFnQixLQUFLLFVBQVUsRUFBRSxDQUFDO1lBQzFELE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDMUIscURBQXFEO1lBQ3JELG9CQUFvQjtZQUNwQixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUE7WUFDMUIsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsT0FBTTtZQUNQLENBQUM7WUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUNELElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FDcEQsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLFNBQVMsQ0FBQyxDQUN4QyxDQUFBO1FBQ0YsQ0FBQztRQUNELE1BQU0sSUFBSSxDQUFDLGVBQWUsQ0FBQTtJQUMzQixDQUFDO0lBRU8sS0FBSyxDQUFDLFVBQVUsQ0FBQyxLQUF3QjtRQUNoRCxJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sR0FBRyxNQUFNLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxnQkFBaUIsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDeEYsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLEdBQUcsT0FBTyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQTtZQUN6RCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssR0FBRyxPQUFPLEVBQUUsS0FBSyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFBO1lBQ25ELElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxHQUFHLE9BQU8sRUFBRSxTQUFTLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUE7WUFDL0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUE7UUFDeEIsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUM5QixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQTtRQUN6QixDQUFDO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjthQUNoQix3QkFBbUIsR0FBa0IsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLE9BQU8sS0FBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLEFBQTVELENBQTREO0lBRTlGLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUNsQixRQUFxRCxFQUNyRCxLQUFpQixFQUNqQixNQUFlLEVBQ2YsS0FBd0I7UUFFeEIsTUFBTSxJQUFJLEdBQTBDLEVBQUUsQ0FBQTtRQUV0RCxNQUFNLFFBQVEsR0FBRyxRQUFRO2FBQ3ZCLE9BQU8sQ0FBQyxLQUFLLENBQUM7YUFDZCxPQUFPLEVBQUU7YUFDVCxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMxQixJQUFJLENBQUM7Z0JBQ0osTUFBTSxNQUFNLEdBQUcsTUFBTSxRQUFRLENBQUMsaUJBQWlCLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMscUJBQXFCLEVBQUUsQ0FBQztvQkFDNUQsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxtQkFBbUIsQ0FBQyxtQkFBbUIsRUFBRSxRQUFRLENBQUMsQ0FBQyxDQUFBO2dCQUN6RSxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2QseUJBQXlCLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRixNQUFNLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFFbEMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLElBQUksS0FBSyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDekQsTUFBTSxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFDOUIsQ0FBQztRQUVELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ3BELENBQUM7SUFRRCxZQUNDLE1BQWUsRUFDZixJQUEyQyxFQUMzQyxLQUFpQjtRQVRELGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQVdwRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtRQUNwQixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksR0FBRyxFQUFFLENBQUE7UUFDekIsTUFBTSxLQUFLLEdBQW9CLEVBQUUsQ0FBQTtRQUNqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDckMsSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDM0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFM0IsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQy9CLDREQUE0RDtnQkFDNUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtnQkFDdEQsSUFBSSxTQUFTLEdBQXVCLFFBQVEsQ0FBQTtnQkFFNUMsTUFBTSxTQUFTLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUMxRSxJQUFJLEtBQVksQ0FBQTtnQkFFaEIsSUFBSSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztvQkFDckQsS0FBSyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLGdCQUFnQixFQUFFLEVBQUUsUUFBUSxDQUFDLENBQUE7b0JBQ25FLFNBQVMsR0FBRyxPQUFPLENBQUE7Z0JBQ3BCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLGNBQWMsRUFBRSxDQUFDLENBQUE7b0JBQ2pFLFNBQVMsR0FBRyxRQUFRLENBQUE7Z0JBQ3JCLENBQUM7Z0JBRUQsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxlQUFlLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxDQUFDLENBQUE7WUFDckYsQ0FBQztRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUN0RixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDNUIsQ0FBQztJQUVPLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQyxLQUFpQixFQUFFLFFBQW1CO1FBQ3hFLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDaEMsTUFBTSxJQUFJLEdBQUcsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLElBQUksSUFBSSxFQUFFLENBQUM7WUFDViwrQkFBK0I7WUFDL0IsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQy9ELENBQUM7UUFFRCxLQUFLLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4QyxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsWUFBWSxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNyRCxNQUFNLE1BQU0sR0FBRyxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNsQyxNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFFakQsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUN0QyxJQUFJLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBRWxDLElBQUksR0FBRyxHQUFHLEtBQUssS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2Qiw2RUFBNkU7WUFDN0UsSUFBSSxLQUFLLEtBQUssTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDakMsZ0JBQWdCO2dCQUNoQixLQUFLLEdBQUcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ3RDLEdBQUcsR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtZQUNuQyxDQUFDO2lCQUFNLElBQUksR0FBRyxLQUFLLE1BQU0sSUFBSSxHQUFHLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUMxRCxpQkFBaUI7Z0JBQ2pCLEtBQUssR0FBRyxNQUFNLENBQUMsY0FBYyxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDdEMsR0FBRyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ25DLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxJQUFJLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxHQUFHLENBQUMsRUFBRSxJQUFJLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFBO0lBQ2pELENBQUM7O0FBR0YsTUFBTSxVQUFVLGFBQWEsQ0FBQyxPQUFnQjtJQUM3QyxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDZixNQUFNLEVBQUUsT0FBTyxDQUFDLE9BQU87UUFDdkIsSUFBSSxFQUFFLE9BQU8sQ0FBQyxFQUFFO1FBQ2hCLEtBQUssRUFBRSxPQUFPLENBQUMsU0FBUyxJQUFJLGtCQUFrQixDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0tBQ2pGLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtBQUNkLENBQUMifQ==