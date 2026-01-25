/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IHistoryService = createDecorator('historyService');
/**
 * Limit editor navigation to certain kinds.
 */
export var GoFilter;
(function (GoFilter) {
    /**
     * Navigate between editor navigation history
     * entries from any kind of navigation source.
     */
    GoFilter[GoFilter["NONE"] = 0] = "NONE";
    /**
     * Only navigate between editor navigation history
     * entries that were resulting from edits.
     */
    GoFilter[GoFilter["EDITS"] = 1] = "EDITS";
    /**
     * Only navigate between editor navigation history
     * entries that were resulting from navigations, such
     * as "Go to definition".
     */
    GoFilter[GoFilter["NAVIGATION"] = 2] = "NAVIGATION";
})(GoFilter || (GoFilter = {}));
/**
 * Limit editor navigation to certain scopes.
 */
export var GoScope;
(function (GoScope) {
    /**
     * Navigate across all editors and editor groups.
     */
    GoScope[GoScope["DEFAULT"] = 0] = "DEFAULT";
    /**
     * Navigate only in editors of the active editor group.
     */
    GoScope[GoScope["EDITOR_GROUP"] = 1] = "EDITOR_GROUP";
    /**
     * Navigate only in the active editor.
     */
    GoScope[GoScope["EDITOR"] = 2] = "EDITOR";
})(GoScope || (GoScope = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGlzdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2hpc3RvcnkvY29tbW9uL2hpc3RvcnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTTVGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxlQUFlLENBQWtCLGdCQUFnQixDQUFDLENBQUE7QUFFakY7O0dBRUc7QUFDSCxNQUFNLENBQU4sSUFBa0IsUUFtQmpCO0FBbkJELFdBQWtCLFFBQVE7SUFDekI7OztPQUdHO0lBQ0gsdUNBQUksQ0FBQTtJQUVKOzs7T0FHRztJQUNILHlDQUFLLENBQUE7SUFFTDs7OztPQUlHO0lBQ0gsbURBQVUsQ0FBQTtBQUNYLENBQUMsRUFuQmlCLFFBQVEsS0FBUixRQUFRLFFBbUJ6QjtBQUVEOztHQUVHO0FBQ0gsTUFBTSxDQUFOLElBQWtCLE9BZWpCO0FBZkQsV0FBa0IsT0FBTztJQUN4Qjs7T0FFRztJQUNILDJDQUFPLENBQUE7SUFFUDs7T0FFRztJQUNILHFEQUFZLENBQUE7SUFFWjs7T0FFRztJQUNILHlDQUFNLENBQUE7QUFDUCxDQUFDLEVBZmlCLE9BQU8sS0FBUCxPQUFPLFFBZXhCIn0=