/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AccessibilitySignalService, IAccessibilitySignalService, } from '../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { AccessibilitySignalLineDebuggerContribution } from './accessibilitySignalDebuggerContribution.js';
import { ShowAccessibilityAnnouncementHelp, ShowSignalSoundHelp } from './commands.js';
import { EditorTextPropertySignalsContribution } from './editorTextPropertySignalsContribution.js';
import { wrapInReloadableClass0 } from '../../../../platform/observable/common/wrapInReloadableClass.js';
registerSingleton(IAccessibilitySignalService, AccessibilitySignalService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2('EditorTextPropertySignalsContribution', wrapInReloadableClass0(() => EditorTextPropertySignalsContribution), 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2('AccessibilitySignalLineDebuggerContribution', AccessibilitySignalLineDebuggerContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(ShowSignalSoundHelp);
registerAction2(ShowAccessibilityAnnouncementHelp);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHlTaWduYWxzL2Jyb3dzZXIvYWNjZXNzaWJpbGl0eVNpZ25hbC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwyQkFBMkIsR0FDM0IsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSw4QkFBOEIsRUFBa0IsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsMkNBQTJDLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDdEYsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFFeEcsaUJBQWlCLENBQ2hCLDJCQUEyQixFQUMzQiwwQkFBMEIsb0NBRTFCLENBQUE7QUFFRCw4QkFBOEIsQ0FDN0IsdUNBQXVDLEVBQ3ZDLHNCQUFzQixDQUFDLEdBQUcsRUFBRSxDQUFDLHFDQUFxQyxDQUFDLHVDQUVuRSxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLDZDQUE2QyxFQUM3QywyQ0FBMkMsdUNBRTNDLENBQUE7QUFFRCxlQUFlLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtBQUNwQyxlQUFlLENBQUMsaUNBQWlDLENBQUMsQ0FBQSJ9