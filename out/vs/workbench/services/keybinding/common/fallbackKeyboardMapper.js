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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmFsbGJhY2tLZXlib2FyZE1hcHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi9mYWxsYmFja0tleWJvYXJkTWFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFFTixZQUFZLEVBQ1osVUFBVSxHQUNWLE1BQU0sd0NBQXdDLENBQUE7QUFHL0MsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFHakg7O0dBRUc7QUFDSCxNQUFNLE9BQU8sc0JBQXNCO0lBQ2xDLFlBQ2tCLGtCQUEyQixFQUMzQixHQUFvQjtRQURwQix1QkFBa0IsR0FBbEIsa0JBQWtCLENBQVM7UUFDM0IsUUFBRyxHQUFILEdBQUcsQ0FBaUI7SUFDbkMsQ0FBQztJQUVHLGFBQWE7UUFDbkIsT0FBTywrQ0FBK0MsQ0FBQTtJQUN2RCxDQUFDO0lBRU0sb0JBQW9CLENBQUMsYUFBNkI7UUFDeEQsTUFBTSxPQUFPLEdBQUcsYUFBYSxDQUFDLE9BQU8sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDL0YsTUFBTSxNQUFNLEdBQUcsYUFBYSxDQUFDLE1BQU0sSUFBSSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsSUFBSSxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDN0YsTUFBTSxLQUFLLEdBQUcsSUFBSSxZQUFZLENBQzdCLE9BQU8sRUFDUCxhQUFhLENBQUMsUUFBUSxFQUN0QixNQUFNLEVBQ04sYUFBYSxDQUFDLE9BQU8sRUFDckIsYUFBYSxDQUFDLE9BQU8sQ0FDckIsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUM5RCxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNqQixDQUFDO0lBRU0saUJBQWlCLENBQUMsVUFBc0I7UUFDOUMsT0FBTywwQkFBMEIsQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzFFLENBQUM7Q0FDRCJ9