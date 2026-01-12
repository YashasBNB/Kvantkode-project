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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5sYXlIaW50cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvaW5sYXlIaW50cy9icm93c2VyL2lubGF5SGludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBYSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFJckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxNQUFNLE9BQU8sZUFBZTtJQUMzQixZQUNVLEtBQVksRUFDWixTQUE2QjtRQUQ3QixVQUFLLEdBQUwsS0FBSyxDQUFPO1FBQ1osY0FBUyxHQUFULFNBQVMsQ0FBb0I7SUFDcEMsQ0FBQztDQUNKO0FBRUQsTUFBTSxPQUFPLGFBQWE7SUFJekIsWUFDVSxJQUFlLEVBQ2YsTUFBdUIsRUFDdkIsUUFBNEI7UUFGNUIsU0FBSSxHQUFKLElBQUksQ0FBVztRQUNmLFdBQU0sR0FBTixNQUFNLENBQWlCO1FBQ3ZCLGFBQVEsR0FBUixRQUFRLENBQW9CO1FBTjlCLGdCQUFXLEdBQVksS0FBSyxDQUFBO0lBT2pDLENBQUM7SUFFSixJQUFJLENBQUMsS0FBa0M7UUFDdEMsTUFBTSxNQUFNLEdBQUcsSUFBSSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN4RSxNQUFN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