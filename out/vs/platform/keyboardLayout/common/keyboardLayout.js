/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ScanCodeUtils } from '../../../base/common/keyCodes.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const IKeyboardLayoutService = createDecorator('keyboardLayoutService');
export function areKeyboardLayoutsEqual(a, b) {
    if (!a || !b) {
        return false;
    }
    if (a.name &&
        b.name &&
        a.name === b.name) {
        return true;
    }
    if (a.id &&
        b.id &&
        a.id === b.id) {
        return true;
    }
    if (a.model &&
        b.model &&
        a.model === b.model &&
        a.layout === b.layout) {
        return true;
    }
    return false;
}
export function parseKeyboardLayoutDescription(layout) {
    if (!layout) {
        return { label: '', description: '' };
    }
    if (layout.name) {
        // windows
        const windowsLayout = layout;
        return {
            label: windowsLayout.text,
            description: '',
        };
    }
    if (layout.id) {
        const macLayout = layout;
        if (macLayout.localizedName) {
            return {
                label: macLayout.localizedName,
                description: '',
            };
        }
        if (/^com\.apple\.keylayout\./.test(macLayout.id)) {
            return {
                label: macLayout.id.replace(/^com\.apple\.keylayout\./, '').replace(/-/, ' '),
                description: '',
            };
        }
        if (/^.*inputmethod\./.test(macLayout.id)) {
            return {
                label: macLayout.id.replace(/^.*inputmethod\./, '').replace(/[-\.]/, ' '),
                description: `Input Method (${macLayout.lang})`,
            };
        }
        return {
            label: macLayout.lang,
            description: '',
        };
    }
    const linuxLayout = layout;
    return {
        label: linuxLayout.layout,
        description: '',
    };
}
export function getKeyboardLayoutId(layout) {
    if (layout.name) {
        return layout.name;
    }
    if (layout.id) {
        return layout.id;
    }
    return layout.layout;
}
function windowsKeyMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (a.vkey === b.vkey &&
        a.value === b.value &&
        a.withShift === b.withShift &&
        a.withAltGr === b.withAltGr &&
        a.withShiftAltGr === b.withShiftAltGr);
}
export function windowsKeyboardMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    for (let scanCode = 0; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
        const strScanCode = ScanCodeUtils.toString(scanCode);
        const aEntry = a[strScanCode];
        const bEntry = b[strScanCode];
        if (!windowsKeyMappingEquals(aEntry, bEntry)) {
            return false;
        }
    }
    return true;
}
function macLinuxKeyMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    return (a.value === b.value &&
        a.withShift === b.withShift &&
        a.withAltGr === b.withAltGr &&
        a.withShiftAltGr === b.withShiftAltGr);
}
export function macLinuxKeyboardMappingEquals(a, b) {
    if (!a && !b) {
        return true;
    }
    if (!a || !b) {
        return false;
    }
    for (let scanCode = 0; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
        const strScanCode = ScanCodeUtils.toString(scanCode);
        const aEntry = a[strScanCode];
        const bEntry = b[strScanCode];
        if (!macLinuxKeyMappingEquals(aEntry, bEntry)) {
            return false;
        }
    }
    return true;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXlib2FyZExheW91dC9jb21tb24va2V5Ym9hcmRMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFZLGFBQWEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUk3RSxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix1QkFBdUIsQ0FBQyxDQUFBO0FBOEVqRSxNQUFNLFVBQVUsdUJBQXVCLENBQ3RDLENBQTZCLEVBQzdCLENBQTZCO0lBRTdCLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVELElBQzhCLENBQUUsQ0FBQyxJQUFJO1FBQ1AsQ0FBRSxDQUFDLElBQUk7UUFDUCxDQUFFLENBQUMsSUFBSSxLQUFrQyxDQUFFLENBQUMsSUFBSSxFQUM1RSxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFDMEIsQ0FBRSxDQUFDLEVBQUU7UUFDTCxDQUFFLENBQUMsRUFBRTtRQUNMLENBQUUsQ0FBQyxFQUFFLEtBQThCLENBQUUsQ0FBQyxFQUFFLEVBQ2hFLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUM0QixDQUFFLENBQUMsS0FBSztRQUNSLENBQUUsQ0FBQyxLQUFLO1FBQ1IsQ0FBRSxDQUFDLEtBQUssS0FBZ0MsQ0FBRSxDQUFDLEtBQUs7UUFDaEQsQ0FBRSxDQUFDLE1BQU0sS0FBZ0MsQ0FBRSxDQUFDLE1BQU0sRUFDNUUsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sS0FBSyxDQUFBO0FBQ2IsQ0FBQztBQUVELE1BQU0sVUFBVSw4QkFBOEIsQ0FBQyxNQUFrQztJQUloRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDYixPQUFPLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsRUFBRSxFQUFFLENBQUE7SUFDdEMsQ0FBQztJQUVELElBQWlDLE1BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQyxVQUFVO1FBQ1YsTUFBTSxhQUFhLEdBQStCLE1BQU0sQ0FBQTtRQUN4RCxPQUFPO1lBQ04sS0FBSyxFQUFFLGFBQWEsQ0FBQyxJQUFJO1lBQ3pCLFdBQVcsRUFBRSxFQUFFO1NBQ2YsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUE2QixNQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDekMsTUFBTSxTQUFTLEdBQTJCLE1BQU0sQ0FBQTtRQUNoRCxJQUFJLFNBQVMsQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUM3QixPQUFPO2dCQUNOLEtBQUssRUFBRSxTQUFTLENBQUMsYUFBYTtnQkFDOUIsV0FBVyxFQUFFLEVBQUU7YUFDZixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksMEJBQTBCLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDO1lBQ25ELE9BQU87Z0JBQ04sS0FBSyxFQUFFLFNBQVMsQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLDBCQUEwQixFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDO2dCQUM3RSxXQUFXLEVBQUUsRUFBRTthQUNmLENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUM7WUFDM0MsT0FBTztnQkFDTixLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsa0JBQWtCLEVBQUUsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUM7Z0JBQ3pFLFdBQVcsRUFBRSxpQkFBaUIsU0FBUyxDQUFDLElBQUksR0FBRzthQUMvQyxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLLEVBQUUsU0FBUyxDQUFDLElBQUk7WUFDckIsV0FBVyxFQUFFLEVBQUU7U0FDZixDQUFBO0lBQ0YsQ0FBQztJQUVELE1BQU0sV0FBVyxHQUE2QixNQUFNLENBQUE7SUFFcEQsT0FBTztRQUNOLEtBQUssRUFBRSxXQUFXLENBQUMsTUFBTTtRQUN6QixXQUFXLEVBQUUsRUFBRTtLQUNmLENBQUE7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLG1CQUFtQixDQUFDLE1BQTJCO0lBQzlELElBQWlDLE1BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQztRQUMvQyxPQUFvQyxNQUFPLENBQUMsSUFBSSxDQUFBO0lBQ2pELENBQUM7SUFFRCxJQUE2QixNQUFPLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDekMsT0FBZ0MsTUFBTyxDQUFDLEVBQUUsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsT0FBa0MsTUFBTyxDQUFDLE1BQU0sQ0FBQTtBQUNqRCxDQUFDO0FBRUQsU0FBUyx1QkFBdUIsQ0FBQyxDQUFxQixFQUFFLENBQXFCO0lBQzVFLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELE9BQU8sQ0FDTixDQUFDLENBQUMsSUFBSSxLQUFLLENBQUMsQ0FBQyxJQUFJO1FBQ2pCLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUs7UUFDbkIsQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsU0FBUztRQUMzQixDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTO1FBQzNCLENBQUMsQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FDckMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLENBQWlDLEVBQ2pDLENBQWlDO0lBRWpDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLFFBQVEsK0JBQXFCLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNsRSxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLHVCQUF1QixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQzlDLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUM7QUFFRCxTQUFTLHdCQUF3QixDQUFDLENBQXNCLEVBQUUsQ0FBc0I7SUFDL0UsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBQ0QsT0FBTyxDQUNOLENBQUMsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLEtBQUs7UUFDbkIsQ0FBQyxDQUFDLFNBQVMsS0FBSyxDQUFDLENBQUMsU0FBUztRQUMzQixDQUFDLENBQUMsU0FBUyxLQUFLLENBQUMsQ0FBQyxTQUFTO1FBQzNCLENBQUMsQ0FBQyxjQUFjLEtBQUssQ0FBQyxDQUFDLGNBQWMsQ0FDckMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsNkJBQTZCLENBQzVDLENBQWtDLEVBQ2xDLENBQWtDO0lBRWxDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNkLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLFFBQVEsK0JBQXFCLEVBQUUsUUFBUSxFQUFFLEVBQUUsQ0FBQztRQUNsRSxNQUFNLFdBQVcsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3QixNQUFNLE1BQU0sR0FBRyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0IsSUFBSSxDQUFDLHdCQUF3QixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsRUFBRSxDQUFDO1lBQy9DLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztJQUNGLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQTtBQUNaLENBQUMifQ==