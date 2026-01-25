/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerTerminalContribution } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalInlineChatAccessibleView } from './terminalChatAccessibleView.js';
import { TerminalChatController } from './terminalChatController.js';
// #region Terminal Contributions
registerTerminalContribution(TerminalChatController.ID, TerminalChatController, false);
// #endregion
// #region Contributions
AccessibleViewRegistry.register(new TerminalInlineChatAccessibleView());
AccessibleViewRegistry.register(new TerminalChatAccessibilityHelp());
registerWorkbenchContribution2(TerminalChatEnabler.Id, TerminalChatEnabler, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion
// #region Actions
import './terminalChatActions.js';
import { AccessibleViewRegistry } from '../../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { TerminalChatAccessibilityHelp } from './terminalChatAccessibilityHelp.js';
import { registerWorkbenchContribution2 } from '../../../../common/contributions.js';
import { TerminalChatEnabler } from './terminalChatEnabler.js';
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuY2hhdC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jaGF0L2Jyb3dzZXIvdGVybWluYWwuY2hhdC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDOUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFcEUsaUNBQWlDO0FBRWpDLDRCQUE0QixDQUFDLHNCQUFzQixDQUFDLEVBQUUsRUFBRSxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUV0RixhQUFhO0FBRWIsd0JBQXdCO0FBRXhCLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLGdDQUFnQyxFQUFFLENBQUMsQ0FBQTtBQUN2RSxzQkFBc0IsQ0FBQyxRQUFRLENBQUMsSUFBSSw2QkFBNkIsRUFBRSxDQUFDLENBQUE7QUFFcEUsOEJBQThCLENBQzdCLG1CQUFtQixDQUFDLEVBQUUsRUFDdEIsbUJBQW1CLHVDQUVuQixDQUFBO0FBRUQsYUFBYTtBQUViLGtCQUFrQjtBQUVsQixPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQ2hILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUU5RCxhQUFhIn0=