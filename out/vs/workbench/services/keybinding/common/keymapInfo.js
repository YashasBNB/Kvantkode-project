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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5bWFwSW5mby5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvY29tbW9uL2tleW1hcEluZm8udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQ04sbUJBQW1CLEdBRW5CLE1BQU0sOERBQThELENBQUE7QUFFckUsU0FBUyxrQkFBa0IsQ0FBQyxpQkFBcUM7SUFDaEUsTUFBTSxPQUFPLEdBQUcsaUJBQWlCLENBQUE7SUFFakMsTUFBTSxHQUFHLEdBQTJCLEVBQUUsQ0FBQTtJQUN0QyxLQUFLLE1BQU0sR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFDO1FBQzNCLE1BQU0sTUFBTSxHQUF3QixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEQsSUFBSSxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbkIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUMzQixNQUFNLFNBQVMsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDM0IsTUFBTSxjQUFjLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2hDLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDeEQsR0FBRyxDQUFDLEdBQUcsQ0FB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