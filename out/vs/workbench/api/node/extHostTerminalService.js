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
import { generateUuid } from '../../../base/common/uuid.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { BaseExtHostTerminalService, ExtHostTerminal, } from '../common/extHostTerminalService.js';
import { IExtHostCommands } from '../common/extHostCommands.js';
let ExtHostTerminalService = class ExtHostTerminalService extends BaseExtHostTerminalService {
    constructor(extHostCommands, extHostRpc) {
        super(true, extHostCommands, extHostRpc);
    }
    createTerminal(name, shellPath, shellArgs) {
        return this.createTerminalFromOptions({ name, shellPath, shellArgs });
    }
    createTerminalFromOptions(options, internalOptions) {
        const terminal = new ExtHostTerminal(this._proxy, generateUuid(), options, options.name);
        this._terminals.push(terminal);
        terminal.create(options, this._serializeParentTerminal(options, internalOptions));
        return terminal.value;
    }
};
ExtHostTerminalService = __decorate([
    __param(0, IExtHostCommands),
    __param(1, IExtHostRpcService)
], ExtHostTerminalService);
export { ExtHostTerminalService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFRlcm1pbmFsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0VGVybWluYWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLGVBQWUsR0FFZixNQUFNLHFDQUFxQyxDQUFBO0FBRTVDLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXhELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXVCLFNBQVEsMEJBQTBCO0lBQ3JFLFlBQ21CLGVBQWlDLEVBQy9CLFVBQThCO1FBRWxELEtBQUssQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7SUFFTSxjQUFjLENBQ3BCLElBQWEsRUFDYixTQUFrQixFQUNsQixTQUE2QjtRQUU3QixPQUFPLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUN0RSxDQUFDO0lBRU0seUJBQXlCLENBQy9CLE9BQStCLEVBQy9CLGVBQTBDO1FBRTFDLE1BQU0sUUFBUSxHQUFHLElBQUksZUFBZSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsWUFBWSxFQUFFLEVBQUUsT0FBTyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN4RixJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5QixRQUFRLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsd0JBQXdCLENBQUMsT0FBTyxFQUFFLGVBQWUsQ0FBQyxDQUFDLENBQUE7UUFDakYsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO0lBQ3RCLENBQUM7Q0FDRCxDQUFBO0FBekJZLHNCQUFzQjtJQUVoQyxXQUFBLGdCQUFnQixDQUFBO0lBQ2hCLFdBQUEsa0JBQWtCLENBQUE7R0FIUixzQkFBc0IsQ0F5QmxDIn0=