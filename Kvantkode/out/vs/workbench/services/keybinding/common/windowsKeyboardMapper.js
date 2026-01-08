/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE, ScanCodeUtils, NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE, } from '../../../../base/common/keyCodes.js';
import { KeyCodeChord, ScanCodeChord, } from '../../../../base/common/keybindings.js';
import { UILabelProvider } from '../../../../base/common/keybindingLabels.js';
import { BaseResolvedKeybinding } from '../../../../platform/keybinding/common/baseResolvedKeybinding.js';
import { toEmptyArrayIfContainsNull } from '../../../../platform/keybinding/common/resolvedKeybindingItem.js';
const LOG = false;
function log(str) {
    if (LOG) {
        console.info(str);
    }
}
export class WindowsNativeResolvedKeybinding extends BaseResolvedKeybinding {
    constructor(mapper, chords) {
        super(1 /* OperatingSystem.Windows */, chords);
        this._mapper = mapper;
    }
    _getLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._mapper.getUILabelForKeyCode(chord.keyCode);
    }
    _getUSLabelForKeybinding(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return KeyCodeUtils.toString(chord.keyCode);
    }
    getUSLabel() {
        return UILabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getUSLabelForKeybinding(keybinding));
    }
    _getAriaLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._mapper.getAriaLabelForKeyCode(chord.keyCode);
    }
    _getElectronAccelerator(chord) {
        return this._mapper.getElectronAcceleratorForKeyBinding(chord);
    }
    _getUserSettingsLabel(chord) {
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        const result = this._mapper.getUserSettingsLabelForKeyCode(chord.keyCode);
        return result ? result.toLowerCase() : result;
    }
    _isWYSIWYG(chord) {
        return this.__isWYSIWYG(chord.keyCode);
    }
    __isWYSIWYG(keyCode) {
        if (keyCode === 15 /* KeyCode.LeftArrow */ ||
            keyCode === 16 /* KeyCode.UpArrow */ ||
            keyCode === 17 /* KeyCode.RightArrow */ ||
            keyCode === 18 /* KeyCode.DownArrow */) {
            return true;
        }
        const ariaLabel = this._mapper.getAriaLabelForKeyCode(keyCode);
        const userSettingsLabel = this._mapper.getUserSettingsLabelForKeyCode(keyCode);
        return ariaLabel === userSettingsLabel;
    }
    _getChordDispatch(chord) {
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
    _getSingleModifierChordDispatch(chord) {
        if (chord.keyCode === 5 /* KeyCode.Ctrl */ && !chord.shiftKey && !chord.altKey && !chord.metaKey) {
            return 'ctrl';
        }
        if (chord.keyCode === 4 /* KeyCode.Shift */ && !chord.ctrlKey && !chord.altKey && !chord.metaKey) {
            return 'shift';
        }
        if (chord.keyCode === 6 /* KeyCode.Alt */ && !chord.ctrlKey && !chord.shiftKey && !chord.metaKey) {
            return 'alt';
        }
        if (chord.keyCode === 57 /* KeyCode.Meta */ && !chord.ctrlKey && !chord.shiftKey && !chord.altKey) {
            return 'meta';
        }
        return null;
    }
    static getProducedCharCode(chord, mapping) {
        if (!mapping) {
            return null;
        }
        if (chord.ctrlKey && chord.shiftKey && chord.altKey) {
            return mapping.withShiftAltGr;
        }
        if (chord.ctrlKey && chord.altKey) {
            return mapping.withAltGr;
        }
        if (chord.shiftKey) {
            return mapping.withShift;
        }
        return mapping.value;
    }
    static getProducedChar(chord, mapping) {
        const char = this.getProducedCharCode(chord, mapping);
        if (char === null || char.length === 0) {
            return ' --- ';
        }
        return '  ' + char + '  ';
    }
}
export class WindowsKeyboardMapper {
    constructor(_isUSStandard, rawMappings, _mapAltGrToCtrlAlt) {
        this._isUSStandard = _isUSStandard;
        this._mapAltGrToCtrlAlt = _mapAltGrToCtrlAlt;
        this._keyCodeToLabel = [];
        this._scanCodeToKeyCode = [];
        this._keyCodeToLabel = [];
        this._keyCodeExists = [];
        this._keyCodeToLabel[0 /* KeyCode.Unknown */] = KeyCodeUtils.toString(0 /* KeyCode.Unknown */);
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
            if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
                this._scanCodeToKeyCode[scanCode] = immutableKeyCode;
                this._keyCodeToLabel[immutableKeyCode] = KeyCodeUtils.toString(immutableKeyCode);
                this._keyCodeExists[immutableKeyCode] = true;
            }
        }
        const producesLetter = [];
        let producesLetters = false;
        this._codeInfo = [];
        for (const strCode in rawMappings) {
            if (rawMappings.hasOwnProperty(strCode)) {
                const scanCode = ScanCodeUtils.toEnum(strCode);
                if (scanCode === 0 /* ScanCode.None */) {
                    log(`Unknown scanCode ${strCode} in mapping.`);
                    continue;
                }
                const rawMapping = rawMappings[strCode];
                const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
                if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
                    const keyCode = NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE[rawMapping.vkey] || 0 /* KeyCode.Unknown */;
                    if (keyCode === 0 /* KeyCode.Unknown */ || immutableKeyCode === keyCode) {
                        continue;
                    }
                    if (scanCode !== 134 /* ScanCode.NumpadComma */) {
                        // Looks like ScanCode.NumpadComma doesn't always map to KeyCode.NUMPAD_SEPARATOR
                        // e.g. on POR - PTB
                        continue;
                    }
                }
                const value = rawMapping.value;
                const withShift = rawMapping.withShift;
                const withAltGr = rawMapping.withAltGr;
                const withShiftAltGr = rawMapping.withShiftAltGr;
                const keyCode = NATIVE_WINDOWS_KEY_CODE_TO_KEY_CODE[rawMapping.vkey] || 0 /* KeyCode.Unknown */;
                const mapping = {
                    scanCode: scanCode,
                    keyCode: keyCode,
                    value: value,
                    withShift: withShift,
                    withAltGr: withAltGr,
                    withShiftAltGr: withShiftAltGr,
                };
                this._codeInfo[scanCode] = mapping;
                this._scanCodeToKeyCode[scanCode] = keyCode;
                if (keyCode === 0 /* KeyCode.Unknown */) {
                    continue;
                }
                this._keyCodeExists[keyCode] = true;
                if (value.length === 0) {
                    // This key does not produce strings
                    this._keyCodeToLabel[keyCode] = null;
                }
                else if (value.length > 1) {
                    // This key produces a letter representable with multiple UTF-16 code units.
                    this._keyCodeToLabel[keyCode] = value;
                }
                else {
                    const charCode = value.charCodeAt(0);
                    if (charCode >= 97 /* CharCode.a */ && charCode <= 122 /* CharCode.z */) {
                        const upperCaseValue = 65 /* CharCode.A */ + (charCode - 97 /* CharCode.a */);
                        producesLetter[upperCaseValue] = true;
                        producesLetters = true;
                        this._keyCodeToLabel[keyCode] = String.fromCharCode(65 /* CharCode.A */ + (charCode - 97 /* CharCode.a */));
                    }
                    else if (charCode >= 65 /* CharCode.A */ && charCode <= 90 /* CharCode.Z */) {
                        producesLetter[charCode] = true;
                        producesLetters = true;
                        this._keyCodeToLabel[keyCode] = value;
                    }
                    else {
                        this._keyCodeToLabel[keyCode] = value;
                    }
                }
            }
        }
        // Handle keyboard layouts where latin characters are not produced e.g. Cyrillic
        const _registerLetterIfMissing = (charCode, keyCode) => {
            if (!producesLetter[charCode]) {
                this._keyCodeToLabel[keyCode] = String.fromCharCode(charCode);
            }
        };
        _registerLetterIfMissing(65 /* CharCode.A */, 31 /* KeyCode.KeyA */);
        _registerLetterIfMissing(66 /* CharCode.B */, 32 /* KeyCode.KeyB */);
        _registerLetterIfMissing(67 /* CharCode.C */, 33 /* KeyCode.KeyC */);
        _registerLetterIfMissing(68 /* CharCode.D */, 34 /* KeyCode.KeyD */);
        _registerLetterIfMissing(69 /* CharCode.E */, 35 /* KeyCode.KeyE */);
        _registerLetterIfMissing(70 /* CharCode.F */, 36 /* KeyCode.KeyF */);
        _registerLetterIfMissing(71 /* CharCode.G */, 37 /* KeyCode.KeyG */);
        _registerLetterIfMissing(72 /* CharCode.H */, 38 /* KeyCode.KeyH */);
        _registerLetterIfMissing(73 /* CharCode.I */, 39 /* KeyCode.KeyI */);
        _registerLetterIfMissing(74 /* CharCode.J */, 40 /* KeyCode.KeyJ */);
        _registerLetterIfMissing(75 /* CharCode.K */, 41 /* KeyCode.KeyK */);
        _registerLetterIfMissing(76 /* CharCode.L */, 42 /* KeyCode.KeyL */);
        _registerLetterIfMissing(77 /* CharCode.M */, 43 /* KeyCode.KeyM */);
        _registerLetterIfMissing(78 /* CharCode.N */, 44 /* KeyCode.KeyN */);
        _registerLetterIfMissing(79 /* CharCode.O */, 45 /* KeyCode.KeyO */);
        _registerLetterIfMissing(80 /* CharCode.P */, 46 /* KeyCode.KeyP */);
        _registerLetterIfMissing(81 /* CharCode.Q */, 47 /* KeyCode.KeyQ */);
        _registerLetterIfMissing(82 /* CharCode.R */, 48 /* KeyCode.KeyR */);
        _registerLetterIfMissing(83 /* CharCode.S */, 49 /* KeyCode.KeyS */);
        _registerLetterIfMissing(84 /* CharCode.T */, 50 /* KeyCode.KeyT */);
        _registerLetterIfMissing(85 /* CharCode.U */, 51 /* KeyCode.KeyU */);
        _registerLetterIfMissing(86 /* CharCode.V */, 52 /* KeyCode.KeyV */);
        _registerLetterIfMissing(87 /* CharCode.W */, 53 /* KeyCode.KeyW */);
        _registerLetterIfMissing(88 /* CharCode.X */, 54 /* KeyCode.KeyX */);
        _registerLetterIfMissing(89 /* CharCode.Y */, 55 /* KeyCode.KeyY */);
        _registerLetterIfMissing(90 /* CharCode.Z */, 56 /* KeyCode.KeyZ */);
        if (!producesLetters) {
            // Since this keyboard layout produces no latin letters at all, most of the UI will use the
            // US kb layout equivalent for UI labels, so also try to render other keys with the US labels
            // for consistency...
            const _registerLabel = (keyCode, charCode) => {
                // const existingLabel = this._keyCodeToLabel[keyCode];
                // const existingCharCode = (existingLabel ? existingLabel.charCodeAt(0) : CharCode.Null);
                // if (existingCharCode < 32 || existingCharCode > 126) {
                this._keyCodeToLabel[keyCode] = String.fromCharCode(charCode);
                // }
            };
            _registerLabel(85 /* KeyCode.Semicolon */, 59 /* CharCode.Semicolon */);
            _registerLabel(86 /* KeyCode.Equal */, 61 /* CharCode.Equals */);
            _registerLabel(87 /* KeyCode.Comma */, 44 /* CharCode.Comma */);
            _registerLabel(88 /* KeyCode.Minus */, 45 /* CharCode.Dash */);
            _registerLabel(89 /* KeyCode.Period */, 46 /* CharCode.Period */);
            _registerLabel(90 /* KeyCode.Slash */, 47 /* CharCode.Slash */);
            _registerLabel(91 /* KeyCode.Backquote */, 96 /* CharCode.BackTick */);
            _registerLabel(92 /* KeyCode.BracketLeft */, 91 /* CharCode.OpenSquareBracket */);
            _registerLabel(93 /* KeyCode.Backslash */, 92 /* CharCode.Backslash */);
            _registerLabel(94 /* KeyCode.BracketRight */, 93 /* CharCode.CloseSquareBracket */);
            _registerLabel(95 /* KeyCode.Quote */, 39 /* CharCode.SingleQuote */);
        }
    }
    dumpDebugInfo() {
        const result = [];
        const immutableSamples = [88 /* ScanCode.ArrowUp */, 104 /* ScanCode.Numpad0 */];
        let cnt = 0;
        result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
                if (immutableSamples.indexOf(scanCode) === -1) {
                    continue;
                }
            }
            if (cnt % 6 === 0) {
                result.push(`|       HW Code combination      |  Key  |    KeyCode combination    |          UI label         |        User settings       | WYSIWYG |`);
                result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
            }
            cnt++;
            const mapping = this._codeInfo[scanCode];
            const strCode = ScanCodeUtils.toString(scanCode);
            const mods = [0b000, 0b010, 0b101, 0b111];
            for (const mod of mods) {
                const ctrlKey = mod & 0b001 ? true : false;
                const shiftKey = mod & 0b010 ? true : false;
                const altKey = mod & 0b100 ? true : false;
                const scanCodeChord = new ScanCodeChord(ctrlKey, shiftKey, altKey, false, scanCode);
                const keyCodeChord = this._resolveChord(scanCodeChord);
                const strKeyCode = keyCodeChord ? KeyCodeUtils.toString(keyCodeChord.keyCode) : null;
                const resolvedKb = keyCodeChord
                    ? new WindowsNativeResolvedKeybinding(this, [keyCodeChord])
                    : null;
                const outScanCode = `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${strCode}`;
                const ariaLabel = resolvedKb ? resolvedKb.getAriaLabel() : null;
                const outUILabel = ariaLabel ? ariaLabel.replace(/Control\+/, 'Ctrl+') : null;
                const outUserSettings = resolvedKb ? resolvedKb.getUserSettingsLabel() : null;
                const outKey = WindowsNativeResolvedKeybinding.getProducedChar(scanCodeChord, mapping);
                const outKb = strKeyCode
                    ? `${ctrlKey ? 'Ctrl+' : ''}${shiftKey ? 'Shift+' : ''}${altKey ? 'Alt+' : ''}${strKeyCode}`
                    : null;
                const isWYSIWYG = resolvedKb ? resolvedKb.isWYSIWYG() : false;
                const outWYSIWYG = isWYSIWYG ? '       ' : '   NO  ';
                result.push(`| ${this._leftPad(outScanCode, 30)} | ${outKey} | ${this._leftPad(outKb, 25)} | ${this._leftPad(outUILabel, 25)} |  ${this._leftPad(outUserSettings, 25)} | ${outWYSIWYG} |`);
            }
            result.push(`-----------------------------------------------------------------------------------------------------------------------------------------`);
        }
        return result.join('\n');
    }
    _leftPad(str, cnt) {
        if (str === null) {
            str = 'null';
        }
        while (str.length < cnt) {
            str = ' ' + str;
        }
        return str;
    }
    getUILabelForKeyCode(keyCode) {
        return this._getLabelForKeyCode(keyCode);
    }
    getAriaLabelForKeyCode(keyCode) {
        return this._getLabelForKeyCode(keyCode);
    }
    getUserSettingsLabelForKeyCode(keyCode) {
        if (this._isUSStandard) {
            return KeyCodeUtils.toUserSettingsUS(keyCode);
        }
        return KeyCodeUtils.toUserSettingsGeneral(keyCode);
    }
    getElectronAcceleratorForKeyBinding(chord) {
        return KeyCodeUtils.toElectronAccelerator(chord.keyCode);
    }
    _getLabelForKeyCode(keyCode) {
        return this._keyCodeToLabel[keyCode] || KeyCodeUtils.toString(0 /* KeyCode.Unknown */);
    }
    resolveKeyboardEvent(keyboardEvent) {
        const ctrlKey = keyboardEvent.ctrlKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const altKey = keyboardEvent.altKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const chord = new KeyCodeChord(ctrlKey, keyboardEvent.shiftKey, altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        return new WindowsNativeResolvedKeybinding(this, [chord]);
    }
    _resolveChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord instanceof KeyCodeChord) {
            if (!this._keyCodeExists[chord.keyCode]) {
                return null;
            }
            return chord;
        }
        const keyCode = this._scanCodeToKeyCode[chord.scanCode] || 0 /* KeyCode.Unknown */;
        if (keyCode === 0 /* KeyCode.Unknown */ || !this._keyCodeExists[keyCode]) {
            return null;
        }
        return new KeyCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, keyCode);
    }
    resolveKeybinding(keybinding) {
        const chords = toEmptyArrayIfContainsNull(keybinding.chords.map((chord) => this._resolveChord(chord)));
        if (chords.length > 0) {
            return [new WindowsNativeResolvedKeybinding(this, chords)];
        }
        return [];
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0tleWJvYXJkTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9jb21tb24vd2luZG93c0tleWJvYXJkTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFFTixZQUFZLEVBQ1osMEJBQTBCLEVBRTFCLGFBQWEsRUFDYixtQ0FBbUMsR0FDbkMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBRU4sWUFBWSxFQUVaLGFBQWEsR0FHYixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUk3RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUc3RyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUE7QUFDakIsU0FBUyxHQUFHLENBQUMsR0FBVztJQUN2QixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ1QsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUNsQixDQUFDO0FBQ0YsQ0FBQztBQVdELE1BQU0sT0FBTywrQkFBZ0MsU0FBUSxzQkFBb0M7SUFHeEYsWUFBWSxNQUE2QixFQUFFLE1BQXNCO1FBQ2hFLEtBQUssa0NBQTBCLE1BQU0sQ0FBQyxDQUFBO1FBQ3RDLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO0lBQ3RCLENBQUM7SUFFUyxTQUFTLENBQUMsS0FBbUI7UUFDdEMsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsRUFBRSxDQUFDO1lBQ3JDLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLE9BQU8s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