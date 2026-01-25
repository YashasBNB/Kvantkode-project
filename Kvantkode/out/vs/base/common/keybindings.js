/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from './errors.js';
/**
 * Binary encoding strategy:
 * ```
 *    1111 11
 *    5432 1098 7654 3210
 *    ---- CSAW KKKK KKKK
 *  C = bit 11 = ctrlCmd flag
 *  S = bit 10 = shift flag
 *  A = bit 9 = alt flag
 *  W = bit 8 = winCtrl flag
 *  K = bits 0-7 = key code
 * ```
 */
var BinaryKeybindingsMask;
(function (BinaryKeybindingsMask) {
    BinaryKeybindingsMask[BinaryKeybindingsMask["CtrlCmd"] = 2048] = "CtrlCmd";
    BinaryKeybindingsMask[BinaryKeybindingsMask["Shift"] = 1024] = "Shift";
    BinaryKeybindingsMask[BinaryKeybindingsMask["Alt"] = 512] = "Alt";
    BinaryKeybindingsMask[BinaryKeybindingsMask["WinCtrl"] = 256] = "WinCtrl";
    BinaryKeybindingsMask[BinaryKeybindingsMask["KeyCode"] = 255] = "KeyCode";
})(BinaryKeybindingsMask || (BinaryKeybindingsMask = {}));
export function decodeKeybinding(keybinding, OS) {
    if (typeof keybinding === 'number') {
        if (keybinding === 0) {
            return null;
        }
        const firstChord = (keybinding & 0x0000ffff) >>> 0;
        const secondChord = (keybinding & 0xffff0000) >>> 16;
        if (secondChord !== 0) {
            return new Keybinding([
                createSimpleKeybinding(firstChord, OS),
                createSimpleKeybinding(secondChord, OS),
            ]);
        }
        return new Keybinding([createSimpleKeybinding(firstChord, OS)]);
    }
    else {
        const chords = [];
        for (let i = 0; i < keybinding.length; i++) {
            chords.push(createSimpleKeybinding(keybinding[i], OS));
        }
        return new Keybinding(chords);
    }
}
export function createSimpleKeybinding(keybinding, OS) {
    const ctrlCmd = keybinding & 2048 /* BinaryKeybindingsMask.CtrlCmd */ ? true : false;
    const winCtrl = keybinding & 256 /* BinaryKeybindingsMask.WinCtrl */ ? true : false;
    const ctrlKey = OS === 2 /* OperatingSystem.Macintosh */ ? winCtrl : ctrlCmd;
    const shiftKey = keybinding & 1024 /* BinaryKeybindingsMask.Shift */ ? true : false;
    const altKey = keybinding & 512 /* BinaryKeybindingsMask.Alt */ ? true : false;
    const metaKey = OS === 2 /* OperatingSystem.Macintosh */ ? ctrlCmd : winCtrl;
    const keyCode = keybinding & 255 /* BinaryKeybindingsMask.KeyCode */;
    return new KeyCodeChord(ctrlKey, shiftKey, altKey, metaKey, keyCode);
}
/**
 * Represents a chord which uses the `keyCode` field of keyboard events.
 * A chord is a combination of keys pressed simultaneously.
 */
export class KeyCodeChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, keyCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.keyCode = keyCode;
    }
    equals(other) {
        return (other instanceof KeyCodeChord &&
            this.ctrlKey === other.ctrlKey &&
            this.shiftKey === other.shiftKey &&
            this.altKey === other.altKey &&
            this.metaKey === other.metaKey &&
            this.keyCode === other.keyCode);
    }
    getHashCode() {
        const ctrl = this.ctrlKey ? '1' : '0';
        const shift = this.shiftKey ? '1' : '0';
        const alt = this.altKey ? '1' : '0';
        const meta = this.metaKey ? '1' : '0';
        return `K${ctrl}${shift}${alt}${meta}${this.keyCode}`;
    }
    isModifierKey() {
        return (this.keyCode === 0 /* KeyCode.Unknown */ ||
            this.keyCode === 5 /* KeyCode.Ctrl */ ||
            this.keyCode === 57 /* KeyCode.Meta */ ||
            this.keyCode === 6 /* KeyCode.Alt */ ||
            this.keyCode === 4 /* KeyCode.Shift */);
    }
    toKeybinding() {
        return new Keybinding([this]);
    }
    /**
     * Does this keybinding refer to the key code of a modifier and it also has the modifier flag?
     */
    isDuplicateModifierCase() {
        return ((this.ctrlKey && this.keyCode === 5 /* KeyCode.Ctrl */) ||
            (this.shiftKey && this.keyCode === 4 /* KeyCode.Shift */) ||
            (this.altKey && this.keyCode === 6 /* KeyCode.Alt */) ||
            (this.metaKey && this.keyCode === 57 /* KeyCode.Meta */));
    }
}
/**
 * Represents a chord which uses the `code` field of keyboard events.
 * A chord is a combination of keys pressed simultaneously.
 */
export class ScanCodeChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, scanCode) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.scanCode = scanCode;
    }
    equals(other) {
        return (other instanceof ScanCodeChord &&
            this.ctrlKey === other.ctrlKey &&
            this.shiftKey === other.shiftKey &&
            this.altKey === other.altKey &&
            this.metaKey === other.metaKey &&
            this.scanCode === other.scanCode);
    }
    getHashCode() {
        const ctrl = this.ctrlKey ? '1' : '0';
        const shift = this.shiftKey ? '1' : '0';
        const alt = this.altKey ? '1' : '0';
        const meta = this.metaKey ? '1' : '0';
        return `S${ctrl}${shift}${alt}${meta}${this.scanCode}`;
    }
    /**
     * Does this keybinding refer to the key code of a modifier and it also has the modifier flag?
     */
    isDuplicateModifierCase() {
        return ((this.ctrlKey &&
            (this.scanCode === 157 /* ScanCode.ControlLeft */ || this.scanCode === 161 /* ScanCode.ControlRight */)) ||
            (this.shiftKey &&
                (this.scanCode === 158 /* ScanCode.ShiftLeft */ || this.scanCode === 162 /* ScanCode.ShiftRight */)) ||
            (this.altKey &&
                (this.scanCode === 159 /* ScanCode.AltLeft */ || this.scanCode === 163 /* ScanCode.AltRight */)) ||
            (this.metaKey &&
                (this.scanCode === 160 /* ScanCode.MetaLeft */ || this.scanCode === 164 /* ScanCode.MetaRight */)));
    }
}
/**
 * A keybinding is a sequence of chords.
 */
export class Keybinding {
    constructor(chords) {
        if (chords.length === 0) {
            throw illegalArgument(`chords`);
        }
        this.chords = chords;
    }
    getHashCode() {
        let result = '';
        for (let i = 0, len = this.chords.length; i < len; i++) {
            if (i !== 0) {
                result += ';';
            }
            result += this.chords[i].getHashCode();
        }
        return result;
    }
    equals(other) {
        if (other === null) {
            return false;
        }
        if (this.chords.length !== other.chords.length) {
            return false;
        }
        for (let i = 0; i < this.chords.length; i++) {
            if (!this.chords[i].equals(other.chords[i])) {
                return false;
            }
        }
        return true;
    }
}
export class ResolvedChord {
    constructor(ctrlKey, shiftKey, altKey, metaKey, keyLabel, keyAriaLabel) {
        this.ctrlKey = ctrlKey;
        this.shiftKey = shiftKey;
        this.altKey = altKey;
        this.metaKey = metaKey;
        this.keyLabel = keyLabel;
        this.keyAriaLabel = keyAriaLabel;
    }
}
/**
 * A resolved keybinding. Consists of one or multiple chords.
 */
export class ResolvedKeybinding {
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2tleWJpbmRpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFJN0M7Ozs7Ozs7Ozs7OztHQVlHO0FBQ0gsSUFBVyxxQkFNVjtBQU5ELFdBQVcscUJBQXFCO0lBQy9CLDBFQUF5QixDQUFBO0lBQ3pCLHNFQUF1QixDQUFBO0lBQ3ZCLGlFQUFvQixDQUFBO0lBQ3BCLHlFQUF3QixDQUFBO0lBQ3hCLHlFQUFvQixDQUFBO0FBQ3JCLENBQUMsRUFOVSxxQkFBcUIsS0FBckIscUJBQXFCLFFBTS9CO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixVQUE2QixFQUM3QixFQUFtQjtJQUVuQixJQUFJLE9BQU8sVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDO1FBQ3BDLElBQUksVUFBVSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3RCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE1BQU0sVUFBVSxHQUFHLENBQUMsVUFBVSxHQUFHLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLFdBQVcsR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDcEQsSUFBSSxXQUFXLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDdkIsT0FBTyxJQUFJLFVBQVUsQ0FBQztnQkFDckIsc0JBQXNCLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQztnQkFDdEMsc0JBQXNCLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQzthQUN2QyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLFVBQVUs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