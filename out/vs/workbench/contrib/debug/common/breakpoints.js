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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vYnJlYWtwb2ludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLGNBQWMsRUFFZCxrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUd0RCxJQUFNLFdBQVcsR0FBakIsTUFBTSxXQUFXO0lBR3ZCLFlBQ2tCLHNCQUErQyxFQUMzQixpQkFBcUM7UUFEekQsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF5QjtRQUMzQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRTFFLElBQUksQ0FBQyxlQUFlO1lBQ25CLE9BQU8sc0JBQXNCLENBQUMsSUFBSSxLQUFLLFFBQVE7Z0JBQzlDLENBQUMsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLHNCQUFzQixDQUFDLElBQUksQ0FBQztnQkFDekQsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNkLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDWCxPQUFPLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxRQUFRLENBQUE7SUFDNUMsQ0FBQztJQUVELElBQUksT0FBTztRQUNWLE9BQU8sQ0FBQyxJQUFJLENBQUMsZUFBZSxJQUFJLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUE7SUFDakcsQ0FBQztDQUNELENBQUE7QUFwQlksV0FBVztJQUtyQixXQUFBLGtCQUFrQixDQUFBO0dBTFIsV0FBVyxDQW9CdkIifQ==