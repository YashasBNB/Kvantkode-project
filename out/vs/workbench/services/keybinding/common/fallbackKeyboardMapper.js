/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { KeyCodeChord, Keybinding, } from '../../../../base/common/keybindings.js';
import { USLayoutResolvedKeybinding } from '../../../../platform/keybinding/common/usLayoutResolvedKeybinding.js';
/**
 * A keyboard mapper to be used when reading the keymap from the OS fails.
 */
export class FallbackKeyboardMapper {
    constructor(_mapAltGrToCtrlAlt, _OS) {
        this._mapAltGrToCtrlAlt = _mapAltGrToCtrlAlt;
        this._OS = _OS;
    }
    dumpDebugInfo() {
        return 'FallbackKeyboardMapper dispatching on keyCode';
    }
    resolveKeyboardEvent(keyboardEvent) {
        const ctrlKey = keyboardEvent.ctrlKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const altKey = keyboardEvent.altKey || (this._mapAltGrToCtrlAlt && keyboardEvent.altGraphKey);
        const chord = new KeyCodeChord(ctrlKey, keyboardEvent.shiftKey, altKey, keyboardEvent.metaKey, keyboardEvent.keyCode);
        const result = this.resolveKeybinding(new Keybinding([chord]));
        return result[0];
    }
    resolveKeybinding(keybinding) {
        return USLayoutResolvedKeybinding.resolveKeybinding(keybinding, this._OS);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFsbGJhY2tLZXlib2FyZE1hcHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvY29tbW9uL2ZhbGxiYWNrS2V5Ym9hcmRNYXBwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLFlBQVksRUFDWixVQUFVLEdBQ1YsTUFBTSx3Q0FBd0MsQ0FBQTtBQUcvQyxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUdqSDs7R0FFRztBQUNILE1BQU0sT0FBTyxzQkFBc0I7SUFDbEMsWUFDa0Isa0JBQTJCLEVBQzNCLEdBQW9CO1FBRHBCLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBUztRQUMzQixRQUFHLEdBQUgsR0FBRyxDQUFpQjtJQUNuQyxDQUFDO0lBRUcsYUFBYTtRQUNuQixPQUFPLCtDQUErQyxDQUFBO0lBQ3ZELENBQUM7SUFFTSxvQkFBb0IsQ0FBQyxhQUE2QjtRQUN4RCxNQUFNLE9BQU8sR0FBRyxhQUFhLENBQUMsT0FBTyxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUMvRixNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQixJQUFJLGFBQWEsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUM3RixNQUFNLEtBQUssR0FBRyxJQUFJLFlBQVksQ0FDN0IsT0FBTyxFQUNQLGFBQWEsQ0FBQyxRQUFRLEVBQ3RCLE1BQU0sRUFDTixhQUFhLENBQUMsT0FBTyxFQUNyQixhQUFhLENBQUMsT0FBTyxDQUNyQixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzlELE9BQU8sTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2pCLENBQUM7SUFFTSxpQkFBaUIsQ0FBQyxVQUFzQjtRQUM5QyxPQUFPLDBCQUEwQixDQUFDLGlCQUFpQixDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDMUUsQ0FBQztDQUNEIn0=