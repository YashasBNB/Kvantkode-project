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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdTdGF0dXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdTdGF0dXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQWUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGFBQWEsRUFBOEIsTUFBTSxvQkFBb0IsQ0FBQTtBQUM5RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4saUJBQWlCLEdBR2pCLE1BQU0sa0RBQWtELENBQUE7QUFHbEQsSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7SUFLbkMsWUFDb0IsZ0JBQW9ELEVBQ3hELFlBQTRDLEVBQ3BDLG9CQUEyQztRQUY5QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBQ3ZDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBTHBELGNBQVMsR0FBa0IsRUFBRSxDQUFBO1FBUXBDLE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFO1lBQzlCLElBQUksQ0FBQyxhQUFhLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFFBQVEsQ0FDbEQsSUFBSSxDQUFDLEtBQUssRUFDVixjQUFjLG1DQUVkLEVBQUUsQ0FBQyxrQkFBa0IsQ0FDckIsQ0FBQTtRQUNGLENBQUMsQ0FBQTtRQUVELE1BQU0sa0JBQWtCLEdBQUcsR0FBRyxFQUFFO1lBQy9CLElBQUksQ0FBQyxlQUFlO2dCQUNuQixvQkFBb0IsQ0FBQyxRQUFRLENBQXNCLE9BQU8sQ0FBQyxDQUFDLGVBQWUsQ0FBQTtZQUM1RSxJQUFJLElBQUksQ0FBQyxlQUFlLEtBQUss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