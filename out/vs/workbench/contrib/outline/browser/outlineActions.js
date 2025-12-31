/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ViewAction } from '../../../browser/parts/views/viewPane.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { ctxAllCollapsed, ctxFilterOnType, ctxFollowsCursor, ctxSortMode, IOutlinePane, } from './outline.js';
// --- commands
registerAction2(class CollapseAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.collapse',
            title: localize('collapse', 'Collapse All'),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(false)),
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
registerAction2(class ExpandAll extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.expand',
            title: localize('expand', 'Expand All'),
            f1: false,
            icon: Codicon.expandAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.and(ContextKeyExpr.equals('view', IOutlinePane.Id), ctxAllCollapsed.isEqualTo(true)),
            },
        });
    }
    runInView(_accessor, view) {
        view.expandAll();
    }
});
registerAction2(class FollowCursor extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.followCursor',
            title: localize('followCur', 'Follow Cursor'),
            f1: false,
            toggled: ctxFollowsCursor,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id),
            },
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.followCursor = !view.outlineViewState.followCursor;
    }
});
registerAction2(class FilterOnType extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.filterOnType',
            title: localize('filterOnType', 'Filter on Type'),
            f1: false,
            toggled: ctxFilterOnType,
            menu: {
                id: MenuId.ViewTitle,
                group: 'config',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id),
            },
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.filterOnType = !view.outlineViewState.filterOnType;
    }
});
registerAction2(class SortByPosition extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByPosition',
            title: localize('sortByPosition', 'Sort By: Position'),
            f1: false,
            toggled: ctxSortMode.isEqualTo(0 /* OutlineSortOrder.ByPosition */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 1,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id),
            },
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 0 /* OutlineSortOrder.ByPosition */;
    }
});
registerAction2(class SortByName extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByName',
            title: localize('sortByName', 'Sort By: Name'),
            f1: false,
            toggled: ctxSortMode.isEqualTo(1 /* OutlineSortOrder.ByName */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 2,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id),
            },
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 1 /* OutlineSortOrder.ByName */;
    }
});
registerAction2(class SortByKind extends ViewAction {
    constructor() {
        super({
            viewId: IOutlinePane.Id,
            id: 'outline.sortByKind',
            title: localize('sortByKind', 'Sort By: Category'),
            f1: false,
            toggled: ctxSortMode.isEqualTo(2 /* OutlineSortOrder.ByKind */),
            menu: {
                id: MenuId.ViewTitle,
                group: 'sort',
                order: 3,
                when: ContextKeyExpr.equals('view', IOutlinePane.Id),
            },
        });
    }
    runInView(_accessor, view) {
        view.outlineViewState.sortBy = 2 /* OutlineSortOrder.ByKind */;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRsaW5lL2Jyb3dzZXIvb3V0bGluZUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUNOLGVBQWUsRUFDZixlQUFlLEVBQ2YsZ0JBQWdCLEVBQ2hCLFdBQVcsRUFDWCxZQUFZLEdBRVosTUFBTSxjQUFjLENBQUE7QUFFckIsZUFBZTtBQUVmLGVBQWUsQ0FDZCxNQUFNLFdBQVksU0FBUSxVQUF3QjtJQUNqRDtRQUNDLEtBQUssQ0FBQztZQUNMLE1BQU0sRUFBRSxZQUFZLENBQUMsRUFBRTtZQUN2QixFQUFFLEVBQUUsa0JBQWtCO1lBQ3RCLEtBQUssRUFBRSxRQUFRLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQztZQUMzQyxFQUFFLEVBQUUsS0FBSztZQUNULElBQUksRUFBRSxPQUFPLENBQUMsV0FBVztZQUN6QixJQUFJLEVBQUU7Z0JBQ0wsRUFBRSxFQUFFLE1BQU0sQ0FBQyxTQUFTO2dCQUNwQixLQUFLLEVBQUUsWUFBWTtnQkFDbkIsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLGNBQWMsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFLENBQUMsRUFDOUMsZUFB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