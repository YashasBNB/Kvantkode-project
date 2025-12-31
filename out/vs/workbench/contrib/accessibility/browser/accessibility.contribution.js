/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { DynamicSpeechAccessibilityConfiguration, registerAccessibilityConfiguration, } from './accessibilityConfiguration.js';
import { Extensions as WorkbenchExtensions, registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { UnfocusedViewDimmingContribution } from './unfocusedViewDimmingContribution.js';
import { AccessibilityStatus } from './accessibilityStatus.js';
import { EditorAccessibilityHelpContribution } from './editorAccessibilityHelp.js';
import { SaveAccessibilitySignalContribution } from '../../accessibilitySignals/browser/saveAccessibilitySignal.js';
import { DiffEditorActiveAnnouncementContribution } from '../../accessibilitySignals/browser/openDiffEditorAnnouncement.js';
import { SpeechAccessibilitySignalContribution } from '../../speech/browser/speechAccessibilitySignal.js';
import { AccessibleViewInformationService, IAccessibleViewInformationService, } from '../../../services/accessibility/common/accessibleViewInformationService.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { AccessibleViewService } from './accessibleView.js';
import { AccesibleViewHelpContribution, AccesibleViewContributions, } from './accessibleViewContributions.js';
import { ExtensionAccessibilityHelpDialogContribution } from './extensionAccesibilityHelp.contribution.js';
registerAccessibilityConfiguration();
registerSingleton(IAccessibleViewService, AccessibleViewService, 1 /* InstantiationType.Delayed */);
registerSingleton(IAccessibleViewInformationService, AccessibleViewInformationService, 1 /* InstantiationType.Delayed */);
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(EditorAccessibilityHelpContribution, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(UnfocusedViewDimmingContribution, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(AccesibleViewHelpContribution, 4 /* LifecyclePhase.Eventually */);
workbenchRegistry.registerWorkbenchContribution(AccesibleViewContributions, 4 /* LifecyclePhase.Eventually */);
registerWorkbenchContribution2(AccessibilityStatus.ID, AccessibilityStatus, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(ExtensionAccessibilityHelpDialogContribution.ID, ExtensionAccessibilityHelpDialogContribution, 2 /* WorkbenchPhase.BlockRestore */);
registerWorkbenchContribution2(SaveAccessibilitySignalContribution.ID, SaveAccessibilitySignalContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(SpeechAccessibilitySignalContribution.ID, SpeechAccessibilitySignalContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(DiffEditorActiveAnnouncementContribution.ID, DiffEditorActiveAnnouncementContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerWorkbenchContribution2(DynamicSpeechAccessibilityConfiguration.ID, DynamicSpeechAccessibilityConfiguration, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsa0NBQWtDLEdBQ2xDLE1BQU0saUNBQWlDLENBQUE7QUFDeEMsT0FBTyxFQUdOLFVBQVUsSUFBSSxtQkFBbUIsRUFDakMsOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQzlELE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxtQ0FBbUMsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25ILE9BQU8sRUFBRSx3Q0FBd0MsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQzNILE9BQU8sRUFBRSxxQ0FBcUMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3pHLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsaUNBQWlDLEdBQ2pDLE1BQU0sNEVBQTRFLENBQUE7QUFDbkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDM0QsT0FBTyxFQUNOLDZCQUE2QixFQUM3QiwwQkFBMEIsR0FDMUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsNENBQTRDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUxRyxrQ0FBa0MsRUFBRSxDQUFBO0FBQ3BDLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLHFCQUFxQixvQ0FBNEIsQ0FBQTtBQUMzRixpQkFBaUIsQ0FDaEIsaUNBQWlDLEVBQ2pDLGdDQUFnQyxvQ0FFaEMsQ0FBQTtBQUVELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEVBQUUsQ0FDcEMsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLG1DQUFtQyxvQ0FFbkMsQ0FBQTtBQUNELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5QyxnQ0FBZ0Msa0NBRWhDLENBQUE7QUFFRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsNkJBQTZCLG9DQUU3QixDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLDBCQUEwQixvQ0FFMUIsQ0FBQTtBQUVELDhCQUE4QixDQUM3QixtQkFBbUIsQ0FBQyxFQUFFLEVBQ3RCLG1CQUFtQixzQ0FFbkIsQ0FBQTtBQUNELDhCQUE4QixDQUM3Qiw0Q0FBNEMsQ0FBQyxFQUFFLEVBQy9DLDRDQUE0QyxzQ0FFNUMsQ0FBQTtBQUNELDhCQUE4QixDQUM3QixtQ0FBbUMsQ0FBQyxFQUFFLEVBQ3RDLG1DQUFtQyx1Q0FFbkMsQ0FBQTtBQUNELDhCQUE4QixDQUM3QixxQ0FBcUMsQ0FBQyxFQUFFLEVBQ3hDLHFDQUFxQyx1Q0FFckMsQ0FBQTtBQUNELDhCQUE4QixDQUM3Qix3Q0FBd0MsQ0FBQyxFQUFFLEVBQzNDLHdDQUF3Qyx1Q0FFeEMsQ0FBQTtBQUNELDhCQUE4QixDQUM3Qix1Q0FBdUMsQ0FBQyxFQUFFLEVBQzFDLHVDQUF1Qyx1Q0FFdkMsQ0FBQSJ9