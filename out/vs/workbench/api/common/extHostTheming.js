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
import { ColorTheme, ColorThemeKind } from './extHostTypes.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { Emitter } from '../../../base/common/event.js';
let ExtHostTheming = class ExtHostTheming {
    constructor(_extHostRpc) {
        this._actual = new ColorTheme(ColorThemeKind.Dark);
        this._onDidChangeActiveColorTheme = new Emitter();
    }
    get activeColorTheme() {
        return this._actual;
    }
    $onColorThemeChange(type) {
        let kind;
        switch (type) {
            case 'light':
                kind = ColorThemeKind.Light;
                break;
            case 'hcDark':
                kind = ColorThemeKind.HighContrast;
                break;
            case 'hcLight':
                kind = ColorThemeKind.HighContrastLight;
                break;
            default:
                kind = ColorThemeKind.Dark;
        }
        this._actual = new ColorTheme(kind);
        this._onDidChangeActiveColorTheme.fire(this._actual);
    }
    get onDidChangeActiveColorTheme() {
        return this._onDidChangeActiveColorTheme.event;
    }
};
ExtHostTheming = __decorate([
    __param(0, IExtHostRpcService)
], ExtHostTheming);
export { ExtHostTheming };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRoZW1pbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0VGhlbWluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGNBQWMsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBRTNELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUV2RCxJQUFNLGNBQWMsR0FBcEIsTUFBTSxjQUFjO0lBTTFCLFlBQWdDLFdBQStCO1FBQzlELElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2xELElBQUksQ0FBQyw0QkFBNEIsR0FBRyxJQUFJLE9BQU8sRUFBYyxDQUFBO0lBQzlELENBQUM7SUFFRCxJQUFXLGdCQUFnQjtRQUMxQixPQUFPLElBQUksQ0FBQyxPQUFPLENBQUE7SUFDcEIsQ0FBQztJQUVELG1CQUFtQixDQUFDLElBQVk7UUFDL0IsSUFBSSxJQUFJLENBQUE7UUFDUixRQUFRLElBQUksRUFBRSxDQUFDO1lBQ2QsS0FBSyxPQUFPO2dCQUNYLElBQUksR0FBRyxjQUFjLENBQUMsS0FBSyxDQUFBO2dCQUMzQixNQUFLO1lBQ04sS0FBSyxRQUFRO2dCQUNaLElBQUksR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFBO2dCQUNsQyxNQUFLO1lBQ04sS0FBSyxTQUFTO2dCQUNiLElBQUksR0FBRyxjQUFjLENBQUMsaUJBQWlCLENBQUE7Z0JBQ3ZDLE1BQUs7WUFDTjtnQkFDQyxJQUFJLEdBQUcsY0FBYyxDQUFDLElBQUksQ0FBQTtRQUM1QixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNuQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsSUFBVywyQkFBMkI7UUFDckMsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO0lBQy9DLENBQUM7Q0FDRCxDQUFBO0FBckNZLGNBQWM7SUFNYixXQUFBLGtCQUFrQixDQUFBO0dBTm5CLGNBQWMsQ0FxQzFCIn0=