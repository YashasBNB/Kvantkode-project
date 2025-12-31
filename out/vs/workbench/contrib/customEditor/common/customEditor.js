/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { distinct } from '../../../../base/common/arrays.js';
import * as nls from '../../../../nls.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { globMatchesResource, priorityToRank, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
export const ICustomEditorService = createDecorator('customEditorService');
export const CONTEXT_ACTIVE_CUSTOM_EDITOR_ID = new RawContextKey('activeCustomEditorId', '', {
    type: 'string',
    description: nls.localize('context.customEditor', 'The viewType of the currently active custom editor.'),
});
export const CONTEXT_FOCUSED_CUSTOM_EDITOR_IS_EDITABLE = new RawContextKey('focusedCustomEditorIsEditable', false);
export var CustomEditorPriority;
(function (CustomEditorPriority) {
    CustomEditorPriority["default"] = "default";
    CustomEditorPriority["builtin"] = "builtin";
    CustomEditorPriority["option"] = "option";
})(CustomEditorPriority || (CustomEditorPriority = {}));
export class CustomEditorInfo {
    constructor(descriptor) {
        this.id = descriptor.id;
        this.displayName = descriptor.displayName;
        this.providerDisplayName = descriptor.providerDisplayName;
        this.priority = descriptor.priority;
        this.selector = descriptor.selector;
    }
    matches(resource) {
        return this.selector.some((selector) => selector.filenamePattern && globMatchesResource(selector.filenamePattern, resource));
    }
}
export class CustomEditorInfoCollection {
    constructor(editors) {
        this.allEditors = distinct(editors, (editor) => editor.id);
    }
    get length() {
        return this.allEditors.length;
    }
    /**
     * Find the single default editor to use (if any) by looking at the editor's priority and the
     * other contributed editors.
     */
    get defaultEditor() {
        return this.allEditors.find((editor) => {
            switch (editor.priority) {
                case RegisteredEditorPriority.default:
                case RegisteredEditorPriority.builtin:
                    // A default editor must have higher priority than all other contributed editors.
                    return this.allEditors.every((otherEditor) => otherEditor === editor || isLowerPriority(otherEditor, editor));
                default:
                    return false;
            }
        });
    }
    /**
     * Find the best available editor to use.
     *
     * Unlike the `defaultEditor`, a bestAvailableEditor can exist even if there are other editors with
     * the same priority.
     */
    get bestAvailableEditor() {
        const editors = Array.from(this.allEditors).sort((a, b) => {
            return priorityToRank(a.priority) - priorityToRank(b.priority);
        });
        return editors[0];
    }
}
function isLowerPriority(otherEditor, editor) {
    return priorityToRank(otherEditor.priority) < priorityToRank(editor.priority);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3VzdG9tRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY3VzdG9tRWRpdG9yL2NvbW1vbi9jdXN0b21FZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBSzVELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLGNBQWMsRUFDZCx3QkFBd0IsR0FDeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUVqRSxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxlQUFlLENBQXVCLHFCQUFxQixDQUFDLENBQUE7QUFFaEcsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsSUFBSSxhQUFhLENBQy9ELHNCQUFzQixFQUN0QixFQUFFLEVBQ0Y7SUFDQyxJQUFJLEVBQUUsUUFBUTtJQUNkLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUN4QixzQkFBc0IsRUFDdEIscURBQXFELENBQ3JEO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0seUNBQXlDLEdBQUcsSUFBSSxhQUFhLENBQ3pFLCtCQUErQixFQUMvQixLQUFLLENBQ0wsQ0FBQTtBQTZERCxNQUFNLENBQU4sSUFBa0Isb0JBSWpCO0FBSkQsV0FBa0Isb0JBQW9CO0lBQ3JDLDJDQUFtQixDQUFBO0lBQ25CLDJDQUFtQixDQUFBO0lBQ25CLHlDQUFpQixDQUFBO0FBQ2xCLENBQUMsRUFKaUIsb0JBQW9CLEtBQXBCLG9CQUFvQixRQUlyQztBQWNELE1BQU0sT0FBTyxnQkFBZ0I7SUFPNUIsWUFBWSxVQUFrQztRQUM3QyxJQUFJLENBQUMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxFQUFFLENBQUE7UUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxVQUFVLENBQUMsV0FBVyxDQUFBO1FBQ3pDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxVQUFVLENBQUMsbUJBQW1CLENBQUE7UUFDekQsSUFBSSxDQUFDLFFBQVEsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFBO1FBQ25DLElBQUksQ0FBQyxRQUFRLEdBQUcsVUFBVSxDQUFDLFFBQVEsQ0FBQTtJQUNwQyxDQUFDO0lBRUQsT0FBTyxDQUFDLFFBQWE7UUFDcEIsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FDeEIsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUNaLFFBQVEsQ0FBQyxlQUFlLElBQUksbUJBQW1CLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxRQUFRLENBQUMsQ0FDcEYsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMEI7SUFHdEMsWUFBWSxPQUFvQztRQUMvQyxJQUFJLENBQUMsVUFBVSxHQUFHLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUMzRCxDQUFDO0lBRUQsSUFBVyxNQUFNO1FBQ2hCLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUE7SUFDOUIsQ0FBQztJQUVEOzs7T0FHRztJQUNILElBQVcsYUFBYTtRQUN2QixPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDdEMsUUFBUSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7Z0JBQ3pCLEtBQUssd0JBQXdCLENBQUMsT0FBTyxDQUFDO2dCQUN0QyxLQUFLLHdCQUF3QixDQUFDLE9BQU87b0JBQ3BDLGlGQUFpRjtvQkFDakYsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FDM0IsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLFdBQVcsS0FBSyxNQUFNLElBQUksZUFBZSxDQUFDLFdBQVcsRUFBRSxNQUFNLENBQUMsQ0FDL0UsQ0FBQTtnQkFFRjtvQkFDQyxPQUFPLEtBQUssQ0FBQTtZQUNkLENBQUM7UUFDRixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILElBQVcsbUJBQW1CO1FBQzdCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRTtZQUN6RCxPQUFPLGNBQWMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvRCxDQUFDLENBQUMsQ0FBQTtRQUNGLE9BQU8sT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xCLENBQUM7Q0FDRDtBQUVELFNBQVMsZUFBZSxDQUFDLFdBQTZCLEVBQUUsTUFBd0I7SUFDL0UsT0FBTyxjQUFjLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxHQUFHLGNBQWMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7QUFDOUUsQ0FBQyJ9