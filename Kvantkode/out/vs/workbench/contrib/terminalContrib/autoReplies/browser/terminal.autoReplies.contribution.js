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
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerWorkbenchContribution2, } from '../../../../common/contributions.js';
import { ITerminalInstanceService } from '../../../terminal/browser/terminal.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
// #region Workbench contributions
let TerminalAutoRepliesContribution = class TerminalAutoRepliesContribution extends Disposable {
    static { this.ID = 'terminalAutoReplies'; }
    constructor(_configurationService, terminalInstanceService) {
        super();
        this._configurationService = _configurationService;
        for (const backend of terminalInstanceService.getRegisteredBackends()) {
            this._installListenersOnBackend(backend);
        }
        this._register(terminalInstanceService.onDidRegisterBackend(async (e) => this._installListenersOnBackend(e)));
    }
    _installListenersOnBackend(backend) {
        // Listen for config changes
        const initialConfig = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
        for (const match of Object.keys(initialConfig.autoReplies)) {
            // Ensure the reply is valid
            const reply = initialConfig.autoReplies[match];
            if (reply) {
                backend.installAutoReply(match, reply);
            }
        }
        this._register(this._configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration("terminal.integrated.autoReplies" /* TerminalAutoRepliesSettingId.AutoReplies */)) {
                backend.uninstallAllAutoReplies();
                const config = this._configurationService.getValue(TERMINAL_CONFIG_SECTION);
                for (const match of Object.keys(config.autoReplies)) {
                    // Ensure the reply is valid
                    const reply = config.autoReplies[match];
                    if (reply) {
                        backend.installAutoReply(match, reply);
                    }
                }
            }
        }));
    }
};
TerminalAutoRepliesContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, ITerminalInstanceService)
], TerminalAutoRepliesContribution);
export { TerminalAutoRepliesContribution };
registerWorkbenchContribution2(TerminalAutoRepliesContribution.ID, TerminalAutoRepliesContribution, 3 /* WorkbenchPhase.AfterRestored */);
// #endregion Contributions
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYXV0b1JlcGxpZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYXV0b1JlcGxpZXMvYnJvd3Nlci90ZXJtaW5hbC5hdXRvUmVwbGllcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBRXJHLE9BQU8sRUFDTiw4QkFBOEIsR0FHOUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQU05RSxrQ0FBa0M7QUFFM0IsSUFBTSwrQkFBK0IsR0FBckMsTUFBTSwrQkFBZ0MsU0FBUSxVQUFVO2FBQ3ZELE9BQUUsR0FBRyxxQkFBcUIsQUFBeEIsQ0FBd0I7SUFFakMsWUFDeUMscUJBQTRDLEVBQzFELHVCQUFpRDtRQUUzRSxLQUFLLEVBQUUsQ0FBQTtRQUhpQywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBS3BGLEtBQUssTUFBTSxPQUFPLElBQUksdUJBQXVCLENBQUMscUJBQXFCLEVBQUUsRUFBRSxDQUFDO1lBQ3ZFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FDYix1QkFBdUIsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDN0YsQ0FBQTtJQUNGLENBQUM7SUFFTywwQkFBMEIsQ0FBQyxPQUF5QjtRQUMzRCw0QkFBNEI7UUFDNUIsTUFBTSxhQUFhLEdBQ2xCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQ2xDLHVCQUF1QixDQUN2QixDQUFBO1FBQ0YsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO1lBQzVELDRCQUE0QjtZQUM1QixNQUFNLEtBQUssR0FBRyxhQUFhLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBa0IsQ0FBQTtZQUMvRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDdkMsQ0FBQztRQUNGLENBQUM7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDL0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLGtGQUEwQyxFQUFFLENBQUM7Z0JBQ3RFLE9BQU8sQ0FBQyx1QkFBdUIsRUFBRSxDQUFBO2dCQUNqQyxNQUFNLE1BQU0sR0FDWCxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUNsQyx1QkFBdUIsQ0FDdkIsQ0FBQTtnQkFDRixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUM7b0JBQ3JELDRCQUE0QjtvQkFDNUIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQWtCLENBQUE7b0JBQ3hELElBQUksS0FBSyxFQUFFLENBQUM7d0JBQ1gsT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtvQkFDdkMsQ0FBQztnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDOztBQWpEVywrQkFBK0I7SUFJekMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHdCQUF3QixDQUFBO0dBTGQsK0JBQStCLENBa0QzQzs7QUFFRCw4QkFBOEIsQ0FDN0IsK0JBQStCLENBQUMsRUFBRSxFQUNsQywrQkFBK0IsdUNBRS9CLENBQUE7QUFFRCwyQkFBMkIifQ==