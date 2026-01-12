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
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
let Breakpoints = class Breakpoints {
    constructor(breakpointContribution, contextKeyService) {
        this.breakpointContribution = breakpointContribution;
        this.contextKeyService = contextKeyService;
        this.breakpointsWhen =
            typeof breakpointContribution.when === 'string'
                ? ContextKeyExpr.deserialize(breakpointContribution.when)
                : undefined;
    }
    get language() {
        return this.breakpointContribution.language;
    }
    get enabled() {
        return !this.breakpointsWhen || this.contextKeyService.contextMatchesRules(this.breakpointsWhen);
    }
};
Breakpoints = __decorate([
    __param(1, IContextKeyService)
], Breakpoints);
export { Breakpoints };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9icmVha3BvaW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBR3RELElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVc7SUFHdkIsWUFDa0Isc0JBQStDLEVBQzNCLGlCQUFxQztRQUR6RCwyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXlCO1FBQzNCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFFMUUsSUFBSSxDQUFDLGVBQWU7WUFDbkIsT0FBTyxzQkFBc0IsQ0FBQyxJQUFJLEtBQUssUUFBUTtnQkFDOUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDO2dCQUN6RCxDQUFDLENBQUMsU0FBUyxDQUFBO0lBQ2QsQ0FBQztJQUVELElBQUksUUFBUTtRQUNYLE9BQU8sSUFBSSxDQUFDLHNCQUFzQixDQUFDLFFBQVEsQ0FBQTtJQUM1QyxDQUFDO0lBRUQsSUFBSSxPQUFPO1FBQ1YsT0FBTyxDQUFDLElBQUksQ0FBQyxlQUFlLElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0NBQ0QsQ0FBQTtBQXBCWSxXQUFXO0lBS3JCLFdBQUEsa0JBQWtCLENBQUE7R0FMUixXQUFXLENBb0J2QiJ9