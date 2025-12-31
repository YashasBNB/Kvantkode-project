/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../base/common/network.js';
import { localize } from '../../../../nls.js';
export class BaseTerminalBackend extends Disposable {
    get isResponsive() {
        return !this._isPtyHostUnresponsive;
    }
    constructor(_ptyHostController, _logService, historyService, configurationResolverService, statusBarService, _workspaceContextService) {
        super();
        this._ptyHostController = _ptyHostController;
        this._logService = _logService;
        this._workspaceContextService = _workspaceContextService;
        this._isPtyHostUnresponsive = false;
        this._onPtyHostConnected = this._register(new Emitter());
        this.onPtyHostConnected = this._onPtyHostConnected.event;
        this._onPtyHostRestart = this._register(new Emitter());
        this.onPtyHostRestart = this._onPtyHostRestart.event;
        this._onPtyHostUnresponsive = this._register(new Emitter());
        this.onPtyHostUnresponsive = this._onPtyHostUnresponsive.event;
        this._onPtyHostResponsive = this._register(new Emitter());
        this.onPtyHostResponsive = this._onPtyHostResponsive.event;
        let unresponsiveStatusBarEntry;
        let statusBarAccessor;
        let hasStarted = false;
        // Attach pty host listeners
        this._register(this._ptyHostController.onPtyHostExit(() => {
            this._logService.error(`The terminal's pty host process exited, the connection to all terminal processes was lost`);
        }));
        this._register(this.onPtyHostConnected(() => (hasStarted = true)));
        this._register(this._ptyHostController.onPtyHostStart(() => {
            this._logService.debug(`The terminal's pty host process is starting`);
            // Only fire the _restart_ event after it has started
            if (hasStarted) {
                this._logService.trace('IPtyHostController#onPtyHostRestart');
                this._onPtyHostRestart.fire();
            }
            statusBarAccessor?.dispose();
            this._isPtyHostUnresponsive = false;
        }));
        this._register(this._ptyHostController.onPtyHostUnresponsive(() => {
            statusBarAccessor?.dispose();
            if (!unresponsiveStatusBarEntry) {
                unresponsiveStatusBarEntry = {
                    name: localize('ptyHostStatus', 'Pty Host Status'),
                    text: `$(debug-disconnect) ${localize('ptyHostStatus.short', 'Pty Host')}`,
                    tooltip: localize('nonResponsivePtyHost', "The connection to the terminal's pty host process is unresponsive, terminals may stop working. Click to manually restart the pty host."),
                    ariaLabel: localize('ptyHostStatus.ariaLabel', 'Pty Host is unresponsive'),
                    command: "workbench.action.terminal.restartPtyHost" /* TerminalContribCommandId.DeveloperRestartPtyHost */,
                    kind: 'warning',
                };
            }
            statusBarAccessor = statusBarService.addEntry(unresponsiveStatusBarEntry, 'ptyHostStatus', 0 /* StatusbarAlignment.LEFT */);
            this._isPtyHostUnresponsive = true;
            this._onPtyHostUnresponsive.fire();
        }));
        this._register(this._ptyHostController.onPtyHostResponsive(() => {
            if (!this._isPtyHostUnresponsive) {
                return;
            }
            this._logService.info('The pty host became responsive again');
            statusBarAccessor?.dispose();
            this._isPtyHostUnresponsive = false;
            this._onPtyHostResponsive.fire();
        }));
        this._register(this._ptyHostController.onPtyHostRequestResolveVariables(async (e) => {
            // Only answer requests for this workspace
            if (e.workspaceId !== this._workspaceContextService.getWorkspace().id) {
                return;
            }
            const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.file);
            const lastActiveWorkspaceRoot = activeWorkspaceRootUri
                ? (this._workspaceContextService.getWorkspaceFolder(activeWorkspaceRootUri) ?? undefined)
                : undefined;
            const resolveCalls = e.originalText.map((t) => {
                return configurationResolverService.resolveAsync(lastActiveWorkspaceRoot, t);
            });
            const result = await Promise.all(resolveCalls);
            this._ptyHostController.acceptPtyHostResolvedVariables(e.requestId, result);
        }));
    }
    restartPtyHost() {
        this._ptyHostController.restartPtyHost();
    }
    _deserializeTerminalState(serializedState) {
        if (serializedState === undefined) {
            return undefined;
        }
        const parsedUnknown = JSON.parse(serializedState);
        if (!('version' in parsedUnknown) ||
            !('state' in parsedUnknown) ||
            !Array.isArray(parsedUnknown.state)) {
            this._logService.warn('Could not revive serialized processes, wrong format', parsedUnknown);
            return undefined;
        }
        const parsedCrossVersion = parsedUnknown;
        if (parsedCrossVersion.version !== 1) {
            this._logService.warn(`Could not revive serialized processes, wrong version "${parsedCrossVersion.version}"`, parsedCrossVersion);
            return undefined;
        }
        return parsedCrossVersion.state;
    }
    _getWorkspaceId() {
        return this._workspaceContextService.getWorkspace().id;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVRlcm1pbmFsQmFja2VuZC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvYmFzZVRlcm1pbmFsQmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFrQjdDLE1BQU0sT0FBZ0IsbUJBQW9CLFNBQVEsVUFBVTtJQUczRCxJQUFJLFlBQVk7UUFDZixPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFBO0lBQ3BDLENBQUM7SUFXRCxZQUNrQixrQkFBc0MsRUFDcEMsV0FBZ0MsRUFDbkQsY0FBK0IsRUFDL0IsNEJBQTJELEVBQzNELGdCQUFtQyxFQUNoQix3QkFBa0Q7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFQVSx1QkFBa0IsR0FBbEIsa0JBQWtCLENBQW9CO1FBQ3BDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQUloQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBckI5RCwyQkFBc0IsR0FBWSxLQUFLLENBQUE7UUFNNUIsd0JBQW1CLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbkUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUN6QyxzQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUNqRSxxQkFBZ0Is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