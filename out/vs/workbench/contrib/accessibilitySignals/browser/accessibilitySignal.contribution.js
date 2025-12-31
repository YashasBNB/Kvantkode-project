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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNpZ25hbC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5U2lnbmFscy9icm93c2VyL2FjY2Vzc2liaWxpdHlTaWduYWwuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsMkJBQTJCLEdBQzNCLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLDJDQUEyQyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUcsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRXhHLGlCQUFpQixDQUNoQiwyQkFBMkIsRUFDM0IsMEJBQTBCLG9DQUUxQixDQUFBO0FBRUQsOEJBQThCLENBQzdCLHVDQUF1QyxFQUN2QyxzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxxQ0FBcUMsQ0FBQyx1Q0FFbkUsQ0FBQTtBQUNELDhCQUE4QixDQUM3Qiw2Q0FBNkMsRUFDN0MsMkNBQTJDLHVDQUUzQyxDQUFBO0FBRUQsZUFBZSxDQUFDLG1CQUFtQixDQUFDLENBQUE7QUFDcEMsZUFBZSxDQUFDLGlDQUFpQyxDQUFDLENBQUEifQ==