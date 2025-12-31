/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, IMMUTABLE_CODE_TO_KEY_CODE, IMMUTABLE_KEY_CODE_TO_CODE, ScanCodeUtils, } from '../../../../base/common/keyCodes.js';
import { KeyCodeChord, ScanCodeChord, } from '../../../../base/common/keybindings.js';
import { BaseResolvedKeybinding } from '../../../../platform/keybinding/common/baseResolvedKeybinding.js';
/**
 * A map from character to key codes.
 * e.g. Contains entries such as:
 *  - '/' => { keyCode: KeyCode.US_SLASH, shiftKey: false }
 *  - '?' => { keyCode: KeyCode.US_SLASH, shiftKey: true }
 */
const CHAR_CODE_TO_KEY_CODE = [];
export class NativeResolvedKeybinding extends BaseResolvedKeybinding {
    constructor(mapper, os, chords) {
        super(os, chords);
        this._mapper = mapper;
    }
    _getLabel(chord) {
        return this._mapper.getUILabelForScanCodeChord(chord);
    }
    _getAriaLabel(chord) {
        return this._mapper.getAriaLabelForScanCodeChord(chord);
    }
    _getElectronAccelerator(chord) {
        return this._mapper.getElectronAcceleratorLabelForScanCodeChord(chord);
    }
    _getUserSettingsLabel(chord) {
        return this._mapper.getUserSettingsLabelForScanCodeChord(chord);
    }
    _isWYSIWYG(binding) {
        if (!binding) {
            return true;
        }
        if (IMMUTABLE_CODE_TO_KEY_CODE[binding.scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
            return true;
        }
        const a = this._mapper.getAriaLabelForScanCodeChord(binding);
        const b = this._mapper.getUserSettingsLabelForScanCodeChord(binding);
        if (!a && !b) {
            return true;
        }
        if (!a || !b) {
            return false;
        }
        return a.toLowerCase() === b.toLowerCase();
    }
    _getChordDispatch(chord) {
        return this._mapper.getDispatchStrForScanCodeChord(chord);
    }
    _getSingleModifierChordDispatch(chord) {
        if ((chord.scanCode === 157 /* ScanCode.ControlLeft */ || chord.scanCode === 161 /* ScanCode.ControlRight */) &&
            !chord.shiftKey &&
            !chord.altKey &&
            !chord.metaKey) {
            return 'ctrl';
        }
        if ((chord.scanCode === 159 /* ScanCode.AltLeft */ || chord.scanCode === 163 /* ScanCode.AltRight */) &&
            !chord.ctrlKey &&
            !chord.shiftKey &&
            !chord.metaKey) {
            return 'alt';
        }
        if ((chord.scanCode === 158 /* ScanCode.ShiftLeft */ || chord.scanCode === 162 /* ScanCode.ShiftRight */) &&
            !chord.ctrlKey &&
            !chord.altKey &&
            !chord.metaKey) {
            return 'shift';
        }
        if ((chord.scanCode === 160 /* ScanCode.MetaLeft */ || chord.scanCode === 164 /* ScanCode.MetaRight */) &&
            !chord.ctrlKey &&
            !chord.shiftKey &&
            !chord.altKey) {
            return 'meta';
        }
        return null;
    }
}
class ScanCodeCombo {
    constructor(ctrlKey, shiftKey, altKey, scanCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.scanCode = scanCode;
    }
    toString() {
        return `${this.ctrlKey ? 'Ctrl+' : ''}${this.shiftKey ? 'Shift+' : ''}${this.altKey ? 'Alt+' : ''}${ScanCodeUtils.toString(this.scanCode)}`;
    }
    equals(other) {
        return (this.ctrlKey === other.ctrlKey &&
            this.shiftKey === other.shiftKey &&
            this.altKey === other.altKey &&
            this.scanCode === other.scanCode);
    }
    getProducedCharCode(mapping) {
        if (!mapping) {
            return '';
        }
        if (this.ctrlKey && this.shiftKey && this.altKey) {
            return mapping.withShiftAltGr;
        }
        if (this.ctrlKey && this.altKey) {
            return mapping.withAltGr;
        }
        if (this.shiftKey) {
            return mapping.withShift;
        }
        return mapping.value;
    }
    getProducedChar(mapping) {
        const charCode = MacLinuxKeyboardMapper.getCharCode(this.getProducedCharCode(mapping));
        if (charCode === 0) {
            return ' --- ';
        }
        if (charCode >= 768 /* CharCode.U_Combining_Grave_Accent */ &&
            charCode <= 879 /* CharCode.U_Combining_Latin_Small_Letter_X */) {
            // combining
            return 'U+' + charCode.toString(16);
        }
        return '  ' + String.fromCharCode(charCode) + '  ';
    }
}
class KeyCodeCombo {
    constructor(ctrlKey, shiftKey, altKey, keyCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.keyCode = keyCode;
    }
    toString() {
        return `${this.ctrlKey ? 'Ctrl+' : ''}${this.shiftKey ? 'Shift+' : ''}${this.altKey ? 'Alt+' : ''}${KeyCodeUtils.toString(this.keyCode)}`;
    }
}
class ScanCodeKeyCodeMapper {
    constructor() {
        /**
         * ScanCode combination => KeyCode combination.
         * Only covers relevant modifiers ctrl, shift, alt (since meta does not influence the mappings).
         */
        this._scanCodeToKeyCode = [];
        /**
         * inverse of `_scanCodeToKeyCode`.
         * KeyCode combination => ScanCode combination.
         * Only covers relevant modifiers ctrl, shift, alt (since meta does not influence the mappings).
         */
        this._keyCodeToScanCode = [];
        this._scanCodeToKeyCode = [];
        this._keyCodeToScanCode = [];
    }
    registrationComplete() {
        // IntlHash and IntlBackslash are rare keys, so ensure they don't end up being the preferred...
        this._moveToEnd(56 /* ScanCode.IntlHash */);
        this._moveToEnd(106 /* ScanCode.IntlBackslash */);
    }
    _moveToEnd(scanCode) {
        for (let mod = 0; mod < 8; mod++) {
            const encodedKeyCodeCombos = this._scanCodeToKeyCode[(scanCode << 3) + mod];
            if (!encodedKeyCodeCombos) {
                continue;
            }
            for (let i = 0, len = encodedKeyCodeCombos.length; i < len; i++) {
                const encodedScanCodeCombos = this._keyCodeToScanCode[encodedKeyCodeCombos[i]];
                if (encodedScanCodeCombos.length === 1) {
                    continue;
                }
                for (let j = 0, len = encodedScanCodeCombos.length; j < len; j++) {
                    const entry = encodedScanCodeCombos[j];
                    const entryScanCode = entry >>> 3;
                    if (entryScanCode === scanCode) {
                        // Move this entry to the end
                        for (let k = j + 1; k < len; k++) {
                            encodedScanCodeCombos[k - 1] = encodedScanCodeCombos[k];
                        }
                        encodedScanCodeCombos[len - 1] = entry;
                    }
                }
            }
        }
    }
    registerIfUnknown(scanCodeCombo, keyCodeCombo) {
        if (keyCodeCombo.keyCode === 0 /* KeyCode.Unknown */) {
            return;
        }
        const scanCodeComboEncoded = this._encodeScanCodeCombo(scanCodeCombo);
        const keyCodeComboEncoded = this._encodeKeyCodeCombo(keyCodeCombo);
        const keyCodeIsDigit = keyCodeCombo.keyCode >= 21 /* KeyCode.Digit0 */ && keyCodeCombo.keyCode <= 30 /* KeyCode.Digit9 */;
        const keyCodeIsLetter = keyCodeCombo.keyCode >= 31 /* KeyCode.KeyA */ && keyCodeCombo.keyCode <= 56 /* KeyCode.KeyZ */;
        const existingKeyCodeCombos = this._scanCodeToKeyCode[scanCodeComboEncoded];
        // Allow a scan code to map to multiple key codes if it is a digit or a letter key code
        if (keyCodeIsDigit || keyCodeIsLetter) {
            // Only check that we don't insert the same entry twice
            if (existingKeyCodeCombos) {
                for (let i = 0, len = existingKeyCodeCombos.length; i < len; i++) {
                    if (existingKeyCodeCombos[i] === keyCodeComboEncoded) {
                        // avoid duplicates
                        return;
                    }
                }
            }
        }
        else {
            // Don't allow multiples
            if (existingKeyCodeCombos && existingKeyCodeCombos.length !== 0) {
                return;
            }
        }
        this._scanCodeToKeyCode[scanCodeComboEncoded] =
            this._scanCodeToKeyCode[scanCodeComboEncoded] || [];
        this._scanCodeToKeyCode[scanCodeComboEncoded].unshift(keyCodeComboEncoded);
        this._keyCodeToScanCode[keyCodeComboEncoded] =
            this._keyCodeToScanCode[keyCodeComboEncoded] || [];
        this._keyCodeToScanCode[keyCodeComboEncoded].unshift(scanCodeComboEncoded);
    }
    lookupKeyCodeCombo(keyCodeCombo) {
        const keyCodeComboEncoded = this._encodeKeyCodeCombo(keyCodeCombo);
        const scanCodeCombosEncoded = this._keyCodeToScanCode[keyCodeComboEncoded];
        if (!scanCodeCombosEncoded || scanCodeCombosEncoded.length === 0) {
            return [];
        }
        const result = [];
        for (let i = 0, len = scanCodeCombosEncoded.length; i < len; i++) {
            const scanCodeComboEncoded = scanCodeCombosEncoded[i];
            const ctrlKey = scanCodeComboEncoded & 0b001 ? true : false;
            const shiftKey = scanCodeComboEncoded & 0b010 ? true : false;
            const altKey = scanCodeComboEncoded & 0b100 ? true : false;
            const scanCode = scanCodeComboEncoded >>> 3;
            result[i] = new ScanCodeCombo(ctrlKey, shiftKey, altKey, scanCode);
        }
        return result;
    }
    lookupScanCodeCombo(scanCodeCombo) {
        const scanCodeComboEncoded = this._encodeScanCodeCombo(scanCodeCombo);
        const keyCodeCombosEncoded = this._scanCodeToKeyCode[scanCodeComboEncoded];
        if (!keyCodeCombosEncoded || keyCodeCombosEncoded.length === 0) {
            return [];
        }
        const result = [];
        for (let i = 0, len = keyCodeCombosEncoded.length; i < len; i++) {
            const keyCodeComboEncoded = keyCodeCombosEncoded[i];
            const ctrlKey = keyCodeComboEncoded & 0b001 ? true : false;
            const shiftKey = keyCodeComboEncoded & 0b010 ? true : false;
            const altKey = keyCodeComboEncoded & 0b100 ? true : false;
            const keyCode = keyCodeComboEncoded >>> 3;
            result[i] = new KeyCodeCombo(ctrlKey, shiftKey, altKey, keyCode);
        }
        return result;
    }
    guessStableKeyCode(scanCode) {
        if (scanCode >= 36 /* ScanCode.Digit1 */ && scanCode <= 45 /* ScanCode.Digit0 */) {
            // digits are ok
            switch (scanCode) {
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
            }
        }
        // Lookup the scanCode with and without shift and see if the keyCode is stable
        const keyCodeCombos1 = this.lookupScanCodeCombo(new ScanCodeCombo(false, false, false, scanCode));
        const keyCodeCombos2 = this.lookupScanCodeCombo(new ScanCodeCombo(false, true, false, scanCode));
        if (keyCodeCombos1.length === 1 && keyCodeCombos2.length === 1) {
            const shiftKey1 = keyCodeCombos1[0].shiftKey;
            const keyCode1 = keyCodeCombos1[0].keyCode;
            const shiftKey2 = keyCodeCombos2[0].shiftKey;
            const keyCode2 = keyCodeCombos2[0].keyCode;
            if (keyCode1 === keyCode2 && shiftKey1 !== shiftKey2) {
                // This looks like a stable mapping
                return keyCode1;
            }
        }
        return -1 /* KeyCode.DependsOnKbLayout */;
    }
    _encodeScanCodeCombo(scanCodeCombo) {
        return this._encode(scanCodeCombo.ctrlKey, scanCodeCombo.shiftKey, scanCodeCombo.altKey, scanCodeCombo.scanCode);
    }
    _encodeKeyCodeCombo(keyCodeCombo) {
        return this._encode(keyCodeCombo.ctrlKey, keyCodeCombo.shiftKey, keyCodeCombo.altKey, keyCodeCombo.keyCode);
    }
    _encode(ctrlKey, shiftKey, altKey, principal) {
        return ((((ctrlKey ? 1 : 0) << 0) |
            ((shiftKey ? 1 : 0) << 1) |
            ((altKey ? 1 : 0) << 2) |
            (principal << 3)) >>>
            0);
    }
}
export class MacLinuxKeyboardMapper {
    constructor(_isUSStandard, rawMappings, _mapAltGrToCtrlAlt, _OS) {
        this._isUSStandard = _isUSStandard;
        this._mapAltGrToCtrlAlt = _mapAltGrToCtrlAlt;
        this._OS = _OS;
        /**
         * UI label for a ScanCode.
         */
        this._scanCodeToLabel = [];
        /**
         * Dispatching string for a ScanCode.
         */
        this._scanCodeToDispatch = [];
        this._codeInfo = [];
        this._scanCodeKeyCodeMapper = new ScanCodeKeyCodeMapper();
        this._scanCodeToLabel = [];
        this._scanCodeToDispatch = [];
        const _registerIfUnknown = (hwCtrlKey, hwShiftKey, hwAltKey, scanCode, kbCtrlKey, kbShiftKey, kbAltKey, keyCode) => {
            this._scanCodeKeyCodeMapper.registerIfUnknown(new ScanCodeCombo(hwCtrlKey ? true : false, hwShiftKey ? true : false, hwAltKey ? true : false, scanCode), new KeyCodeCombo(kbCtrlKey ? true : false, kbShiftKey ? true : false, kbAltKey ? true : false, keyCode));
        };
        const _registerAllCombos = (_ctrlKey, _shiftKey, _altKey, scanCode, keyCode) => {
            for (let ctrlKey = _ctrlKey; ctrlKey <= 1; ctrlKey++) {
                for (let shiftKey = _shiftKey; shiftKey <= 1; shiftKey++) {
                    for (let altKey = _altKey; altKey <= 1; altKey++) {
                        _registerIfUnknown(ctrlKey, shiftKey, altKey, scanCode, ctrlKey, shiftKey, altKey, keyCode);
                    }
                }
            }
        };
        // Initialize `_scanCodeToLabel`
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            this._scanCodeToLabel[scanCode] = null;
        }
        // Initialize `_scanCodeToDispatch`
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            this._scanCodeToDispatch[scanCode] = null;
        }
        // Handle immutable mappings
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            const keyCode = IMMUTABLE_CODE_TO_KEY_CODE[scanCode];
            if (keyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
                _registerAllCombos(0, 0, 0, scanCode, keyCode);
                this._scanCodeToLabel[scanCode] = KeyCodeUtils.toString(keyCode);
                if (keyCode === 0 /* KeyCode.Unknown */ ||
                    keyCode === 5 /* KeyCode.Ctrl */ ||
                    keyCode === 57 /* KeyCode.Meta */ ||
                    keyCode === 6 /* KeyCode.Alt */ ||
                    keyCode === 4 /* KeyCode.Shift */) {
                    this._scanCodeToDispatch[scanCode] = null; // cannot dispatch on this ScanCode
                }
                else {
                    this._scanCodeToDispatch[scanCode] = `[${ScanCodeUtils.toString(scanCode)}]`;
                }
            }
        }
        // Try to identify keyboard layouts where characters A-Z are missing
        // and forcibly map them to their corresponding scan codes if that is the case
        const missingLatinLettersOverride = {};
        {
            const producesLatinLetter = [];
            for (const strScanCode in rawMappings) {
                if (rawMappings.hasOwnProperty(strScanCode)) {
                    const scanCode = ScanCodeUtils.toEnum(strScanCode);
                    if (scanCode === 0 /* ScanCode.None */) {
                        continue;
                    }
                    if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
                        continue;
                    }
                    const rawMapping = rawMappings[strScanCode];
                    const value = MacLinuxKeyboardMapper.getCharCode(rawMapping.value);
                    if (value >= 97 /* CharCode.a */ && value <= 122 /* CharCode.z */) {
                        const upperCaseValue = 65 /* CharCode.A */ + (value - 97 /* CharCode.a */);
                        producesLatinLetter[upperCaseValue] = true;
                    }
                }
            }
            const _registerLetterIfMissing = (charCode, scanCode, value, withShift) => {
                if (!producesLatinLetter[charCode]) {
                    missingLatinLettersOverride[ScanCodeUtils.toString(scanCode)] = {
                        value: value,
                        withShift: withShift,
                        withAltGr: '',
                        withShiftAltGr: '',
                    };
                }
            };
            // Ensure letters are mapped
            _registerLetterIfMissing(65 /* CharCode.A */, 10 /* ScanCode.KeyA */, 'a', 'A');
            _registerLetterIfMissing(66 /* CharCode.B */, 11 /* ScanCode.KeyB */, 'b', 'B');
            _registerLetterIfMissing(67 /* CharCode.C */, 12 /* ScanCode.KeyC */, 'c', 'C');
            _registerLetterIfMissing(68 /* CharCode.D */, 13 /* ScanCode.KeyD */, 'd', 'D');
            _registerLetterIfMissing(69 /* CharCode.E */, 14 /* ScanCode.KeyE */, 'e', 'E');
            _registerLetterIfMissing(70 /* CharCode.F */, 15 /* ScanCode.KeyF */, 'f', 'F');
            _registerLetterIfMissing(71 /* CharCode.G */, 16 /* ScanCode.KeyG */, 'g', 'G');
            _registerLetterIfMissing(72 /* CharCode.H */, 17 /* ScanCode.KeyH */, 'h', 'H');
            _registerLetterIfMissing(73 /* CharCode.I */, 18 /* ScanCode.KeyI */, 'i', 'I');
            _registerLetterIfMissing(74 /* CharCode.J */, 19 /* ScanCode.KeyJ */, 'j', 'J');
            _registerLetterIfMissing(75 /* CharCode.K */, 20 /* ScanCode.KeyK */, 'k', 'K');
            _registerLetterIfMissing(76 /* CharCode.L */, 21 /* ScanCode.KeyL */, 'l', 'L');
            _registerLetterIfMissing(77 /* CharCode.M */, 22 /* ScanCode.KeyM */, 'm', 'M');
            _registerLetterIfMissing(78 /* CharCode.N */, 23 /* ScanCode.KeyN */, 'n', 'N');
            _registerLetterIfMissing(79 /* CharCode.O */, 24 /* ScanCode.KeyO */, 'o', 'O');
            _registerLetterIfMissing(80 /* CharCode.P */, 25 /* ScanCode.KeyP */, 'p', 'P');
            _registerLetterIfMissing(81 /* CharCode.Q */, 26 /* ScanCode.KeyQ */, 'q', 'Q');
            _registerLetterIfMissing(82 /* CharCode.R */, 27 /* ScanCode.KeyR */, 'r', 'R');
            _registerLetterIfMissing(83 /* CharCode.S */, 28 /* ScanCode.KeyS */, 's', 'S');
            _registerLetterIfMissing(84 /* CharCode.T */, 29 /* ScanCode.KeyT */, 't', 'T');
            _registerLetterIfMissing(85 /* CharCode.U */, 30 /* ScanCode.KeyU */, 'u', 'U');
            _registerLetterIfMissing(86 /* CharCode.V */, 31 /* ScanCode.KeyV */, 'v', 'V');
            _registerLetterIfMissing(87 /* CharCode.W */, 32 /* ScanCode.KeyW */, 'w', 'W');
            _registerLetterIfMissing(88 /* CharCode.X */, 33 /* ScanCode.KeyX */, 'x', 'X');
            _registerLetterIfMissing(89 /* CharCode.Y */, 34 /* ScanCode.KeyY */, 'y', 'Y');
            _registerLetterIfMissing(90 /* CharCode.Z */, 35 /* ScanCode.KeyZ */, 'z', 'Z');
        }
        const mappings = [];
        let mappingsLen = 0;
        for (const strScanCode in rawMappings) {
            if (rawMappings.hasOwnProperty(strScanCode)) {
                const scanCode = ScanCodeUtils.toEnum(strScanCode);
                if (scanCode === 0 /* ScanCode.None */) {
                    continue;
                }
                if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
                    continue;
                }
                this._codeInfo[scanCode] = rawMappings[strScanCode];
                const rawMapping = missingLatinLettersOverride[strScanCode] || rawMappings[strScanCode];
                const value = MacLinuxKeyboardMapper.getCharCode(rawMapping.value);
                const withShift = MacLinuxKeyboardMapper.getCharCode(rawMapping.withShift);
                const withAltGr = MacLinuxKeyboardMapper.getCharCode(rawMapping.withAltGr);
                const withShiftAltGr = MacLinuxKeyboardMapper.getCharCode(rawMapping.withShiftAltGr);
                const mapping = {
                    scanCode: scanCode,
                    value: value,
                    withShift: withShift,
                    withAltGr: withAltGr,
                    withShiftAltGr: withShiftAltGr,
                };
                mappings[mappingsLen++] = mapping;
                this._scanCodeToDispatch[scanCode] = `[${ScanCodeUtils.toString(scanCode)}]`;
                if (value >= 97 /* CharCode.a */ && value <= 122 /* CharCode.z */) {
                    const upperCaseValue = 65 /* CharCode.A */ + (value - 97 /* CharCode.a */);
                    this._scanCodeToLabel[scanCode] = String.fromCharCode(upperCaseValue);
                }
                else if (value >= 65 /* CharCode.A */ && value <= 90 /* CharCode.Z */) {
                    this._scanCodeToLabel[scanCode] = String.fromCharCode(value);
                }
                else if (value) {
                    this._scanCodeToLabel[scanCode] = String.fromCharCode(value);
                }
                else {
                    this._scanCodeToLabel[scanCode] = null;
                }
            }
        }
        // Handle all `withShiftAltGr` entries
        for (let i = mappings.length - 1; i >= 0; i--) {
            const mapping = mappings[i];
            const scanCode = mapping.scanCode;
            const withShiftAltGr = mapping.withShiftAltGr;
            if (withShiftAltGr === mapping.withAltGr ||
                withShiftAltGr === mapping.withShift ||
                withShiftAltGr === mapping.value) {
                // handled below
                continue;
            }
            const kb = MacLinuxKeyboardMapper._charCodeToKb(withShiftAltGr);
            if (!kb) {
                continue;
            }
            const kbShiftKey = kb.shiftKey;
            const keyCode = kb.keyCode;
            if (kbShiftKey) {
                // Ctrl+Shift+Alt+ScanCode => Shift+KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 0, 1, 0, keyCode); //       Ctrl+Alt+ScanCode =>          Shift+KeyCode
            }
            else {
                // Ctrl+Shift+Alt+ScanCode => KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 0, 0, 0, keyCode); //       Ctrl+Alt+ScanCode =>                KeyCode
            }
        }
        // Handle all `withAltGr` entries
        for (let i = mappings.length - 1; i >= 0; i--) {
            const mapping = mappings[i];
            const scanCode = mapping.scanCode;
            const withAltGr = mapping.withAltGr;
            if (withAltGr === mapping.withShift || withAltGr === mapping.value) {
                // handled below
                continue;
            }
            const kb = MacLinuxKeyboardMapper._charCodeToKb(withAltGr);
            if (!kb) {
                continue;
            }
            const kbShiftKey = kb.shiftKey;
            const keyCode = kb.keyCode;
            if (kbShiftKey) {
                // Ctrl+Alt+ScanCode => Shift+KeyCode
                _registerIfUnknown(1, 0, 1, scanCode, 0, 1, 0, keyCode); //       Ctrl+Alt+ScanCode =>          Shift+KeyCode
            }
            else {
                // Ctrl+Alt+ScanCode => KeyCode
                _registerIfUnknown(1, 0, 1, scanCode, 0, 0, 0, keyCode); //       Ctrl+Alt+ScanCode =>                KeyCode
            }
        }
        // Handle all `withShift` entries
        for (let i = mappings.length - 1; i >= 0; i--) {
            const mapping = mappings[i];
            const scanCode = mapping.scanCode;
            const withShift = mapping.withShift;
            if (withShift === mapping.value) {
                // handled below
                continue;
            }
            const kb = MacLinuxKeyboardMapper._charCodeToKb(withShift);
            if (!kb) {
                continue;
            }
            const kbShiftKey = kb.shiftKey;
            const keyCode = kb.keyCode;
            if (kbShiftKey) {
                // Shift+ScanCode => Shift+KeyCode
                _registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
                _registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
                _registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
            }
            else {
                // Shift+ScanCode => KeyCode
                _registerIfUnknown(0, 1, 0, scanCode, 0, 0, 0, keyCode); //          Shift+ScanCode =>                KeyCode
                _registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
                _registerIfUnknown(0, 1, 1, scanCode, 0, 0, 1, keyCode); //      Shift+Alt+ScanCode =>            Alt+KeyCode
                _registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
                _registerIfUnknown(1, 1, 0, scanCode, 1, 0, 0, keyCode); //     Ctrl+Shift+ScanCode =>           Ctrl+KeyCode
                _registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 1, 0, 1, keyCode); // Ctrl+Shift+Alt+ScanCode =>       Ctrl+Alt+KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
            }
        }
        // Handle all `value` entries
        for (let i = mappings.length - 1; i >= 0; i--) {
            const mapping = mappings[i];
            const scanCode = mapping.scanCode;
            const kb = MacLinuxKeyboardMapper._charCodeToKb(mapping.value);
            if (!kb) {
                continue;
            }
            const kbShiftKey = kb.shiftKey;
            const keyCode = kb.keyCode;
            if (kbShiftKey) {
                // ScanCode => Shift+KeyCode
                _registerIfUnknown(0, 0, 0, scanCode, 0, 1, 0, keyCode); //                ScanCode =>          Shift+KeyCode
                _registerIfUnknown(0, 0, 1, scanCode, 0, 1, 1, keyCode); //            Alt+ScanCode =>      Shift+Alt+KeyCode
                _registerIfUnknown(1, 0, 0, scanCode, 1, 1, 0, keyCode); //           Ctrl+ScanCode =>     Ctrl+Shift+KeyCode
                _registerIfUnknown(1, 0, 1, scanCode, 1, 1, 1, keyCode); //       Ctrl+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
            }
            else {
                // ScanCode => KeyCode
                _registerIfUnknown(0, 0, 0, scanCode, 0, 0, 0, keyCode); //                ScanCode =>                KeyCode
                _registerIfUnknown(0, 0, 1, scanCode, 0, 0, 1, keyCode); //            Alt+ScanCode =>            Alt+KeyCode
                _registerIfUnknown(0, 1, 0, scanCode, 0, 1, 0, keyCode); //          Shift+ScanCode =>          Shift+KeyCode
                _registerIfUnknown(0, 1, 1, scanCode, 0, 1, 1, keyCode); //      Shift+Alt+ScanCode =>      Shift+Alt+KeyCode
                _registerIfUnknown(1, 0, 0, scanCode, 1, 0, 0, keyCode); //           Ctrl+ScanCode =>           Ctrl+KeyCode
                _registerIfUnknown(1, 0, 1, scanCode, 1, 0, 1, keyCode); //       Ctrl+Alt+ScanCode =>       Ctrl+Alt+KeyCode
                _registerIfUnknown(1, 1, 0, scanCode, 1, 1, 0, keyCode); //     Ctrl+Shift+ScanCode =>     Ctrl+Shift+KeyCode
                _registerIfUnknown(1, 1, 1, scanCode, 1, 1, 1, keyCode); // Ctrl+Shift+Alt+ScanCode => Ctrl+Shift+Alt+KeyCode
            }
        }
        // Handle all left-over available digits
        _registerAllCombos(0, 0, 0, 36 /* ScanCode.Digit1 */, 22 /* KeyCode.Digit1 */);
        _registerAllCombos(0, 0, 0, 37 /* ScanCode.Digit2 */, 23 /* KeyCode.Digit2 */);
        _registerAllCombos(0, 0, 0, 38 /* ScanCode.Digit3 */, 24 /* KeyCode.Digit3 */);
        _registerAllCombos(0, 0, 0, 39 /* ScanCode.Digit4 */, 25 /* KeyCode.Digit4 */);
        _registerAllCombos(0, 0, 0, 40 /* ScanCode.Digit5 */, 26 /* KeyCode.Digit5 */);
        _registerAllCombos(0, 0, 0, 41 /* ScanCode.Digit6 */, 27 /* KeyCode.Digit6 */);
        _registerAllCombos(0, 0, 0, 42 /* ScanCode.Digit7 */, 28 /* KeyCode.Digit7 */);
        _registerAllCombos(0, 0, 0, 43 /* ScanCode.Digit8 */, 29 /* KeyCode.Digit8 */);
        _registerAllCombos(0, 0, 0, 44 /* ScanCode.Digit9 */, 30 /* KeyCode.Digit9 */);
        _registerAllCombos(0, 0, 0, 45 /* ScanCode.Digit0 */, 21 /* KeyCode.Digit0 */);
        this._scanCodeKeyCodeMapper.registrationComplete();
    }
    dumpDebugInfo() {
        const result = [];
        const immutableSamples = [88 /* ScanCode.ArrowUp */, 104 /* ScanCode.Numpad0 */];
        let cnt = 0;
        result.push(`isUSStandard: ${this._isUSStandard}`);
        result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
        for (let scanCode = 0 /* ScanCode.None */; scanCode < 193 /* ScanCode.MAX_VALUE */; scanCode++) {
            if (IMMUTABLE_CODE_TO_KEY_CODE[scanCode] !== -1 /* KeyCode.DependsOnKbLayout */) {
                if (immutableSamples.indexOf(scanCode) === -1) {
                    continue;
                }
            }
            if (cnt % 4 === 0) {
                result.push(`|       HW Code combination      |  Key  |    KeyCode combination    | Pri |          UI label         |         User settings          |    Electron accelerator   |       Dispatching string       | WYSIWYG |`);
                result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
            }
            cnt++;
            const mapping = this._codeInfo[scanCode];
            for (let mod = 0; mod < 8; mod++) {
                const hwCtrlKey = mod & 0b001 ? true : false;
                const hwShiftKey = mod & 0b010 ? true : false;
                const hwAltKey = mod & 0b100 ? true : false;
                const scanCodeCombo = new ScanCodeCombo(hwCtrlKey, hwShiftKey, hwAltKey, scanCode);
                const resolvedKb = this.resolveKeyboardEvent({
                    _standardKeyboardEventBrand: true,
                    ctrlKey: scanCodeCombo.ctrlKey,
                    shiftKey: scanCodeCombo.shiftKey,
                    altKey: scanCodeCombo.altKey,
                    metaKey: false,
                    altGraphKey: false,
                    keyCode: -1 /* KeyCode.DependsOnKbLayout */,
                    code: ScanCodeUtils.toString(scanCode),
                });
                const outScanCodeCombo = scanCodeCombo.toString();
                const outKey = scanCodeCombo.getProducedChar(mapping);
                const ariaLabel = resolvedKb.getAriaLabel();
                const outUILabel = ariaLabel ? ariaLabel.replace(/Control\+/, 'Ctrl+') : null;
                const outUserSettings = resolvedKb.getUserSettingsLabel();
                const outElectronAccelerator = resolvedKb.getElectronAccelerator();
                const outDispatchStr = resolvedKb.getDispatchChords()[0];
                const isWYSIWYG = resolvedKb ? resolvedKb.isWYSIWYG() : false;
                const outWYSIWYG = isWYSIWYG ? '       ' : '   NO  ';
                const kbCombos = this._scanCodeKeyCodeMapper.lookupScanCodeCombo(scanCodeCombo);
                if (kbCombos.length === 0) {
                    result.push(`| ${this._leftPad(outScanCodeCombo, 30)} | ${outKey} | ${this._leftPad('', 25)} | ${this._leftPad('', 3)} | ${this._leftPad(outUILabel, 25)} | ${this._leftPad(outUserSettings, 30)} | ${this._leftPad(outElectronAccelerator, 25)} | ${this._leftPad(outDispatchStr, 30)} | ${outWYSIWYG} |`);
                }
                else {
                    for (let i = 0, len = kbCombos.length; i < len; i++) {
                        const kbCombo = kbCombos[i];
                        // find out the priority of this scan code for this key code
                        let colPriority;
                        const scanCodeCombos = this._scanCodeKeyCodeMapper.lookupKeyCodeCombo(kbCombo);
                        if (scanCodeCombos.length === 1) {
                            // no need for priority, this key code combo maps to precisely this scan code combo
                            colPriority = '';
                        }
                        else {
                            let priority = -1;
                            for (let j = 0; j < scanCodeCombos.length; j++) {
                                if (scanCodeCombos[j].equals(scanCodeCombo)) {
                                    priority = j + 1;
                                    break;
                                }
                            }
                            colPriority = String(priority);
                        }
                        const outKeybinding = kbCombo.toString();
                        if (i === 0) {
                            result.push(`| ${this._leftPad(outScanCodeCombo, 30)} | ${outKey} | ${this._leftPad(outKeybinding, 25)} | ${this._leftPad(colPriority, 3)} | ${this._leftPad(outUILabel, 25)} | ${this._leftPad(outUserSettings, 30)} | ${this._leftPad(outElectronAccelerator, 25)} | ${this._leftPad(outDispatchStr, 30)} | ${outWYSIWYG} |`);
                        }
                        else {
                            // secondary keybindings
                            result.push(`| ${this._leftPad('', 30)} |       | ${this._leftPad(outKeybinding, 25)} | ${this._leftPad(colPriority, 3)} | ${this._leftPad('', 25)} | ${this._leftPad('', 30)} | ${this._leftPad('', 25)} | ${this._leftPad('', 30)} |         |`);
                        }
                    }
                }
            }
            result.push(`----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------`);
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
    keyCodeChordToScanCodeChord(chord) {
        // Avoid double Enter bindings (both ScanCode.NumpadEnter and ScanCode.Enter point to KeyCode.Enter)
        if (chord.keyCode === 3 /* KeyCode.Enter */) {
            return [
                new ScanCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, 46 /* ScanCode.Enter */),
            ];
        }
        const scanCodeCombos = this._scanCodeKeyCodeMapper.lookupKeyCodeCombo(new KeyCodeCombo(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.keyCode));
        const result = [];
        for (let i = 0, len = scanCodeCombos.length; i < len; i++) {
            const scanCodeCombo = scanCodeCombos[i];
            result[i] = new ScanCodeChord(scanCodeCombo.ctrlKey, scanCodeCombo.shiftKey, scanCodeCombo.altKey, chord.metaKey, scanCodeCombo.scanCode);
        }
        return result;
    }
    getUILabelForScanCodeChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        if (this._OS === 2 /* OperatingSystem.Macintosh */) {
            switch (chord.scanCode) {
                case 86 /* ScanCode.ArrowLeft */:
                    return '←';
                case 88 /* ScanCode.ArrowUp */:
                    return '↑';
                case 85 /* ScanCode.ArrowRight */:
                    return '→';
                case 87 /* ScanCode.ArrowDown */:
                    return '↓';
            }
        }
        return this._scanCodeToLabel[chord.scanCode];
    }
    getAriaLabelForScanCodeChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        return this._scanCodeToLabel[chord.scanCode];
    }
    getDispatchStrForScanCodeChord(chord) {
        const codeDispatch = this._scanCodeToDispatch[chord.scanCode];
        if (!codeDispatch) {
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
        result += codeDispatch;
        return result;
    }
    getUserSettingsLabelForScanCodeChord(chord) {
        if (!chord) {
            return null;
        }
        if (chord.isDuplicateModifierCase()) {
            return '';
        }
        const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[chord.scanCode];
        if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            return KeyCodeUtils.toUserSettingsUS(immutableKeyCode).toLowerCase();
        }
        // Check if this scanCode always maps to the same keyCode and back
        const constantKeyCode = this._scanCodeKeyCodeMapper.guessStableKeyCode(chord.scanCode);
        if (constantKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            // Verify that this is a good key code that can be mapped back to the same scan code
            const reverseChords = this.keyCodeChordToScanCodeChord(new KeyCodeChord(chord.ctrlKey, chord.shiftKey, chord.altKey, chord.metaKey, constantKeyCode));
            for (let i = 0, len = reverseChords.length; i < len; i++) {
                const reverseChord = reverseChords[i];
                if (reverseChord.scanCode === chord.scanCode) {
                    return KeyCodeUtils.toUserSettingsUS(constantKeyCode).toLowerCase();
                }
            }
        }
        return this._scanCodeToDispatch[chord.scanCode];
    }
    getElectronAcceleratorLabelForScanCodeChord(chord) {
        if (!chord) {
            return null;
        }
        const immutableKeyCode = IMMUTABLE_CODE_TO_KEY_CODE[chord.scanCode];
        if (immutableKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            return KeyCodeUtils.toElectronAccelerator(immutableKeyCode);
        }
        // Check if this scanCode always maps to the same keyCode and back
        const constantKeyCode = this._scanCodeKeyCodeMapper.guessStableKeyCode(chord.scanCode);
        if (this._OS === 3 /* OperatingSystem.Linux */ && !this._isUSStandard) {
            // [Electron Accelerators] On Linux, Electron does not handle correctly OEM keys.
            // when using a different keyboard layout than US Standard.
            // See https://github.com/microsoft/vscode/issues/23706
            // See https://github.com/microsoft/vscode/pull/134890#issuecomment-941671791
            const isOEMKey = constantKeyCode === 85 /* KeyCode.Semicolon */ ||
                constantKeyCode === 86 /* KeyCode.Equal */ ||
                constantKeyCode === 87 /* KeyCode.Comma */ ||
                constantKeyCode === 88 /* KeyCode.Minus */ ||
                constantKeyCode === 89 /* KeyCode.Period */ ||
                constantKeyCode === 90 /* KeyCode.Slash */ ||
                constantKeyCode === 91 /* KeyCode.Backquote */ ||
                constantKeyCode === 92 /* KeyCode.BracketLeft */ ||
                constantKeyCode === 93 /* KeyCode.Backslash */ ||
                constantKeyCode === 94 /* KeyCode.BracketRight */;
            if (isOEMKey) {
                return null;
            }
        }
        if (constantKeyCode !== -1 /* KeyCode.DependsOnKbLayout */) {
            return KeyCodeUtils.toElectronAccelerator(constantKeyCode);
        }
        return null;
    }
    _toResolvedKeybinding(chordParts) {
        if (chordParts.length === 0) {
            return [];
        }
        const result = [];
        this._generateResolvedKeybindings(chordParts, 0, [], result);
        return result;
    }
    _generateResolvedKeybindings(chordParts, currentIndex, previousParts, result) {
        const chordPart = chordParts[currentIndex];
        const isFinalIndex = currentIndex === chordParts.length - 1;
        for (let i = 0, len = chordPart.length; i < len; i++) {
            const chords = [...previousParts, chordPart[i]];
            if (isFinalIndex) {
                result.push(new NativeResolvedKeybinding(this, this._OS, chords));
            }
            else {
                this._generateResolvedKeybindings(chordParts, currentIndex + 1, chords, result);
            }
        }
    }
    resolveKeyboardEvent(keyboardEvent) {
        let code = ScanCodeUtils.toEnum(keyboardEvent.code);
        // Treat NumpadEnter as Enter
        if (code === 94 /* ScanCode.NumpadEnter */) {
            code = 46 /* ScanCode.Enter */;
        }
        const keyCode = keyboardEvent.keyCode;
        if (keyCode === 15 /* KeyCode.LeftArrow */ ||
            keyCode === 16 /* KeyCode.UpArrow */ ||
            keyCode === 17 /* KeyCode.RightArrow */ ||
            keyCode === 18 /* KeyCode.DownArrow */ ||
            keyCode === 20 /* KeyCode.Delete */ ||
            keyCode === 19 /* KeyCode.Insert */ ||
            keyCode === 14 /* KeyCode.Home */ ||
            keyCode === 13 /* KeyCode.End */ ||
            keyCode === 12 /* KeyCode.PageDown */ ||
            keyCode === 11 /* KeyCode.PageUp */ ||
            keyCode === 1 /* KeyCode.Backspace */) {
            // "Dispatch" on keyCode for these key codes to workaround issues with remote desktoping software
            // where the scan codes appear to be incorrect (see https://github.com/microsoft/vscode/issues/24107)
            const immutableScanCode = IMMUTABLE_KEY_CODE_TO_CODE[keyCode];
            if (immutableScanCode !== -1 /* ScanCode.DependsOnKbLayout */) {
                code = immutableScanCode;
            }
        }
        else {
            if (code === 95 /* ScanCode.Numpad1 */ ||
                code === 96 /* ScanCode.Numpad2 */ ||
                code === 97 /* ScanCode.Numpad3 */ ||
                code === 98 /* ScanCode.Numpad4 */ ||
                code === 99 /* ScanCode.Numpad5 */ ||
                code === 100 /* ScanCode.Numpad6 */ ||
                code === 101 /* ScanCode.Numpad7 */ ||
                code === 102 /* ScanCode.Numpad8 */ ||
                code === 103 /* ScanCode.Numpad9 */ ||
                code === 104 /* ScanCode.Numpad0 */ ||
                code === 105 /* ScanCode.NumpadDecimal */) {
                // "Dispatch" on keyCode for all numpad keys in order for NumLock to work correctly
                if (keyCode >= 0) {
                    const immutableScanCode = IMMUTABLE_KEY_CODE_TO_CODE[keyCode];
                    if (immutableScanCode !== -1 /* ScanCode.DependsOnKbLayout */) {
                        code = immutableScanCode;
                    }
                }
            }
        }
        const ctrlKey = keyboardEvent.ctrlKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const altKey = keyboardEvent.altKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const chord = new ScanCodeChord(ctrlKey, keyboardEvent.shiftKey, altKey, keyboardEvent.metaKey, code);
        return new NativeResolvedKeybinding(this, this._OS, [chord]);
    }
    _resolveChord(chord) {
        if (!chord) {
            return [];
        }
        if (chord instanceof ScanCodeChord) {
            return [chord];
        }
        return this.keyCodeChordToScanCodeChord(chord);
    }
    resolveKeybinding(keybinding) {
        const chords = keybinding.chords.map((chord) => this._resolveChord(chord));
        return this._toResolvedKeybinding(chords);
    }
    static _redirectCharCode(charCode) {
        switch (charCode) {
            // allow-any-unicode-next-line
            // CJK: 。 「 」 【 】 ； ，
            // map: . [ ] [ ] ; ,
            case 12290 /* CharCode.U_IDEOGRAPHIC_FULL_STOP */:
                return 46 /* CharCode.Period */;
            case 12300 /* CharCode.U_LEFT_CORNER_BRACKET */:
                return 91 /* CharCode.OpenSquareBracket */;
            case 12301 /* CharCode.U_RIGHT_CORNER_BRACKET */:
                return 93 /* CharCode.CloseSquareBracket */;
            case 12304 /* CharCode.U_LEFT_BLACK_LENTICULAR_BRACKET */:
                return 91 /* CharCode.OpenSquareBracket */;
            case 12305 /* CharCode.U_RIGHT_BLACK_LENTICULAR_BRACKET */:
                return 93 /* CharCode.CloseSquareBracket */;
            case 65307 /* CharCode.U_FULLWIDTH_SEMICOLON */:
                return 59 /* CharCode.Semicolon */;
            case 65292 /* CharCode.U_FULLWIDTH_COMMA */:
                return 44 /* CharCode.Comma */;
        }
        return charCode;
    }
    static _charCodeToKb(charCode) {
        charCode = this._redirectCharCode(charCode);
        if (charCode < CHAR_CODE_TO_KEY_CODE.length) {
            return CHAR_CODE_TO_KEY_CODE[charCode];
        }
        return null;
    }
    /**
     * Attempt to map a combining character to a regular one that renders the same way.
     *
     * https://www.compart.com/en/unicode/bidiclass/NSM
     */
    static getCharCode(char) {
        if (char.length === 0) {
            return 0;
        }
        const charCode = char.charCodeAt(0);
        switch (charCode) {
            case 768 /* CharCode.U_Combining_Grave_Accent */:
                return 96 /* CharCode.U_GRAVE_ACCENT */;
            case 769 /* CharCode.U_Combining_Acute_Accent */:
                return 180 /* CharCode.U_ACUTE_ACCENT */;
            case 770 /* CharCode.U_Combining_Circumflex_Accent */:
                return 94 /* CharCode.U_CIRCUMFLEX */;
            case 771 /* CharCode.U_Combining_Tilde */:
                return 732 /* CharCode.U_SMALL_TILDE */;
            case 772 /* CharCode.U_Combining_Macron */:
                return 175 /* CharCode.U_MACRON */;
            case 773 /* CharCode.U_Combining_Overline */:
                return 8254 /* CharCode.U_OVERLINE */;
            case 774 /* CharCode.U_Combining_Breve */:
                return 728 /* CharCode.U_BREVE */;
            case 775 /* CharCode.U_Combining_Dot_Above */:
                return 729 /* CharCode.U_DOT_ABOVE */;
            case 776 /* CharCode.U_Combining_Diaeresis */:
                return 168 /* CharCode.U_DIAERESIS */;
            case 778 /* CharCode.U_Combining_Ring_Above */:
                return 730 /* CharCode.U_RING_ABOVE */;
            case 779 /* CharCode.U_Combining_Double_Acute_Accent */:
                return 733 /* CharCode.U_DOUBLE_ACUTE_ACCENT */;
        }
        return charCode;
    }
}
;
(function () {
    function define(charCode, keyCode, shiftKey) {
        for (let i = CHAR_CODE_TO_KEY_CODE.length; i < charCode; i++) {
            CHAR_CODE_TO_KEY_CODE[i] = null;
        }
        CHAR_CODE_TO_KEY_CODE[charCode] = { keyCode: keyCode, shiftKey: shiftKey };
    }
    for (let chCode = 65 /* CharCode.A */; chCode <= 90 /* CharCode.Z */; chCode++) {
        define(chCode, 31 /* KeyCode.KeyA */ + (chCode - 65 /* CharCode.A */), true);
    }
    for (let chCode = 97 /* CharCode.a */; chCode <= 122 /* CharCode.z */; chCode++) {
        define(chCode, 31 /* KeyCode.KeyA */ + (chCode - 97 /* CharCode.a */), false);
    }
    define(59 /* CharCode.Semicolon */, 85 /* KeyCode.Semicolon */, false);
    define(58 /* CharCode.Colon */, 85 /* KeyCode.Semicolon */, true);
    define(61 /* CharCode.Equals */, 86 /* KeyCode.Equal */, false);
    define(43 /* CharCode.Plus */, 86 /* KeyCode.Equal */, true);
    define(44 /* CharCode.Comma */, 87 /* KeyCode.Comma */, false);
    define(60 /* CharCode.LessThan */, 87 /* KeyCode.Comma */, true);
    define(45 /* CharCode.Dash */, 88 /* KeyCode.Minus */, false);
    define(95 /* CharCode.Underline */, 88 /* KeyCode.Minus */, true);
    define(46 /* CharCode.Period */, 89 /* KeyCode.Period */, false);
    define(62 /* CharCode.GreaterThan */, 89 /* KeyCode.Period */, true);
    define(47 /* CharCode.Slash */, 90 /* KeyCode.Slash */, false);
    define(63 /* CharCode.QuestionMark */, 90 /* KeyCode.Slash */, true);
    define(96 /* CharCode.BackTick */, 91 /* KeyCode.Backquote */, false);
    define(126 /* CharCode.Tilde */, 91 /* KeyCode.Backquote */, true);
    define(91 /* CharCode.OpenSquareBracket */, 92 /* KeyCode.BracketLeft */, false);
    define(123 /* CharCode.OpenCurlyBrace */, 92 /* KeyCode.BracketLeft */, true);
    define(92 /* CharCode.Backslash */, 93 /* KeyCode.Backslash */, false);
    define(124 /* CharCode.Pipe */, 93 /* KeyCode.Backslash */, true);
    define(93 /* CharCode.CloseSquareBracket */, 94 /* KeyCode.BracketRight */, false);
    define(125 /* CharCode.CloseCurlyBrace */, 94 /* KeyCode.BracketRight */, true);
    define(39 /* CharCode.SingleQuote */, 95 /* KeyCode.Quote */, false);
    define(34 /* CharCode.DoubleQuote */, 95 /* KeyCode.Quote */, true);
})();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFjTGludXhLZXlib2FyZE1hcHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi9tYWNMaW51eEtleWJvYXJkTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFFTixZQUFZLEVBQ1osMEJBQTBCLEVBQzFCLDBCQUEwQixFQUUxQixhQUFhLEdBQ2IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBRU4sWUFBWSxFQUVaLGFBQWEsR0FHYixNQUFNLHdDQUF3QyxDQUFBO0FBSS9DLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBTXpHOzs7OztHQUtHO0FBQ0gsTUFBTSxxQkFBcUIsR0FBdUQsRUFBRSxDQUFBO0FBRXBGLE1BQU0sT0FBTyx3QkFBeUIsU0FBUSxzQkFBcUM7SUFHbEYsWUFBWSxNQUE4QixFQUFFLEVBQW1CLEVBQUUsTUFBdUI7UUFDdkYsS0FBSyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUNqQixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN0QixDQUFDO0lBRVMsU0FBUyxDQUFDLEtBQW9CO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRVMsYUFBYSxDQUFDLEtBQW9CO1FBQzNDLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBRVMsdUJBQXVCLENBQUMsS0FBb0I7UUFDckQsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLDJDQUEyQyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3ZFLENBQUM7SUFFUyxxQkFBcUIsQ0FB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LENBQUMsUUFBUSxDQUFDLENBQUMsR0FBRzt3QkFDL0QsS0FBSyxFQUFFLEtBQUs7d0JBQ1osU0FBUyxFQUFFLFNBQVM7d0JBQ3BCLFNBQVMsRUFBRSxFQUFFO3dCQUNiLGNBQWMsRUFBRSxFQUFFO3FCQUNsQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDLENBQUE7WUFFRCw0QkFBNEI7WUFDNUIsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0QixHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDN0Qsd0JBQXdCLDhDQUE0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QUFvQyxJQUFJLENBQUMsQ0FBQTtJQUUvQyxNQUFNLG1EQUFpQyxLQUFLLENBQUMsQ0FBQTtJQUM3QyxNQUFNLGlEQUErQixJQUFJLENBQUMsQ0FBQTtJQUUxQyxNQUFNLGtEQUFnQyxLQUFLLENBQUMsQ0FBQTtJQUM1QyxNQUFNLHFEQUFtQyxJQUFJLENBQUMsQ0FBQTtJQUU5QyxNQUFNLGlEQUErQixLQUFLLENBQUMsQ0FBQTtJQUMzQyxNQUFNLHNEQUFvQyxJQUFJLENBQUMsQ0FBQTtJQUUvQyxNQUFNLG9EQUFrQyxLQUFLLENBQUMsQ0FBQTtJQUM5QyxNQUFNLHlEQUF1QyxJQUFJLENBQUMsQ0FBQTtJQUVsRCxNQUFNLGtEQUFnQyxLQUFLLENBQUMsQ0FBQTtJQUM1QyxNQUFNLHlEQUF1QyxJQUFJLENBQUMsQ0FBQTtJQUVsRCxNQUFNLHlEQUF1QyxLQUFLLENBQUMsQ0FBQTtJQUNuRCxNQUFNLHVEQUFvQyxJQUFJLENBQUMsQ0FBQTtJQUUvQyxNQUFNLG9FQUFrRCxLQUFLLENBQUMsQ0FBQTtJQUM5RCxNQUFNLGtFQUErQyxJQUFJLENBQUMsQ0FBQTtJQUUxRCxNQUFNLDBEQUF3QyxLQUFLLENBQUMsQ0FBQTtJQUNwRCxNQUFNLHNEQUFtQyxJQUFJLENBQUMsQ0FBQTtJQUU5QyxNQUFNLHNFQUFvRCxLQUFLLENBQUMsQ0FBQTtJQUNoRSxNQUFNLG9FQUFpRCxJQUFJLENBQUMsQ0FBQTtJQUU1RCxNQUFNLHdEQUFzQyxLQUFLLENBQUMsQ0FBQTtJQUNsRCxNQUFNLHdEQUFzQyxJQUFJLENBQUMsQ0FBQTtBQUNsRCxDQUFDLENBQUMsRUFBRSxDQUFBIn0=