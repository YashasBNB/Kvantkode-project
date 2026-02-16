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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENMSVNlcnZlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9ub2RlL2V4dEhvc3RDTElTZXJ2ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0UsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFDNUIsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQTRDM0YsTUFBTSxPQUFPLGFBQWE7SUFHekIsWUFDa0IsU0FBNEIsRUFDNUIsVUFBdUIsRUFDdkIsY0FBc0I7UUFGdEIsY0FBUyxHQUFULFNBQVMsQ0FBbUI7UUFDNUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUN2QixtQkFBYyxHQUFkLGNBQWMsQ0FBUTtRQUV2QyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3hFLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLEVBQUUsRUFBRTtZQUMxQixVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lB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