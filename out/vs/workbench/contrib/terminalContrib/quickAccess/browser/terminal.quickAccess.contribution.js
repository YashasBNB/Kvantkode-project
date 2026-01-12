/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../../nls.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { Extensions as QuickAccessExtensions, } from '../../../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { getQuickNavigateHandler } from '../../../../browser/quickaccess.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { TerminalQuickAccessProvider } from './terminalQuickAccess.js';
var TerminalQuickAccessCommandId;
(function (TerminalQuickAccessCommandId) {
    TerminalQuickAccessCommandId["QuickOpenTerm"] = "workbench.action.quickOpenTerm";
})(TerminalQuickAccessCommandId || (TerminalQuickAccessCommandId = {}));
const quickAccessRegistry = Registry.as(QuickAccessExtensions.Quickaccess);
const inTerminalsPicker = 'inTerminalPicker';
quickAccessRegistry.registerQuickAccessProvider({
    ctor: TerminalQuickAccessProvider,
    prefix: TerminalQuickAccessProvider.PREFIX,
    contextKey: inTerminalsPicker,
    placeholder: nls.localize('tasksQuickAccessPlaceholder', 'Type the name of a terminal to open.'),
    helpEntries: [
        {
            description: nls.localize('tasksQuickAccessHelp', 'Show All Opened Terminals'),
            commandId: "workbench.action.quickOpenTerm" /* TerminalQuickAccessCommandId.QuickOpenTerm */,
        },
    ],
});
const quickAccessNavigateNextInTerminalPickerId = 'workbench.action.quickOpenNavigateNextInTerminalPicker';
CommandsRegistry.registerCommand({
    id: quickAccessNavigateNextInTerminalPickerId,
    handler: getQuickNavigateHandler(quickAccessNavigateNextInTerminalPickerId, true),
});
const quickAccessNavigatePreviousInTerminalPickerId = 'workbench.action.quickOpenNavigatePreviousInTerminalPicker';
CommandsRegistry.registerCommand({
    id: quickAccessNavigatePreviousInTerminalPickerId,
    handler: getQuickNavigateHandler(quickAccessNavigatePreviousInTerminalPickerId, false),
});
registerTerminalAction({
    id: "workbench.action.quickOpenTerm" /* TerminalQuickAccessCommandId.QuickOpenTerm */,
    title: nls.localize2('quickAccessTerminal', 'Switch Active Terminal'),
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (c, accessor) => accessor.get(IQuickInputService).quickAccess.show(TerminalQuickAccessProvider.PREFIX),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwucXVpY2tBY2Nlc3MuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvcXVpY2tBY2Nlc3MvYnJvd3Nlci90ZXJtaW5hbC5xdWlja0FjY2Vzcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUVOLFVBQVUsSUFBSSxxQkFBcUIsR0FDbkMsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDcEYsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFFdEUsSUFBVyw0QkFFVjtBQUZELFdBQVcsNEJBQTRCO0lBQ3RDLGdGQUFnRCxDQUFBO0FBQ2pELENBQUMsRUFGVSw0QkFBNEIsS0FBNUIsNEJBQTRCLFFBRXRDO0FBRUQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF1QixxQkFBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQTtBQUNoRyxNQUFNLGlCQUFpQixHQUFHLGtCQUFrQixDQUFBO0FBQzVDLG1CQUFtQixDQUFDLDJCQUEyQixDQUFDO0lBQy9DLElBQUksRUFBRSwyQkFBMkI7SUFDakMsTUFBTSxFQUFFLDJCQUEyQixDQUFDLE1BQU07SUFDMUMsVUFBVSxFQUFFLGlCQUFpQjtJQUM3QixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxzQ0FBc0MsQ0FBQztJQUNoRyxXQUFXLEVBQUU7UUFDWjtZQUNDLFdBQVcsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLDJCQUEyQixDQUFDO1lBQzlFLFNBQVMsbUZBQTRDO1NBQ3JEO0tBQ0Q7Q0FDRCxDQUFDLENBQUE7QUFDRixNQUFNLHlDQUF5QyxHQUM5Qyx3REFBd0QsQ0FBQTtBQUN6RCxnQkFBZ0IsQ0FBQyxlQUFlLENBQUM7SUFDaEMsRUFBRSxFQUFFLHlDQUF5QztJQUM3QyxPQUFPLEVBQUUsdUJBQXVCLENBQUMseUNBQXlDLEVBQUUsSUFBSSxDQUFDO0NBQ2pGLENBQUMsQ0FBQTtBQUNGLE1BQU0sNkNBQTZDLEdBQ2xELDREQUE0RCxDQUFBO0FBQzdELGdCQUFnQixDQUFDLGVBQWUsQ0FBQztJQUNoQyxFQUFFLEVBQUUsNkNBQTZDO0lBQ2pELE9BQU8sRUFBRSx1QkFBdUIsQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLENBQUM7Q0FDdEYsQ0FBQyxDQUFBO0FBRUYsc0JBQXNCLENBQUM7SUFDdEIsRUFBRSxtRkFBNEM7SUFDOUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMscUJBQXFCLEVBQUUsd0JBQXdCLENBQUM7SUFDckUsWUFBWSxFQUFFLGNBQWMsQ0FBQyxFQUFFLENBQzlCLG1CQUFtQixDQUFDLGdCQUFnQixFQUNwQyxtQkFBbUIsQ0FBQyxzQkFBc0IsQ0FDMUM7SUFDRCxHQUFHLEVBQUUsQ0FBQyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FDcEIsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsTUFBTSxDQUFDO0NBQ3RGLENBQUMsQ0FBQSJ9