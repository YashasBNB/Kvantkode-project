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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93c0tleWJvYXJkTWFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvY29tbW9uL3dpbmRvd3NLZXlib2FyZE1hcHBlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBRU4sWUFBWSxFQUNaLDBCQUEwQixFQUUxQixhQUFhLEVBQ2IsbUNBQW1DLEdBQ25DLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUVOLFlBQVksRUFFWixhQUFhLEdBR2IsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFJN0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDekcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFHN0csTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFBO0FBQ2pCLFNBQVMsR0FBRyxDQUFDLEdBQVc7SUFDdkIsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUNULE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDbEIsQ0FBQztBQUNGLENBQUM7QUFXRCxNQUFNLE9BQU8sK0JBQWdDLFNBQVEsc0JBQW9DO0lBR3hGLFlBQVksTUFBNkIsRUFBRSxNQUFzQjtRQUNoRSxLQUFLLGtDQUEwQixNQUFNLENBQUMsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN0QixDQUFDO0lBRVMsU0FBUyxDQUFDLEtBQW1CO1FBQ3RDLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMs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