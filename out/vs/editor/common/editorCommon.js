/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export var ScrollType;
(function (ScrollType) {
    ScrollType[ScrollType["Smooth"] = 0] = "Smooth";
    ScrollType[ScrollType["Immediate"] = 1] = "Immediate";
})(ScrollType || (ScrollType = {}));
/**
 * @internal
 */
export function isThemeColor(o) {
    return o && typeof o.id === 'string';
}
/**
 * The type of the `IEditor`.
 */
export const EditorType = {
    ICodeEditor: 'vs.editor.ICodeEditor',
    IDiffEditor: 'vs.editor.IDiffEditor',
};
/**
 * Built-in commands.
 * @internal
 */
export var Handler;
(function (Handler) {
    Handler["CompositionStart"] = "compositionStart";
    Handler["CompositionEnd"] = "compositionEnd";
    Handler["Type"] = "type";
    Handler["ReplacePreviousChar"] = "replacePreviousChar";
    Handler["CompositionType"] = "compositionType";
    Handler["Paste"] = "paste";
    Handler["Cut"] = "cut";
})(Handler || (Handler = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29tbW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9lZGl0b3JDb21tb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUEyTmhHLE1BQU0sQ0FBTixJQUFrQixVQUdqQjtBQUhELFdBQWtCLFVBQVU7SUFDM0IsK0NBQVUsQ0FBQTtJQUNWLHFEQUFhLENBQUE7QUFDZCxDQUFDLEVBSGlCLFVBQVUsS0FBVixVQUFVLFFBRzNCO0FBd1lEOztHQUVHO0FBQ0gsTUFBTSxVQUFVLFlBQVksQ0FBQyxDQUFNO0lBQ2xDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxRQUFRLENBQUE7QUFDckMsQ0FBQztBQTBIRDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRztJQUN6QixXQUFXLEVBQUUsdUJBQXVCO0lBQ3BDLFdBQVcsRUFBRSx1QkFBdUI7Q0FDcEMsQ0FBQTtBQUVEOzs7R0FHRztBQUNILE1BQU0sQ0FBTixJQUFrQixPQVFqQjtBQVJELFdBQWtCLE9BQU87SUFDeEIsZ0RBQXFDLENBQUE7SUFDckMsNENBQWlDLENBQUE7SUFDakMsd0JBQWEsQ0FBQTtJQUNiLHNEQUEyQyxDQUFBO0lBQzNDLDhDQUFtQyxDQUFBO0lBQ25DLDBCQUFlLENBQUE7SUFDZixzQkFBVyxDQUFBO0FBQ1osQ0FBQyxFQVJpQixPQUFPLEtBQVAsT0FBTyxRQVF4QiJ9