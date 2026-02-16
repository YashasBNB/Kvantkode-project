/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { showChatView, showEditsView } from '../../../../../chat.js';
import { assertDefined } from '../../../../../../../../../base/common/types.js';
import { ACTION_ID_NEW_CHAT, ACTION_ID_NEW_EDIT_SESSION } from '../../../../chatClearActions.js';
/**
 * Attaches provided prompts to a chat input.
 */
export const attachPrompts = async (files, options, keyMods) => {
    const widget = await getChatWidgetObject(options, keyMods);
    for (const file of files) {
        widget.attachmentModel.promptInstructions.add(file.value);
    }
    return widget;
};
/**
 * Gets a chat widget based on the provided {@link IChatAttachPromptActionOptions.widget widget}
 * reference. If no widget reference is provided, the function will reveal a `chat panel` by default
 * (either a last focused, or a new one), but if the {@link altOption} is set to `true`, a `chat edits`
 * panel will be revealed instead (likewise either a last focused, or a new one).
 *
 * @throws if failed to reveal a chat widget.
 */
const getChatWidgetObject = async (options, keyMods) => {
    const { widget } = options;
    const { alt, ctrlCmd } = keyMods;
    // if `ctrl/cmd` key was pressed, create a new chat session
    if (ctrlCmd) {
        return await openNewChat(options, alt);
    }
    // if no widget reference is present, the command was triggered from outside of
    // an active chat input, so we reveal a chat widget window based on the `alt`
    // key modifier state when a prompt was selected from the picker UI dialog
    if (!widget) {
        return await showExistingChat(options, alt);
    }
    return widget;
};
/**
 * Opens a new chat session based on the `unified chat view` mode
 * enablement, and provided `edits` flag.
 */
const openNewChat = async (options, edits) => {
    const { commandService, chatService, viewsService } = options;
    // the `unified chat view` mode does not have a separate `edits` view
    // therefore we always open a new default chat session in this mode
    if (chatService.unifiedViewEnabled === true) {
        await commandService.executeCommand(ACTION_ID_NEW_CHAT);
        const widget = await showChatView(viewsService);
        assertDefined(widget, 'Chat widget must be defined.');
        return widget;
    }
    // in non-unified chat view mode, we can open either an `edits` view
    // or an `ask` chat view based on the `edits` flag
    edits === true
        ? await commandService.executeCommand(ACTION_ID_NEW_EDIT_SESSION)
        : await commandService.executeCommand(ACTION_ID_NEW_CHAT);
    const widget = edits === true ? await showEditsView(viewsService) : await showChatView(viewsService);
    assertDefined(widget, 'Chat widget must be defined.');
    return widget;
};
/**
 * Shows an existing chat view based on the `unified chat view` mode
 * enablement, and provided `edits` flag.
 */
const showExistingChat = async (options, edits) => {
    const { chatService, viewsService } = options;
    // there is no "edits" view when in the unified view mode
    const widget = edits && chatService.unifiedViewEnabled === false
        ? await showEditsView(viewsService)
        : await showChatView(viewsService);
    assertDefined(widget, 'Revealed chat widget must be defined.');
    return widget;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoUHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L3V0aWxzL2F0dGFjaFByb21wdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFlLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVqRixPQUFPLEVBQUUsYUFBYSxFQUFnQixNQUFNLGlEQUFpRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBTWhHOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sYUFBYSxHQUFHLEtBQUssRUFDakMsS0FBOEMsRUFDOUMsT0FBNkIsRUFDN0IsT0FBaUIsRUFDTSxFQUFFO0lBQ3pCLE1BQU0sTUFBTSxHQUFHLE1BQU0sbUJBQW1CLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBRTFELEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzFELENBQUM7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMsQ0FBQTtBQUVEOzs7Ozs7O0dBT0c7QUFDSCxNQUFNLG1CQUFtQixHQUFHLEtBQUssRUFDaEMsT0FBNkIsRUFDN0IsT0FBaUIsRUFDTSxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxNQUFNLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFDMUIsTUFBTSxFQUFFLEdBQUcsRUFBRSxPQUFPLEVBQUUsR0FBRyxPQUFPLENBQUE7SUFFaEMsMkRBQTJEO0lBQzNELElBQUksT0FBTyxFQUFFLENBQUM7UUFDYixPQUFPLE1BQU0sV0FBVyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUN2QyxDQUFDO0lBRUQsK0VBQStFO0lBQy9FLDZFQUE2RTtJQUM3RSwwRUFBMEU7SUFDMUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ2IsT0FBTyxNQUFNLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDLENBQUE7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsT0FBNkIsRUFBRSxLQUFjLEVBQXdCLEVBQUU7SUFDakcsTUFBTSxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBRTdELHFFQUFxRTtJQUNyRSxtRUFBbUU7SUFDbkUsSUFBSSxXQUFXLENBQUMsa0JBQWtCLEtBQUssSUFBSSxFQUFFLENBQUM7UUFDN0MsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDdkQsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7UUFFL0MsYUFBYSxDQUFDLE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxDQUFBO1FBRXJELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELG9FQUFvRTtJQUNwRSxrREFBa0Q7SUFDbEQsS0FBSyxLQUFLLElBQUk7UUFDYixDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLDBCQUEwQixDQUFDO1FBQ2pFLENBQUMsQ0FBQyxNQUFNLGNBQWMsQ0FBQyxjQUFjLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUUxRCxNQUFNLE1BQU0sR0FDWCxLQUFLLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFdEYsYUFBYSxDQUFDLE1BQU0sRUFBRSw4QkFBOEIsQ0FBQyxDQUFBO0lBRXJELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyxDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxnQkFBZ0IsR0FBRyxLQUFLLEVBQzdCLE9BQTZCLEVBQzdCLEtBQWMsRUFDUyxFQUFFO0lBQ3pCLE1BQU0sRUFBRSxXQUFXLEVBQUUsWUFBWSxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBRTdDLHlEQUF5RDtJQUN6RCxNQUFNLE1BQU0sR0FDWCxLQUFLLElBQUksV0FBVyxDQUFDLGtCQUFrQixLQUFLLEtBQUs7UUFDaEQsQ0FBQyxDQUFDLE1BQU0sYUFBYSxDQUFDLFlBQVksQ0FBQztRQUNuQyxDQUFDLENBQUMsTUFBTSxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUE7SUFFcEMsYUFBYSxDQUFDLE1BQU0sRUFBRSx1Q0FBdUMsQ0FBQyxDQUFBO0lBRTlELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyxDQUFBIn0=