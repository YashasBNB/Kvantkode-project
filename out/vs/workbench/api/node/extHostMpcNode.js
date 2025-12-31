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
import { spawn } from 'child_process';
import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { parseEnvFile } from '../../../base/common/envfile.js';
import { URI } from '../../../base/common/uri.js';
import { StreamSplitter } from '../../../base/node/nodeStreams.js';
import { LogLevel } from '../../../platform/log/common/log.js';
import { ExtHostMcpService } from '../common/extHostMcp.js';
import { IExtHostRpcService } from '../common/extHostRpcService.js';
import { findExecutable } from '../../../base/node/processes.js';
let NodeExtHostMpcService = class NodeExtHostMpcService extends ExtHostMcpService {
    constructor(extHostRpc) {
        super(extHostRpc);
        this.nodeServers = new Map();
    }
    _startMcp(id, launch) {
        if (launch.type === 1 /* McpServerTransportType.Stdio */) {
            this.startNodeMpc(id, launch);
        }
        else {
            super._startMcp(id, launch);
        }
    }
    $stopMcp(id) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.abortCtrl.abort();
            this.nodeServers.delete(id);
        }
        else {
            super.$stopMcp(id);
        }
    }
    $sendMessage(id, message) {
        const nodeServer = this.nodeServers.get(id);
        if (nodeServer) {
            nodeServer.child.stdin.write(message + '\n');
        }
        else {
            super.$sendMessage(id, message);
        }
    }
    async startNodeMpc(id, launch) {
        const onError = (err) => this._proxy.$onDidChangeState(id, {
            state: 3 /* McpConnectionState.Kind.Error */,
            message: typeof err === 'string' ? err : err.message,
        });
        // MCP servers are run on the same authority where they are defined, so
        // reading the envfile based on its path off the filesystem here is fine.
        const env = { ...process.env };
        if (launch.envFile) {
            try {
                for (const [key, value] of parseEnvFile(await readFile(launch.envFile, 'utf-8'))) {
                    env[key] = value;
                }
            }
            catch (e) {
                onError(`Failed to read envFile '${launch.envFile}': ${e.message}`);
                return;
            }
        }
        for (const [key, value] of Object.entries(launch.env)) {
            env[key] = value === null ? undefined : String(value);
        }
        const abortCtrl = new AbortController();
        let child;
        try {
            const cwd = launch.cwd ? URI.revive(launch.cwd).fsPath : homedir();
            const { executable, args, shell } = await formatSubprocessArguments(launch.command, launch.args, cwd, env);
            this._proxy.$onDidPublishLog(id, LogLevel.Debug, `Server command line: ${executable} ${args.join(' ')}`);
            child = spawn(executable, args, {
                stdio: 'pipe',
                cwd: launch.cwd ? URI.revive(launch.cwd).fsPath : homedir(),
                signal: abortCtrl.signal,
                env,
                shell,
            });
        }
        catch (e) {
            onError(e);
            abortCtrl.abort();
            return;
        }
        this._proxy.$onDidChangeState(id, { state: 1 /* McpConnectionState.Kind.Starting */ });
        child.stdout
            .pipe(new StreamSplitter('\n'))
            .on('data', (line) => this._proxy.$onDidReceiveMessage(id, line.toString()));
        child.stdin.on('error', onError);
        child.stdout.on('error', onError);
        // Stderr handling is not currently specified https://github.com/modelcontextprotocol/specification/issues/177
        // Just treat it as generic log data for now
        child.stderr
            .pipe(new StreamSplitter('\n'))
            .on('data', (line) => this._proxy.$onDidPublishLog(id, LogLevel.Warning, `[server stderr] ${line.toString().trimEnd()}`));
        child.on('spawn', () => this._proxy.$onDidChangeState(id, { state: 2 /* McpConnectionState.Kind.Running */ }));
        child.on('error', (e) => {
            if (abortCtrl.signal.aborted) {
                this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ });
            }
            else {
                onError(e);
            }
        });
        child.on('exit', (code) => code === 0 || abortCtrl.signal.aborted
            ? this._proxy.$onDidChangeState(id, { state: 0 /* McpConnectionState.Kind.Stopped */ })
            : this._proxy.$onDidChangeState(id, {
                state: 3 /* McpConnectionState.Kind.Error */,
                message: `Process exited with code ${code}`,
            }));
        this.nodeServers.set(id, { abortCtrl, child });
    }
};
NodeExtHostMpcService = __decorate([
    __param(0, IExtHostRpcService)
], NodeExtHostMpcService);
export { NodeExtHostMpcService };
const windowsShellScriptRe = /\.(bat|cmd)$/i;
/**
 * Formats arguments to avoid issues on Windows for CVE-2024-27980.
 */
export const formatSubprocessArguments = async (executable, args, cwd, env) => {
    if (process.platform !== 'win32') {
        return { executable, args, shell: false };
    }
    const found = await findExecutable(executable, cwd, undefined, env);
    if (found && windowsShellScriptRe.test(found)) {
        const quote = (s) => (s.includes(' ') ? `"${s}"` : s);
        return {
            executable: quote(found),
            args: args.map(quote),
            shell: true,
        };
    }
    return { executable, args, shell: false };
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1wY05vZGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL25vZGUvZXh0SG9zdE1wY05vZGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFrQyxLQUFLLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDckUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzVCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQU85RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFekQsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxpQkFBaUI7SUFDM0QsWUFBZ0MsVUFBOEI7UUFDN0QsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBR1YsZ0JBQVcsR0FBRyxJQUFJLEdBQUcsRUFNMUIsQ0FBQTtJQVJILENBQUM7SUFVa0IsU0FBUyxDQUFDLEVBQVUsRUFBRSxNQUF1QjtRQUMvRCxJQUFJLE1BQU0sQ0FBQyxJQUFJLHlDQUFpQyxFQUFFLENBQUM7WUFDbEQsSUFBSSxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDOUIsQ0FBQzthQUFNLENBQUM7WUFDUCxLQUFLLENBQUMsU0FBUyxDQUFDLEVBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUVRLFFBQVEsQ0FBQyxFQUFVO1FBQzNCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzNDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtZQUM1QixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUM1QixDQUFDO2FBQU0sQ0FBQztZQUNQLEtBQUssQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDbkIsQ0FBQztJQUNGLENBQUM7SUFFUSxZQUFZLENBQUMsRUFBVSxFQUFFLE9BQWU7UUFDaEQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDM0MsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUNoQixVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFBO1FBQzdDLENBQUM7YUFBTSxDQUFDO1lBQ1AsS0FBSyxDQUFDLFlBQVksQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDaEMsQ0FBQztJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMsWUFBWSxDQUFDLEVBQVUsRUFBRSxNQUErQjtRQUNyRSxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQW1CLEVBQUUsRUFBRSxDQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsRUFBRTtZQUNqQyxLQUFLLHVDQUErQjtZQUNwQyxPQUFPLEVBQUUsT0FBTyxHQUFHLEtBQUssUUFBUSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPO1NBQ3BELENBQUMsQ0FBQTtRQUVILHVFQUF1RTtRQUN2RSx5RUFBeUU7UUFDekUsTUFBTSxHQUFHLEdBQUcsRUFBRSxHQUFHLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQTtRQUM5QixJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNwQixJQUFJLENBQUM7Z0JBQ0osS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLFlBQVksQ0FBQyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDbEYsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssQ0FBQTtnQkFDakIsQ0FBQztZQUNGLENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNaLE9BQU8sQ0FBQywyQkFBMkIsTUFBTSxDQUFDLE9BQU8sTUFBTSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtnQkFDbkUsT0FBTTtZQUNQLENBQUM7UUFDRixDQUFDO1FBQ0QsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDdkQsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLEtBQUssS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3RELENBQUM7UUFFRCxNQUFNLFNBQVMsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3ZDLElBQUksS0FBcUMsQ0FBQTtRQUN6QyxJQUFJLENBQUM7WUFDSixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2xFLE1BQU0sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0seUJBQXlCLENBQ2xFLE1BQU0sQ0FBQyxPQUFPLEVBQ2QsTUFBTSxDQUFDLElBQUksRUFDWCxHQUFHLEVBQ0gsR0FBRyxDQUNILENBQUE7WUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUMzQixFQUFFLEVBQ0YsUUFBUSxDQUFDLEtBQUssRUFDZCx3QkFBd0IsVUFBVSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FDdEQsQ0FBQTtZQUNELEtBQUssR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRTtnQkFDL0IsS0FBSyxFQUFFLE1BQU07Z0JBQ2IsR0FBRyxFQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFO2dCQUMzRCxNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07Z0JBQ3hCLEdBQUc7Z0JBQ0gsS0FBSzthQUNMLENBQUMsQ0FBQTtRQUNILENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1YsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFBO1lBQ2pCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLDBDQUFrQyxFQUFFLENBQUMsQ0FBQTtRQUU5RSxLQUFLLENBQUMsTUFBTTthQUNWLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTdFLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUNoQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFakMsOEdBQThHO1FBQzlHLDRDQUE0QztRQUM1QyxLQUFLLENBQUMsTUFBTTthQUNWLElBQUksQ0FBQyxJQUFJLGNBQWMsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM5QixFQUFFLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FDM0IsRUFBRSxFQUNGLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLG1CQUFtQixJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FDOUMsQ0FDRCxDQUFBO1FBRUYsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQ3RCLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFLEVBQUUsS0FBSyx5Q0FBaUMsRUFBRSxDQUFDLENBQzdFLENBQUE7UUFFRCxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3ZCLElBQUksU0FBUyxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDOUIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUMsQ0FBQTtZQUM5RSxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ1gsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0YsS0FBSyxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUN6QixJQUFJLEtBQUssQ0FBQyxJQUFJLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTztZQUNyQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLEVBQUUsRUFBRSxLQUFLLHlDQUFpQyxFQUFFLENBQUM7WUFDL0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsRUFBRSxFQUFFO2dCQUNsQyxLQUFLLHVDQUErQjtnQkFDcEMsT0FBTyxFQUFFLDRCQUE0QixJQUFJLEVBQUU7YUFDM0MsQ0FBQyxDQUNKLENBQUE7UUFFRCxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0NBQ0QsQ0FBQTtBQXZJWSxxQkFBcUI7SUFDcEIsV0FBQSxrQkFBa0IsQ0FBQTtHQURuQixxQkFBcUIsQ0F1SWpDOztBQUVELE1BQU0sb0JBQW9CLEdBQUcsZUFBZSxDQUFBO0FBRTVDOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsS0FBSyxFQUM3QyxVQUFrQixFQUNsQixJQUEyQixFQUMzQixHQUF1QixFQUN2QixHQUF1QyxFQUN0QyxFQUFFO0lBQ0gsSUFBSSxPQUFPLENBQUMsUUFBUSxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ2xDLE9BQU8sRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxjQUFjLENBQUMsVUFBVSxFQUFFLEdBQUcsRUFBRSxTQUFTLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDbkUsSUFBSSxLQUFLLElBQUksb0JBQW9CLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDL0MsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0QsT0FBTztZQUNOLFVBQVUsRUFBRSxLQUFLLENBQUMsS0FBSyxDQUFDO1lBQ3hCLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztZQUNyQixLQUFLLEVBQUUsSUFBSTtTQUNYLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQSJ9