/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './accessibility.css';
import * as nls from '../../../../../nls.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { accessibilityHelpIsShown } from '../../../accessibility/browser/accessibilityConfiguration.js';
import { alert } from '../../../../../base/browser/ui/aria/aria.js';
import { AccessibilityHelpNLS } from '../../../../../editor/common/standaloneStrings.js';
class ToggleScreenReaderMode extends Action2 {
    constructor() {
        super({
            id: 'editor.action.toggleScreenReaderAccessibilityMode',
            title: nls.localize2('toggleScreenReaderMode', 'Toggle Screen Reader Accessibility Mode'),
            metadata: {
                description: nls.localize2('toggleScreenReaderModeDescription', 'Toggles an optimized mode for usage with screen readers, braille devices, and other assistive technologies.'),
            },
            f1: true,
            keybinding: [
                {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 35 /* KeyCode.KeyE */,
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                    when: accessibilityHelpIsShown,
                },
                {
                    primary: 512 /* KeyMod.Alt */ | 59 /* KeyCode.F1 */ | 1024 /* KeyMod.Shift */,
                    linux: { primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */ | 1024 /* KeyMod.Shift */ },
                    weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 10,
                },
            ],
        });
    }
    async run(accessor) {
        const accessibiiltyService = accessor.get(IAccessibilityService);
        const configurationService = accessor.get(IConfigurationService);
        const isScreenReaderOptimized = accessibiiltyService.isScreenReaderOptimized();
        configurationService.updateValue('editor.accessibilitySupport', isScreenReaderOptimized ? 'off' : 'on', 2 /* ConfigurationTarget.USER */);
        alert(isScreenReaderOptimized
            ? AccessibilityHelpNLS.screenReaderModeDisabled
            : AccessibilityHelpNLS.screenReaderModeEnabled);
    }
}
registerAction2(ToggleScreenReaderMode);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2FjY2Vzc2liaWxpdHkvYWNjZXNzaWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sS0FBSyxHQUFHLE1BQU0sdUJBQXVCLENBQUE7QUFDNUMsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBRXRFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOERBQThELENBQUE7QUFHdkcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRXhGLE1BQU0sc0JBQXVCLFNBQVEsT0FBTztJQUMzQztRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSxtREFBbUQ7WUFDdkQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsd0JBQXdCLEVBQUUseUNBQXlDLENBQUM7WUFDekYsUUFBUSxFQUFFO2dCQUNULFdBQVcsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUN6QixtQ0FBbUMsRUFDbkMsNkdBQTZHLENBQzdHO2FBQ0Q7WUFDRCxFQUFFLEVBQUUsSUFBSTtZQUNSLFVBQVUsRUFBRTtnQkFDWDtvQkFDQyxPQUFPLEVBQUUsaURBQTZCO29CQUN0QyxNQUFNLEVBQUUsOENBQW9DLEVBQUU7b0JBQzlDLElBQUksRUFBRSx3QkFBd0I7aUJBQzlCO2dCQUNEO29CQUNDLE9BQU8sRUFBRSwwQ0FBdUIsMEJBQWU7b0JBQy9DLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSwwQ0FBdUIsMEJBQWUsRUFBRTtvQkFDMUQsTUFBTSxFQUFFLDhDQUFvQyxFQUFFO2lCQUM5QzthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEI7UUFDbkMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDaEUsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDaEUsTUFBTSx1QkFBdUIsR0FBRyxvQkFBb0IsQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO1FBQzlFLG9CQUFvQixDQUFDLFdBQVcsQ0FDL0IsNkJBQTZCLEVBQzdCLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksbUNBRXRDLENBQUE7UUFDRCxLQUFLLENBQ0osdUJBQXVCO1lBQ3RCLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx3QkFBd0I7WUFDL0MsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHVCQUF1QixDQUMvQyxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBRUQsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUEifQ==