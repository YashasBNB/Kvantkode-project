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
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { FileAccess, Schemas } from '../../../base/common/network.js';
import { Client } from '../../../base/parts/ipc/node/ipc.cp.js';
import { IEnvironmentService, } from '../../environment/common/environment.js';
import { parsePtyHostDebugPort } from '../../environment/node/environmentService.js';
let NodePtyHostStarter = class NodePtyHostStarter extends Disposable {
    constructor(_reconnectConstants, _environmentService) {
        super();
        this._reconnectConstants = _reconnectConstants;
        this._environmentService = _environmentService;
    }
    start() {
        const opts = {
            serverName: 'Pty Host',
            args: [
                '--type=ptyHost',
                '--logsPath',
                this._environmentService.logsHome.with({ scheme: Schemas.file }).fsPath,
            ],
            env: {
                VSCODE_ESM_ENTRYPOINT: 'vs/platform/terminal/node/ptyHostMain',
                VSCODE_PIPE_LOGGING: 'true',
                VSCODE_VERBOSE_LOGGING: 'true', // transmit console logs from server to client,
                VSCODE_RECONNECT_GRACE_TIME: this._reconnectConstants.graceTime,
                VSCODE_RECONNECT_SHORT_GRACE_TIME: this._reconnectConstants.shortGraceTime,
                VSCODE_RECONNECT_SCROLLBACK: this._reconnectConstants.scrollback,
            },
        };
        const ptyHostDebug = parsePtyHostDebugPort(this._environmentService.args, this._environmentService.isBuilt);
        if (ptyHostDebug) {
            if (ptyHostDebug.break && ptyHostDebug.port) {
                opts.debugBrk = ptyHostDebug.port;
            }
            else if (!ptyHostDebug.break && ptyHostDebug.port) {
                opts.debug = ptyHostDebug.port;
            }
        }
        const client = new Client(FileAccess.asFileUri('bootstrap-fork').fsPath, opts);
        const store = new DisposableStore();
        store.add(client);
        return {
            client,
            store,
            onDidProcessExit: client.onDidProcessExit,
        };
    }
};
NodePtyHostStarter = __decorate([
    __param(1, IEnvironmentService)
], NodePtyHostStarter);
export { NodePtyHostStarter };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9kZVB0eUhvc3RTdGFydGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC9ub2RlL25vZGVQdHlIb3N0U3RhcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLE1BQU0sRUFBZSxNQUFNLHdDQUF3QyxDQUFBO0FBQzVFLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUk3RSxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7SUFDakQsWUFDa0IsbUJBQXdDLEVBQ25CLG1CQUE4QztRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUhVLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDbkIsd0JBQW1CLEdBQW5CLG1CQUFtQixDQUEyQjtJQUdyRixDQUFDO0lBRUQsS0FBSztRQUNKLE1BQU0sSUFBSSxHQUFnQjtZQUN6QixVQUFVLEVBQUUsVUFBVTtZQUN0QixJQUFJLEVBQUU7Z0JBQ0wsZ0JBQWdCO2dCQUNoQixZQUFZO2dCQUNaLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU07YUFDdkU7WUFDRCxHQUFHLEVBQUU7Z0JBQ0oscUJBQXFCLEVBQUUsdUNBQXVDO2dCQUM5RCxtQkFBbUIsRUFBRSxNQUFNO2dCQUMzQixzQkFBc0IsRUFBRSxNQUFNLEVBQUUsK0NBQStDO2dCQUMvRSwyQkFBMkIsRUFBRSxJQUFJLENBQUMsbUJBQW1CLENBQUMsU0FBUztnQkFDL0QsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLG1CQUFtQixDQUFDLGNBQWM7Z0JBQzFFLDJCQUEyQixFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxVQUFVO2FBQ2hFO1NBQ0QsQ0FBQTtRQUVELE1BQU0sWUFBWSxHQUFHLHFCQUFxQixDQUN6QyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUM3QixJQUFJLENBQUMsbUJBQW1CLENBQUMsT0FBTyxDQUNoQyxDQUFBO1FBQ0QsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixJQUFJLFlBQVksQ0FBQyxLQUFLLElBQUksWUFBWSxDQUFDLElBQUksRUFBRSxDQUFDO2dCQUM3QyxJQUFJLENBQUMsUUFBUSxHQUFHLFlBQVksQ0FBQyxJQUFJLENBQUE7WUFDbEMsQ0FBQztpQkFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLEtBQUssSUFBSSxZQUFZLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ3JELElBQUksQ0FBQyxLQUFLLEdBQUcsWUFBWSxDQUFDLElBQUksQ0FBQTtZQUMvQixDQUFDO1FBQ0YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFFOUUsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUNuQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRWpCLE9BQU87WUFDTixNQUFNO1lBQ04sS0FBSztZQUNMLGdCQUFnQixFQUFFLE1BQU0sQ0FBQyxnQkFBZ0I7U0FDekMsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBakRZLGtCQUFrQjtJQUc1QixXQUFBLG1CQUFtQixDQUFBO0dBSFQsa0JBQWtCLENBaUQ5QiJ9