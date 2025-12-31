/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isEqual } from '../../../../../base/common/resources.js';
import { findDiffEditorContainingCodeEditor } from '../../../../../editor/browser/widget/diffEditor/commands.js';
export function isTextDiffEditorForEntry(accessor, entry, editor) {
    const diffEditor = findDiffEditorContainingCodeEditor(accessor, editor);
    if (!diffEditor) {
        return false;
    }
    const originalModel = diffEditor.getOriginalEditor().getModel();
    const modifiedModel = diffEditor.getModifiedEditor().getModel();
    return (isEqual(originalModel?.uri, entry.originalURI) && isEqual(modifiedModel?.uri, entry.modifiedURI));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBSWhILE1BQU0sVUFBVSx3QkFBd0IsQ0FDdkMsUUFBMEIsRUFDMUIsS0FBeUIsRUFDekIsTUFBbUI7SUFFbkIsTUFBTSxVQUFVLEdBQUcsa0NBQWtDLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZFLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztRQUNqQixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUMvRCxNQUFNLGFBQWEsR0FBRyxVQUFVLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUMvRCxPQUFPLENBQ04sT0FBTyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FDaEcsQ0FBQTtBQUNGLENBQUMifQ==