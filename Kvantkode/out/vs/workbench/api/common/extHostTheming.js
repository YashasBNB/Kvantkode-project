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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRoZW1pbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RUaGVtaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsY0FBYyxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFM0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBRXZELElBQU0sY0FBYyxHQUFwQixNQUFNLGNBQWM7SUFNMUIsWUFBZ0MsV0FBK0I7UUFDOUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxDQUFDLDRCQUE0QixHQUFHLElBQUksT0FBTyxFQUFjLENBQUE7SUFDOUQsQ0FBQztJQUVELElBQVcsZ0JBQWdCO1FBQzFCLE9BQU8sSUFBSSxDQUFDLE9BQU8sQ0FBQTtJQUNwQixDQUFDO0lBRUQsbUJBQW1CLENBQUMsSUFBWTtRQUMvQixJQUFJLElBQUksQ0FBQTtRQUNSLFFBQVEsSUFBSSxFQUFFLENBQUM7WUFDZCxLQUFLLE9BQU87Z0JBQ1gsSUFBSSxHQUFHLGNBQWMsQ0FBQyxLQUFLLENBQUE7Z0JBQzNCLE1BQUs7WUFDTixLQUFLLFFBQVE7Z0JBQ1osSUFBSSxHQUFHLGNBQWMsQ0FBQyxZQUFZLENBQUE7Z0JBQ2xDLE1BQUs7WUFDTixLQUFLLFNBQVM7Z0JBQ2IsSUFBSSxHQUFHLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQTtnQkFDdkMsTUFBSztZQUNOO2dCQUNDLElBQUksR0FBRyxjQUFjLENBQUMsSUFBSSxDQUFBO1FBQzVCLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxJQUFXLDJCQUEyQjtRQUNyQyxPQUFPLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxLQUFLLENBQUE7SUFDL0MsQ0FBQztDQUNELENBQUE7QUFyQ1ksY0FBYztJQU1iLFdBQUEsa0JBQWtCLENBQUE7R0FObkIsY0FBYyxDQXFDMUIifQ==