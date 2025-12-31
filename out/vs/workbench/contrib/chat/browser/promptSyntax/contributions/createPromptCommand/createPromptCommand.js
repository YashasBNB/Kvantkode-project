/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../nls.js';
import { createPromptFile } from './utils/createPromptFile.js';
import { CHAT_CATEGORY } from '../../../actions/chatActions.js';
import { askForPromptName } from './dialogs/askForPromptName.js';
import { ChatContextKeys } from '../../../../common/chatContextKeys.js';
import { ILogService } from '../../../../../../../platform/log/common/log.js';
import { askForPromptSourceFolder } from './dialogs/askForPromptSourceFolder.js';
import { IFileService } from '../../../../../../../platform/files/common/files.js';
import { ILabelService } from '../../../../../../../platform/label/common/label.js';
import { IOpenerService } from '../../../../../../../platform/opener/common/opener.js';
import { PromptsConfig } from '../../../../../../../platform/prompts/common/config.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../../../platform/contextkey/common/contextkey.js';
import { MenuId, MenuRegistry } from '../../../../../../../platform/actions/common/actions.js';
import { IPromptsService } from '../../../../common/promptSyntax/service/types.js';
import { IQuickInputService } from '../../../../../../../platform/quickinput/common/quickInput.js';
import { IWorkspaceContextService } from '../../../../../../../platform/workspace/common/workspace.js';
import { CONFIGURE_SYNC_COMMAND_ID } from '../../../../../../services/userDataSync/common/userDataSync.js';
import { IUserDataSyncEnablementService, } from '../../../../../../../platform/userDataSync/common/userDataSync.js';
import { KeybindingsRegistry, } from '../../../../../../../platform/keybinding/common/keybindingsRegistry.js';
import { INotificationService, NeverShowAgainScope, Severity, } from '../../../../../../../platform/notification/common/notification.js';
/**
 * Base command ID prefix.
 */
const BASE_COMMAND_ID = 'workbench.command.prompts.create';
/**
 * Command ID for creating a 'local' prompt.
 */
const LOCAL_COMMAND_ID = `${BASE_COMMAND_ID}.local`;
/**
 * Command ID for creating a 'user' prompt.
 */
const USER_COMMAND_ID = `${BASE_COMMAND_ID}.user`;
/**
 * Title of the 'create local prompt' command.
 */
const LOCAL_COMMAND_TITLE = localize('commands.prompts.create.title.local', 'Create Prompt');
/**
 * Title of the 'create user prompt' command.
 */
const USER_COMMAND_TITLE = localize('commands.prompts.create.title.user', 'Create User Prompt');
/**
 * The command implementation.
 */
const command = async (accessor, type) => {
    const logService = accessor.get(ILogService);
    const fileService = accessor.get(IFileService);
    const labelService = accessor.get(ILabelService);
    const openerService = accessor.get(IOpenerService);
    const promptsService = accessor.get(IPromptsService);
    const commandService = accessor.get(ICommandService);
    const quickInputService = accessor.get(IQuickInputService);
    const notificationService = accessor.get(INotificationService);
    const workspaceService = accessor.get(IWorkspaceContextService);
    const userDataSyncEnablementService = accessor.get(IUserDataSyncEnablementService);
    const fileName = await askForPromptName(type, quickInputService);
    if (!fileName) {
        return;
    }
    const selectedFolder = await askForPromptSourceFolder({
        type: type,
        labelService,
        openerService,
        promptsService,
        workspaceService,
        quickInputService,
    });
    if (!selectedFolder) {
        return;
    }
    const content = localize('workbench.command.prompts.create.initial-content', 'Add prompt contents...');
    const promptUri = await createPromptFile({
        fileName,
        folder: selectedFolder,
        content,
        fileService,
        openerService,
    });
    await openerService.open(promptUri);
    if (type !== 'user') {
        return;
    }
    // due to PII concerns, synchronization of the 'user' reusable prompts
    // is disabled by default, but we want to make that fact clear to the user
    // hence after a 'user' prompt is create, we check if the synchronization
    // was explicitly configured before, and if it wasn't, we show a suggestion
    // to enable the synchronization logic in the Settings Sync configuration
    const isConfigured = userDataSyncEnablementService.isResourceEnablementConfigured("prompts" /* SyncResource.Prompts */);
    const isSettingsSyncEnabled = userDataSyncEnablementService.isEnabled();
    // if prompts synchronization has already been configured before or
    // if settings sync service is currently disabled, nothing to do
    if (isConfigured === true || isSettingsSyncEnabled === false) {
        return;
    }
    // show suggestion to enable synchronization of the user prompts to the user
    notificationService.prompt(Severity.Info, localize('workbench.command.prompts.create.user.enable-sync-notification', 'User prompts are not currently synchronized. Do you want to enable synchronization of the user prompts?'), [
        {
            label: localize('enable.capitalized', 'Enable'),
            run: () => {
                commandService.executeCommand(CONFIGURE_SYNC_COMMAND_ID).catch((error) => {
                    logService.error(`Failed to run '${CONFIGURE_SYNC_COMMAND_ID}' command: ${error}.`);
                });
            },
        },
    ], {
        neverShowAgain: {
            id: 'workbench.command.prompts.create.user.enable-sync-notification',
            scope: NeverShowAgainScope.PROFILE,
        },
    });
};
/**
 * Factory for creating the command handler with specific prompt `type`.
 */
const commandFactory = (type) => {
    return async (accessor) => {
        return command(accessor, type);
    };
};
/**
 * Register the "Create Prompt" command.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: LOCAL_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: commandFactory('local'),
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Create User Prompt" command.
 */
KeybindingsRegistry.registerCommandAndKeybindingRule({
    id: USER_COMMAND_ID,
    weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    handler: commandFactory('user'),
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Create Prompt" command in the command palette.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: LOCAL_COMMAND_ID,
        title: LOCAL_COMMAND_TITLE,
        category: CHAT_CATEGORY,
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
/**
 * Register the "Create User Prompt" command in the command palette.
 */
MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
    command: {
        id: USER_COMMAND_ID,
        title: USER_COMMAND_TITLE,
        category: CHAT_CATEGORY,
    },
    when: ContextKeyExpr.and(PromptsConfig.enabledCtx, ChatContextKeys.enabled),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9wcm9tcHRTeW50YXgvY29udHJpYnV0aW9ucy9jcmVhdGVQcm9tcHRDb21tYW5kL2NyZWF0ZVByb21wdENvbW1hbmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQzdFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDM0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxNQUFNLEVBQUUsWUFBWSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDOUYsT0FBTyxFQUFlLGVBQWUs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