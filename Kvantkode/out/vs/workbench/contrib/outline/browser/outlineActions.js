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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZUFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL291dGxpbmUvYnJvd3Nlci9vdXRsaW5lQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxNQUFNLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDeEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixPQUFPLEVBQ04sZUFBZSxFQUNmLGVBQWUsRUFDZixnQkFBZ0IsRUFDaEIsV0FBVyxFQUNYLFlBQVksR0FFWixNQUFNLGNBQWMsQ0FBQTtBQUVyQixlQUFlO0FBRWYsZUFBZSxDQUNkLE1BQU0sV0FBWSxTQUFRLFVBQXdCO0lBQ2pEO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsTUFBTSxFQUFFLFlBQVksQ0FBQyxFQUFFO1lBQ3ZCLEVBQUUsRUFBRSxrQkFBa0I7WUFDdEIsS0FBSyxFQUFFLFFBQVEsQ0FBQyxVQUFVLEVBQUUsY0FBYyxDQUFDO1lBQzNDLEVBQUUsRUFBRSxLQUFLO1lBQ1QsSUFBSSxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQ3pCLElBQUksRUFBRTtnQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ3BCLEtBQUssRUFBRSxZQUFZO2dCQUNuQixJQUFJLEVBQUUsY0FBYyxDQUFDLEdBQUcsQ0FDdkIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsWUFBWSxDQUFDLEVBQUUsQ0FBQyxFQUM5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