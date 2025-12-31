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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEFjY2Vzc2liaWxpdHlBbm5vdW5jZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vcmVwbEFjY2Vzc2liaWxpdHlBbm5vdW5jZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBRW5DLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTthQUNsRCxPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXFDO0lBQzlDLFlBQ2dCLFlBQTJCLEVBQ25CLG9CQUEyQyxFQUNyRCxVQUF1QjtRQUVwQyxLQUFLLEVBQUUsQ0FBQTtRQUNQLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUM3QyxJQUFJLENBQUMsU0FBUyxDQUNiLFNBQVMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQ3ZDLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDZCxPQUFNO1lBQ1AsQ0FBQztZQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUU7Z0JBQzNDLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxDQUFDLG9CQUFvQixJQUFJLE9BQU8sQ0FBQyxFQUFFLENBQUM7b0JBQ3BELGtEQUFrRDtvQkFDbEQsT0FBTTtnQkFDUCxDQUFDO2dCQUNELE1BQU0sS0FBSyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtnQkFDaEMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO2dCQUNsQyxVQUFVLENBQUMsS0FBSyxDQUNmLG9EQUFvRCxFQUNwRCxPQUFPLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxHQUFHLEtBQUssQ0FDekMsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQzs7QUE5QlcsMEJBQTBCO0lBR3BDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLFdBQVcsQ0FBQTtHQUxELDBCQUEwQixDQStCdEMifQ==