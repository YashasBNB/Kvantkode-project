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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXR0YWNoUHJvbXB0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9hY3Rpb25zL2NoYXRBdHRhY2hQcm9tcHRBY3Rpb24vZGlhbG9ncy9hc2tUb1NlbGVjdFByb21wdC91dGlscy9hdHRhY2hQcm9tcHRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBZSxZQUFZLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFakYsT0FBTyxFQUFFLGFBQWEsRUFBZ0IsTUFBTSxpREFBaUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQU1oRzs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQ2pDLEtBQThDLEVBQzlDLE9BQTZCLEVBQzdCLE9BQWlCLEVBQ00sRUFBRTtJQUN6QixNQUFNLE1BQU0sR0FBRyxNQUFNLG1CQUFtQixDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUUxRCxLQUFLLE1BQU0sSUFBSSxJQUFJLEtBQUssRUFBRSxDQUFDO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUMxRCxDQUFDO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDLENBQUE7QUFFRDs7Ozs7OztHQU9HO0FBQ0gsTUFBTSxtQkFBbUIsR0FBRyxLQUFLLEVBQ2hDLE9BQTZCLEVBQzdCLE9BQWlCLEVBQ00sRUFBRTtJQUN6QixNQUFNLEVBQUUsTUFBTSxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBQzFCLE1BQU0sRUFBRSxHQUFHLEVBQUUsT0FBTyxFQUFFLEdBQUcsT0FBTyxDQUFBO0lBRWhDLDJEQUEyRDtJQUMzRCxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQ2IsT0FBTyxNQUFNLFdBQVcsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELCtFQUErRTtJQUMvRSw2RUFBNkU7SUFDN0UsMEVBQTBFO0lBQzFFLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNiLE9BQU8sTUFBTSxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVELE9BQU8sTUFBTSxDQUFBO0FBQ2QsQ0FBQyxDQUFBO0FBRUQ7OztHQUdHO0FBQ0gsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLE9BQTZCLEVBQUUsS0FBYyxFQUF3QixFQUFFO0lBQ2pHLE1BQU0sRUFBRSxjQUFjLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUU3RCxxRUFBcUU7SUFDckUsbUVBQW1FO0lBQ25FLElBQUksV0FBVyxDQUFDLGtCQUFrQixLQUFLLElBQUksRUFBRSxDQUFDO1FBQzdDLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQ3ZELE1BQU0sTUFBTSxHQUFHLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBRS9DLGFBQWEsQ0FBQyxNQUFNLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtRQUVyRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxvRUFBb0U7SUFDcEUsa0RBQWtEO0lBQ2xELEtBQUssS0FBSyxJQUFJO1FBQ2IsQ0FBQyxDQUFDLE1BQU0sY0FBYyxDQUFDLGNBQWMsQ0FBQywwQkFBMEIsQ0FBQztRQUNqRSxDQUFDLENBQUMsTUFBTSxjQUFjLENBQUMsY0FBYyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFFMUQsTUFBTSxNQUFNLEdBQ1gsS0FBSyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXRGLGFBQWEsQ0FBQyxNQUFNLEVBQUUsOEJBQThCLENBQUMsQ0FBQTtJQUVyRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMsQ0FBQTtBQUVEOzs7R0FHRztBQUNILE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxFQUM3QixPQUE2QixFQUM3QixLQUFjLEVBQ1MsRUFBRTtJQUN6QixNQUFNLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBRSxHQUFHLE9BQU8sQ0FBQTtJQUU3Qyx5REFBeUQ7SUFDekQsTUFBTSxNQUFNLEdBQ1gsS0FBSyxJQUFJLFdBQVcsQ0FBQyxrQkFBa0IsS0FBSyxLQUFLO1FBQ2hELENBQUMsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxZQUFZLENBQUM7UUFDbkMsQ0FBQyxDQUFDLE1BQU0sWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRXBDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsdUNBQXVDLENBQUMsQ0FBQTtJQUU5RCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMsQ0FBQSJ9