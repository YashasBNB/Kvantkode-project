/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { mark } from '../../../../base/common/performance.js';
import { URI } from '../../../../base/common/uri.js';
/**
 * Responsible for establishing and maintaining a connection with an existing terminal process
 * created on the local pty host.
 */
export class BasePty extends Disposable {
    constructor(id, shouldPersist) {
        super();
        this.id = id;
        this.shouldPersist = shouldPersist;
        this._properties = {
            cwd: '',
            initialCwd: '',
            fixedDimensions: { cols: undefined, rows: undefined },
            title: '',
            shellType: undefined,
            hasChildProcesses: true,
            resolvedShellLaunchConfig: {},
            overrideDimensions: undefined,
            failedShellIntegrationActivation: false,
            usedShellIntegrationInjection: undefined,
        };
        this._lastDimensions = { cols: -1, rows: -1 };
        this._inReplay = false;
        this._onProcessData = this._register(new Emitter());
        this.onProcessData = this._onProcessData.event;
        this._onProcessReplayComplete = this._register(new Emitter());
        this.onProcessReplayComplete = this._onProcessReplayComplete.event;
        this._onProcessReady = this._register(new Emitter());
        this.onProcessReady = this._onProcessReady.event;
        this._onDidChangeProperty = this._register(new Emitter());
        this.onDidChangeProperty = this._onDidChangeProperty.event;
        this._onProcessExit = this._register(new Emitter());
        this.onProcessExit = this._onProcessExit.event;
        this._onRestoreCommands = this._register(new Emitter());
        this.onRestoreCommands = this._onRestoreCommands.event;
    }
    async getInitialCwd() {
        return this._properties.initialCwd;
    }
    async getCwd() {
        return this._properties.cwd || this._properties.initialCwd;
    }
    handleData(e) {
        this._onProcessData.fire(e);
    }
    handleExit(e) {
        this._onProcessExit.fire(e);
    }
    handleReady(e) {
        this._onProcessReady.fire(e);
    }
    handleDidChangeProperty({ type, value }) {
        switch (type) {
            case "cwd" /* ProcessPropertyType.Cwd */:
                this._properties.cwd = value;
                break;
            case "initialCwd" /* ProcessPropertyType.InitialCwd */:
                this._properties.initialCwd = value;
                break;
            case "resolvedShellLaunchConfig" /* ProcessPropertyType.ResolvedShellLaunchConfig */:
                if (value.cwd && typeof value.cwd !== 'string') {
                    value.cwd = URI.revive(value.cwd);
                }
        }
        this._onDidChangeProperty.fire({ type, value });
    }
    async handleReplay(e) {
        mark(`code/terminal/willHandleReplay/${this.id}`);
        try {
            this._inReplay = true;
            for (const innerEvent of e.events) {
                if (innerEvent.cols !== 0 || innerEvent.rows !== 0) {
                    // never override with 0x0 as that is a marker for an unknown initial size
                    this._onDidChangeProperty.fire({
                        type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */,
                        value: { cols: innerEvent.cols, rows: innerEvent.rows, forceExactSize: true },
                    });
                }
                const e = { data: innerEvent.data, trackCommit: true };
                this._onProcessData.fire(e);
                await e.writePromise;
            }
        }
        finally {
            this._inReplay = false;
        }
        if (e.commands) {
            this._onRestoreCommands.fire(e.commands);
        }
        // remove size override
        this._onDidChangeProperty.fire({
            type: "overrideDimensions" /* ProcessPropertyType.OverrideDimensions */,
            value: undefined,
        });
        mark(`code/terminal/didHandleReplay/${this.id}`);
        this._onProcessReplayComplete.fire();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVB0eS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2NvbW1vbi9iYXNlUHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQWNwRDs7O0dBR0c7QUFDSCxNQUFNLE9BQWdCLE9BQVEsU0FBUSxVQUFVO0lBK0IvQyxZQUNVLEVBQVUsRUFDVixhQUFzQjtRQUUvQixLQUFLLEVBQUUsQ0FBQTtRQUhFLE9BQUUsR0FBRixFQUFFLENBQVE7UUFDVixrQkFBYSxHQUFiLGFBQWEsQ0FBUztRQWhDYixnQkFBVyxHQUF3QjtZQUNyRCxHQUFHLEVBQUUsRUFBRTtZQUNQLFVBQVUsRUFBRSxFQUFFO1lBQ2QsZUFBZSxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFO1lBQ3JELEtBQUssRUFBRSxFQUFFO1lBQ1QsU0FBUyxFQUFFLFNBQVM7WUFDcEIsaUJBQWlCLEVBQUUsSUFBSTtZQUN2Qix5QkFBeUIsRUFBRSxFQUFFO1lBQzdCLGtCQUFrQixFQUFFLFNBQVM7WUFDN0IsZ0NBQWdDLEVBQUUsS0FBSztZQUN2Qyw2QkFBNkIsRUFBRSxTQUFTO1NBQ3hDLENBQUE7UUFDa0Isb0JBQWUsR0FBbUMsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUE7UUFDakYsY0FBUyxHQUFHLEtBQUssQ0FBQTtR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