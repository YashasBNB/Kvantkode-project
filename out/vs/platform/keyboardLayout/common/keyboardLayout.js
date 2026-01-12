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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJvYXJkTGF5b3V0L2NvbW1vbi9rZXlib2FyZExheW91dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQVksYUFBYSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSTdFLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUE4RWpFLE1BQU0sVUFBVSx1QkFBdUIsQ0FDdEMsQ0FBNkIsRUFDN0IsQ0FBNkI7SUFFN0IsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFDOEIsQ0FBRSxDQUFDLElBQUk7UUFDUCxDQUFFLENBQUMsSUFBSTtRQUNQLENBQUUsQ0FBQyxJQUFJLEtBQWtDLENBQUUsQ0FBQyxJQUFJLEVBQzVFLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUMwQixDQUFFLENBQUMsRUFBRTtRQUNMLENBQUUsQ0FBQyxFQUFFO1FBQ0wsQ0FBRSxDQUFDLEVBQUUsS0FBOEIsQ0FBRSxDQUFDLEVBQUUsRUFDaEUsQ0FBQztRQUNGLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELElBQzRCLENBQUUsQ0FBQyxLQUFLO1FBQ1IsQ0FBRSxDQUFDLEtBQUs7UUFDUixDQUFFLENBQUMsS0FBSyxLQUFnQyxDQUFFLENBQUMsS0FBSztRQUNoRCxDQUFFLENBQUMsTUFBTSxLQUFnQyxDQUFFLENBQUMsTUFBTSxFQUM1RSxDQUFDO1FBQ0YsT0FBTyxJQUFJLENBQUE7SUFD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