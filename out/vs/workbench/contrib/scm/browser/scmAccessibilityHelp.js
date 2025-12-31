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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NtQWNjZXNzaWJpbGl0eUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zY20vYnJvd3Nlci9zY21BY2Nlc3NpYmlsaXR5SGVscC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBUTdDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsZUFBZSxFQUNmLHlCQUF5QixFQUN6QixZQUFZLEdBQ1osTUFBTSxrQkFBa0IsQ0FBQTtBQUV6QixNQUFNLE9BQU8sb0JBQW9CO0lBQWpDO1FBQ1UsU0FBSSxHQUFHLEtBQUssQ0FBQTtRQUNaLFNBQUksd0NBQTBCO1FBQzlCLGFBQVEsR0FBRyxHQUFHLENBQUE7UUFDZCxTQUFJLEdBQUcsY0FBYyxDQUFDLEVBQUUsQ0FDaEMsY0FBYyxDQUFDLEdBQUcsQ0FDakIsY0FBYyxDQUFDLE1BQU0sQ0FBQyxlQUFlLEVBQUUsb0JBQW9CLENBQUMsRUFDNUQsbUJBQW1CLENBQ25CLEVBQ0QsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLENBQUMsRUFDeEUsY0FBYyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLEVBQUUsWUFB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