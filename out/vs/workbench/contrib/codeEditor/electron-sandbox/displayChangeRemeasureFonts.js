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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { FontMeasurements } from '../../../../editor/browser/config/fontMeasurements.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
let DisplayChangeRemeasureFonts = class DisplayChangeRemeasureFonts extends Disposable {
    constructor(nativeHostService) {
        super();
        this._register(nativeHostService.onDidChangeDisplay(() => {
            FontMeasurements.clearAllFontInfos();
        }));
    }
};
DisplayChangeRemeasureFonts = __decorate([
    __param(0, INativeHostService)
], DisplayChangeRemeasureFonts);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(DisplayChangeRemeasureFonts, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzcGxheUNoYW5nZVJlbWVhc3VyZUZvbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9lbGVjdHJvbi1zYW5kYm94L2Rpc3BsYXlDaGFuZ2VSZW1lYXN1cmVGb250cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBR2pDLE1BQU0sa0NBQWtDLENBQUE7QUFHekMsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBQ25ELFlBQWdDLGlCQUFxQztRQUNwRSxLQUFLLEVBQUUsQ0FBQTtRQUVQLElBQUksQ0FBQyxTQUFTLENBQ2IsaUJBQWlCLENBQUMsa0JBQWtCLENBQUMsR0FBRyxFQUFFO1lBQ3pDLGdCQUFnQixDQUFDLGlCQUFpQixFQUFFLENBQUE7UUFDckMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBVkssMkJBQTJCO0lBQ25CLFdBQUEsa0JBQWtCLENBQUE7R0FEMUIsMkJBQTJCLENBVWhDO0FBRUQsUUFBUSxDQUFDLEVBQUUsQ0FDVixtQkFBbUIsQ0FBQyxTQUFTLENBQzdCLENBQUMsNkJBQTZCLENBQUMsMkJBQTJCLG9DQUE0QixDQUFBIn0=