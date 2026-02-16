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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlUHJvbXB0Q29tbWFuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL3Byb21wdFN5bnRheC9jb250cmlidXRpb25zL2NyZWF0ZVByb21wdENvbW1hbmQvY3JlYXRlUHJvbXB0Q29tbWFuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDN0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdEYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMzRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDOUYsT0FBTyxFQUFFLE1BQU0sRUFBRSxZQUFZLEVBQUUsTUFBTSx5REFBeUQsQ0FB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