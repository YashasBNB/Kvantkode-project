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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9rZXliaW5kaW5ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBSTdDOzs7Ozs7Ozs7Ozs7R0FZRztBQUNILElBQVcscUJBTVY7QUFORCxXQUFXLHFCQUFxQjtJQUMvQiwwRUFBeUIsQ0FBQTtJQUN6QixzRUFBdUIsQ0FBQTtJQUN2QixpRUFBb0IsQ0FBQTtJQUNwQix5RUFBd0IsQ0FBQTtJQUN4Qix5RUFBb0IsQ0FBQTtBQUNyQixDQUFDLEVBTlUscUJBQXFCLEtBQXJCLHFCQUFxQixRQU0vQjtBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsVUFBNkIsRUFDN0IsRUFBbUI7SUFFbkIsSUFBSSxPQUFPLFVBQVUsS0FBSyxRQUFRLEVBQUUsQ0FBQztRQUNwQyxJQUFJLFVBQVUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN0QixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFDRCxNQUFNLFVBQVUsR0FBRyxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEQsTUFBTSxXQUFXLEdBQUcsQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3BELElBQUksV0FBVyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sSUFBSSxVQUFVLENBQUM7Z0JBQ3JCLHNCQUFzQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7Z0JBQ3RDLHNCQUFzQixDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUM7YUFDdkMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUNELE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2hFLENBQUM7U0FBTSxDQUFDO1FBQ1AsTUFBTSxNQUFNLEdBQUcsRUFBRSxDQUFBO1FBQ2pCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDNUMsTUFBTSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBQ0QsT0FBTyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUM5QixDQUFDO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxzQkFBc0IsQ0FBQyxVQUFrQixFQUFFLEVBQW1CO0lBQzdFLE1BQU0sT0FBTyxHQUFHLFVBQVUsMkNBQWdDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ3pFLE1BQU0sT0FBTyxHQUFHLFVBQVUsMENBQWdDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBRXpFLE1BQU0sT0FBTyxHQUFHLEVBQUUsc0NBQThCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQ3BFLE1BQU0sUUFBUSxHQUFHLFVBQVUseUNBQThCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ3hFLE1BQU0sTUFBTSxHQUFHLFVBQVUsc0NBQTRCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFBO0lBQ3BFLE1BQU0sT0FBTyxHQUFHLEVBQUUsc0NBQThCLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFBO0lBQ3BFLE1BQU0sT0FBTyxHQUFHLFVBQVUsMENBQWdDLENBQUE7SUFFMUQsT0FBTyxJQUFJLFlBQVksQ0FBQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDckUsQ0FBQztBQVNEOzs7R0FHRztBQUNILE1BQU0sT0FBTyxZQUFZO0lBQ3hCLFlBQ2lCLE9BQWdCLEVBQ2hCLFFBQWlCLEVBQ2pCLE1BQWUsRUFDZixPQUFnQixFQUNoQixPQUFnQjtRQUpoQixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLGFBQVEsR0FBUixRQUFRLENBQVM7UUFDakIsV0FBTSxHQUFOLE1BQU0sQ0FBUztRQUNmLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsWUFBTyxHQUFQLE9BQU8sQ0FBUztJQUM5QixDQUFDO0lBRUcsTUFBTSxDQUFDLEtBQVk7UUFDekIsT0FBTyxDQUNOLEtBQUssWUFBWSxZQUFZO1lBQzdCLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU87WUFDOUIsSUFBSSxDQUFDLFFBQVEsS0FBSyxLQUFLLENBQUMsUUFBUTtZQUNoQyxJQUFJLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNO1lBQzVCLElBQUksQ0FBQyxPQUFPLEtBQUssS0FBSyxDQUFDLE9BQU87WUFDOUIsSUFBSSxDQUFDLE9BQU8sS0FBSyxLQUFLLENBQUMsT0FBTyxDQUM5QixDQUFBO0lBQ0YsQ0FBQztJQUVNLFdBQVc7UUFDakIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDckMsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDdkMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDbkMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUE7UUFDckMsT0FBTyxJQUFJLElBQUksR0FBRyxLQUFLLEdBQUcsR0FBRyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEQsQ0FBQztJQUVNLGFBQWE7UUFDbkIsT0FBTyxDQUNOLElBQUksQ0FBQyxPQUFPLDRCQUFvQjtZQUNoQyxJQUFJLENBQUMsT0FBTyx5QkFBaUI7WUFDN0IsSUFBSSxDQUFDLE9BQU8sMEJBQWlCO1lBQzdCLElBQUksQ0FBQyxPQUFPLHdCQUFnQjtZQUM1QixJQUFJLENBQUMsT0FBTywwQkFBa0IsQ0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFFTSxZQUFZO1FBQ2xCLE9BQU8sSUFBSSxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzlCLENBQUM7SUFFRDs7T0FFRztJQUNJLHVCQUF1QjtRQUM3QixPQUFPLENBQ04sQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLHlCQUFpQixDQUFDO1lBQy9DLENBQUMsSUFBSSxDQUFDLFFBQVEsSUFBSSxJQUFJLENBQUMsT0FBTywwQkFBa0IsQ0FBQztZQUNqRCxDQUFDLElBQUksQ0FBQyxNQUFNLElBQUksSUFBSSxDQUFDLE9BQU8sd0JBQWdCLENBQUM7WUFDN0MsQ0FBQyxJQUFJLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxPQUFPLDBCQUFpQixDQUFDLENBQy9DLENBQUE7SUFDRixDQUFDO0NBQ0Q7QUFFRDs7O0dBR0c7QUFDSCxNQUFNLE9BQU8sYUFBYTtJQUN6QixZQUNpQixPQUFnQixFQUNoQixRQUFpQixFQUNqQixNQUFlLEVBQ2YsT0FBZ0IsRUFDaEIsUUFBa0I7UUFKbEIsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUFTO1FBQ2pCLFdBQU0sR0FBTixNQUFNLENBQVM7UUFDZixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLGFBQVEsR0FBUixRQUFRLENBQVU7SUFDaEMsQ0FBQztJQUVHLE1BQU0sQ0FBQyxLQUFZO1FBQ3pCLE9BQU8sQ0FDTixLQUFLLFlBQVksYUFBYTtZQUM5QixJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxPQUFPO1lBQzlCLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVE7WUFDaEMsSUFBSSxDQUFDLE1BQU0sS0FBSyxLQUFLLENBQUMsTUFBTTtZQUM1QixJQUFJLENBQUMsT0FBTyxLQUFLLEtBQUssQ0FBQyxPQUFPO1lBQzlCLElBQUksQ0FBQyxRQUFRLEtBQUssS0FBSyxDQUFDLFFBQVEsQ0FDaEMsQ0FBQTtJQUNGLENBQUM7SUFFTSxXQUFXO1FBQ2pCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ3JDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ3ZDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ25DLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO1FBQ3JDLE9BQU8sSUFBSSxJQUFJLEdBQUcsS0FBSyxHQUFHLEdBQUcsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFBO0lBQ3ZELENBQUM7SUFFRDs7T0FFRztJQUNJLHVCQUF1QjtRQUM3QixPQUFPLENBQ04sQ0FBQyxJQUFJLENBQUMsT0FBTztZQUNaLENBQUMsSUFBSSxDQUFDLFFBQVEsbUNBQXlCLElBQUksSUFBSSxDQUFDLFFBQVEsb0NBQTBCLENBQUMsQ0FBQztZQUNyRixDQUFDLElBQUksQ0FBQyxRQUFRO2dCQUNiLENBQUMsSUFBSSxDQUFDLFFBQVEsaUNBQXVCLElBQUksSUFBSSxDQUFDLFFBQVEsa0NBQXdCLENBQUMsQ0FBQztZQUNqRixDQUFDLElBQUksQ0FBQyxNQUFNO2dCQUNYLENBQUMsSUFBSSxDQUFDLFFBQVEsK0JBQXFCLElBQUksSUFBSSxDQUFDLFFBQVEsZ0NBQXNCLENBQUMsQ0FBQztZQUM3RSxDQUFDLElBQUksQ0FBQyxPQUFPO2dCQUNaLENBQUMsSUFBSSxDQUFDLFFBQVEsZ0NBQXNCLElBQUksSUFBSSxDQUFDLFFBQVEsaUNBQXVCLENBQUMsQ0FBQyxDQUMvRSxDQUFBO0lBQ0YsQ0FBQztDQUNEO0FBSUQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sVUFBVTtJQUd0QixZQUFZLE1BQWU7UUFDMUIsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQTtJQUNyQixDQUFDO0lBRU0sV0FBVztRQUNqQixJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hELElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNiLE1BQU0sSUFBSSxHQUFHLENBQUE7WUFDZCxDQUFDO1lBQ0QsTUFBTSxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDdkMsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVNLE1BQU0sQ0FBQyxLQUF3QjtRQUNyQyxJQUFJLEtBQUssS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNwQixPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxLQUFLLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEQsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUM3QyxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYTtJQUN6QixZQUNpQixPQUFnQixFQUNoQixRQUFpQixFQUNqQixNQUFlLEVBQ2YsT0FBZ0IsRUFDaEIsUUFBdUIsRUFDdkIsWUFBMkI7UUFMM0IsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixhQUFRLEdBQVIsUUFBUSxDQUFTO1FBQ2pCLFdBQU0sR0FBTixNQUFNLENBQVM7UUFDZixZQUFPLEdBQVAsT0FBTyxDQUFTO1FBQ2hCLGFBQVEsR0FBUixRQUFRLENBQWU7UUFDdkIsaUJBQVksR0FBWixZQUFZLENBQWU7SUFDekMsQ0FBQztDQUNKO0FBSUQ7O0dBRUc7QUFDSCxNQUFNLE9BQWdCLGtCQUFrQjtDQTRDdkMifQ==