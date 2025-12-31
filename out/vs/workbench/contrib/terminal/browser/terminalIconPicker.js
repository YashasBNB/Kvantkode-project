/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Dimension, getActiveDocument } from '../../../../base/browser/dom.js';
import { codiconsLibrary } from '../../../../base/common/codiconsLibrary.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getIconRegistry, } from '../../../../platform/theme/common/iconRegistry.js';
import { WorkbenchIconSelectBox } from '../../../services/userDataProfile/browser/iconSelectBox.js';
const icons = new Lazy(() => {
    const iconDefinitions = getIconRegistry().getIcons();
    const includedChars = new Set();
    const dedupedIcons = iconDefinitions.filter((e) => {
        if (e.id === codiconsLibrary.blank.id) {
            return false;
        }
        if (!('fontCharacter' in e.defaults)) {
            return false;
        }
        if (includedChars.has(e.defaults.fontCharacter)) {
            return false;
        }
        includedChars.add(e.defaults.fontCharacter);
        return true;
    });
    return dedupedIcons;
});
let TerminalIconPicker = class TerminalIconPicker extends Disposable {
    constructor(instantiationService, _hoverService) {
        super();
        this._hoverService = _hoverService;
        this._iconSelectBox = instantiationService.createInstance(WorkbenchIconSelectBox, {
            icons: icons.value,
            inputBoxStyles: defaultInputBoxStyles,
            showIconInfo: true,
        });
    }
    async pickIcons() {
        const dimension = new Dimension(486, 260);
        return new Promise((resolve) => {
            this._register(this._iconSelectBox.onDidSelect((e) => {
                resolve(e);
                this._iconSelectBox.dispose();
            }));
            this._iconSelectBox.clearInput();
            const hoverWidget = this._hoverService.showInstantHover({
                content: this._iconSelectBox.domNode,
                target: getActiveDocument().body,
                position: {
                    hoverPosition: 2 /* HoverPosition.BELOW */,
                },
                persistence: {
                    sticky: true,
                },
                appearance: {
                    showPointer: true,
                },
            }, true);
            if (hoverWidget) {
                this._register(hoverWidget);
            }
            this._iconSelectBox.layout(dimension);
            this._iconSelectBox.focus();
        });
    }
};
TerminalIconPicker = __decorate([
    __param(0, IInstantiationService),
    __param(1, IHoverService)
], TerminalIconPicker);
export { TerminalIconPicker };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJY29uUGlja2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEljb25QaWNrZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTlFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMzRixPQUFPLEVBQ04sZUFBZSxHQUVmLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbkcsTUFBTSxLQUFLLEdBQUcsSUFBSSxJQUFJLENBQXFCLEdBQUcsRUFBRTtJQUMvQyxNQUFNLGVBQWUsR0FBRyxlQUFlLEVBQUUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtJQUNwRCxNQUFNLGFBQWEsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFBO0lBQ3ZDLE1BQU0sWUFBWSxHQUFHLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtRQUNqRCxJQUFJLENBQUMsQ0FBQyxFQUFFLEtBQUssZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxlQUFlLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDdEMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztZQUNqRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDM0MsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDLENBQUMsQ0FBQTtJQUNGLE9BQU8sWUFBWSxDQUFBO0FBQ3BCLENBQUMsQ0FBQyxDQUFBO0FBRUssSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBR2pELFlBQ3dCLG9CQUEyQyxFQUNsQyxhQUE0QjtRQUU1RCxLQUFLLEVBQUUsQ0FBQTtRQUZ5QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUk1RCxJQUFJLENBQUMsY0FBYyxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRTtZQUNqRixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsY0FBYyxFQUFFLHFCQUFxQjtZQUNyQyxZQUFZLEVBQUUsSUFBSTtTQUNsQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLFNBQVM7UUFDZCxNQUFNLFNBQVMsR0FBRyxJQUFJLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDekMsT0FBTyxJQUFJLE9BQU8sQ0FBd0IsQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNyRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ3JDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtnQkFDVixJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQzlCLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQ3REO2dCQUNDLE9BQU8sRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLE9BQU87Z0JBQ3BDLE1BQU0sRUFBRSxpQkFBaUIsRUFBRSxDQUFDLElBQUk7Z0JBQ2hDLFFBQVEsRUFBRTtvQkFDVCxhQUFhLDZCQUFxQjtpQkFDbEM7Z0JBQ0QsV0FBVyxFQUFFO29CQUNaLE1BQU0sRUFBRSxJQUFJO2lCQUNaO2dCQUNELFVBQVUsRUFBRTtvQkFDWCxXQUFXLEVBQUUsSUFBSTtpQkFDakI7YUFDRCxFQUNELElBQUksQ0FDSixDQUFBO1lBQ0QsSUFBSSxXQUFXLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQTtZQUM1QixDQUFDO1lBQ0QsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDckMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUM1QixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBakRZLGtCQUFrQjtJQUk1QixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsYUFBYSxDQUFBO0dBTEgsa0JBQWtCLENBaUQ5QiJ9