/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../../platform/contextkey/common/contextkey.js';
import { localize } from '../../../../../nls.js';
export var DiffSide;
(function (DiffSide) {
    DiffSide[DiffSide["Original"] = 0] = "Original";
    DiffSide[DiffSide["Modified"] = 1] = "Modified";
})(DiffSide || (DiffSide = {}));
export const DIFF_CELL_MARGIN = 16;
export const NOTEBOOK_DIFF_CELL_INPUT = new RawContextKey('notebook.diffEditor.cell.inputChanged', false);
export const NOTEBOOK_DIFF_METADATA = new RawContextKey('notebook.diffEditor.metadataChanged', false);
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY = 'notebook.diffEditor.cell.ignoreWhitespace';
export const NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE = new RawContextKey(NOTEBOOK_DIFF_CELL_IGNORE_WHITESPACE_KEY, false);
export const NOTEBOOK_DIFF_CELL_PROPERTY = new RawContextKey('notebook.diffEditor.cell.property.changed', false);
export const NOTEBOOK_DIFF_CELL_PROPERTY_EXPANDED = new RawContextKey('notebook.diffEditor.cell.property.expanded', false);
export const NOTEBOOK_DIFF_CELLS_COLLAPSED = new RawContextKey('notebook.diffEditor.allCollapsed', undefined, localize('notebook.diffEditor.allCollapsed', 'Whether all cells in notebook diff editor are collapsed'));
export const NOTEBOOK_DIFF_HAS_UNCHANGED_CELLS = new RawContextKey('notebook.diffEditor.hasUnchangedCells', undefined, localize('notebook.diffEditor.hasUnchangedCells', 'Whether there are unchanged cells in the notebook diff editor'));
export const NOTEBOOK_DIFF_UNCHANGED_CELLS_HIDDEN = new RawContextKey('notebook.diffEditor.unchangedCellsAreHidden', undefined, localize('notebook.diffEditor.unchangedCellsAreHidden', 'Whether the unchanged cells in the notebook diff editor are hidden'));
export const NOTEBOOK_DIFF_ITEM_KIND = new RawContextKey('notebook.diffEditor.item.kind', undefined, localize('notebook.diffEditor.item.kind', 'The kind of item in the notebook diff editor, Cell, Metadata or Output'));
export const NOTEBOOK_DIFF_ITEM_DIFF_STATE = new RawContextKey('notebook.diffEditor.item.state', undefined, localize('notebook.diffEditor.item.state', 'The diff state of item in the notebook diff editor, delete, insert, modified or unchanged'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tEaWZmRWRpdG9yQnJvd3Nlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi9ub3RlYm9va0RpZmZFZGl0b3JCcm93c2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBaUJoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFNdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBR2hELE1BQU0sQ0FBTixJQUFZLFFBR1g7QUFIRCxXQUFZLFFBQVE7SUFDbkIsK0NBQVksQ0FBQTtJQUNaLCtDQUFZLENBQUE7QUFDYixDQUFDLEVBSFcsUUFBUSxLQUFSLFFBQVEsUUFHbkI7QUEwS0QsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsRUFBRSxDQUFBO0FBQ2xDLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUFHLElBQUksYUFBYSxDQUN4RCx1Q0FBdUMsRUFDdkMsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FBRyxJQUFJLGFBQWEsQ0FDdEQscUNBQXFDLEVBQ3JDLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sd0NBQXdDLEdBQUcsMkNBQTJDLENBQUE7QUFDbkcsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQ3BFLHdDQUF3QyxFQUN4QyxLQUFLLENBQ0wsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLElBQUksYUFBYSxDQUMzRCwyQ0FBMkMsRUFDM0MsS0FBSyxDQUNMLENBQUE7QUFDRCxNQUFNLENBQUMsTUFBTSxvQ0FBb0MsR0FBRyxJQUFJLGFBQWEsQ0FDcEUsNENBQTRDLEVBQzVDLEtBQUssQ0FDTCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQzdELGtDQUFrQyxFQUNsQyxTQUFTLEVBQ1QsUUFBUSxDQUNQLGtDQUFrQyxFQUNsQyx5REFBeUQsQ0FDekQsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQUcsSUFBSSxhQUFhLENBQ2pFLHVDQUF1QyxFQUN2QyxTQUFTLEVBQ1QsUUFBUSxDQUNQLHVDQUF1QyxFQUN2QywrREFBK0QsQ0FDL0QsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sb0NBQW9DLEdBQUcsSUFBSSxhQUFhLENBQ3BFLDZDQUE2QyxFQUM3QyxTQUFTLEVBQ1QsUUFBUSxDQUNQLDZDQUE2QyxFQUM3QyxvRUFBb0UsQ0FDcEUsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxhQUFhLENBQ3ZELCtCQUErQixFQUMvQixTQUFTLEVBQ1QsUUFBUSxDQUNQLCtCQUErQixFQUMvQix3RUFBd0UsQ0FDeEUsQ0FDRCxDQUFBO0FBQ0QsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsSUFBSSxhQUFhLENBQzdELGdDQUFnQyxFQUNoQyxTQUFTLEVBQ1QsUUFBUSxDQUNQLGdDQUFnQyxFQUNoQywyRkFBMkYsQ0FDM0YsQ0FDRCxDQUFBIn0=