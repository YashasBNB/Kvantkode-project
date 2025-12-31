/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction2 } from '../../../../../editor/browser/editorExtensions.js';
import { localize2 } from '../../../../../nls.js';
import { Action2 } from '../../../../../platform/actions/common/actions.js';
const defaultOptions = {
    category: localize2('snippets', 'Snippets'),
};
export class SnippetsAction extends Action2 {
    constructor(desc) {
        super({ ...defaultOptions, ...desc });
    }
}
export class SnippetEditorAction extends EditorAction2 {
    constructor(desc) {
        super({ ...defaultOptions, ...desc });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RTbmlwcGV0c0FjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zbmlwcGV0cy9icm93c2VyL2NvbW1hbmRzL2Fic3RyYWN0U25pcHBldHNBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLE9BQU8sRUFBbUIsTUFBTSxtREFBbUQsQ0FBQTtBQUU1RixNQUFNLGNBQWMsR0FBRztJQUN0QixRQUFRLEVBQUUsU0FBUyxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUM7Q0FDbEMsQ0FBQTtBQUVWLE1BQU0sT0FBZ0IsY0FBZSxTQUFRLE9BQU87SUFDbkQsWUFBWSxJQUErQjtRQUMxQyxLQUFLLENBQUMsRUFBRSxHQUFHLGNBQWMsRUFBRSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFnQixtQkFBb0IsU0FBUSxhQUFhO0lBQzlELFlBQVksSUFBK0I7UUFDMUMsS0FBSyxDQUFDLEVBQUUsR0FBRyxjQUFjLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7Q0FDRCJ9