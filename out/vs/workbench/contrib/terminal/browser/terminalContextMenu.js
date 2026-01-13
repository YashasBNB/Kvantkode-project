/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { StandardMouseEvent } from '../../../../base/browser/mouseEvent.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { asArray } from '../../../../base/common/arrays.js';
import { getFlatContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
/**
 * A context that is passed to actions as arguments to represent the terminal instance(s) being
 * acted upon.
 */
export class InstanceContext {
    constructor(instance) {
        // Only store the instance to avoid contexts holding on to disposed instances.
        this.instanceId = instance.instanceId;
    }
    toJSON() {
        return {
            $mid: 15 /* MarshalledId.TerminalContext */,
            instanceId: this.instanceId,
        };
    }
}
export class TerminalContextActionRunner extends ActionRunner {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    async runAction(action, context) {
        if (Array.isArray(context) && context.every((e) => e instanceof InstanceContext)) {
            // arg1: The (first) focused instance
            // arg2: All selected instances
            await action.run(context?.[0], context);
            return;
        }
        return super.runAction(action, context);
    }
}
export function openContextMenu(targetWindow, event, contextInstances, menu, contextMenuService, extraActions) {
    const standardEvent = new StandardMouseEvent(targetWindow, event);
    const actions = getFlatContextMenuActions(menu.getActions({ shouldForwardArgs: true }));
    if (extraActions) {
        actions.push(...extraActions);
    }
    const context = contextInstances
        ? asArray(contextInstances).map((e) => new InstanceContext(e))
        : [];
    const actionRunner = new TerminalContextActionRunner();
    contextMenuService.showContextMenu({
        actionRunner,
        getAnchor: () => standardEvent,
        getActions: () => actions,
        getActionsContext: () => context,
        onHide: () => actionRunner.dispose(),
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0TWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbENvbnRleHRNZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHM0QsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFNM0c7OztHQUdHO0FBQ0gsTUFBTSxPQUFPLGVBQWU7SUFHM0IsWUFBWSxRQUEyQjtRQUN0Qyw4RUFBOEU7UUFDOUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxNQUFNO1FBQ0wsT0FBTztZQUNOLElBQUksdUNBQThCO1lBQ2xDLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtTQUMzQixDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDJCQUE0QixTQUFRLFlBQVk7SUFDNUQsZ0VBQWdFO0lBQzdDLEtBQUssQ0FBQyxTQUFTLENBQ2pDLE1BQWUsRUFDZixPQUE2QztRQUU3QyxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxZQUFZLGVBQWUsQ0FBQyxFQUFFLENBQUM7WUFDbEYscUNBQXFDO1lBQ3JDLCtCQUErQjtZQUMvQixNQUFNLE1BQU0sQ0FBQyxHQUFHLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUE7WUFDdkMsT0FBTTtRQUNQLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hDLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVSxlQUFlLENBQzlCLFlBQW9CLEVBQ3BCLEtBQWlCLEVBQ2pCLGdCQUE2RCxFQUM3RCxJQUFXLEVBQ1gsa0JBQXVDLEVBQ3ZDLFlBQXdCO0lBRXhCLE1BQU0sYUFBYSxHQUFHLElBQUksa0JBQWtCLENBQUMsWUFBWSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBRWpFLE1BQU0sT0FBTyxHQUFHLHlCQUF5QixDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsRUFBRSxpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFFdkYsSUFBSSxZQUFZLEVBQUUsQ0FBQztRQUNsQixPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsWUFBWSxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFzQixnQkFBZ0I7UUFDbEQsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUQsQ0FBQyxDQUFDLEVBQUUsQ0FBQTtJQUVMLE1BQU0sWUFBWSxHQUFHLElBQUksMkJBQTJCLEVBQUUsQ0FBQTtJQUN0RCxrQkFBa0IsQ0FBQyxlQUFlLENBQUM7UUFDbEMsWUFBWTtRQUNaLFNBQVMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxhQUFhO1FBQzlCLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1FBQ3pCLGlCQUFpQixFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU87UUFDaEMsTUFBTSxFQUFFLEdBQUcsRUFBRSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUU7S0FDcEMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9