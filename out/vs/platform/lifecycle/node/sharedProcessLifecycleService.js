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
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
export const ISharedProcessLifecycleService = createDecorator('sharedProcessLifecycleService');
let SharedProcessLifecycleService = class SharedProcessLifecycleService extends Disposable {
    constructor(logService) {
        super();
        this.logService = logService;
        this._onWillShutdown = this._register(new Emitter());
        this.onWillShutdown = this._onWillShutdown.event;
    }
    fireOnWillShutdown() {
        this.logService.trace('Lifecycle#onWillShutdown.fire()');
        this._onWillShutdown.fire();
    }
};
SharedProcessLifecycleService = __decorate([
    __param(0, ILogService)
], SharedProcessLifecycleService);
export { SharedProcessLifecycleService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2hhcmVkUHJvY2Vzc0xpZmVjeWNsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9saWZlY3ljbGUvbm9kZS9zaGFyZWRQcm9jZXNzTGlmZWN5Y2xlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFckQsTUFBTSxDQUFDLE1BQU0sOEJBQThCLEdBQUcsZUFBZSxDQUM1RCwrQkFBK0IsQ0FDL0IsQ0FBQTtBQVdNLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQ1osU0FBUSxVQUFVO0lBUWxCLFlBQXlCLFVBQXdDO1FBQ2hFLEtBQUssRUFBRSxDQUFBO1FBRGtDLGVBQVUsR0FBVixVQUFVLENBQWE7UUFIaEQsb0JBQWUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUM3RCxtQkFBYyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFBO0lBSXBELENBQUM7SUFFRCxrQkFBa0I7UUFDakIsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsaUNBQWlDLENBQUMsQ0FBQTtRQUV4RCxJQUFJLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQzVCLENBQUM7Q0FDRCxDQUFBO0FBbEJZLDZCQUE2QjtJQVM1QixXQUFBLFdBQVcsQ0FBQTtHQVRaLDZCQUE2QixDQWtCekMifQ==