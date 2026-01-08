/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isSearchTreeFileMatch, } from '../searchTreeModel/searchTreeCommon.js';
export function isNotebookFileMatch(obj) {
    return (obj &&
        typeof obj.bindNotebookEditorWidget === 'function' &&
        typeof obj.updateMatchesForEditorWidget === 'function' &&
        typeof obj.unbindNotebookEditorWidget === 'function' &&
        typeof obj.updateNotebookHighlights === 'function' &&
        isSearchTreeFileMatch(obj));
}
export function isIMatchInNotebook(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        typeof obj.parent === 'function' &&
        typeof obj.cellParent === 'object' &&
        typeof obj.isWebviewMatch === 'function' &&
        typeof obj.cellIndex === 'number' &&
        (typeof obj.webviewIndex === 'number' || obj.webviewIndex === undefined) &&
        (typeof obj.cell === 'object' || obj.cell === undefined));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbEJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL25vdGVib29rU2VhcmNoL25vdGVib29rU2VhcmNoTW9kZWxCYXNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBTWhHLE9BQU8sRUFHTixxQkFBcUIsR0FDckIsTUFBTSx3Q0FBd0MsQ0FBQTtBQWMvQyxNQUFNLFVBQVUsbUJBQW1CLENBQUMsR0FBUTtJQUMzQyxPQUFPLENBQ04sR0FBRztRQUNILE9BQU8sR0FBRyxDQUFDLHdCQUF3QixLQUFLLFVBQVU7UUFDbEQsT0FBTyxHQUFHLENBQUMsNEJBQTRCLEtBQUssVUFBVTtRQUN0RCxPQUFPLEdBQUcsQ0FBQywwQkFBMEIsS0FBSyxVQUFVO1FBQ3BELE9BQU8sR0FBRyxDQUFDLHdCQUF3QixLQUFLLFVBQVU7UUFDbEQscUJBQXFCLENBQUMsR0FBRyxDQUFDLENBQzFCLENBQUE7QUFDRixDQUFDO0FBVUQsTUFBTSxVQUFVLGtCQUFrQixDQUFDLEdBQVE7SUFDMUMsT0FBTyxDQUNOLE9BQU8sR0FBRyxLQUFLLFFBQVE7UUFDdkIsR0FBRyxLQUFLLElBQUk7UUFDWixPQUFPLEdBQUcsQ0FBQyxNQUFNLEtBQUssVUFBVTtRQUNoQyxPQUFPLEdBQUcsQ0FBQyxVQUFVLEtBQUssUUFBUTtRQUNsQyxPQUFPLEdBQUcsQ0FBQyxjQUFjLEtBQUssVUFBVTtRQUN4QyxPQUFPLEdBQUcsQ0FBQyxTQUFTLEtBQUssUUFBUTtRQUNqQyxDQUFDLE9BQU8sR0FBRyxDQUFDLFlBQVksS0FBSyxRQUFRLElBQUksR0FBRyxDQUFDLFlBQVksS0FBSyxTQUFTLENBQUM7UUFDeEUsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxJQUFJLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFDLENBQ3hELENBQUE7QUFDRixDQUFDIn0=