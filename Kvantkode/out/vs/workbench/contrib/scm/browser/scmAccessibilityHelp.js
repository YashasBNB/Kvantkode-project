/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { FocusedViewContext, SidebarFocusContext } from '../../../common/contextkeys.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { HISTORY_VIEW_PANE_ID, ISCMViewService, REPOSITORIES_VIEW_PANE_ID, VIEW_PANE_ID, } from '../common/scm.js';
export class SCMAccessibilityHelp {
    constructor() {
        this.name = 'scm';
        this.type = "help" /* AccessibleViewType.Help */;
        this.priority = 100;
        this.when = ContextKeyExpr.or(ContextKeyExpr.and(ContextKeyExpr.equals('activeViewlet', 'workbench.view.scm'), SidebarFocusContext), ContextKeyExpr.equals(FocusedViewContext.key, REPOSITORIES_VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, VIEW_PANE_ID), ContextKeyExpr.equals(FocusedViewContext.key, HISTORY_VIEW_PANE_ID));
    }
    getProvider(accessor) {
        const commandService = accessor.get(ICommandService);
        const scmViewService = accessor.get(ISCMViewService);
        const viewsService = accessor.get(IViewsService);
        return new SCMAccessibilityHelpContentProvider(commandService, scmViewService, viewsService);
    }
}
let SCMAccessibilityHelpContentProvider = class SCMAccessibilityHelpContentProvider extends Disposable {
    constructor(_commandService, _scmViewService, _viewsService) {
        super();
        this._commandService = _commandService;
        this._scmViewService = _scmViewService;
        this._viewsService = _viewsService;
        this.id = "scm" /* AccessibleViewProviderId.SourceControl */;
        this.verbositySettingKey = "accessibility.verbosity.sourceControl" /* AccessibilityVerbositySettingId.SourceControl */;
        this.options = { type: "help" /* AccessibleViewType.Help */ };
        this._focusedView = this._viewsService.getFocusedViewName();
    }
    onClose() {
        switch (this._focusedView) {
            case 'Source Control':
                this._commandService.executeCommand('workbench.scm');
                break;
            case 'Source Control Repositories':
                this._commandService.executeCommand('workbench.scm.repositories');
                break;
            case 'Source Control Graph':
                this._commandService.executeCommand('workbench.scm.history');
                break;
            default:
                this._commandService.executeCommand('workbench.view.scm');
        }
    }
    provideContent() {
        const content = [];
        // Active Repository State
        if (this._scmViewService.visibleRepositories.length > 1) {
            const repositoryList = this._scmViewService.visibleRepositories
                .map((r) => r.provider.name)
                .join(', ');
            content.push(localize('state-msg1', 'Visible repositories: {0}', repositoryList));
        }
        const focusedRepository = this._scmViewService.focusedRepository;
        if (focusedRepository) {
            content.push(localize('state-msg2', 'Repository: {0}', focusedRepository.provider.name));
            // History Item Reference
            const currentHistoryItemRef = focusedRepository.provider.historyProvider
                .get()
                ?.historyItemRef.get();
            if (currentHistoryItemRef) {
                content.push(localize('state-msg3', 'History item reference: {0}', currentHistoryItemRef.name));
            }
            // Commit Message
            if (focusedRepository.input.visible &&
                focusedRepository.input.enabled &&
                focusedRepository.input.value !== '') {
                content.push(localize('state-msg4', 'Commit message: {0}', focusedRepository.input.value));
            }
            // Action Button
            const actionButton = focusedRepository.provider.actionButton.get();
            if (actionButton) {
                const label = actionButton.command.tooltip ?? actionButton.command.title;
                const enablementLabel = actionButton.enabled
                    ? localize('enabled', 'enabled')
                    : localize('disabled', 'disabled');
                content.push(localize('state-msg5', 'Action button: {0}, {1}', label, enablementLabel));
            }
            // Resource Groups
            const resourceGroups = [];
            for (const resourceGroup of focusedRepository.provider.groups) {
                resourceGroups.push(`${resourceGroup.label} (${resourceGroup.resources.length} resource(s))`);
            }
            focusedRepository.provider.groups.map((g) => g.label).join(', ');
            content.push(localize('state-msg6', 'Resource groups: {0}', resourceGroups.join(', ')));
        }
        // Source Control Repositories
        content.push(localize('scm-repositories-msg1', 'Use the "Source Control: Focus on Source Control Repositories View" command to open the Source Control Repositories view.'));
        content.push(localize('scm-repositories-msg2', 'The Source Control Repositories view lists all repositories from the workspace and is only shown when the workspace contains more than one repository.'));
        content.push(localize('scm-repositories-msg3', 'Once the Source Control Repositories view is opened you can:'));
        content.push(localize('scm-repositories-msg4', ' - Use the up/down arrow keys to navigate the list of repositories.'));
        content.push(localize('scm-repositories-msg5', ' - Use the Enter or Space keys to select a repository.'));
        content.push(localize('scm-repositories-msg6', ' - Use Shift + up/down keys to select multiple repositories.'));
        // Source Control
        content.push(localize('scm-msg1', 'Use the "Source Control: Focus on Source Control View" command to open the Source Control view.'));
        content.push(localize('scm-msg2', 'The Source Control view displays the resource groups and resources of the repository. If the workspace contains more than one repository it will list the resource groups and resources of the repositories selected in the Source Control Repositories view.'));
        content.push(localize('scm-msg3', 'Once the Source Control view is opened you can:'));
        content.push(localize('scm-msg4', ' - Use the up/down arrow keys to navigate the list of repositories, resource groups and resources.'));
        content.push(localize('scm-msg5', ' - Use the Space key to expand or collapse a resource group.'));
        // Source Control Graph
        content.push(localize('scm-graph-msg1', 'Use the "Source Control: Focus on Source Control Graph View" command to open the Source Control Graph view.'));
        content.push(localize('scm-graph-msg2', 'The Source Control Graph view displays a graph history items of the repository. If the workspace contains more than one repository it will list the history items of the active repository.'));
        content.push(localize('scm-graph-msg3', 'Once the Source Control Graph view is opened you can:'));
        content.push(localize('scm-graph-msg4', ' - Use the up/down arrow keys to navigate the list of history items.'));
        content.push(localize('scm-graph-msg5', ' - Use the Space key to open the history item details in the multi-file diff editor.'));
        return content.join('\n');
    }
};
SCMAccessibilityHelpContentProvider = __decorate([
    __param(0, ICommandService),
    __param(1, ISCMViewService),
    __param(2, IViewsService)
], SCMAccessibilityHelpContentProvider);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtQWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3NjbUFjY2Vzc2liaWxpdHlIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFRN0MsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN4RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixlQUFlLEVBQ2YseUJBQXlCLEVBQ3pCLFlBQVksR0FDWixNQUFNLGtCQUFrQixDQUFBO0FBRXpCLE1BQU0sT0FBTyxvQkFBb0I7SUFBakM7UUFDVSxTQUFJLEdBQUcsS0FBSyxDQUFBO1FBQ1osU0FBSSx3Q0FBMEI7UUFDOUIsYUFBUSxHQUFHLEdBQUcsQ0FBQTtRQUNkLFNBQUksR0FBRyxjQUFjLENBQUMsRUFBRSxDQUNoQyxjQUFjLENBQUMsR0FBRyxDQUNqQixjQUFjLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFBRSxvQkFBb0IsQ0FBQyxFQUM1RCxtQkFBbUIsQ0FDbkIsRUFDRCxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSx5QkFBeUIsQ0FBQyxFQUN4RSxjQUFjLENBQUMsTUFBTSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsRUFBRSxZQUFZLENBQUMsRUFDM0QsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsb0JBQW9CLENBQUMsQ0FDbkUsQ0FBQTtJQVNGLENBQUM7SUFQQSxXQUFXLENBQUMsUUFBMEI7UUFDckMsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNwRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sWUFBWSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLENBQUE7UUFFaEQsT0FBTyxJQUFJLG1DQUFtQyxDQUFDLGNBQWMsRUFBRSxjQUFjLEVBQUUsWUFBWSxDQUFDLENBQUE7SUFDN0YsQ0FBQztDQUNEO0FBRUQsSUFBTSxtQ0FBbUMsR0FBekMsTUFBTSxtQ0FDTCxTQUFRLFVBQVU7SUFTbEIsWUFDa0IsZUFBaUQsRUFDakQsZUFBaUQsRUFDbkQsYUFBNkM7UUFFNUQsS0FBSyxFQUFFLENBQUE7UUFKMkIsb0JBQWUsR0FBZixlQUFlLENBQWlCO1FBQ2hDLG9CQUFlLEdBQWYsZUFBZSxDQUFpQjtRQUNsQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQVRwRCxPQUFFLHNEQUF5QztRQUMzQyx3QkFBbUIsK0ZBQWdEO1FBQ25FLFlBQU8sR0FBRyxFQUFFLElBQUksc0NBQXlCLEVBQUUsQ0FBQTtRQVVuRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtJQUM1RCxDQUFDO0lBRUQsT0FBTztRQUNOLFFBQVEsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQzNCLEtBQUssZ0JBQWdCO2dCQUNwQixJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDcEQsTUFBSztZQUNOLEtBQUssNkJBQTZCO2dCQUNqQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO2dCQUNqRSxNQUFLO1lBQ04sS0FBSyxzQkFBc0I7Z0JBQzFCLElBQUksQ0FBQyxlQUFlLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUE7Z0JBQzVELE1BQUs7WUFDTjtnQkFDQyxJQUFJLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1FBQzNELENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYztRQUNiLE1BQU0sT0FBTyxHQUFhLEVBQUUsQ0FBQTtRQUU1QiwwQkFBMEI7UUFDMUIsSUFBSSxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLG1CQUFtQjtpQkFDN0QsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQztpQkFDM0IsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ1osT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLDJCQUEyQixFQUFFLGNBQWMsQ0FBQyxDQUFDLENBQUE7UUFDbEYsQ0FBQztRQUVELE1BQU0saUJBQWlCLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxpQkFBaUIsQ0FBQTtRQUNoRSxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDdkIsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRXhGLHlCQUF5QjtZQUN6QixNQUFNLHFCQUFxQixHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxlQUFlO2lCQUN0RSxHQUFHLEVBQUU7Z0JBQ04sRUFBRSxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUE7WUFDdkIsSUFBSSxxQkFBcUIsRUFBRSxDQUFDO2dCQUMzQixPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FBQyxZQUFZLEVBQUUsNkJBQTZCLEVBQUUscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQ2pGLENBQUE7WUFDRixDQUFDO1lBRUQsaUJBQWlCO1lBQ2pCLElBQ0MsaUJBQWlCLENBQUMsS0FBSyxDQUFDLE9BQU87Z0JBQy9CLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxPQUFPO2dCQUMvQixpQkFBaUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxLQUFLLEVBQUUsRUFDbkMsQ0FBQztnQkFDRixPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7WUFDM0YsQ0FBQztZQUVELGdCQUFnQjtZQUNoQixNQUFNLFlBQVksR0FBRyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ2xFLElBQUksWUFBWSxFQUFFLENBQUM7Z0JBQ2xCLE1BQU0sS0FBSyxHQUFHLFlBQVksQ0FBQyxPQUFPLENBQUMsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFBO2dCQUN4RSxNQUFNLGVBQWUsR0FBRyxZQUFZLENBQUMsT0FBTztvQkFDM0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDO29CQUNoQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtnQkFDbkMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLHlCQUF5QixFQUFFLEtBQUssRUFBRSxlQUFlLENBQUMsQ0FBQyxDQUFBO1lBQ3hGLENBQUM7WUFFRCxrQkFBa0I7WUFDbEIsTUFBTSxjQUFjLEdBQWEsRUFBRSxDQUFBO1lBQ25DLEtBQUssTUFBTSxhQUFhLElBQUksaUJBQWlCLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUMvRCxjQUFjLENBQUMsSUFBSSxDQUNsQixHQUFHLGFBQWEsQ0FBQyxLQUFLLEtBQUssYUFBYSxDQUFDLFNBQVMsQ0FBQyxNQUFNLGVBQWUsQ0FDeEUsQ0FBQTtZQUNGLENBQUM7WUFFRCxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNoRSxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDeEYsQ0FBQztRQUVELDhCQUE4QjtRQUM5QixPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCx1QkFBdUIsRUFDdkIsMkhBQTJILENBQzNILENBQ0QsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUNQLHVCQUF1QixFQUN2Qix3SkFBd0osQ0FDeEosQ0FDRCxDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQ1AsdUJBQXVCLEVBQ3ZCLDhEQUE4RCxDQUM5RCxDQUNELENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCx1QkFBdUIsRUFDdkIscUVBQXFFLENBQ3JFLENBQ0QsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUFDLHVCQUF1QixFQUFFLHdEQUF3RCxDQUFDLENBQzNGLENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCx1QkFBdUIsRUFDdkIsOERBQThELENBQzlELENBQ0QsQ0FBQTtRQUVELGlCQUFpQjtRQUNqQixPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCxVQUFVLEVBQ1YsaUdBQWlHLENBQ2pHLENBQ0QsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUNQLFVBQVUsRUFDViwrUEFBK1AsQ0FDL1AsQ0FDRCxDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLGlEQUFpRCxDQUFDLENBQUMsQ0FBQTtRQUNyRixPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCxVQUFVLEVBQ1Ysb0dBQW9HLENBQ3BHLENBQ0QsQ0FBQTtRQUNELE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUFDLFVBQVUsRUFBRSw4REFBOEQsQ0FBQyxDQUNwRixDQUFBO1FBRUQsdUJBQXVCO1FBQ3ZCLE9BQU8sQ0FBQyxJQUFJLENBQ1gsUUFBUSxDQUNQLGdCQUFnQixFQUNoQiw2R0FBNkcsQ0FDN0csQ0FDRCxDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQ1AsZ0JBQWdCLEVBQ2hCLDZMQUE2TCxDQUM3TCxDQUNELENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FBQyxnQkFBZ0IsRUFBRSx1REFBdUQsQ0FBQyxDQUNuRixDQUFBO1FBQ0QsT0FBTyxDQUFDLElBQUksQ0FDWCxRQUFRLENBQ1AsZ0JBQWdCLEVBQ2hCLHNFQUFzRSxDQUN0RSxDQUNELENBQUE7UUFDRCxPQUFPLENBQUMsSUFBSSxDQUNYLFFBQVEsQ0FDUCxnQkFBZ0IsRUFDaEIsc0ZBQXNGLENBQ3RGLENBQ0QsQ0FBQTtRQUVELE9BQU8sT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0NBQ0QsQ0FBQTtBQXJMSyxtQ0FBbUM7SUFXdEMsV0FBQSxlQUFlLENBQUE7SUFDZixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsYUFBYSxDQUFBO0dBYlYsbUNBQW1DLENBcUx4QyJ9