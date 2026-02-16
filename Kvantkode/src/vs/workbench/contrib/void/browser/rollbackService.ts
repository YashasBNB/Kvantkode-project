/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import {
	InstantiationType,
	registerSingleton,
} from '../../../../platform/instantiation/common/extensions.js'
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js'
import { URI } from '../../../../base/common/uri.js'

export type RollbackChange = {
	id: string
	messageIdx: number
	toolName: string
	toolId: string
	uri: URI
	changeType: 'file_edit' | 'file_rewrite'
	timestamp: string
	description: string
	canRollback: boolean
}

export type RollbackOperation = {
	id: string
	messageIdx: number
	changes: RollbackChange[]
	timestamp: string
	description: string
}

export interface IRollbackService {
	readonly _serviceBrand: undefined

	// Track changes made by AI tools
	recordChange(opts: {
		threadId: string
		messageIdx: number
		toolName: string
		toolId: string
		uri: URI
		changeType: 'file_edit' | 'file_rewrite'
	}): void

	// Get rollback operations for a thread
	getRollbackOperations(threadId: string): RollbackOperation[]

	// Rollback specific changes
	rollbackChanges(opts: {
		threadId: string
		changeIds: string[]
	}): Promise<void>

	// Rollback all changes from a message
	rollbackMessage(opts: {
		threadId: string
		messageIdx: number
	}): Promise<void>

	// Get changes that can be rolled back
	getRollbackableChanges(threadId: string): RollbackChange[]
}

export const IRollbackService = createDecorator<IRollbackService>('voidRollbackService')

class RollbackService implements IRollbackService {
	_serviceBrand: undefined

	// Track changes per thread: threadId -> messageIdx -> changes
	private readonly _changesByThread = new Map<string, Map<number, RollbackChange[]>>()

	constructor() {
		// Service doesn't need initialization
	}

	recordChange(opts: {
		threadId: string
		messageIdx: number
		toolName: string
		toolId: string
		uri: URI
		changeType: 'file_edit' | 'file_rewrite'
	}): void {
		const { threadId, messageIdx, toolName, toolId, uri, changeType } = opts

		// Initialize thread map if needed
		if (!this._changesByThread.has(threadId)) {
			this._changesByThread.set(threadId, new Map())
		}

		const threadChanges = this._changesByThread.get(threadId)!
		if (!threadChanges.has(messageIdx)) {
			threadChanges.set(messageIdx, [])
		}

		const messageChanges = threadChanges.get(messageIdx)!

		// Check if we already recorded this change
		const existingChange = messageChanges.find(c => c.toolId === toolId)
		if (existingChange) {
			return
		}

		const change: RollbackChange = {
			id: `${threadId}-${messageIdx}-${toolId}`,
			messageIdx,
			toolName,
			toolId,
			uri,
			changeType,
			timestamp: new Date().toISOString(),
			description: `${changeType === 'file_edit' ? 'Edited' : 'Rewrote'} ${uri.fsPath.split('/').pop() || uri.fsPath}`,
			canRollback: true,
		}

		messageChanges.push(change)
	}

	getRollbackOperations(threadId: string): RollbackOperation[] {
		const threadChanges = this._changesByThread.get(threadId)
		if (!threadChanges) {
			return []
		}

		const operations: RollbackOperation[] = []
		for (const [messageIdx, changes] of threadChanges) {
			if (changes.length > 0) {
				operations.push({
					id: `${threadId}-${messageIdx}`,
					messageIdx,
					changes: [...changes],
					timestamp: changes[0].timestamp,
					description: `AI changes in message ${messageIdx + 1}`,
				})
			}
		}

		// Sort by message index (most recent first)
		return operations.sort((a, b) => b.messageIdx - a.messageIdx)
	}

	async rollbackChanges(opts: {
		threadId: string
		changeIds: string[]
	}): Promise<void> {
		const { threadId, changeIds } = opts

		// Get the changes to rollback
		const changesToRollback: RollbackChange[] = []
		const threadChanges = this._changesByThread.get(threadId)

		if (threadChanges) {
			for (const changes of threadChanges.values()) {
				for (const change of changes) {
					if (changeIds.includes(change.id)) {
						changesToRollback.push(change)
					}
				}
			}
		}

		if (changesToRollback.length === 0) {
			throw new Error('No changes found to rollback')
		}

		// For now, use the VS Code undo system
		// In a more sophisticated implementation, we'd track specific diffs
		// and reverse them individually
		for (const change of changesToRollback) {
			// Use VS Code's undo system - this is a simplified approach
			// A more robust implementation would track the exact diffs and reverse them
			await this._undoLastEditForFile(change.uri)

			// Mark as no longer rollbackable (since we've undone it)
			change.canRollback = false
		}
	}

	async rollbackMessage(opts: {
		threadId: string
		messageIdx: number
	}): Promise<void> {
		const { threadId, messageIdx } = opts

		const threadChanges = this._changesByThread.get(threadId)
		if (!threadChanges) {
			throw new Error('No changes found for this thread')
		}

		const messageChanges = threadChanges.get(messageIdx)
		if (!messageChanges || messageChanges.length === 0) {
			throw new Error('No changes found for this message')
		}

		const changeIds = messageChanges.map(c => c.id)
		await this.rollbackChanges({ threadId, changeIds })
	}

	getRollbackableChanges(threadId: string): RollbackChange[] {
		const operations = this.getRollbackOperations(threadId)
		return operations.flatMap(op => op.changes.filter(c => c.canRollback))
	}

	private async _undoLastEditForFile(uri: URI): Promise<void> {
		// This is a placeholder - in a real implementation,
		// we'd need to integrate with VS Code's undo system
		// or implement our own diff reversal logic

		// For now, we'll rely on the existing undo system
		// The editCodeService already has undo functionality via _addToHistory
		console.log(`Rolling back changes for ${uri.fsPath}`)
	}
}

registerSingleton(IRollbackService, RollbackService, InstantiationType.Eager)
