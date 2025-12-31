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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuYXV0b1JlcGxpZXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2F1dG9SZXBsaWVzL2Jyb3dzZXIvdGVybWluYWwuYXV0b1JlcGxpZXMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQ04sOEJBQThCLEdBRzlCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDaEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFNOUUsa0NBQWtDO0FBRTNCLElBQU0sK0JBQStCLEdBQXJDLE1BQU0sK0JBQWdDLFNBQVEsVUFBVTthQUN2RCxPQUFFLEdBQUcscUJBQXFCLEFBQXhCLENBQXdCO0lBRWpDLFlBQ3lDLHFCQUE0QyxFQUMxRCx1QkFBaUQ7UUFFM0UsS0FBSyxFQUFFLENBQUE7UUFIaUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUtwRixLQUFLLE1BQU0sT0FBTyxJQUFJLHVCQUF1QixDQUFDLHFCQUFxQixFQUFFLEVBQUUsQ0FBQztZQUN2RSxJQUFJLENBQUMsMEJBQTBCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDekMsQ0FBQztRQUNELElBQUksQ0FBQyxTQUFTLENBQ2IsdUJBQXVCLENBQUMsb0JBQW9CLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLDBCQUEwQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQzdGLENBQUE7SUFDRixDQUFDO0lBRU8sMEJBQTBCLENBQUMsT0FBeUI7UUFDM0QsNEJBQTRCO1FBQzVCLE1BQU0sYUFBYSxHQUNsQixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUNsQyx1QkFBdUIsQ0FDdkIsQ0FBQTtRQUNGLEtBQUssTUFBTSxLQUFLLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQztZQUM1RCw0QkFBNEI7WUFDNUIsTUFBTSxLQUFLLEdBQUcsYUFBYSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQWtCLENBQUE7WUFDL0QsSUFBSSxLQUFLLEVBQUUsQ0FBQztnQkFDWCxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3ZDLENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQy9ELElBQUksQ0FBQyxDQUFDLG9CQUFvQixrRkFBMEMsRUFBRSxDQUFDO2dCQUN0RSxPQUFPLENBQUMsdUJBQXVCLEVBQUUsQ0FBQTtnQkFDakMsTUFBTSxNQUFNLEdBQ1gsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FDbEMsdUJBQXVCLENBQ3ZCLENBQUE7Z0JBQ0YsS0FBSyxNQUFNLEtBQUssSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDO29CQUNyRCw0QkFBNEI7b0JBQzVCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFrQixDQUFBO29CQUN4RCxJQUFJLEtBQUssRUFBRSxDQUFDO3dCQUNYLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7b0JBQ3ZDLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQzs7QUFqRFcsK0JBQStCO0lBSXpDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSx3QkFBd0IsQ0FBQTtHQUxkLCtCQUErQixDQWtEM0M7O0FBRUQsOEJBQThCLENBQzdCLCtCQUErQixDQUFDLEVBQUUsRUFDbEMsK0JBQStCLHVDQUUvQixDQUFBO0FBRUQsMkJBQTJCIn0=