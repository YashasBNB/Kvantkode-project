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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVyZ2VFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21lcmdlRWRpdG9yL2NvbW1vbi9tZXJnZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBSXBGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLElBQUksYUFBYSxDQUFVLGVBQWUsRUFBRSxLQUFLLEVBQUU7SUFDbEYsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSw4QkFBOEIsQ0FBQztDQUMzRCxDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLEVBQUU7SUFDOUYsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUFDLEtBQUssRUFBRSxzREFBc0QsQ0FBQztDQUNwRixDQUFDLENBQUE7QUFDRixNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLGFBQWEsQ0FDcEQsbUJBQW1CLEVBQ25CLE9BQU8sRUFDUCxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxjQUFjLEVBQUUsbUNBQW1DLENBQUMsRUFBRSxDQUM5RixDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQUcsSUFBSSxhQUFhLENBQVUscUJBQXFCLEVBQUUsS0FBSyxFQUFFO0lBQzlGLElBQUksRUFBRSxTQUFTO0lBQ2YsV0FBVyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsNENBQTRDLENBQUM7Q0FDL0UsQ0FBQyxDQUFBO0FBQ0YsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsSUFBSSxhQUFhLENBQzNELDBCQUEwQixFQUMxQixLQUFLLEVBQ0wsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFdBQVcsRUFBRSxRQUFRLENBQUMsZUFBZSxFQUFFLG9DQUFvQyxDQUFDLEVBQUUsQ0FDakcsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLHVDQUF1QyxHQUFHLElBQUksYUFBYSxDQUN2RSxzQ0FBc0MsRUFDdEMsS0FBSyxFQUNMO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixXQUFXLEVBQUUsUUFBUSxDQUNwQiwyQkFBMkIsRUFDM0IsbURBQW1ELENBQ25EO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLElBQUksYUFBYSxDQUFTLG9CQUFvQixFQUFFLEVBQUUsRUFBRTtJQUNsRixJQUFJLEVBQUUsUUFBUTtJQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsU0FBUyxFQUFFLHdDQUF3QyxDQUFDO0NBQzFFLENBQUMsQ0FBQTtBQUNGLE1BQU0sQ0FBQyxNQUFNLGlCQUFpQixHQUFHLElBQUksYUFBYSxDQUFTLHNCQUFzQixFQUFFLEVBQUUsRUFBRTtJQUN0RixJQUFJLEVBQUUsUUFBUTtJQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVyxFQUFFLHlDQUF5QyxDQUFDO0NBQzdFLENBQUMsQ0FBQTtBQVdGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLCtCQUErQixDQUFBIn0=