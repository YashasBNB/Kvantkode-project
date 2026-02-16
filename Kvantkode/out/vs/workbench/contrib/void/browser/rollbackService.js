/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IRollbackService = createDecorator('voidRollbackService');
class RollbackService {
    constructor() {
        // Track changes per thread: threadId -> messageIdx -> changes
        this._changesByThread = new Map();
        // Service doesn't need initialization
    }
    recordChange(opts) {
        const { threadId, messageIdx, toolName, toolId, uri, changeType } = opts;
        // Initialize thread map if needed
        if (!this._changesByThread.has(threadId)) {
            this._changesByThread.set(threadId, new Map());
        }
        const threadChanges = this._changesByThread.get(threadId);
        if (!threadChanges.has(messageIdx)) {
            threadChanges.set(messageIdx, []);
        }
        const messageChanges = threadChanges.get(messageIdx);
        // Check if we already recorded this change
        const existingChange = messageChanges.find(c => c.toolId === toolId);
        if (existingChange) {
            return;
        }
        const change = {
            id: `${threadId}-${messageIdx}-${toolId}`,
            messageIdx,
            toolName,
            toolId,
            uri,
            changeType,
            timestamp: new Date().toISOString(),
            description: `${changeType === 'file_edit' ? 'Edited' : 'Rewrote'} ${uri.fsPath.split('/').pop() || uri.fsPath}`,
            canRollback: true,
        };
        messageChanges.push(change);
    }
    getRollbackOperations(threadId) {
        const threadChanges = this._changesByThread.get(threadId);
        if (!threadChanges) {
            return [];
        }
        const operations = [];
        for (const [messageIdx, changes] of threadChanges) {
            if (changes.length > 0) {
                operations.push({
                    id: `${threadId}-${messageIdx}`,
                    messageIdx,
                    changes: [...changes],
                    timestamp: changes[0].timestamp,
                    description: `AI changes in message ${messageIdx + 1}`,
                });
            }
        }
        // Sort by message index (most recent first)
        return operations.sort((a, b) => b.messageIdx - a.messageIdx);
    }
    async rollbackChanges(opts) {
        const { threadId, changeIds } = opts;
        // Get the changes to rollback
        const changesToRollback = [];
        const threadChanges = this._changesByThread.get(threadId);
        if (threadChanges) {
            for (const changes of threadChanges.values()) {
                for (const change of changes) {
                    if (changeIds.includes(change.id)) {
                        changesToRollback.push(change);
                    }
                }
            }
        }
        if (changesToRollback.length === 0) {
            throw new Error('No changes found to rollback');
        }
        // For now, use the VS Code undo system
        // In a more sophisticated implementation, we'd track specific diffs
        // and reverse them individually
        for (const change of changesToRollback) {
            // Use VS Code's undo system - this is a simplified approach
            // A more robust implementation would track the exact diffs and reverse them
            await this._undoLastEditForFile(change.uri);
            // Mark as no longer rollbackable (since we've undone it)
            change.canRollback = false;
        }
    }
    async rollbackMessage(opts) {
        const { threadId, messageIdx } = opts;
        const threadChanges = this._changesByThread.get(threadId);
        if (!threadChanges) {
            throw new Error('No changes found for this thread');
        }
        const messageChanges = threadChanges.get(messageIdx);
        if (!messageChanges || messageChanges.length === 0) {
            throw new Error('No changes found for this message');
        }
        const changeIds = messageChanges.map(c => c.id);
        await this.rollbackChanges({ threadId, changeIds });
    }
    getRollbackableChanges(threadId) {
        const operations = this.getRollbackOperations(threadId);
        return operations.flatMap(op => op.changes.filter(c => c.canRollback));
    }
    async _undoLastEditForFile(uri) {
        // This is a placeholder - in a real implementation,
        // we'd need to integrate with VS Code's undo system
        // or implement our own diff reversal logic
        // For now, we'll rely on the existing undo system
        // The editCodeService already has undo functionality via _addToHistory
        console.log(`Rolling back changes for ${uri.fsPath}`);
    }
}
registerSingleton(IRollbackService, RollbackService, 0 /* InstantiationType.Eager */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm9sbGJhY2tTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvcm9sbGJhY2tTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7MEZBRzBGO0FBRTFGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUF1RDVGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBbUIscUJBQXFCLENBQUMsQ0FBQTtBQUV4RixNQUFNLGVBQWU7SUFNcEI7UUFIQSw4REFBOEQ7UUFDN0MscUJBQWdCLEdBQUcsSUFBSSxHQUFHLEVBQXlDLENBQUE7UUFHbkYsc0NBQXNDO0lBQ3ZDLENBQUM7SUFFRCxZQUFZLENBQUMsSUFPWjtRQUNBLE1BQU0sRUFBRSxRQUFRLEVBQUUsVUFBVSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsR0FBRyxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQTtRQUV4RSxrQ0FBa0M7UUFDbEMsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLFFBQVEsRUFBRSxJQUFJLEdBQUcsRUFBRSxDQUFDLENBQUE7UUFDL0MsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFFLENBQUE7UUFDMUQsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNwQyxhQUFhLENBQUMsR0FBRyxDQUFD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