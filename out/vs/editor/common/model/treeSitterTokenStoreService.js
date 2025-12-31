/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Range } from '../core/range.js';
import { TokenQuality, TokenStore } from './tokenStore.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
export const ITreeSitterTokenizationStoreService = createDecorator('treeSitterTokenizationStoreService');
class TreeSitterTokenizationStoreService {
    constructor() {
        this.tokens = new Map();
    }
    setTokens(model, tokens, tokenQuality) {
        const disposables = new DisposableStore();
        const store = disposables.add(new TokenStore(model));
        this.tokens.set(model, {
            store: store,
            accurateVersion: model.getVersionId(),
            disposables,
            guessVersion: model.getVersionId(),
        });
        store.buildStore(tokens, tokenQuality);
        disposables.add(model.onWillDispose(() => {
            const storeInfo = this.tokens.get(model);
            if (storeInfo) {
                storeInfo.disposables.dispose();
                this.tokens.delete(model);
            }
        }));
    }
    handleContentChanged(model, e) {
        const storeInfo = this.tokens.get(model);
        if (!storeInfo) {
            return;
        }
        storeInfo.guessVersion = e.versionId;
        for (const change of e.changes) {
            if (change.text.length > change.rangeLength) {
                // If possible, use the token before the change as the starting point for the new token.
                // This is more likely to let the new text be the correct color as typeing is usually at the end of the token.
                const offset = change.rangeOffset > 0 ? change.rangeOffset - 1 : change.rangeOffset;
                const oldToken = storeInfo.store.getTokenAt(offset);
                let newToken;
                if (oldToken) {
                    // Insert. Just grow the token at this position to include the insert.
                    newToken = {
                        startOffsetInclusive: oldToken.startOffsetInclusive,
                        length: oldToken.length + change.text.length - change.rangeLength,
                        token: oldToken.token,
                    };
                    // Also mark tokens that are in the range of the change as needing a refresh.
                    storeInfo.store.markForRefresh(offset, change.rangeOffset +
                        (change.text.length > change.rangeLength ? change.text.length : change.rangeLength));
                }
                else {
                    // The document got larger and the change is at the end of the document.
                    newToken = { startOffsetInclusive: offset, length: change.text.length, token: 0 };
                }
                storeInfo.store.update(oldToken?.length ?? 0, [newToken], TokenQuality.EditGuess);
            }
            else if (change.text.length < change.rangeLength) {
                // Delete. Delete the tokens at the corresponding range.
                const deletedCharCount = change.rangeLength - change.text.length;
                storeInfo.store.delete(deletedCharCount, change.rangeOffset);
            }
        }
    }
    rangeHasTokens(model, range, minimumTokenQuality) {
        const tokens = this.tokens.get(model);
        if (!tokens) {
            return false;
        }
        return tokens.store.rangeHasTokens(model.getOffsetAt(range.getStartPosition()), model.getOffsetAt(range.getEndPosition()), minimumTokenQuality);
    }
    hasTokens(model, accurateForRange) {
        const tokens = this.tokens.get(model);
        if (!tokens) {
            return false;
        }
        if (!accurateForRange || tokens.guessVersion === tokens.accurateVersion) {
            return true;
        }
        return !tokens.store.rangeNeedsRefresh(model.getOffsetAt(accurateForRange.getStartPosition()), model.getOffsetAt(accurateForRange.getEndPosition()));
    }
    getTokens(model, line) {
        const tokens = this.tokens.get(model)?.store;
        if (!tokens) {
            return undefined;
        }
        const lineStartOffset = model.getOffsetAt({ lineNumber: line, column: 1 });
        const lineTokens = tokens.getTokensInRange(lineStartOffset, model.getOffsetAt({ lineNumber: line, column: model.getLineLength(line) }) + 1);
        const result = new Uint32Array(lineTokens.length * 2);
        for (let i = 0; i < lineTokens.length; i++) {
            result[i * 2] = lineTokens[i].startOffsetInclusive - lineStartOffset + lineTokens[i].length;
            result[i * 2 + 1] = lineTokens[i].token;
        }
        return result;
    }
    updateTokens(model, version, updates, tokenQuality) {
        const existingTokens = this.tokens.get(model);
        if (!existingTokens) {
            return;
        }
        existingTokens.accurateVersion = version;
        for (const update of updates) {
            const lastToken = update.newTokens.length > 0 ? update.newTokens[update.newTokens.length - 1] : undefined;
            let oldRangeLength;
            if (lastToken && existingTokens.guessVersion >= version) {
                oldRangeLength =
                    lastToken.startOffsetInclusive +
                        lastToken.length -
                        update.newTokens[0].startOffsetInclusive;
            }
            else if (update.oldRangeLength) {
                oldRangeLength = update.oldRangeLength;
            }
            else {
                oldRangeLength = 0;
            }
            existingTokens.store.update(oldRangeLength, update.newTokens, tokenQuality);
        }
    }
    markForRefresh(model, range) {
        const tree = this.tokens.get(model)?.store;
        if (!tree) {
            return;
        }
        tree.markForRefresh(model.getOffsetAt(range.getStartPosition()), model.getOffsetAt(range.getEndPosition()));
    }
    getNeedsRefresh(model) {
        const needsRefreshOffsetRanges = this.tokens.get(model)?.store.getNeedsRefresh();
        if (!needsRefreshOffsetRanges) {
            return [];
        }
        return needsRefreshOffsetRanges.map((range) => ({
            range: Range.fromPositions(model.getPositionAt(range.startOffset), model.getPositionAt(range.endOffset)),
            startOffset: range.startOffset,
            endOffset: range.endOffset,
        }));
    }
    delete(model) {
        const storeInfo = this.tokens.get(model);
        if (storeInfo) {
            storeInfo.disposables.dispose();
            this.tokens.delete(model);
        }
    }
    dispose() {
        for (const [, value] of this.tokens) {
            value.disposables.dispose();
        }
    }
}
registerSingleton(ITreeSitterTokenizationStoreService, TreeSitterTokenizationStoreService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuU3RvcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9tb2RlbC90cmVlU2l0dGVyVG9rZW5TdG9yZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRXhDLE9BQU8sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFlLE1BQU0saUJBQWlCLENBQUE7QUFDdkUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFxQmhGLE1BQU0sQ0FBQyxNQUFNLG1DQUFtQyxHQUMvQyxlQUFlLENBQXNDLG9DQUFvQyxDQUFDLENBQUE7QUFPM0YsTUFBTSxrQ0FBa0M7SUFldkM7UUFWaUIsV0FBTSxHQUFHLElBQUksR0FBRyxFQVE5QixDQUFBO0lBRVksQ0FBQztJQUVoQixTQUFTLENBQUMsS0FBaUIsRUFBRSxNQUFxQixFQUFFLFlBQTBCO1FBQzdFLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQ3BELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssRUFBRTtZQUN0QixLQUFLLEVBQUUsS0FBSztZQUNaLGVBQWUsRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFO1lBQ3JDLFdBQVc7WUFDWCxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksRUFBRTtTQUNsQyxDQUFD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