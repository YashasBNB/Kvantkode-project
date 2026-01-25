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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxrQ0FBa0MsR0FDbEMsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBR04sVUFBVSxJQUFJLG1CQUFtQixFQUNqQyw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDeEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEYsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDbkgsT0FBTyxFQUFFLHdDQUF3QyxFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDM0gsT0FBTyxFQUFFLHFDQUFxQyxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDekcsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxpQ0FBaUMsR0FDakMsTUFBTSw0RUFBNEUsQ0FBQTtBQUNuRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDBCQUEwQixHQUMxQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTFHLGtDQUFrQyxFQUFFLENBQUE7QUFDcEMsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLG9DQUE0QixDQUFBO0FBQzNGLGlCQUFpQixDQUNoQixpQ0FBaUMsRUFDakMsZ0NBQWdDLG9DQUVoQyxDQUFBO0FBRUQsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUNwQyxtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsbUNBQW1DLG9DQUVuQyxDQUFBO0FBQ0QsaUJBQWlCLENBQUMsNkJBQTZCLENBQzlDLGdDQUFnQyxrQ0FFaEMsQ0FBQTtBQUVELGlCQUFpQixDQUFDLDZCQUE2QixDQUM5Qyw2QkFBNkIsb0NBRTdCLENBQUE7QUFDRCxpQkFBaUIsQ0FBQyw2QkFBNkIsQ0FDOUMsMEJBQTBCLG9DQUUxQixDQUFBO0FBRUQsOEJBQThCLENBQzdCLG1CQUFtQixDQUFDLEVBQUUsRUFDdEIsbUJBQW1CLHNDQUVuQixDQUFBO0FBQ0QsOEJBQThCLENBQzdCLDRDQUE0QyxDQUFDLEVBQUUsRUFDL0MsNENBQTRDLHNDQUU1QyxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLG1DQUFtQyxDQUFDLEVBQUUsRUFDdEMsbUNBQW1DLHVDQUVuQyxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHFDQUFxQyxDQUFDLEVBQUUsRUFDeEMscUNBQXFDLHVDQUVyQyxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHdDQUF3QyxDQUFDLEVBQUUsRUFDM0Msd0NBQXdDLHVDQUV4QyxDQUFBO0FBQ0QsOEJBQThCLENBQzdCLHVDQUF1QyxDQUFDLEVBQUUsRUFDMUMsdUNBQXVDLHVDQUV2QyxDQUFBIn0=