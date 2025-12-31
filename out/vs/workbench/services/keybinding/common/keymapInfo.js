/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows, isLinux } from '../../../../base/common/platform.js';
import { getKeyboardLayoutId, } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
function deserializeMapping(serializedMapping) {
    const mapping = serializedMapping;
    const ret = {};
    for (const key in mapping) {
        const result = mapping[key];
        if (result.length) {
            const value = result[0];
            const withShift = result[1];
            const withAltGr = result[2];
            const withShiftAltGr = result[3];
            const mask = Number(result[4]);
            const vkey = result.length === 6 ? result[5] : undefined;
            ret[key] = {
                value: value,
                vkey: vkey,
                withShift: withShift,
                withAltGr: withAltGr,
                withShiftAltGr: withShiftAltGr,
                valueIsDeadKey: (mask & 1) > 0,
                withShiftIsDeadKey: (mask & 2) > 0,
                withAltGrIsDeadKey: (mask & 4) > 0,
                withShiftAltGrIsDeadKey: (mask & 8) > 0,
            };
        }
        else {
            ret[key] = {
                value: '',
                valueIsDeadKey: false,
                withShift: '',
                withShiftIsDeadKey: false,
                withAltGr: '',
                withAltGrIsDeadKey: false,
                withShiftAltGr: '',
                withShiftAltGrIsDeadKey: false,
            };
        }
    }
    return ret;
}
export class KeymapInfo {
    constructor(layout, secondaryLayouts, keyboardMapping, isUserKeyboardLayout) {
        this.layout = layout;
        this.secondaryLayouts = secondaryLayouts;
        this.mapping = deserializeMapping(keyboardMapping);
        this.isUserKeyboardLayout = !!isUserKeyboardLayout;
        this.layout.isUserKeyboardLayout = !!isUserKeyboardLayout;
    }
    static createKeyboardLayoutFromDebugInfo(layout, value, isUserKeyboardLayout) {
        const keyboardLayoutInfo = new KeymapInfo(layout, [], {}, true);
        keyboardLayoutInfo.mapping = value;
        return keyboardLayoutInfo;
    }
    update(other) {
        this.layout = other.layout;
        this.secondaryLayouts = other.secondaryLayouts;
        this.mapping = other.mapping;
        this.isUserKeyboardLayout = other.isUserKeyboardLayout;
        this.layout.isUserKeyboardLayout = other.isUserKeyboardLayout;
    }
    getScore(other) {
        let score = 0;
        for (const key in other) {
            if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
                // keymap from Chromium is probably wrong.
                continue;
            }
            if (isLinux && (key === 'Backspace' || key === 'Escape')) {
                // native keymap doesn't align with keyboard event
                continue;
            }
            const currentMapping = this.mapping[key];
            if (currentMapping === undefined) {
                score -= 1;
            }
            const otherMapping = other[key];
            if (currentMapping && otherMapping && currentMapping.value !== otherMapping.value) {
                score -= 1;
            }
        }
        return score;
    }
    equal(other) {
        if (this.isUserKeyboardLayout !== other.isUserKeyboardLayout) {
            return false;
        }
        if (getKeyboardLayoutId(this.layout) !== getKeyboardLayoutId(other.layout)) {
            return false;
        }
        return this.fuzzyEqual(other.mapping);
    }
    fuzzyEqual(other) {
        for (const key in other) {
            if (isWindows && (key === 'Backslash' || key === 'KeyQ')) {
                // keymap from Chromium is probably wrong.
                continue;
            }
            if (this.mapping[key] === undefined) {
                return false;
            }
            const currentMapping = this.mapping[key];
            const otherMapping = other[key];
            if (currentMapping.value !== otherMapping.value) {
                return false;
            }
        }
        return true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi9rZXltYXBJbmZvLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLFNBQVMsa0JBQWtCLENBQUMsaUJBQXFDO0lBQ2hFLE1BQU0sT0FBTyxHQUFHLGlCQUFpQixDQUFBO0lBRWpDLE1BQU0sR0FBRyxHQUEyQixFQUFFLENBQUE7SUFDdEMsS0FBSyxNQUFNLEdBQUcsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUMzQixNQUFNLE1BQU0sR0FBd0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hELElBQUksTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ25CLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0IsTUFBTSxTQUFTLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzNCLE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDOUIsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ3hELEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FB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