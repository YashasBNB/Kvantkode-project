/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeUtils, ScanCodeUtils } from './keyCodes.js';
import { KeyCodeChord, ScanCodeChord, Keybinding } from './keybindings.js';
export class KeybindingParser {
    static _readModifiers(input) {
        input = input.toLowerCase().trim();
        let ctrl = false;
        let shift = false;
        let alt = false;
        let meta = false;
        let matchedModifier;
        do {
            matchedModifier = false;
            if (/^ctrl(\+|\-)/.test(input)) {
                ctrl = true;
                input = input.substr('ctrl-'.length);
                matchedModifier = true;
            }
            if (/^shift(\+|\-)/.test(input)) {
                shift = true;
                input = input.substr('shift-'.length);
                matchedModifier = true;
            }
            if (/^alt(\+|\-)/.test(input)) {
                alt = true;
                input = input.substr('alt-'.length);
                matchedModifier = true;
            }
            if (/^meta(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('meta-'.length);
                matchedModifier = true;
            }
            if (/^win(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('win-'.length);
                matchedModifier = true;
            }
            if (/^cmd(\+|\-)/.test(input)) {
                meta = true;
                input = input.substr('cmd-'.length);
                matchedModifier = true;
            }
        } while (matchedModifier);
        let key;
        const firstSpaceIdx = input.indexOf(' ');
        if (firstSpaceIdx > 0) {
            key = input.substring(0, firstSpaceIdx);
            input = input.substring(firstSpaceIdx);
        }
        else {
            key = input;
            input = '';
        }
        return {
            remains: input,
            ctrl,
            shift,
            alt,
            meta,
            key,
        };
    }
    static parseChord(input) {
        const mods = this._readModifiers(input);
        const scanCodeMatch = mods.key.match(/^\[([^\]]+)\]$/);
        if (scanCodeMatch) {
            const strScanCode = scanCodeMatch[1];
            const scanCode = ScanCodeUtils.lowerCaseToEnum(strScanCode);
            return [new ScanCodeChord(mods.ctrl, mods.shift, mods.alt, mods.meta, scanCode), mods.remains];
        }
        const keyCode = KeyCodeUtils.fromUserSettings(mods.key);
        return [new KeyCodeChord(mods.ctrl, mods.shift, mods.alt, mods.meta, keyCode), mods.remains];
    }
    static parseKeybinding(input) {
        if (!input) {
            return null;
        }
        const chords = [];
        let chord;
        while (input.length > 0) {
            ;
            [chord, input] = this.parseChord(input);
            chords.push(chord);
        }
        return chords.length > 0 ? new Keybinding(chords) : null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ1BhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL2tleWJpbmRpbmdQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDM0QsT0FBTyxFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFTLE1BQU0sa0JBQWtCLENBQUE7QUFFakYsTUFBTSxPQUFPLGdCQUFnQjtJQUNwQixNQUFNLENBQUMsY0FBYyxDQUFDLEtBQWE7UUFDMUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUVsQyxJQUFJLElBQUksR0FBRyxLQUFLLENBQUE7UUFDaEIsSUFBSSxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQ2pCLElBQUksR0FBRyxHQUFHLEtBQUssQ0FBQTtRQUNmLElBQUksSUFBSSxHQUFHLEtBQUssQ0FBQTtRQUVoQixJQUFJLGVBQXdCLENBQUE7UUFFNUIsR0FBRyxDQUFDO1lBQ0gsZUFBZSxHQUFHLEtBQUssQ0FBQTtZQUN2QixJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDWCxLQUFLLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7Z0JBQ3BDLGVBQWUsR0FBRyxJQUFJLENBQUE7WUFDdkIsQ0FBQztZQUNELElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxLQUFLLEdBQUcsSUFBSSxDQUFBO2dCQUNaLEtBQUssR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxN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