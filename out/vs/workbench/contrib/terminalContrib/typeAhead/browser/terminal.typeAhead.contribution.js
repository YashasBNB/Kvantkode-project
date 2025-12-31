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
var TerminalTypeAheadContribution_1;
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TERMINAL_CONFIG_SECTION } from '../../../terminal/common/terminal.js';
import { TypeAheadAddon } from './terminalTypeAheadAddon.js';
let TerminalTypeAheadContribution = class TerminalTypeAheadContribution extends DisposableStore {
    static { TerminalTypeAheadContribution_1 = this; }
    static { this.ID = 'terminal.typeAhead'; }
    static get(instance) {
        return instance.getContribution(TerminalTypeAheadContribution_1.ID);
    }
    constructor(_ctx, _configurationService, _instantiationService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this.add(toDisposable(() => this._addon?.dispose()));
    }
    xtermReady(xterm) {
        this._loadTypeAheadAddon(xterm.raw);
        this.add(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.localEchoEnabled" /* TerminalTypeAheadSettingId.LocalEchoEnabled */)) {
                this._loadTypeAheadAddon(xterm.raw);
            }
        }));
        // Reset the addon when the terminal launches or relaunches
        this.add(this._ctx.processManager.onProcessReady(() => {
            this._addon?.reset();
        }));
    }
    _loadTypeAheadAddon(xterm) {
        const enabled = this._configurationService.getValue(TERMINAL_CONFIG_SECTION).localEchoEnabled;
        const isRemote = !!this._ctx.processManager.remoteAuthority;
        if (enabled === 'off' || (enabled === 'auto' && !isRemote)) {
            this._addon?.dispose();
            this._addon = undefined;
            return;
        }
        if (this._addon) {
            return;
        }
        if (enabled === 'on' || (enabled === 'auto' && isRemote)) {
            this._addon = this._instantiationService.createInstance(TypeAheadAddon, this._ctx.processManager);
            xterm.loadAddon(this._addon);
        }
    }
};
TerminalTypeAheadContribution = TerminalTypeAheadContribution_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IInstantiationService)
], TerminalTypeAheadContribution);
registerTerminalContribution(TerminalTypeAheadContribution.ID, TerminalTypeAheadContribution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwudHlwZUFoZWFkLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi90eXBlQWhlYWQvYnJvd3Nlci90ZXJtaW5hbC50eXBlQWhlYWQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBTXJHLE9BQU8sRUFDTiw0QkFBNEIsR0FFNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUs5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFNUQsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxlQUFlOzthQUMxQyxPQUFFLEdBQUcsb0JBQW9CLEFBQXZCLENBQXVCO0lBRXpDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBMkI7UUFDckMsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFnQywrQkFBNkIsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNqRyxDQUFDO0lBSUQsWUFDa0IsSUFBa0MsRUFDWCxxQkFBNEMsRUFDNUMscUJBQTRDO1FBRXBGLEtBQUssRUFBRSxDQUFBO1FBSlUsU0FBSSxHQUFKLElBQUksQ0FBOEI7UUFDWCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFHcEYsSUFBSSxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDckQsQ0FBQztJQUVELFVBQVUsQ0FBQyxLQUFpRDtRQUMzRCxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25DLElBQUksQ0FBQyxHQUFHLENBQ1AsSUFBSSxDQUFDLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDekQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLDBGQUE2QyxFQUFFLENBQUM7Z0JBQ3pFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDcEMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCwyREFBMkQ7UUFDM0QsSUFBSSxDQUFDLEdBQUcsQ0FDUCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFO1lBQzVDLElBQUksQ0FBQyxNQUFNLEVBQUUsS0FBSyxFQUFFLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxtQkFBbUIsQ0FBQyxLQUF1QjtRQUNsRCxNQUFNLE9BQU8sR0FDWixJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUNsQyx1QkFBdUIsQ0FDdkIsQ0FBQyxnQkFBZ0IsQ0FBQTtRQUNuQixNQUFNLFFBQVEsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFBO1FBQzNELElBQUksT0FBTyxLQUFLLEtBQUssSUFBSSxDQUFDLE9BQU8sS0FBSyxNQUFNLElBQUksQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzVELElBQUksQ0FBQyxNQUFNLEVBQUUsT0FBTyxFQUFFLENBQUE7WUFDdEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxTQUFTLENBQUE7WUFDdkIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksT0FBTyxLQUFLLElBQUksSUFBSSxDQUFDLE9BQU8sS0FBSyxNQUFNLElBQUksUUFBUSxDQUFDLEVBQUUsQ0FBQztZQUMxRCxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQ3RELGNBQWMsRUFDZCxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FDeEIsQ0FBQTtZQUNELEtBQUssQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzdCLENBQUM7SUFDRixDQUFDOztBQXpESSw2QkFBNkI7SUFXaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBWmxCLDZCQUE2QixDQTBEbEM7QUFFRCw0QkFBNEIsQ0FBQyw2QkFBNkIsQ0FBQyxFQUFFLEVBQUUsNkJBQTZCLENBQUMsQ0FBQSJ9