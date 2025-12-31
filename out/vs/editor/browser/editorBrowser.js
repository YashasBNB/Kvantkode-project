/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as editorCommon from '../common/editorCommon.js';
/**
 * A positioning preference for rendering content widgets.
 */
export var ContentWidgetPositionPreference;
(function (ContentWidgetPositionPreference) {
    /**
     * Place the content widget exactly at a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["EXACT"] = 0] = "EXACT";
    /**
     * Place the content widget above a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["ABOVE"] = 1] = "ABOVE";
    /**
     * Place the content widget below a position
     */
    ContentWidgetPositionPreference[ContentWidgetPositionPreference["BELOW"] = 2] = "BELOW";
})(ContentWidgetPositionPreference || (ContentWidgetPositionPreference = {}));
/**
 * A positioning preference for rendering overlay widgets.
 */
export var OverlayWidgetPositionPreference;
(function (OverlayWidgetPositionPreference) {
    /**
     * Position the overlay widget in the top right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_RIGHT_CORNER"] = 0] = "TOP_RIGHT_CORNER";
    /**
     * Position the overlay widget in the bottom right corner
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["BOTTOM_RIGHT_CORNER"] = 1] = "BOTTOM_RIGHT_CORNER";
    /**
     * Position the overlay widget in the top center
     */
    OverlayWidgetPositionPreference[OverlayWidgetPositionPreference["TOP_CENTER"] = 2] = "TOP_CENTER";
})(OverlayWidgetPositionPreference || (OverlayWidgetPositionPreference = {}));
/**
 * Type of hit element with the mouse in the editor.
 */
export var MouseTargetType;
(function (MouseTargetType) {
    /**
     * Mouse is on top of an unknown element.
     */
    MouseTargetType[MouseTargetType["UNKNOWN"] = 0] = "UNKNOWN";
    /**
     * Mouse is on top of the textarea used for input.
     */
    MouseTargetType[MouseTargetType["TEXTAREA"] = 1] = "TEXTAREA";
    /**
     * Mouse is on top of the glyph margin
     */
    MouseTargetType[MouseTargetType["GUTTER_GLYPH_MARGIN"] = 2] = "GUTTER_GLYPH_MARGIN";
    /**
     * Mouse is on top of the line numbers
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_NUMBERS"] = 3] = "GUTTER_LINE_NUMBERS";
    /**
     * Mouse is on top of the line decorations
     */
    MouseTargetType[MouseTargetType["GUTTER_LINE_DECORATIONS"] = 4] = "GUTTER_LINE_DECORATIONS";
    /**
     * Mouse is on top of the whitespace left in the gutter by a view zone.
     */
    MouseTargetType[MouseTargetType["GUTTER_VIEW_ZONE"] = 5] = "GUTTER_VIEW_ZONE";
    /**
     * Mouse is on top of text in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_TEXT"] = 6] = "CONTENT_TEXT";
    /**
     * Mouse is on top of empty space in the content (e.g. after line text or below last line)
     */
    MouseTargetType[MouseTargetType["CONTENT_EMPTY"] = 7] = "CONTENT_EMPTY";
    /**
     * Mouse is on top of a view zone in the content.
     */
    MouseTargetType[MouseTargetType["CONTENT_VIEW_ZONE"] = 8] = "CONTENT_VIEW_ZONE";
    /**
     * Mouse is on top of a content widget.
     */
    MouseTargetType[MouseTargetType["CONTENT_WIDGET"] = 9] = "CONTENT_WIDGET";
    /**
     * Mouse is on top of the decorations overview ruler.
     */
    MouseTargetType[MouseTargetType["OVERVIEW_RULER"] = 10] = "OVERVIEW_RULER";
    /**
     * Mouse is on top of a scrollbar.
     */
    MouseTargetType[MouseTargetType["SCROLLBAR"] = 11] = "SCROLLBAR";
    /**
     * Mouse is on top of an overlay widget.
     */
    MouseTargetType[MouseTargetType["OVERLAY_WIDGET"] = 12] = "OVERLAY_WIDGET";
    /**
     * Mouse is outside of the editor.
     */
    MouseTargetType[MouseTargetType["OUTSIDE_EDITOR"] = 13] = "OUTSIDE_EDITOR";
})(MouseTargetType || (MouseTargetType = {}));
/**
 * @internal
 */
export var DiffEditorState;
(function (DiffEditorState) {
    DiffEditorState[DiffEditorState["Idle"] = 0] = "Idle";
    DiffEditorState[DiffEditorState["ComputingDiff"] = 1] = "ComputingDiff";
    DiffEditorState[DiffEditorState["DiffComputed"] = 2] = "DiffComputed";
})(DiffEditorState || (DiffEditorState = {}));
/**
 *@internal
 */
export function isCodeEditor(thing) {
    if (thing && typeof thing.getEditorType === 'function') {
        return thing.getEditorType() === editorCommon.EditorType.ICodeEditor;
    }
    else {
        return false;
    }
}
/**
 *@internal
 */
export function isDiffEditor(thing) {
    if (thing && typeof thing.getEditorType === 'function') {
        return thing.getEditorType() === editorCommon.EditorType.IDiffEditor;
    }
    else {
        return false;
    }
}
/**
 *@internal
 */
export function isCompositeEditor(thing) {
    return (!!thing &&
        typeof thing === 'object' &&
        typeof thing.onDidChangeActiveEditor === 'function');
}
/**
 *@internal
 */
export function getCodeEditor(thing) {
    if (isCodeEditor(thing)) {
        return thing;
    }
    if (isDiffEditor(thing)) {
        return thing.getModifiedEditor();
    }
    if (isCompositeEditor(thing) && isCodeEditor(thing.activeCodeEditor)) {
        return thing.activeCodeEditor;
    }
    return null;
}
/**
 *@internal
 */
export function getIEditor(thing) {
    if (isCodeEditor(thing) || isDiffEditor(thing)) {
        return thing;
    }
    return null;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2VkaXRvckJyb3dzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUEyQmhHLE9BQU8sS0FBSyxZQUFZLE1BQU0sMkJBQTJCLENBQUE7QUFvSHpEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLCtCQWFqQjtBQWJELFdBQWtCLCtCQUErQjtJQUNoRDs7T0FFRztJQUNILHVGQUFLLENBQUE7SUFDTDs7T0FFRztJQUNILHVGQUFLLENBQUE7SUFDTDs7T0FFRztJQUNILHVGQUFLLENBQUE7QUFDTixDQUFDLEVBYmlCLCtCQUErQixLQUEvQiwrQkFBK0IsUUFhaEQ7QUE0RkQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsK0JBZWpCO0FBZkQsV0FBa0IsK0JBQStCO0lBQ2hEOztPQUVHO0lBQ0gsNkdBQWdCLENBQUE7SUFFaEI7O09BRUc7SUFDSCxtSEFBbUIsQ0FBQTtJQUVuQjs7T0FFRztJQUNILGlHQUFVLENBQUE7QUFDWCxDQUFDLEVBZmlCLCtCQUErQixLQUEvQiwrQkFBK0IsUUFlaEQ7QUFtR0Q7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsZUF5RGpCO0FBekRELFdBQWtCLGVBQWU7SUFDaEM7O09BRUc7SUFDSCwyREFBTyxDQUFBO0lBQ1A7O09BRUc7SUFDSCw2REFBUSxDQUFBO0lBQ1I7O09BRUc7SUFDSCxtRkFBbUIsQ0FBQTtJQUNuQjs7T0FFRztJQUNILG1GQUFtQixDQUFBO0lBQ25COztPQUVHO0lBQ0gsMkZBQXVCLENBQUE7SUFDdkI7O09BRUc7SUFDSCw2RUFBZ0IsQ0FBQTtJQUNoQjs7T0FFRztJQUNILHFFQUFZLENBQUE7SUFDWjs7T0FFRztJQUNILHVFQUFhLENBQUE7SUFDYjs7T0FFRztJQUNILCtFQUFpQixDQUFBO0lBQ2pCOztPQUVHO0lBQ0gseUVBQWMsQ0FBQTtJQUNkOztPQUVHO0lBQ0gsMEVBQWMsQ0FBQTtJQUNkOztPQUVHO0lBQ0gsZ0VBQVMsQ0FBQTtJQUNUOztPQUVHO0lBQ0gsMEVBQWMsQ0FBQTtJQUNkOztPQUVHO0lBQ0gsMEVBQWMsQ0FBQTtBQUNmLENBQUMsRUF6RGlCLGVBQWUsS0FBZixlQUFlLFFBeURoQztBQXUyQkQ7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsZUFJakI7QUFKRCxXQUFrQixlQUFlO0lBQ2hDLHFEQUFJLENBQUE7SUFDSix1RUFBYSxDQUFBO0lBQ2IscUVBQVksQ0FBQTtBQUNiLENBQUMsRUFKaUIsZUFBZSxLQUFmLGVBQWUsUUFJaEM7QUFtSEQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEtBQWM7SUFDMUMsSUFBSSxLQUFLLElBQUksT0FBcUIsS0FBTSxDQUFDLGFBQWEsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN2RSxPQUFxQixLQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUE7SUFDcEYsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsWUFBWSxDQUFDLEtBQWM7SUFDMUMsSUFBSSxLQUFLLElBQUksT0FBcUIsS0FBTSxDQUFDLGFBQWEsS0FBSyxVQUFVLEVBQUUsQ0FBQztRQUN2RSxPQUFxQixLQUFNLENBQUMsYUFBYSxFQUFFLEtBQUssWUFBWSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUE7SUFDcEYsQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCLENBQUMsS0FBYztJQUMvQyxPQUFPLENBQ04sQ0FBQyxDQUFDLEtBQUs7UUFDUCxPQUFPLEtBQUssS0FBSyxRQUFRO1FBQ3pCLE9BQTJDLEtBQU0sQ0FBQyx1QkFBdUIsS0FBSyxVQUFVLENBQ3hGLENBQUE7QUFDRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsYUFBYSxDQUFDLEtBQWM7SUFDM0MsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUN6QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFFRCxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sS0FBSyxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDakMsQ0FBQztJQUVELElBQUksaUJBQWlCLENBQUMsS0FBSyxDQUFDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7UUFDdEUsT0FBTyxLQUFLLENBQUMsZ0JBQWdCLENBQUE7SUFDOUIsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQztBQUVEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFVBQVUsQ0FBQyxLQUFVO0lBQ3BDLElBQUksWUFBWSxDQUFDLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ2hELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU8sSUFBSSxDQUFBO0FBQ1osQ0FBQyJ9