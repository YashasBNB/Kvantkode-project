/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { useState, useCallback, useMemo } from 'react';
import { useChatThreadsState, useAccessor } from '../util/services.js';
import { IChatThreadService } from '../browser/chatThreadService.js';
import { IRollbackService, RollbackChange, RollbackOperation } from '../browser/rollbackService.js';
import { Button } from '../../../../base/browser/ui/button/button.js';

interface RollbackAppProps {
  className?: string;
}

export const RollbackApp: React.FC<RollbackAppProps> = ({ className }) => {
  const accessor = useAccessor();
  const chatThreadsService = accessor.get(IChatThreadService);
  const rollbackService = accessor.get(IRollbackService);

  const chatThreadsState = useChatThreadsState();
  const currentThread = chatThreadsService.getCurrentThread();

  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set());
  const [isRollingBack, setIsRollingBack] = useState(false);

  const rollbackOperations = useMemo(() => {
    if (!currentThread) return [];
    return rollbackService.getRollbackOperations(currentThread.id);
  }, [currentThread, rollbackService]);

  const handleChangeSelect = useCallback((changeId: string, selected: boolean) => {
    setSelectedChanges((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(changeId);
      } else {
        newSet.delete(changeId);
      }
      return newSet;
    });
  }, []);

  const handleRollbackSelected = useCallback(async () => {
    if (!currentThread || selectedChanges.size === 0) return;

    setIsRollingBack(true);
    try {
      await rollbackService.rollbackChanges({
        threadId: currentThread.id,
        changeIds: Array.from(selectedChanges)
      });
      setSelectedChanges(new Set());
    } catch (error) {
      console.error('Rollback failed:', error);
    } finally {
      setIsRollingBack(false);
    }
  }, [currentThread, selectedChanges, rollbackService]);

  const handleRollbackAll = useCallback(async () => {
    if (!currentThread || rollbackOperations.length === 0) return;

    setIsRollingBack(true);
    try {
      const allChangeIds = rollbackOperations.flatMap((op) => op.changes.map((c) => c.id));
      await rollbackService.rollbackChanges({
        threadId: currentThread.id,
        changeIds: allChangeIds
      });
      setSelectedChanges(new Set());
    } catch (error) {
      console.error('Rollback all failed:', error);
    } finally {
      setIsRollingBack(false);
    }
  }, [currentThread, rollbackOperations, rollbackService]);

  const handleRollbackMessage = useCallback(async (messageIdx: number) => {
    if (!currentThread) return;

    setIsRollingBack(true);
    try {
      await rollbackService.rollbackMessage({
        threadId: currentThread.id,
        messageIdx
      });
      setSelectedChanges(new Set());
    } catch (error) {
      console.error('Rollback message failed:', error);
    } finally {
      setIsRollingBack(false);
    }
  }, [currentThread, rollbackService]);

  if (!currentThread) {
    return (
      <div className={`void-p-4 ${className || ''}`}>
				<div className="void-text-void-fg-3">No active thread</div>
			</div>);

  }

  if (rollbackOperations.length === 0) {
    return (
      <div className={`void-p-4 ${className || ''}`}>
				<div className="void-text-void-fg-3">No AI changes to rollback</div>
			</div>);

  }

  return (
    <div className={`void-p-4 void-max-h-96 void-overflow-y-auto ${className || ''}`}>
			<div className="void-mb-4">
				<h3 className="void-text-lg void-font-semibold void-text-void-fg-1 void-mb-2">Rollback AI Changes</h3>
				<p className="void-text-sm void-text-void-fg-3 void-mb-4">
					Select specific changes to revert or rollback entire messages.
				</p>

				{/* Action buttons */}
				<div className="void-flex void-gap-2 void-mb-4">
					<Button
            onClick={handleRollbackSelected}
            disabled={selectedChanges.size === 0 || isRollingBack}
            className="void-px-3 void-py-1 void-text-sm">

						{isRollingBack ? 'Rolling back...' : `Rollback Selected (${selectedChanges.size})`}
					</Button>
					<Button
            onClick={handleRollbackAll}
            disabled={rollbackOperations.length === 0 || isRollingBack}
            className="void-px-3 void-py-1 void-text-sm void-bg-red-600 hover:void-bg-red-700">

						{isRollingBack ? 'Rolling back...' : 'Rollback All'}
					</Button>
				</div>
			</div>

			{/* Rollback operations */}
			<div className="void-space-y-4">
				{rollbackOperations.map((operation) =>
        <div key={operation.id} className="void-border void-border-void-border-2 void-rounded void-p-3">
						<div className="void-flex void-items-center void-justify-between void-mb-2">
							<div className="void-flex void-items-center void-gap-2">
								<span className="void-text-sm void-font-medium void-text-void-fg-2">
									Message {operation.messageIdx + 1}
								</span>
								<span className="void-text-xs void-text-void-fg-4">
									{new Date(operation.timestamp).toLocaleTimeString()}
								</span>
							</div>
							<Button
              onClick={() => handleRollbackMessage(operation.messageIdx)}
              disabled={isRollingBack}
              className="void-px-2 void-py-1 void-text-xs void-bg-orange-600 hover:void-bg-orange-700">

								Rollback Message
							</Button>
						</div>

						<div className="void-text-sm void-text-void-fg-3 void-mb-2">{operation.description}</div>

						{/* Individual changes */}
						<div className="void-space-y-2">
							{operation.changes.map((change: RollbackChange) =>
            <div key={change.id} className="void-flex void-items-center void-gap-2 void-p-2 void-bg-void-bg-2 void-rounded">
									<input
                type="checkbox"
                checked={selectedChanges.has(change.id)}
                onChange={(e) => handleChangeSelect(change.id, e.target.checked)}
                className="void-rounded" />

									<div className="void-flex-1">
										<div className="void-text-sm void-text-void-fg-2">
											{change.changeType === 'file_edit' ? '✏️' : '📝'} {change.description}
										</div>
										<div className="void-text-xs void-text-void-fg-4">
											{change.uri.fsPath.split('/').pop()}
										</div>
									</div>
									<div className={`void-text-xs void-px-2 void-py-1 void-rounded ${
              change.canRollback ? "void-bg-green-600 void-text-white" : "void-bg-gray-600 void-text-gray-300"}`}>



										{change.canRollback ? 'Available' : 'Rolled back'}
									</div>
								</div>
            )}
						</div>
					</div>
        )}
			</div>
		</div>);

};