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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9hY2Nlc3NpYmlsaXR5L2FjY2Vzc2liaWxpdHkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sRUFFTixxQkFBcUIsR0FDckIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBR3ZHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUV4RixNQUFNLHNCQUF1QixTQUFRLE9BQU87SUFDM0M7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsbURBQW1EO1lBQ3ZELEtBQUssRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLHdCQUF3QixFQUFFLHlDQUF5QyxDQUFDO1lBQ3pGLFFBQVEsRUFBRTtnQkFDVCxXQUFXLEVBQUUsR0FBRyxDQUFDLFNBQVMsQ0FDekIsbUNBQW1DLEVBQ25DLDZHQUE2RyxDQUM3RzthQUNEO1lBQ0QsRUFBRSxFQUFFLElBQUk7WUFDUixVQUFVLEVBQUU7Z0JBQ1g7b0JBQ0MsT0FBTyxFQUFFLGlEQUE2QjtvQkFDdEMsTUFBTSxFQUFFLDhDQUFvQyxFQUFFO29CQUM5QyxJQUFJLEVBQUUsd0JBQXdCO2lCQUM5QjtnQkFDRDtvQkFDQyxPQUFPLEVBQUUsMENBQXVCLDBCQUFlO29CQUMvQyxLQUFLLEVBQUUsRUFBRSxPQUFPLEVBQUUsMENBQXVCLDBCQUFlLEVBQUU7b0JBQzFELE1BQU0sRUFBRSw4Q0FBb0MsRUFBRTtpQkFDOUM7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sdUJBQXVCLEdBQUcsb0JBQW9CLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtRQUM5RSxvQkFBb0IsQ0FBQyxXQUFXLENBQy9CLDZCQUE2QixFQUM3Qix1QkFBdUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLG1DQUV0QyxDQUFBO1FBQ0QsS0FBSyxDQUNKLHVCQUF1QjtZQUN0QixDQUFDLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCO1lBQy9DLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx1QkFBdUIsQ0FDL0MsQ0FBQTtJQUNGLENBQUM7Q0FDRDtBQUVELGVBQWUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFBIn0=