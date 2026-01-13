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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENoYXRTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQ2hhdFN0YXR1cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDNUYsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFFTixXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUcvQixJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFVBQVU7SUFDbkQsWUFDQyxlQUFnQyxFQUNTLHNCQUE4QztRQUV2RixLQUFLLEVBQUUsQ0FBQTtRQUZrQywyQkFBc0IsR0FBdEIsc0JBQXNCLENBQXdCO0lBR3hGLENBQUM7SUFFRCxTQUFTLENBQUMsRUFBVSxFQUFFLEtBQXdCO1FBQzdDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxnQkFBZ0IsQ0FBQztZQUM1QyxFQUFFO1lBQ0YsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO1lBQ2xCLFdBQVcsRUFBRSxLQUFLLENBQUMsV0FBVztZQUM5QixNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07U0FDcEIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELGFBQWEsQ0FBQyxFQUFVO1FBQ3ZCLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNELENBQUE7QUFwQlksb0JBQW9CO0lBRGhDLG9CQUFvQixDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsQ0FBQztJQUlwRCxXQUFBLHNCQUFzQixDQUFBO0dBSFosb0JBQW9CLENBb0JoQyJ9