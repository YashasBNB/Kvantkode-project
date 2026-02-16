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
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IDebugService } from './debug.js';
let ReplAccessibilityAnnouncer = class ReplAccessibilityAnnouncer extends Disposable {
    static { this.ID = 'debug.replAccessibilityAnnouncer'; }
    constructor(debugService, accessibilityService, logService) {
        super();
        const viewModel = debugService.getViewModel();
        this._register(viewModel.onDidFocusSession((session) => {
            if (!session) {
                return;
            }
            this._register(session.onDidChangeReplElements((element) => {
                if (!element || !('originalExpression' in element)) {
                    // element was removed or hasn't been resolved yet
                    return;
                }
                const value = element.toString();
                accessibilityService.status(value);
                logService.trace('ReplAccessibilityAnnouncer#onDidChangeReplElements', element.originalExpression + ': ' + value);
            }));
        }));
    }
};
ReplAccessibilityAnnouncer = __decorate([
    __param(0, IDebugService),
    __param(1, IAccessibilityService),
    __param(2, ILogService)
], ReplAccessibilityAnnouncer);
export { ReplAccessibilityAnnouncer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlBbm5vdW5jZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9yZXBsQWNjZXNzaWJpbGl0eUFubm91bmNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFFbkMsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO2FBQ2xELE9BQUUsR0FBRyxrQ0FBa0MsQUFBckMsQ0FBcUM7SUFDOUMsWUFDZ0IsWUFBMkIsRUFDbkIsb0JBQTJDLEVBQ3JELFVBQXVCO1FBRXBDLEtBQUssRUFBRSxDQUFBO1FBQ1AsTUFBTSxTQUFTLEdBQUcsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFBO1FBQzdDLElBQUksQ0FBQyxTQUFTLENBQ2IsU0FBUyxDQUFDLGlCQUFpQixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7WUFDdkMsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLE9BQU07WUFDUCxDQUFDO1lBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYixPQUFPLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDM0MsSUFBSSxDQUFDLE9BQU8sSUFBSSxDQUFDLENBQUMsb0JBQW9CLElBQUksT0FBTyxDQUFDLEVBQUUsQ0FBQztvQkFDcEQsa0RBQWtEO29CQUNsRCxPQUFNO2dCQUNQLENBQUM7Z0JBQ0QsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO2dCQUNoQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7Z0JBQ2xDLFVBQVUsQ0FBQyxLQUFLLENBQ2Ysb0RBQW9ELEVBQ3BELE9BQU8sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLEdBQUcsS0FBSyxDQUN6QyxDQUFBO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDOztBQTlCVywwQkFBMEI7SUFHcEMsV0FBQSxhQUFhLENBQUE7SUFDYixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsV0FBVyxDQUFBO0dBTEQsMEJBQTBCLENBK0J0QyJ9