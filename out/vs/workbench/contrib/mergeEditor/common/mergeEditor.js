/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export const ctxIsMergeEditor = new RawContextKey('isMergeEditor', false, {
    type: 'boolean',
    description: localize('is', 'The editor is a merge editor'),
});
export const ctxIsMergeResultEditor = new RawContextKey('isMergeResultEditor', false, {
    type: 'boolean',
    description: localize('isr', 'The editor is a the result editor of a merge editor.'),
});
export const ctxMergeEditorLayout = new RawContextKey('mergeEditorLayout', 'mixed', { type: 'string', description: localize('editorLayout', 'The layout mode of a merge editor') });
export const ctxMergeEditorShowBase = new RawContextKey('mergeEditorShowBase', false, {
    type: 'boolean',
    description: localize('showBase', 'If the merge editor shows the base version'),
});
export const ctxMergeEditorShowBaseAtTop = new RawContextKey('mergeEditorShowBaseAtTop', false, { type: 'boolean', description: localize('showBaseAtTop', 'If base should be shown at the top') });
export const ctxMergeEditorShowNonConflictingChanges = new RawContextKey('mergeEditorShowNonConflictingChanges', false, {
    type: 'boolean',
    description: localize('showNonConflictingChanges', 'If the merge editor shows non-conflicting changes'),
});
export const ctxMergeBaseUri = new RawContextKey('mergeEditorBaseUri', '', {
    type: 'string',
    description: localize('baseUri', 'The uri of the baser of a merge editor'),
});
export const ctxMergeResultUri = new RawContextKey('mergeEditorResultUri', '', {
    type: 'string',
    description: localize('resultUri', 'The uri of the result of a merge editor'),
});
export const StorageCloseWithConflicts = 'mergeEditorCloseWithConflicts';
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tZXJnZUVkaXRvci9jb21tb24vbWVyZ2VFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUlwRixNQUFNLENBQUMsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxlQUFlLEVBQUUsS0FBSyxFQUFFO0lBQ2xGLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLENBQUM7Q0FDM0QsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsS0FBSyxFQUFFO0lBQzlGLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxLQUFLLEVBQUUsc0RBQXNELENBQUM7Q0FDcEYsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxhQUFhLENBQ3BELG1CQUFtQixFQUNuQixPQUFPLEVBQ1AsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsY0FBYyxFQUFFLG1DQUFtQyxDQUFDLEVBQUUsQ0FDOUYsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUFHLElBQUksYUFBYSxDQUFVLHFCQUFxQixFQUFFLEtBQUssRUFBRTtJQUM5RixJQUFJLEVBQUUsU0FBUztJQUNmLFdBQVcsRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLDRDQUE0QyxDQUFDO0NBQy9FLENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUMzRCwwQkFBMEIsRUFDMUIsS0FBSyxFQUNMLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxXQUFXLEVBQUUsUUFBUSxDQUFDLGVBQWUsRUFBRSxvQ0FBb0MsQ0FBQyxFQUFFLENBQ2pHLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSx1Q0FBdUMsR0FBRyxJQUFJLGFBQWEsQ0FDdkUsc0NBQXNDLEVBQ3RDLEtBQUssRUFDTDtJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsMkJBQTJCLEVBQzNCLG1EQUFtRCxDQUNuRDtDQUNELENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBUyxvQkFBb0IsRUFBRSxFQUFFLEVBQUU7SUFDbEYsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLFNBQVMsRUFBRSx3Q0FBd0MsQ0FBQztDQUMxRSxDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FBUyxzQkFBc0IsRUFBRSxFQUFFLEVBQUU7SUFDdEYsSUFBSSxFQUFFLFFBQVE7SUFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsRUFBRSx5Q0FBeUMsQ0FBQztDQUM3RSxDQUFDLENBQUE7QUFXRixNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRywrQkFBK0IsQ0FBQSJ9