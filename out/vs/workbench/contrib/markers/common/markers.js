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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvY29tbW9uL21hcmtlcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE1BQU0sQ0FBTixJQUFrQixlQUdqQjtBQUhELFdBQWtCLGVBQWU7SUFDaEMsa0NBQWUsQ0FBQTtJQUNmLGdDQUFhLENBQUE7QUFDZCxDQUFDLEVBSGlCLGVBQWUsS0FBZixlQUFlLFFBR2hDO0FBRUQsTUFBTSxLQUFXLE9BQU8sQ0FrQnZCO0FBbEJELFdBQWlCLE9BQU87SUFDViw0QkFBb0IsR0FBRyx5QkFBeUIsQ0FBQTtJQUNoRCx1QkFBZSxHQUFHLDhCQUE4QixDQUFBO0lBQ2hELCtCQUF1QixHQUFHLHlCQUF5QixDQUFBO0lBQ25ELDZCQUFxQixHQUFHLHNCQUFzQixDQUFBO0lBQzlDLHFDQUE2QixHQUFHLDZCQUE2QixDQUFBO0lBQzdELGtEQUEwQyxHQUN0RCwrQ0FBK0MsQ0FBQTtJQUNuQyxrQ0FBMEIsR0FBRyx5Q0FBeUMsQ0FBQTtJQUN0RSxpQ0FBeUIsR0FBRyw2QkFBNkIsQ0FBQTtJQUN6RCxzQ0FBOEIsR0FBRyxpQ0FBaUMsQ0FBQTtJQUNsRSwyQ0FBbUMsR0FBRyxzQ0FBc0MsQ0FBQTtJQUM1RSw0Q0FBb0MsR0FBRyx1Q0FBdUMsQ0FBQTtJQUM5RSw2QkFBcUIsR0FBRyxzQkFBc0IsQ0FBQTtJQUM5QyxrQ0FBMEIsR0FBRyw0QkFBNEIsQ0FBQTtJQUN6RCw0QkFBb0IsR0FBRyxxQ0FBcUMsQ0FBQTtJQUM1RCw2QkFBcUIsR0FBRyxnQ0FBZ0MsQ0FBQTtJQUN4RCxxQ0FBNkIsR0FBRyx1Q0FBdUMsQ0FBQTtBQUNyRixDQUFDLEVBbEJnQixPQUFPLEtBQVAsT0FBTyxRQWtCdkI7QUFFRCxNQUFNLEtBQVcsa0JBQWtCLENBbUNsQztBQW5DRCxXQUFpQixrQkFBa0I7SUFDckIsNENBQXlCLEdBQUcsSUFBSSxhQUFhLENBQ3pELGtCQUFrQixvQ0FFbEIsQ0FBQTtJQUNZLGtEQUErQixHQUFHLElBQUksYUFBYSxDQUMvRCxvQkFBb0IsRUFDcEIsS0FBSyxDQUNMLENBQUE7SUFDWSx3Q0FBcUIsR0FBRyxJQUFJLGFBQWEsQ0FBVSxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDekUsa0RBQStCLEdBQUcsSUFBSSxhQUFhLENBQy9ELHFCQUFxQixFQUNyQixLQUFLLENBQ0wsQ0FBQTtJQUNZLG9EQUFpQyxHQUFHLElBQUksYUFBYSxDQUNqRSx5QkFBeUIsRUFDekIsS0FBSyxDQUNMLENBQUE7SUFDWSw2Q0FBMEIsR0FBRyxJQUFJLGFBQWEsQ0FDMUQsd0JBQXdCLEVBQ3hCLElBQUksQ0FDSixDQUFBO0lBQ1ksK0NBQTRCLEdBQUcsSUFBSSxhQUFhLENBQzVELDBCQUEwQixFQUMxQixJQUFJLENBQ0osQ0FBQTtJQUNZLDJDQUF3QixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLElBQUksQ0FBQyxDQUFBO0lBQ25GLGlEQUE4QixHQUFHLElBQUksYUFBYSxDQUM5RCw0QkFBNEIsRUFDNUIsS0FBSyxDQUNMLENBQUE7SUFDWSxvREFBaUMsR0FBRyxJQUFJLGFBQWEsQ0FDakUsK0JBQStCLEVBQy9CLElBQUksQ0FDSixDQUFBO0FBQ0YsQ0FBQyxFQW5DZ0Isa0JBQWtCLEtBQWxCLGtCQUFrQixRQW1DbEMifQ==