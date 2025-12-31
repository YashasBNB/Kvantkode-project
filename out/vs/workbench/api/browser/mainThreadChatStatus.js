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
import { Disposable } from '../../../base/common/lifecycle.js';
import { IChatStatusItemService } from '../../contrib/chat/browser/chatStatusItemService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { MainContext, } from '../common/extHost.protocol.js';
let MainThreadChatStatus = class MainThreadChatStatus extends Disposable {
    constructor(_extHostContext, _chatStatusItemService) {
        super();
        this._chatStatusItemService = _chatStatusItemService;
    }
    $setEntry(id, entry) {
        this._chatStatusItemService.setOrUpdateEntry({
            id,
            label: entry.title,
            description: entry.description,
            detail: entry.detail,
        });
    }
    $disposeEntry(id) {
        this._chatStatusItemService.deleteEntry(id);
    }
};
MainThreadChatStatus = __decorate([
    extHostNamedCustomer(MainContext.MainThreadChatStatus),
    __param(1, IChatStatusItemService)
], MainThreadChatStatus);
export { MainThreadChatStatus };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2Jyb3dzZXIvbWFpblRocmVhZENoYXRTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzVGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sV0FBVyxHQUVYLE1BQU0sK0JBQStCLENBQUE7QUFHL0IsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxVQUFVO0lBQ25ELFlBQ0MsZUFBZ0MsRUFDUyxzQkFBOEM7UUFFdkYsS0FBSyxFQUFFLENBQUE7UUFGa0MsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtJQUd4RixDQUFDO0lBRUQsU0FBUyxDQUFDLEVBQVUsRUFBRSxLQUF3QjtRQUM3QyxJQUFJLENBQUMsc0JBQXNCLENBQUMsZ0JBQWdCLENBQUM7WUFDNUMsRUFBRTtZQUNGLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7WUFDOUIsTUFBTSxFQUFFLEtBQUssQ0FBQyxNQUFNO1NBQ3BCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxhQUFhLENBQUMsRUFBVTtRQUN2QixJQUFJLENBQUMsc0JBQXNCLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRCxDQUFBO0FBcEJZLG9CQUFvQjtJQURoQyxvQkFBb0IsQ0FBQyxXQUFXLENBQUMsb0JBQW9CLENBQUM7SUFJcEQsV0FBQSxzQkFBc0IsQ0FBQTtHQUhaLG9CQUFvQixDQW9CaEMifQ==