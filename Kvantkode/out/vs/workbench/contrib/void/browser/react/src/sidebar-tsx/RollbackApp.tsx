/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useCallback, useMemo } from 'react'
import { useChatThreadsState, useAccessor } from '../util/services.js'
import { IChatThreadService } from '../browser/chatThreadService.js'
import { IRollbackService, RollbackChange, RollbackOperation } from '../browser/rollbackService.js'
import { Button } from '../../../../base/browser/ui/button/button.js'

interface RollbackAppProps {
	className?: string
}

export const RollbackApp: React.FC<RollbackAppProps> = ({ className }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get(IChatThreadService)
	const rollbackService = accessor.get(IRollbackService)

	const chatThreadsState = useChatThreadsState()
	const currentThread = chatThreadsService.getCurrentThread()

	const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())
	const [isRollingBack, setIsRollingBack] = useState(false)

	const rollbackOperations = useMemo(() => {
		if (!currentThread) return []
		return rollbackService.getRollbackOperations(currentThread.id)
	}, [currentThread, rollbackService])

	const handleChangeSelect = useCallback((changeId: string, selected: boolean) => {
		setSelectedChanges(prev => {
			const newSet = new Set(prev)
			if (selected) {
				newSet.add(changeId)
			} else {
				newSet.delete(changeId)
			}
			return newSet
		})
	}, [])

	const handleRollbackSelected = useCallback(async () => {
		if (!currentThread || selectedChanges.size === 0) return

		setIsRollingBack(true)
		try {
			await rollbackService.rollbackChanges({
				threadId: currentThread.id,
				changeIds: Array.from(selectedChanges),
			})
			setSelectedChanges(new Set())
		} catch (error) {
			console.error('Rollback failed:', error)
		} finally {
			setIsRollingBack(false)
		}
	}, [currentThread, selectedChanges, rollbackService])

	const handleRollbackAll = useCallback(async () => {
		if (!currentThread || rollbackOperations.length === 0) return

		setIsRollingBack(true)
		try {
			const allChangeIds = rollbackOperations.flatMap(op => op.changes.map(c => c.id))
			await rollbackService.rollbackChanges({
				threadId: currentThread.id,
				changeIds: allChangeIds,
			})
			setSelectedChanges(new Set())
		} catch (error) {
			console.error('Rollback all failed:', error)
		} finally {
			setIsRollingBack(false)
		}
	}, [currentThread, rollbackOperations, rollbackService])

	const handleRollbackMessage = useCallback(async (messageIdx: number) => {
		if (!currentThread) return

		setIsRollingBack(true)
		try {
			await rollbackService.rollbackMessage({
				threadId: currentThread.id,
				messageIdx,
			})
			setSelectedChanges(new Set())
		} catch (error) {
			console.error('Rollback message failed:', error)
		} finally {
			setIsRollingBack(false)
		}
	}, [currentThread, rollbackService])

	if (!currentThread) {
		return (
			<div className={`p-4 ${className || ''}`}>
				<div className="text-void-fg-3">No active thread</div>
			</div>
		)
	}

	if (rollbackOperations.length === 0) {
		return (
			<div className={`p-4 ${className || ''}`}>
				<div className="text-void-fg-3">No AI changes to rollback</div>
			</div>
		)
	}

	return (
		<div className={`p-4 max-h-96 overflow-y-auto ${className || ''}`}>
			<div className="mb-4">
				<h3 className="text-lg font-semibold text-void-fg-1 mb-2">Rollback AI Changes</h3>
				<p className="text-sm text-void-fg-3 mb-4">
					Select specific changes to revert or rollback entire messages.
				</p>

				{/* Action buttons */}
				<div className="flex gap-2 mb-4">
					<Button
						onClick={handleRollbackSelected}
						disabled={selectedChanges.size === 0 || isRollingBack}
						className="px-3 py-1 text-sm"
					>
						{isRollingBack ? 'Rolling back...' : `Rollback Selected (${selectedChanges.size})`}
					</Button>
					<Button
						onClick={handleRollbackAll}
						disabled={rollbackOperations.length === 0 || isRollingBack}
						className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700"
					>
						{isRollingBack ? 'Rolling back...' : 'Rollback All'}
					</Button>
				</div>
			</div>

			{/* Rollback operations */}
			<div className="space-y-4">
				{rollbackOperations.map((operation) => (
					<div key={operation.id} className="border border-void-border-2 rounded p-3">
						<div className="flex items-center justify-between mb-2">
							<div className="flex items-center gap-2">
								<span className="text-sm font-medium text-void-fg-2">
									Message {operation.messageIdx + 1}
								</span>
								<span className="text-xs text-void-fg-4">
									{new Date(operation.timestamp).toLocaleTimeString()}
								</span>
							</div>
							<Button
								onClick={() => handleRollbackMessage(operation.messageIdx)}
								disabled={isRollingBack}
								className="px-2 py-1 text-xs bg-orange-600 hover:bg-orange-700"
							>
								Rollback Message
							</Button>
						</div>

						<div className="text-sm text-void-fg-3 mb-2">{operation.description}</div>

						{/* Individual changes */}
						<div className="space-y-2">
							{operation.changes.map((change: RollbackChange) => (
								<div key={change.id} className="flex items-center gap-2 p-2 bg-void-bg-2 rounded">
									<input
										type="checkbox"
										checked={selectedChanges.has(change.id)}
										onChange={(e) => handleChangeSelect(change.id, e.target.checked)}
										className="rounded"
									/>
									<div className="flex-1">
										<div className="text-sm text-void-fg-2">
											{change.changeType === 'file_edit' ? '✏️' : '📝'} {change.description}
										</div>
										<div className="text-xs text-void-fg-4">
											{change.uri.fsPath.split('/').pop()}
										</div>
									</div>
									<div className={`text-xs px-2 py-1 rounded ${
										change.canRollback
											? 'bg-green-600 text-white'
											: 'bg-gray-600 text-gray-300'
									}`}>
										{change.canRollback ? 'Available' : 'Rolled back'}
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
