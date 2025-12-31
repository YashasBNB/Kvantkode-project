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
import * as nls from '../../../../nls.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { IDebugService } from '../common/debug.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
let DebugStatusContribution = class DebugStatusContribution {
    constructor(statusBarService, debugService, configurationService) {
        this.statusBarService = statusBarService;
        this.debugService = debugService;
        this.toDispose = [];
        const addStatusBarEntry = () => {
            this.entryAccessor = this.statusBarService.addEntry(this.entry, 'status.debug', 0 /* StatusbarAlignment.LEFT */, 30 /* Low Priority */);
        };
        const setShowInStatusBar = () => {
            this.showInStatusBar =
                configurationService.getValue('debug').showInStatusBar;
            if (this.showInStatusBar === 'always' && !this.entryAccessor) {
                addStatusBarEntry();
            }
        };
        setShowInStatusBar();
        this.toDispose.push(this.debugService.onDidChangeState((state) => {
            if (state !== 0 /* State.Inactive */ &&
                this.showInStatusBar === 'onFirstSessionStart' &&
                !this.entryAccessor) {
                addStatusBarEntry();
            }
        }));
        this.toDispose.push(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('debug.showInStatusBar')) {
                setShowInStatusBar();
                if (this.entryAccessor && this.showInStatusBar === 'never') {
                    this.entryAccessor.dispose();
                    this.entryAccessor = undefined;
                }
            }
        }));
        this.toDispose.push(this.debugService.getConfigurationManager().onDidSelectConfiguration((e) => {
            this.entryAccessor?.update(this.entry);
        }));
    }
    get entry() {
        let text = '';
        const manager = this.debugService.getConfigurationManager();
        const name = manager.selectedConfiguration.name || '';
        const nameAndLaunchPresent = name && manager.selectedConfiguration.launch;
        if (nameAndLaunchPresent) {
            text =
                manager.getLaunches().length > 1
                    ? `${name} (${manager.selectedConfiguration.launch.name})`
                    : name;
        }
        return {
            name: nls.localize('status.debug', 'Debug'),
            text: '$(debug-alt-small) ' + text,
            ariaLabel: nls.localize('debugTarget', 'Debug: {0}', text),
            tooltip: nls.localize('selectAndStartDebug', 'Select and Start Debug Configuration'),
            command: 'workbench.action.debug.selectandstart',
        };
    }
    dispose() {
        this.entryAccessor?.dispose();
        dispose(this.toDispose);
    }
};
DebugStatusContribution = __decorate([
    __param(0, IStatusbarService),
    __param(1, IDebugService),
    __param(2, IConfigurationService)
], DebugStatusContribution);
export { DebugStatusContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnU3RhdHVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxhQUFhLEVBQThCLE1BQU0sb0JBQW9CLENBQUE7QUFDOUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGlCQUFpQixHQUdqQixNQUFNLGtEQUFrRCxDQUFBO0FBR2xELElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO0lBS25DLFlBQ29CLGdCQUFvRCxFQUN4RCxZQUE0QyxFQUNwQyxvQkFBMkM7UUFGOUIscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUN2QyxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUxwRCxjQUFTLEdBQWtCLEVBQUUsQ0FBQTtRQVFwQyxNQUFNLGlCQUFpQixHQUFHLEdBQUcsRUFBRTtZQUM5QixJQUFJLENBQUMsYUFBYSxHQUFHLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQ2xELElBQUksQ0FBQyxLQUFLLEVBQ1YsY0FBYyxtQ0FFZCxFQUFFLENBQUMsa0JBQWtCLENBQ3JCLENBQUE7UUFDRixDQUFDLENBQUE7UUFFRCxNQUFNLGtCQUFrQixHQUFHLEdBQUcsRUFBRTtZQUMvQixJQUFJLENBQUMsZUFBZTtnQkFDbkIsb0JBQW9CLENBQUMsUUFBUSxDQUFzQixPQUFPLENBQUMsQ0FBQyxlQUFlLENBQUE7WUFDNUUsSUFBSSxJQUFJLENBQUMsZUFBZSxLQUFLLFFBQVEs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