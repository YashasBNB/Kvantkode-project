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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwudHlwZUFoZWFkLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL3R5cGVBaGVhZC9icm93c2VyL3Rlcm1pbmFsLnR5cGVBaGVhZC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFNckcsT0FBTyxFQUNOLDRCQUE0QixHQUU1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBSzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUU1RCxJQUFNLDZCQUE2QixHQUFuQyxNQUFNLDZCQUE4QixTQUFRLGVBQWU7O2FBQzFDLE9BQUUsR0FBRyxvQkFBb0IsQUFBdkIsQ0FBdUI7SUFFekMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxRQUEyQjtRQUNyQyxPQUFPLFFBQVEsQ0FBQyxlQUFlLENBQWdDLCtCQUE2QixDQUFDLEVBQUUsQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFJRCxZQUNrQixJQUFrQyxFQUNYLHFCQUE0QyxFQUM1QyxxQkFBNEM7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFKVSxTQUFJLEdBQUosSUFBSSxDQUE4QjtRQUNYLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUdwRixJQUFJLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNyRCxDQUFDO0lBRUQsVUFBVSxDQUFDLEtBQWlEO1FBQzNELElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDbkMsSUFBSSxDQUFDLEdBQUcsQ0FDUCxJQUFJLENBQUMscUJBQXFCLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUN6RCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsMEZBQTZDLEVBQUUsQ0FBQztnQkFDekUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsR0FBRyxDQUNQLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxHQUFHLEVBQUU7WUFDNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQTtRQUNyQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLG1CQUFtQixDQUFDLEtBQXVCO1FBQ2xELE1BQU0sT0FBTyxHQUNaLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLENBQ2xDLHVCQUF1QixDQUN2QixDQUFDLGdCQUFnQixDQUFBO1FBQ25CLE1BQU0sUUFBUSxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUE7UUFDM0QsSUFBSSxPQUFPLEtBQUssS0FBSyxJQUFJLENBQUMsT0FBTyxLQUFLLE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDNUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsQ0FBQTtZQUN0QixJQUFJLENBQUMsTUFBTSxHQUFHLFNBQVMsQ0FBQTtZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxPQUFPLEtBQUssSUFBSSxJQUFJLENBQUMsT0FBTyxLQUFLLE1BQU0sSUFBSSxRQUFRLENBQUMsRUFBRSxDQUFDO1lBQzFELElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDdEQsY0FBYyxFQUNkLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUN4QixDQUFBO1lBQ0QsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDN0IsQ0FBQztJQUNGLENBQUM7O0FBekRJLDZCQUE2QjtJQVdoQyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FabEIsNkJBQTZCLENBMERsQztBQUVELDRCQUE0QixDQUFDLDZCQUE2QixDQUFDLEVBQUUsRUFBRSw2QkFBNkIsQ0FBQyxDQUFBIn0=