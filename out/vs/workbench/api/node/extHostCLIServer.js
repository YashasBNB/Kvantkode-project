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
import { createRandomIPCHandle } from '../../../base/parts/ipc/node/ipc.net.js';
import * as http from 'http';
import * as fs from 'fs';
import { IExtHostCommands } from '../common/extHostCommands.js';
import { URI } from '../../../base/common/uri.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { hasWorkspaceFileExtension } from '../../../platform/workspace/common/workspace.js';
export class CLIServerBase {
    constructor(_commands, logService, _ipcHandlePath) {
        this._commands = _commands;
        this.logService = logService;
        this._ipcHandlePath = _ipcHandlePath;
        this._server = http.createServer((req, res) => this.onRequest(req, res));
        this.setup().catch((err) => {
            logService.error(err);
            return '';
        });
    }
    get ipcHandlePath() {
        return this._ipcHandlePath;
    }
    async setup() {
        try {
            this._server.listen(this.ipcHandlePath);
            this._server.on('error', (err) => this.logService.error(err));
        }
        catch (err) {
            this.logService.error('Could not start open from terminal server.');
        }
        return this._ipcHandlePath;
    }
    onRequest(req, res) {
        const sendResponse = (statusCode, returnObj) => {
            res.writeHead(statusCode, { 'content-type': 'application/json' });
            res.end(JSON.stringify(returnObj || null), (err) => err && this.logService.error(err)); // CodeQL [SM01524] Only the message portion of errors are passed in.
        };
        const chunks = [];
        req.setEncoding('utf8');
        req.on('data', (d) => chunks.push(d));
        req.on('end', async () => {
            try {
                const data = JSON.parse(chunks.join(''));
                let returnObj;
                switch (data.type) {
                    case 'open':
                        returnObj = await this.open(data);
                        break;
                    case 'openExternal':
                        returnObj = await this.openExternal(data);
                        break;
                    case 'status':
                        returnObj = await this.getStatus(data);
                        break;
                    case 'extensionManagement':
                        returnObj = await this.manageExtensions(data);
                        break;
                    default:
                        sendResponse(404, `Unknown message type: ${data.type}`);
                        break;
                }
                sendResponse(200, returnObj);
            }
            catch (e) {
                const message = e instanceof Error ? e.message : JSON.stringify(e);
                sendResponse(500, message);
                this.logService.error('Error while processing pipe request', e);
            }
        });
    }
    async open(data) {
        const { fileURIs, folderURIs, forceNewWindow, diffMode, mergeMode, addMode, removeMode, forceReuseWindow, gotoLineMode, waitMarkerFilePath, remoteAuthority, } = data;
        const urisToOpen = [];
        if (Array.isArray(folderURIs)) {
            for (const s of folderURIs) {
                try {
                    urisToOpen.push({ folderUri: URI.parse(s) });
                }
                catch (e) {
                    // ignore
                }
            }
        }
        if (Array.isArray(fileURIs)) {
            for (const s of fileURIs) {
                try {
                    if (hasWorkspaceFileExtension(s)) {
                        urisToOpen.push({ workspaceUri: URI.parse(s) });
                    }
                    else {
                        urisToOpen.push({ fileUri: URI.parse(s) });
                    }
                }
                catch (e) {
                    // ignore
                }
            }
        }
        const waitMarkerFileURI = waitMarkerFilePath ? URI.file(waitMarkerFilePath) : undefined;
        const preferNewWindow = !forceReuseWindow && !waitMarkerFileURI && !addMode && !removeMode;
        const windowOpenArgs = {
            forceNewWindow,
            diffMode,
            mergeMode,
            addMode,
            removeMode,
            gotoLineMode,
            forceReuseWindow,
            preferNewWindow,
            waitMarkerFileURI,
            remoteAuthority,
        };
        this._commands.executeCommand('_remoteCLI.windowOpen', urisToOpen, windowOpenArgs);
    }
    async openExternal(data) {
        for (const uriString of data.uris) {
            const uri = URI.parse(uriString);
            const urioOpen = uri.scheme === 'file' ? uri : uriString; // workaround for #112577
            await this._commands.executeCommand('_remoteCLI.openExternal', urioOpen);
        }
    }
    async manageExtensions(data) {
        const toExtOrVSIX = (inputs) => inputs?.map((input) => (/\.vsix$/i.test(input) ? URI.parse(input) : input));
        const commandArgs = {
            list: data.list,
            install: toExtOrVSIX(data.install),
            uninstall: toExtOrVSIX(data.uninstall),
            force: data.force,
        };
        return await this._commands.executeCommand('_remoteCLI.manageExtensions', commandArgs);
    }
    async getStatus(data) {
        return await this._commands.executeCommand('_remoteCLI.getSystemStatus');
    }
    dispose() {
        this._server.close();
        if (this._ipcHandlePath && process.platform !== 'win32' && fs.existsSync(this._ipcHandlePath)) {
            fs.unlinkSync(this._ipcHandlePath);
        }
    }
}
let CLIServer = class CLIServer extends CLIServerBase {
    constructor(commands, logService) {
        super(commands, logService, createRandomIPCHandle());
    }
};
CLIServer = __decorate([
    __param(0, IExtHostCommands),
    __param(1, ILogService)
], CLIServer);
export { CLIServer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENMSVNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvbm9kZS9leHRIb3N0Q0xJU2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9FLE9BQU8sS0FBSyxJQUFJLE1BQU0sTUFBTSxDQUFBO0FBQzVCLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRS9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0saURBQWlELENBQUE7QUE0QzNGLE1BQU0sT0FBTyxhQUFhO0lBR3pCLFlBQ2tCLFNBQTRCLEVBQzVCLFVBQXVCLEVBQ3ZCLGNBQXNCO1FBRnRCLGNBQVMsR0FBVCxTQUFTLENBQW1CO1FBQzVCLGVBQVUsR0FBVixVQUFVLENBQWE7UUFDdkIsbUJBQWMsR0FBZCxjQUFjLENBQVE7UUFFdkMsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN4RSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUU7WUFDMUIsVUFBVSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNyQixPQUFPLEVBQUUsQ0FBQTtRQUNW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