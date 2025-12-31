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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tTZWFyY2hNb2RlbEJhc2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9ub3RlYm9va1NlYXJjaC9ub3RlYm9va1NlYXJjaE1vZGVsQmFzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQU1oRyxPQUFPLEVBR04scUJBQXFCLEdBQ3JCLE1BQU0sd0NBQXdDLENBQUE7QUFjL0MsTUFBTSxVQUFVLG1CQUFtQixDQUFDLEdBQVE7SUFDM0MsT0FBTyxDQUNOLEdBQUc7UUFDSCxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxVQUFVO1FBQ2xELE9BQU8sR0FBRyxDQUFDLDRCQUE0QixLQUFLLFVBQVU7UUFDdEQsT0FBTyxHQUFHLENBQUMsMEJBQTBCLEtBQUssVUFBVTtRQUNwRCxPQUFPLEdBQUcsQ0FBQyx3QkFBd0IsS0FBSyxVQUFVO1FBQ2xELHFCQUFxQixDQUFDLEdBQUcsQ0FBQyxDQUMxQixDQUFBO0FBQ0YsQ0FBQztBQVVELE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxHQUFRO0lBQzFDLE9BQU8sQ0FDTixPQUFPLEdBQUcsS0FBSyxRQUFRO1FBQ3ZCLEdBQUcsS0FBSyxJQUFJO1FBQ1osT0FBTyxHQUFHLENBQUMsTUFBTSxLQUFLLFVBQVU7UUFDaEMsT0FBTyxHQUFHLENBQUMsVUFBVSxLQUFLLFFBQVE7UUFDbEMsT0FBTyxHQUFHLENBQUMsY0FBYyxLQUFLLFVBQVU7UUFDeEMsT0FBTyxHQUFHLENBQUMsU0FBUyxLQUFLLFFBQVE7UUFDakMsQ0FBQyxPQUFPLEdBQUcsQ0FBQyxZQUFZLEtBQUssUUFBUSxJQUFJLEdBQUcsQ0FBQyxZQUFZLEtBQUssU0FBUyxDQUFDO1FBQ3hFLENBQUMsT0FBTyxHQUFHLENBQUMsSUFBSSxLQUFLLFFBQVEsSUFBSSxHQUFHLENBQUMsSUFBSSxLQUFLLFNBQVMsQ0FBQyxDQUN4RCxDQUFBO0FBQ0YsQ0FBQyJ9