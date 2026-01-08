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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuU3RvcmVTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29tbW9uL21vZGVsL3RyZWVTaXR0ZXJUb2tlblN0b3JlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFFeEMsT0FBTyxFQUFFLFlBQVksRUFBRSxVQUFVLEVBQWUsTUFBTSxpQkFBaUIsQ0FBQTtBQUN2RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQXFCaEYsTUFBTSxDQUFDLE1BQU0sbUNBQW1DLEdBQy9DLGVBQWUsQ0FBc0Msb0NBQW9DLENBQUMsQ0FBQTtBQU8zRixNQUFNLGtDQUFrQztJQWV2QztRQVZpQixXQUFNLEdBQUcsSUFBSSxHQUFHLEVBUTlCLENBQUE7SUFFWSxDQUFDO0lBRWhCLFNBQVMsQ0FBQyxLQUFpQixFQUFFLE1BQXFCLEVBQUUsWUFBMEI7UUFDN0UsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDcEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFO1lBQ3RCLEtBQUssRUFBRSxLQUFLO1lBQ1osZUFBZSxFQUFFLEtBQUssQ0FBQyxZQUFZLEVBQUU7WUFDckMsV0FBVztZQUNYLFlBQVksRUFBRSxLQUFLLENBQUMsWUFBWSxFQUFFO1NBQ2xD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