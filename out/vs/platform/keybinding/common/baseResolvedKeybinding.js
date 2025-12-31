/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from '../../../base/common/errors.js';
import { AriaLabelProvider, ElectronAcceleratorLabelProvider, UILabelProvider, UserSettingsLabelProvider, } from '../../../base/common/keybindingLabels.js';
import { ResolvedKeybinding, ResolvedChord, } from '../../../base/common/keybindings.js';
export class BaseResolvedKeybinding extends ResolvedKeybinding {
    constructor(os, chords) {
        super();
        if (chords.length === 0) {
            throw illegalArgument(`chords`);
        }
        this._os = os;
        this._chords = chords;
    }
    getLabel() {
        return UILabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getLabel(keybinding));
    }
    getAriaLabel() {
        return AriaLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getAriaLabel(keybinding));
    }
    getElectronAccelerator() {
        if (this._chords.length > 1) {
            // [Electron Accelerators] Electron cannot handle chords
            return null;
        }
        if (this._chords[0].isDuplicateModifierCase()) {
            // [Electron Accelerators] Electron cannot handle modifier only keybindings
            // e.g. "shift shift"
            return null;
        }
        return ElectronAcceleratorLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getElectronAccelerator(keybinding));
    }
    getUserSettingsLabel() {
        return UserSettingsLabelProvider.toLabel(this._os, this._chords, (keybinding) => this._getUserSettingsLabel(keybinding));
    }
    isWYSIWYG() {
        return this._chords.every((keybinding) => this._isWYSIWYG(keybinding));
    }
    hasMultipleChords() {
        return this._chords.length > 1;
    }
    getChords() {
        return this._chords.map((keybinding) => this._getChord(keybinding));
    }
    _getChord(keybinding) {
        return new ResolvedChord(keybinding.ctrlKey, keybinding.shiftKey, keybinding.altKey, keybinding.metaKey, this._getLabel(keybinding), this._getAriaLabel(keybinding));
    }
    getDispatchChords() {
        return this._chords.map((keybinding) => this._getChordDispatch(keybinding));
    }
    getSingleModifierDispatchChords() {
        return this._chords.map((keybinding) => this._getSingleModifierChordDispatch(keybinding));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVJlc29sdmVkS2V5YmluZGluZy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJpbmRpbmcvY29tbW9uL2Jhc2VSZXNvbHZlZEtleWJpbmRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2hFLE9BQU8sRUFDTixpQkFBaUIsRUFDakIsZ0NBQWdDLEVBQ2hDLGVBQWUsRUFDZix5QkFBeUIsR0FDekIsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBR04sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHFDQUFxQyxDQUFBO0FBRzVDLE1BQU0sT0FBZ0Isc0JBQXdDLFNBQVEsa0JBQWtCO0lBSXZGLFlBQVksRUFBbUIsRUFBRSxNQUFvQjtRQUNwRCxLQUFLLEVBQUUsQ0FBQTtRQUNQLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6QixNQUFNLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoQyxDQUFDO1FBQ0QsSUFBSSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUE7UUFDYixJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtJQUN0QixDQUFDO0lBRU0sUUFBUTtRQUNkLE9BQU8sZUFBZSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUNyRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUMxQixDQUFBO0lBQ0YsQ0FBQztJQUVNLFlBQVk7UUFDbEIsT0FBTyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDdkUsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUM3Qix3REFBd0Q7WUFDeEQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLHVCQUF1QixFQUFFLEVBQUUsQ0FBQztZQUMvQywyRUFBMkU7WUFDM0UscUJBQXFCO1lBQ3JCLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQztRQUNELE9BQU8sZ0NBQWdDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQ3RGLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxVQUFVLENBQUMsQ0FDeEMsQ0FBQTtJQUNGLENBQUM7SUFFTSxvQkFBb0I7UUFDMUIsT0FBTyx5QkFBeUIsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FDL0UsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFVBQVUsQ0FBQyxDQUN0QyxDQUFBO0lBQ0YsQ0FBQztJQUVNLFNBQVM7UUFDZixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDdkUsQ0FBQztJQUVNLGlCQUFpQjtRQUN2QixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtJQUMvQixDQUFDO0lBRU0sU0FBUztRQUNmLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRU8sU0FBUyxDQUFDLFVBQWE7UUFDOUIsT0FBTyxJQUFJLGFBQWEsQ0FDdkIsVUFBVSxDQUFDLE9BQU8sRUFDbEIsVUFBVSxDQUFDLFFBQVEsRUFDbkIsVUFBVSxDQUFDLE1BQU0sRUFDakIsVUFBVSxDQUFDLE9BQU8sRUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsRUFDMUIsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUMsQ0FDOUIsQ0FBQTtJQUNGLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQztJQUVNLCtCQUErQjtRQUNyQyxPQUFPLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsK0JBQStCLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtJQUMxRixDQUFDO0NBU0QifQ==