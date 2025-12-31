/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE, } from '../../../base/common/keyCodes.js';
import { KeyCodeChord, } from '../../../base/common/keybindings.js';
import { BaseResolvedKeybinding } from './baseResolvedKeybinding.js';
import { toEmptyArrayIfContainsNull } from './resolvedKeybindingItem.js';
/**
 * Do not instantiate. Use KeybindingService to get a ResolvedKeybinding seeded with information about the current kb layout.
 */
export class USLayoutResolvedKeybinding extends BaseResolvedKeybinding {
    constructor(chords, os) {
        super(os, chords);
    }
    _keyCodeToUILabel(keyCode) {
        if (this._os === 2 /* OperatingSystem.Macintosh */) {
            switch (keyCode) {
                case 15 /* KeyCode.LeftArrow */:
                    return '←';
                case 16 /* KeyCode.UpArrow */:
                    return '↑';
                case 17 /* KeyCode.RightArrow */:
                    return '→';
                case 18 /* KeyCode.DownArrow */:
                    return '↓';
            }
        }
        return KeyCodeUtils.toString(keyCode);
    }
    _getLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._keyCodeToUILabel(chord.keyCode);
    }
    _getAriaLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return KeyCodeUtils.toString(chord.keyCode);
    }
    _getElectronAccelerator(chord) {
        return KeyCodeUtils.toElectronAccelerator(chord.keyCode);
    }
    _getUserSettingsLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        const result = KeyCodeUtils.toUserSettingsUS(chord.keyCode);
        return result ? result.toLowerCase() : result;
    }
    _isWYSIWYG() {
        return true;
    }
    _getChordDispatch(chord) {
        return USLayoutResolvedKeybinding.getDispatchStr(chord);
    }
    static getDispatchStr(chord) {
        if (chord.isModifierKey()) {
            return null;
        }
        let result = '';
        if (chord.ctrlKey) {
            result += 'ctrl+';
        }
        if (chord.shiftKey) {
            result += 'shift+';
        }
        if (chord.altKey) {
            result += 'alt+';
        }
        if (chord.metaKey) {
            result += 'meta+';
        }
        result += KeyCodeUtils.toString(chord.keyCode);
        return result;
    }
    _getSingleModifierChordDispatch(keybinding) {
        if (keybinding.keyCode === 5 /* KeyCode.Ctrl */ &&
            !keybinding.shiftKey &&
            !keybinding.altKey &&
            !keybinding.metaKey) {
            return 'ctrl';
        }
        if (keybinding.keyCode === 4 /* KeyCode.Shift */ &&
            !keybinding.ctrlKey &&
            !keybinding.altKey &&
            !keybinding.metaKey) {
            return 'shift';
        }
        if (keybinding.keyCode === 6 /* KeyCode.Alt */ &&
            !keybinding.ctrlKey &&
            !keybinding.shiftKey &&
            !keybinding.metaKey) {
            return 'alt';
        }
        if (keybinding.keyCode === 57 /* KeyCode.Meta */ &&
            !keybinding.ctrlKey &&
            !keybinding.shiftKey &&
            !keybinding.altKey) {
            return 'meta';
        }
        return null;
    }
    /**
     * *NOTE*: Check return value for `KeyCode.Unknown`.
     */
    static _scanCodeToKeyCode(scanCode) {
        const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
        if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            return immutableKeyCode;
        }
        switch (scanCode) {
            case 10 /* ScanCode.KeyA */:
                return 31 /* KeyCode.KeyA */;
            case 11 /* ScanCode.KeyB */:
                return 32 /* KeyCode.KeyB */;
            case 12 /* ScanCode.KeyC */:
                return 33 /* KeyCode.KeyC */;
            case 13 /* ScanCode.KeyD */:
                return 34 /* KeyCode.KeyD */;
            case 14 /* ScanCode.KeyE */:
                return 35 /* KeyCode.KeyE */;
            case 15 /* ScanCode.KeyF */:
                return 36 /* KeyCode.KeyF */;
            case 16 /* ScanCode.KeyG */:
                return 37 /* KeyCode.KeyG */;
            case 17 /* ScanCode.KeyH */:
                return 38 /* KeyCode.KeyH */;
            case 18 /* ScanCode.KeyI */:
                return 39 /* KeyCode.KeyI */;
            case 19 /* ScanCode.KeyJ */:
                return 40 /* KeyCode.KeyJ */;
            case 20 /* ScanCode.KeyK */:
                return 41 /* KeyCode.KeyK */;
            case 21 /* ScanCode.KeyL */:
                return 42 /* KeyCode.KeyL */;
            case 22 /* ScanCode.KeyM */:
                return 43 /* KeyCode.KeyM */;
            case 23 /* ScanCode.KeyN */:
                return 44 /* KeyCode.KeyN */;
            case 24 /* ScanCode.KeyO */:
                return 45 /* KeyCode.KeyO */;
            case 25 /* ScanCode.KeyP */:
                return 46 /* KeyCode.KeyP */;
            case 26 /* ScanCode.KeyQ */:
                return 47 /* KeyCode.KeyQ */;
            case 27 /* ScanCode.KeyR */:
                return 48 /* KeyCode.KeyR */;
            case 28 /* ScanCode.KeyS */:
                return 49 /* KeyCode.KeyS */;
            case 29 /* ScanCode.KeyT */:
                return 50 /* KeyCode.KeyT */;
            case 30 /* ScanCode.KeyU */:
                return 51 /* KeyCode.KeyU */;
            case 31 /* ScanCode.KeyV */:
                return 52 /* KeyCode.KeyV */;
            case 32 /* ScanCode.KeyW */:
                return 53 /* KeyCode.KeyW */;
            case 33 /* ScanCode.KeyX */:
                return 54 /* KeyCode.KeyX */;
            case 34 /* ScanCode.KeyY */:
                return 55 /* KeyCode.KeyY */;
            case 35 /* ScanCode.KeyZ */:
                return 56 /* KeyCode.KeyZ */;
            case 36 /* ScanCode.Digit1 */:
                return 22 /* KeyCode.Digit1 */;
            case 37 /* ScanCode.Digit2 */:
                return 23 /* KeyCode.Digit2 */;
            case 38 /* ScanCode.Digit3 */:
                return 24 /* KeyCode.Digit3 */;
            case 39 /* ScanCode.Digit4 */:
                return 25 /* KeyCode.Digit4 */;
            case 40 /* ScanCode.Digit5 */:
                return 26 /* KeyCode.Digit5 */;
            case 41 /* ScanCode.Digit6 */:
                return 27 /* KeyCode.Digit6 */;
            case 42 /* ScanCode.Digit7 */:
                return 28 /* KeyCode.Digit7 */;
            case 43 /* ScanCode.Digit8 */:
                return 29 /* KeyCode.Digit8 */;
            case 44 /* ScanCode.Digit9 */:
                return 30 /* KeyCode.Digit9 */;
            case 45 /* ScanCode.Digit0 */:
                return 21 /* KeyCode.Digit0 */;
            case 51 /* ScanCode.Minus */:
                return 88 /* KeyCode.Minus */;
            case 52 /* ScanCode.Equal */:
                return 86 /* KeyCode.Equal */;
            case 53 /* ScanCode.BracketLeft */:
                return 92 /* KeyCode.BracketLeft */;
            case 54 /* ScanCode.BracketRight */:
                return 94 /* KeyCode.BracketRight */;
            case 55 /* ScanCode.Backslash */:
                return 93 /* KeyCode.Backslash */;
            case 56 /* ScanCode.IntlHash */:
                return 0 /* KeyCode.Unknown */; // missing
            case 57 /* ScanCode.Semicolon */:
                return 85 /* KeyCode.Semicolon */;
            case 58 /* ScanCode.Quote */:
                return 95 /* KeyCode.Quote */;
            case 59 /* ScanCode.Backquote */:
                return 91 /* KeyCode.Backquote */;
            case 60 /* ScanCode.Comma */:
                return 87 /* KeyCode.Comma */;
            case 61 /* ScanCode.Period */:
                return 89 /* KeyCode.Period */;
            case 62 /* ScanCode.Slash */:
                return 90 /* KeyCode.Slash */;
            case 106 /* ScanCode.IntlBackslash */:
                return 97 /* KeyCode.IntlBackslash */;
        }
        return 0 /* KeyCode.Unknown */;
    }
    static _toKeyCodeChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord instanceof KeyCodeChord) {
            return chord;
        }
        const keyCode = this._scanCodeToKeyCode(chord.scanCode);
        if (keyCode === 0 /* KeyCode.Unknown */) {
            return null;
        }
        return new KeyCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, keyCode);
    }
    static resolveKeybinding(keybinding, os) {
        const chords = toEmptyArrayIfContainsNull(keybinding.chords.map((chord) => this._toKeyCodeChord(chord)));
        if (chords.length > 0) {
            return [new USLayoutResolvedKeybinding(chords, os)];
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNMYXlvdXRSZXNvbHZlZEtleWJpbmRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9rZXliaW5kaW5nL2NvbW1vbi91c0xheW91dFJlc29sdmVkS2V5YmluZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBRU4sWUFBWSxFQUNaLDBCQUEwQixHQUUxQixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFHTixZQUFZLEdBRVosTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUV4RTs7R0FFRztBQUNILE1BQU0sT0FBTywwQkFBMkIsU0FBUSxzQkFBb0M7SUFDbkYsWUFBWSxNQUFzQixFQUFFLEVBQW1CO1FBQ3RELEtBQUssQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEIsQ0FBQztJQUVPLGlCQUFpQixDQUFDLE9BQWdCO1FBQ3pDLElBQUksSUFBSSxDQUFDLEdBQUcsc0NBQThCLEVBQUUsQ0FBQztZQUM1QyxRQUFRLE9BQU8sRUFBRSxDQUFDO2dCQUNqQjtvQkFDQyxPQUFPLEdBQUcsQ0FBQTtnQkFDWDtvQkFDQyxPQUFPLEdBQUcsQ0FBQTtnQkFDWDtvQkFDQyxPQUFPLEdBQUcsQ0FBQTtnQkFDWDtvQkFDQyxPQUFPLEdBQUcsQ0FBQTtZQUNaLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxZQUFZLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3RDLENBQUM7SUFFUyxTQUFTLENBQUMsS0FBbUI7UUFDdEMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sRUFBRSxDQUFB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