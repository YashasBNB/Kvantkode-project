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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRFdmVudC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9rZXlib2FyZEV2ZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxrQkFBa0IsRUFBVyxZQUFZLEVBQVUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDdkQsT0FBTyxLQUFLLFFBQVEsTUFBTSx1QkFBdUIsQ0FBQTtBQUVqRCxTQUFTLGNBQWMsQ0FBQyxDQUFnQjtJQUN2QyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNoQiwyQkFBMkI7UUFDM0IsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDMUQsT0FBTyxZQUFZLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBRXpCLGlCQUFpQjtJQUNqQixJQUFJLE9BQU8sS0FBSyxDQUFDLEVBQUUsQ0FBQztRQUNuQixrQ0FBeUI7SUFDMUIsQ0FBQztTQUFNLElBQUksT0FBTyxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQzlCLFFBQVEsT0FBTyxFQUFFLENBQUM7WUFDakIsS0FBSyxFQUFFO2dCQUNOLGtDQUF3QjtZQUN6QixLQUFLLEVBQUU7Z0JBQ04sSUFBSSxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ3RCLHNDQUE0QjtnQkFDN0IsQ0FBQztnQkFDRCxNQUFLO1lBQ04sS0FBSyxFQUFFO2dCQUNOLDhCQUFvQjtZQUNyQiwrRkFB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