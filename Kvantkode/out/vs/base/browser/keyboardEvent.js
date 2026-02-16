/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as browser from './browser.js';
import { EVENT_KEY_CODE_MAP, KeyCodeUtils } from '../common/keyCodes.js';
import { KeyCodeChord } from '../common/keybindings.js';
import * as platform from '../common/platform.js';
function extractKeyCode(e) {
    if (e.charCode) {
        // "keypress" events mostly
        const char = String.fromCharCode(e.charCode).toUpperCase();
        return KeyCodeUtils.fromString(char);
    }
    const keyCode = e.keyCode;
    // browser quirks
    if (keyCode === 3) {
        return 7 /* KeyCode.PauseBreak */;
    }
    else if (browser.isFirefox) {
        switch (keyCode) {
            case 59:
                return 85 /* KeyCode.Semicolon */;
            case 60:
                if (platform.isLinux) {
                    return 97 /* KeyCode.IntlBackslash */;
                }
                break;
            case 61:
                return 86 /* KeyCode.Equal */;
            // based on: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/keyCode#numpad_keys
            case 107:
                return 109 /* KeyCode.NumpadAdd */;
            case 109:
                return 111 /* KeyCode.NumpadSubtract */;
            case 173:
                return 88 /* KeyCode.Minus */;
            case 224:
                if (platform.isMacintosh) {
                    return 57 /* KeyCode.Meta */;
                }
                break;
        }
    }
    else if (browser.isWebKit) {
        if (platform.isMacintosh && keyCode === 93) {
            // the two meta keys in the Mac have different key codes (91 and 93)
            return 57 /* KeyCode.Meta */;
        }
        else if (!platform.isMacintosh && keyCode === 92) {
            return 57 /* KeyCode.Meta */;
        }
    }
    // cross browser keycodes:
    return EVENT_KEY_CODE_MAP[keyCode] || 0 /* KeyCode.Unknown */;
}
const ctrlKeyMod = platform.isMacintosh ? 256 /* KeyMod.WinCtrl */ : 2048 /* KeyMod.CtrlCmd */;
const altKeyMod = 512 /* KeyMod.Alt */;
const shiftKeyMod = 1024 /* KeyMod.Shift */;
const metaKeyMod = platform.isMacintosh ? 2048 /* KeyMod.CtrlCmd */ : 256 /* KeyMod.WinCtrl */;
export function printKeyboardEvent(e) {
    const modifiers = [];
    if (e.ctrlKey) {
        modifiers.push(`ctrl`);
    }
    if (e.shiftKey) {
        modifiers.push(`shift`);
    }
    if (e.altKey) {
        modifiers.push(`alt`);
    }
    if (e.metaKey) {
        modifiers.push(`meta`);
    }
    return `modifiers: [${modifiers.join(',')}], code: ${e.code}, keyCode: ${e.keyCode}, key: ${e.key}`;
}
export function printStandardKeyboardEvent(e) {
    const modifiers = [];
    if (e.ctrlKey) {
        modifiers.push(`ctrl`);
    }
    if (e.shiftKey) {
        modifiers.push(`shift`);
    }
    if (e.altKey) {
        modifiers.push(`alt`);
    }
    if (e.metaKey) {
        modifiers.push(`meta`);
    }
    return `modifiers: [${modifiers.join(',')}], code: ${e.code}, keyCode: ${e.keyCode} ('${KeyCodeUtils.toString(e.keyCode)}')`;
}
export class StandardKeyboardEvent {
    constructor(source) {
        this._standardKeyboardEventBrand = true;
        const e = source;
        this.browserEvent = e;
        this.target = e.target;
        this.ctrlKey = e.ctrlKey;
        this.shiftKey = e.shiftKey;
        this.altKey = e.altKey;
        this.metaKey = e.metaKey;
        this.altGraphKey = e.getModifierState?.('AltGraph');
        this.keyCode = extractKeyCode(e);
        this.code = e.code;
        // console.info(e.type + ": keyCode: " + e.keyCode + ", which: " + e.which + ", charCode: " + e.charCode + ", detail: " + e.detail + " ====> " + this.keyCode + ' -- ' + KeyCode[this.keyCode]);
        this.ctrlKey = this.ctrlKey || this.keyCode === 5 /* KeyCode.Ctrl */;
        this.altKey = this.altKey || this.keyCode === 6 /* KeyCode.Alt */;
        this.shiftKey = this.shiftKey || this.keyCode === 4 /* KeyCode.Shift */;
        this.metaKey = this.metaKey || this.keyCode === 57 /* KeyCode.Meta */;
        this._asKeybinding = this._computeKeybinding();
        this._asKeyCodeChord = this._computeKeyCodeChord();
        // console.log(`code: ${e.code}, keyCode: ${e.keyCode}, key: ${e.key}`);
    }
    preventDefault() {
        if (this.browserEvent && this.browserEvent.preventDefault) {
            this.browserEvent.preventDefault();
        }
    }
    stopPropagation() {
        if (this.browserEvent && this.browserEvent.stopPropagation) {
            this.browserEvent.stopPropagation();
        }
    }
    toKeyCodeChord() {
        return this._asKeyCodeChord;
    }
    equals(other) {
        return this._asKeybinding === other;
    }
    _computeKeybinding() {
        let key = 0 /* KeyCode.Unknown */;
        if (this.keyCode !== 5 /* KeyCode.Ctrl */ &&
            this.keyCode !== 4 /* KeyCode.Shift */ &&
            this.keyCode !== 6 /* KeyCode.Alt */ &&
            this.keyCode !== 57 /* KeyCode.Meta */) {
            key = this.keyCode;
        }
        let result = 0;
        if (this.ctrlKey) {
            result |= ctrlKeyMod;
        }
        if (this.altKey) {
            result |= altKeyMod;
        }
        if (this.shiftKey) {
            result |= shiftKeyMod;
        }
        if (this.metaKey) {
            result |= metaKeyMod;
        }
        result |= key;
        return result;
    }
    _computeKeyCodeChord() {
        let key = 0 /* KeyCode.Unknown */;
        if (this.keyCode !== 5 /* KeyCode.Ctrl */ &&
            this.keyCode !== 4 /* KeyCode.Shift */ &&
            this.keyCode !== 6 /* KeyCode.Alt */ &&
            this.keyCode !== 57 /* KeyCode.Meta */) {
            key = this.keyCode;
        }
        return new KeyCodeChord(this.ctrlKey, this.shiftKey, this.altKey, this.metaKey, key);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL2tleWJvYXJkRXZlbnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE9BQU8sTUFBTSxjQUFjLENBQUE7QUFDdkMsT0FBTyxFQUFFLGtCQUFrQixFQUFXLFlBQVksRUFBVSxNQUFNLHVCQUF1QixDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssUUFBUSxNQUFNLHVCQUF1QixDQUFBO0FBRWpELFNBQVMsY0FBYyxDQUFDLENBQWdCO0lBQ3ZDLElBQUksQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ2hCLDJCQUEyQjtRQUMzQixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUMxRCxPQUFPLFlBQVksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVELE1BQU0sT0FBTyxHQUFHLENBQUMsQ0FBQyxPQUFPLENBQUE7SUFFekIsaUJBQWlCO0lBQ2pCLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQ25CLGtDQUF5QjtJQUMxQixDQUFDO1NBQU0sSUFBSSxPQUFPLENBQUMsU0FBUyxFQUFFLENBQUM7UUFDOUIsUUFBUSxPQUFPLEVBQUUsQ0FBQztZQUNqQixLQUFLLEVBQUU7Z0JBQ04sa0NBQXdCO1lBQ3pCLEtBQUssRUFBRTtnQkFDTixJQUFJLFFBQVEsQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDdEIsc0NBQTRCO2dCQUM3QixDQUFDO2dCQUNELE1BQUs7WUFDTixLQUFLLEVBQUU7Z0JBQ04sOEJBQW9CO1lBQ3JCLCtGQUErRjtZQUMvRixLQUFLLEdBQUc7Z0JBQ1AsbUNBQXdCO1lBQ3pCLEtBQUssR0FBRztnQkFDUCx3Q0FBNkI7WUFDOUIsS0FBSyxHQUFHO2dCQUNQLDhCQUFvQjtZQUNyQixLQUFLLEdBQUc7Z0JBQ1AsSUFBSSxRQUFRLENBQUMsV0FBVyxFQUFFLENBQUM7b0JBQzFCLDZCQUFtQjtnQkFDcEIsQ0FBQztnQkFDRCxNQUFLO1FBQ1AsQ0FBQztJQUNGLENBQUM7U0FBTSxJQUFJLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUM3QixJQUFJLFFBQVEsQ0FBQyxXQUFXLElBQUksT0FBTyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzVDLG9FQUFvRTtZQUNwRSw2QkFBbUI7UUFDcEIsQ0FBQzthQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxJQUFJLE9BQU8sS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUNwRCw2QkFBbUI7UUFDcEIsQ0FBQztJQUNGLENBQUM7SUFFRCwwQkFBMEI7SUFDMUIsT0FBTyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsMkJBQW1CLENBQUE7QUFDdEQsQ0FBQztBQTBCRCxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsMEJBQWdCLENBQUMsMEJBQWUsQ0FBQTtBQUN6RSxNQUFNLFNBQVMsdUJBQWEsQ0FBQTtBQUM1QixNQUFNLFdBQVcsMEJBQWUsQ0FBQTtBQUNoQyxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsMkJBQWdCLENBQUMseUJBQWUsQ0FBQTtBQUV6RSxNQUFNLFVBQVUsa0JBQWtCLENBQUMsQ0FBZ0I7SUFDbEQsTUFBTSxTQUFTLEdBQWEsRUFBRSxDQUFBO0lBQzlCLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN2QixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDaEIsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBQ0QsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLENBQUM7UUFDZCxTQUFTLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQztRQUNmLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDdkIsQ0FBQztJQUNELE9BQU8sZUFBZSxTQUFTLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxJQUFJLGNBQWMsQ0FBQyxDQUFDLE9BQU8sVUFBVSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUE7QUFDcEcsQ0FBQztBQUVELE1BQU0sVUFBVSwwQkFBMEIsQ0FBQyxDQUF3QjtJQUNsRSxNQUFNLFNBQVMsR0FBYSxFQUFFLENBQUE7SUFDOUIsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDZixTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQixTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxJQUFJLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUNkLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdEIsQ0FBQztJQUNELElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2YsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUN2QixDQUFDO0lBQ0QsT0FBTyxlQUFlLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksY0FBYyxDQUFDLENBQUMsT0FBTyxNQUFNLFlBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7QUFDN0gsQ0FBQztBQUVELE1BQU0sT0FBTyxxQkFBcUI7SUFpQmpDLFlBQVksTUFBcUI7UUFoQnhCLGdDQUEyQixHQUFHLElBQUksQ0FBQTtRQWlCMUMsTUFBTSxDQUFDLEdBQUcsTUFBTSxDQUFBO1FBRWhCLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFBO1FBQ3JCLElBQUksQ0FBQyxNQUFNLEdBQWdCLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFFbkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQTtRQUMxQixJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7UUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO1FBQ3hCLElBQUksQ0FBQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLGdCQUFnQixFQUFFLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLE9BQU8sR0FBRyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFBO1FBRWxCLGdNQUFnTTtRQUVoTSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8seUJBQWlCLENBQUE7UUFDNUQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxPQUFPLHdCQUFnQixDQUFBO1FBQ3pELElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTywwQkFBa0IsQ0FBQTtRQUMvRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sMEJBQWlCLENBQUE7UUFFNUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUM5QyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO1FBRWxELHdFQUF3RTtJQUN6RSxDQUFDO0lBRU0sY0FBYztRQUNwQixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxjQUFjLEVBQUUsQ0FBQztZQUMzRCxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFBO1FBQ25DLENBQUM7SUFDRixDQUFDO0lBRU0sZUFBZTtRQUNyQixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUM1RCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsRUFBRSxDQUFBO1FBQ3BDLENBQUM7SUFDRixDQUFDO0lBRU0sY0FBYztRQUNwQixPQUFPLElBQUksQ0FBQyxlQUFlLENBQUE7SUFDNUIsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUFhO1FBQzFCLE9BQU8sSUFBSSxDQUFDLGFBQWEsS0FBSyxLQUFLLENBQUE7SUFDcEMsQ0FBQztJQUVPLGtCQUFrQjtRQUN6QixJQUFJLEdBQUcsMEJBQWtCLENBQUE7UUFDekIsSUFDQyxJQUFJLENBQUMsT0FBTyx5QkFBaUI7WUFDN0IsSUFBSSxDQUFDLE9BQU8sMEJBQWtCO1lBQzlCLElBQUksQ0FBQyxPQUFPLHdCQUFnQjtZQUM1QixJQUFJLENBQUMsT0FBTywwQkFBaUIsRUFDNUIsQ0FBQztZQUNGLEdBQUcsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFBO1FBQ25CLENBQUM7UUFFRCxJQUFJLE1BQU0sR0FBRyxDQUFDLENBQUE7UUFDZCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksVUFBVSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixNQUFNLElBQUksU0FBUyxDQUFBO1FBQ3BCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixNQUFNLElBQUksV0FBVyxDQUFBO1FBQ3RCLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixNQUFNLElBQUksVUFBVSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxNQUFNLElBQUksR0FBRyxDQUFBO1FBRWIsT0FBTyxNQUFNLENBQUE7SUFDZCxDQUFDO0lBRU8sb0JBQW9CO1FBQzNCLElBQUksR0FBRywwQkFBa0IsQ0FBQTtRQUN6QixJQUNDLElBQUksQ0FBQyxPQUFPLHlCQUFpQjtZQUM3QixJQUFJLENBQUMsT0FBTywwQkFBa0I7WUFDOUIsSUFBSSxDQUFDLE9BQU8sd0JBQWdCO1lBQzVCLElBQUksQ0FBQyxPQUFPLDBCQUFpQixFQUM1QixDQUFDO1lBQ0YsR0FBRyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUE7UUFDbkIsQ0FBQztRQUNELE9BQU8sSUFBSSxZQUFZLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtJQUNyRixDQUFDO0NBQ0QifQ==