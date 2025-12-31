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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb250ZXh0TWVudS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxDb250ZXh0TWVudS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsWUFBWSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRzNELE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBTTNHOzs7R0FHRztBQUNILE1BQU0sT0FBTyxlQUFlO0lBRzNCLFlBQVksUUFBMkI7UUFDdEMsOEVBQThFO1FBQzlFLElBQUksQ0FBQyxVQUFVLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQTtJQUN0QyxDQUFDO0lBRUQsTUFBTTtRQUNMLE9BQU87WUFDTixJQUFJLHVDQUE4QjtZQUNsQyxVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7U0FDM0IsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywyQkFBNEIsU0FBUSxZQUFZO0lBQzVELGdFQUFnRTtJQUM3QyxLQUFLLENBQUMsU0FBUyxDQUNqQyxNQUFlLEVBQ2YsT0FBNkM7UUFFN0MsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSxlQUFlLENBQUMsRUFBRSxDQUFDO1lBQ2xGLHFDQUFxQztZQUNyQywrQkFBK0I7WUFDL0IsTUFBTSxNQUFNLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZDLE9BQU07UUFDUCxDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN4QyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUM5QixZQUFvQixFQUNwQixLQUFpQixFQUNqQixnQkFBNkQsRUFDN0QsSUFBVyxFQUNYLGtCQUF1QyxFQUN2QyxZQUF3QjtJQUV4QixNQUFNLGFBQWEsR0FBRyxJQUFJLGtCQUFrQixDQUFDLFlBQVksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUVqRSxNQUFNLE9BQU8sR0FBRyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEVBQUUsaUJBQWlCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBRXZGLElBQUksWUFBWSxFQUFFLENBQUM7UUFDbEIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLFlBQVksQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBc0IsZ0JBQWdCO1FBQ2xELENBQUMsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlELENBQUMsQ0FBQyxFQUFFLENBQUE7SUFFTCxNQUFNLFlBQVksR0FBRyxJQUFJLDJCQUEyQixFQUFFLENBQUE7SUFDdEQsa0JBQWtCLENBQUMsZUFBZSxDQUFDO1FBQ2xDLFlBQVk7UUFDWixTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsYUFBYTtRQUM5QixVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTztRQUN6QixpQkFBaUIsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPO1FBQ2hDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFO0tBQ3BDLENBQUMsQ0FBQTtBQUNILENBQUMifQ==