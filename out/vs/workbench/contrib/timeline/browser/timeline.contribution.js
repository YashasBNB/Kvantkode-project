/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewExtensions, } from '../../../common/views.js';
import { VIEW_CONTAINER } from '../../files/browser/explorerViewlet.js';
import { ITimelineService, TimelinePaneId } from '../common/timeline.js';
import { TimelineHasProviderContext, TimelineService } from '../common/timelineService.js';
import { TimelinePane } from './timelinePane.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { ExplorerFolderContext } from '../../files/common/files.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const timelineViewIcon = registerIcon('timeline-view-icon', Codicon.history, localize('timelineViewIcon', 'View icon of the timeline view.'));
const timelineOpenIcon = registerIcon('timeline-open', Codicon.history, localize('timelineOpenIcon', 'Icon for the open timeline action.'));
export class TimelinePaneDescriptor {
    constructor() {
        this.id = TimelinePaneId;
        this.name = TimelinePane.TITLE;
        this.containerIcon = timelineViewIcon;
        this.ctorDescriptor = new SyncDescriptor(TimelinePane);
        this.order = 2;
        this.weight = 30;
        this.collapsed = true;
        this.canToggleVisibility = true;
        this.hideByDefault = false;
        this.canMoveView = true;
        this.when = TimelineHasProviderContext;
        this.focusCommand = { id: 'timeline.focus' };
    }
}
// Configuration
const configurationRegistry = Registry.as(ConfigurationExtensions.Configuration);
configurationRegistry.registerConfiguration({
    id: 'timeline',
    order: 1001,
    title: localize('timelineConfigurationTitle', 'Timeline'),
    type: 'object',
    properties: {
        'timeline.pageSize': {
            type: ['number', 'null'],
            default: 50,
            markdownDescription: localize('timeline.pageSize', 'The number of items to show in the Timeline view by default and when loading more items. Setting to `null` will automatically choose a page size based on the visible area of the Timeline view.'),
        },
        'timeline.pageOnScroll': {
            type: 'boolean',
            default: true,
            description: localize('timeline.pageOnScroll', 'Controls whether the Timeline view will load the next page of items when you scroll to the end of the list.'),
        },
    },
});
Registry.as(ViewExtensions.ViewsRegistry).registerViews([new TimelinePaneDescriptor()], VIEW_CONTAINER);
var OpenTimelineAction;
(function (OpenTimelineAction) {
    OpenTimelineAction.ID = 'files.openTimeline';
    OpenTimelineAction.LABEL = localize('files.openTimeline', 'Open Timeline');
    function handler() {
        return (accessor, arg) => {
            const service = accessor.get(ITimelineService);
            return service.setUri(arg);
        };
    }
    OpenTimelineAction.handler = handler;
})(OpenTimelineAction || (OpenTimelineAction = {}));
CommandsRegistry.registerCommand(OpenTimelineAction.ID, OpenTimelineAction.handler());
MenuRegistry.appendMenuItem(MenuId.ExplorerContext, {
    group: '4_timeline',
    order: 1,
    command: {
        id: OpenTimelineAction.ID,
        title: OpenTimelineAction.LABEL,
        icon: timelineOpenIcon,
    },
    when: ContextKeyExpr.and(ExplorerFolderContext.toNegated(), ResourceContextKey.HasResource, TimelineHasProviderContext),
});
const timelineFilter = registerIcon('timeline-filter', Codicon.filter, localize('timelineFilter', 'Icon for the filter timeline action.'));
MenuRegistry.appendMenuItem(MenuId.TimelineTitle, {
    submenu: MenuId.TimelineFilterSubMenu,
    title: localize('filterTimeline', 'Filter Timeline'),
    group: 'navigation',
    order: 100,
    icon: timelineFilter,
});
registerSingleton(ITimelineService, TimelineService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGltZWxpbmUuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGltZWxpbmUvYnJvd3Nlci90aW1lbGluZS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUN6RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFHTixVQUFVLElBQUksY0FBYyxHQUM1QixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsY0FBYyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDeEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzFGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNoRCxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLG9FQUFvRSxDQUFBO0FBQzNFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQWdCLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRyxPQUFPLEVBQW1CLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDcEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDbkUsT0FB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