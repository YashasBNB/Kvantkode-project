/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var MarkersViewMode;
(function (MarkersViewMode) {
    MarkersViewMode["Table"] = "table";
    MarkersViewMode["Tree"] = "tree";
})(MarkersViewMode || (MarkersViewMode = {}));
export var Markers;
(function (Markers) {
    Markers.MARKERS_CONTAINER_ID = 'workbench.panel.markers';
    Markers.MARKERS_VIEW_ID = 'workbench.panel.markers.view';
    Markers.MARKERS_VIEW_STORAGE_ID = 'workbench.panel.markers';
    Markers.MARKER_COPY_ACTION_ID = 'problems.action.copy';
    Markers.MARKER_COPY_MESSAGE_ACTION_ID = 'problems.action.copyMessage';
    Markers.RELATED_INFORMATION_COPY_MESSAGE_ACTION_ID = 'problems.action.copyRelatedInformationMessage';
    Markers.FOCUS_PROBLEMS_FROM_FILTER = 'problems.action.focusProblemsFromFilter';
    Markers.MARKERS_VIEW_FOCUS_FILTER = 'problems.action.focusFilter';
    Markers.MARKERS_VIEW_CLEAR_FILTER_TEXT = 'problems.action.clearFilterText';
    Markers.MARKERS_VIEW_SHOW_MULTILINE_MESSAGE = 'problems.action.showMultilineMessage';
    Markers.MARKERS_VIEW_SHOW_SINGLELINE_MESSAGE = 'problems.action.showSinglelineMessage';
    Markers.MARKER_OPEN_ACTION_ID = 'problems.action.open';
    Markers.MARKER_OPEN_SIDE_ACTION_ID = 'problems.action.openToSide';
    Markers.MARKER_SHOW_PANEL_ID = 'workbench.action.showErrorsWarnings';
    Markers.MARKER_SHOW_QUICK_FIX = 'problems.action.showQuickFixes';
    Markers.TOGGLE_MARKERS_VIEW_ACTION_ID = 'workbench.actions.view.toggleProblems';
})(Markers || (Markers = {}));
export var MarkersContextKeys;
(function (MarkersContextKeys) {
    MarkersContextKeys.MarkersViewModeContextKey = new RawContextKey('problemsViewMode', "tree" /* MarkersViewMode.Tree */);
    MarkersContextKeys.MarkersTreeVisibilityContextKey = new RawContextKey('problemsVisibility', false);
    MarkersContextKeys.MarkerFocusContextKey = new RawContextKey('problemFocus', false);
    MarkersContextKeys.MarkerViewFilterFocusContextKey = new RawContextKey('problemsFilterFocus', false);
    MarkersContextKeys.RelatedInformationFocusContextKey = new RawContextKey('relatedInformationFocus', false);
    MarkersContextKeys.ShowErrorsFilterContextKey = new RawContextKey('problems.filter.errors', true);
    MarkersContextKeys.ShowWarningsFilterContextKey = new RawContextKey('problems.filter.warnings', true);
    MarkersContextKeys.ShowInfoFilterContextKey = new RawContextKey('problems.filter.info', true);
    MarkersContextKeys.ShowActiveFileFilterContextKey = new RawContextKey('problems.filter.activeFile', false);
    MarkersContextKeys.ShowExcludedFilesFilterContextKey = new RawContextKey('problems.filter.excludedFiles', true);
})(MarkersContextKeys || (MarkersContextKeys = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbWFya2Vycy9jb21tb24vbWFya2Vycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFcEYsTUFBTSxDQUFOLElBQWtCLGVBR2pCO0FBSEQsV0FBa0IsZUFBZTtJQUNoQyxrQ0FBZSxDQUFBO0lBQ2YsZ0NBQWEsQ0FBQTtBQUNkLENBQUMsRUFIaUIsZUFBZSxLQUFmLGVBQWUsUUFHaEM7QUFFRCxNQUFNLEtBQVcsT0FBTyxDQWtCdkI7QUFsQkQsV0FBaUIsT0FBTztJQUNWLDRCQUFvQixHQUFHLHlCQUF5QixDQUFBO0lBQ2hELHVCQUFlLEdBQUcsOEJBQThCLENBQUE7SUFDaEQsK0JBQXVCLEdBQUcseUJBQXlCLENBQUE7SUFDbkQsNkJBQXFCLEdBQUcsc0JBQXNCLENBQUE7SUFDOUMscUNBQTZCLEdBQUcsNkJBQTZCLENBQUE7SUFDN0Qsa0RBQTBDLEdBQ3RELCtDQUErQyxDQUFBO0lBQ25DLGtDQUEwQixHQUFHLHlDQUF5QyxDQUFBO0lBQ3RFLGlDQUF5QixHQUFHLDZCQUE2QixDQUFBO0lBQ3pELHNDQUE4QixHQUFHLGlDQUFpQyxDQUFBO0lBQ2xFLDJDQUFtQyxHQUFHLHNDQUFzQyxDQUFBO0lBQzVFLDRDQUFvQyxHQUFHLHVDQUF1QyxDQUFBO0lBQzlFLDZCQUFxQixHQUFHLHNCQUFzQixDQUFBO0lBQzlDLGtDQUEwQixHQUFHLDRCQUE0QixDQUFBO0lBQ3pELDRCQUFvQixHQUFHLHFDQUFxQyxDQUFBO0lBQzVELDZCQUFxQixHQUFHLGdDQUFnQyxDQUFBO0lBQ3hELHFDQUE2QixHQUFHLHVDQUF1QyxDQUFBO0FBQ3JGLENBQUMsRUFsQmdCLE9BQU8sS0FBUCxPQUFPLFFBa0J2QjtBQUVELE1BQU0sS0FBVyxrQkFBa0IsQ0FtQ2xDO0FBbkNELFdBQWlCLGtCQUFrQjtJQUNyQiw0Q0FBeUIsR0FBRyxJQUFJLGFBQWEsQ0FDekQsa0JBQWtCLG9DQUVsQixDQUFBO0lBQ1ksa0RBQStCLEdBQUcsSUFBSSxhQUFhLENBQy9ELG9CQUFvQixFQUNwQixLQUFLLENBQ0wsQ0FBQTtJQUNZLHdDQUFxQixHQUFHLElBQUksYUFBYSxDQUFVLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN6RSxrREFBK0IsR0FBRyxJQUFJLGFBQWEsQ0FDL0QscUJBQXFCLEVBQ3JCLEtBQUssQ0FDTCxDQUFBO0lBQ1ksb0RBQWlDLEdBQUcsSUFBSSxhQUFhLENBQ2pFLHlCQUF5QixFQUN6QixLQUFLLENBQ0wsQ0FBQTtJQUNZLDZDQUEwQixHQUFHLElBQUksYUFBYSxDQUMxRCx3QkFBd0IsRUFDeEIsSUFBSSxDQUNKLENBQUE7SUFDWSwrQ0FBNEIsR0FBRyxJQUFJLGFBQWEsQ0FDNUQsMEJBQTBCLEVBQzFCLElBQUksQ0FDSixDQUFBO0lBQ1ksMkNBQXdCLEdBQUcsSUFBSSxhQUFhLENBQVUsc0JBQXNCLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbkYsaURBQThCLEdBQUcsSUFBSSxhQUFhLENBQzlELDRCQUE0QixFQUM1QixLQUFLLENBQ0wsQ0FBQTtJQUNZLG9EQUFpQyxHQUFHLElBQUksYUFBYSxDQUNqRSwrQkFBK0IsRUFDL0IsSUFBSSxDQUNKLENBQUE7QUFDRixDQUFDLEVBbkNnQixrQkFBa0IsS0FBbEIsa0JBQWtCLFFBbUNsQyJ9