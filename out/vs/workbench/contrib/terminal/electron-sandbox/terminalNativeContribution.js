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
import { ipcRenderer } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerRemoteContributions } from './terminalRemote.js';
import { IRemoteAgentService } from '../../../services/remote/common/remoteAgentService.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { ITerminalService } from '../browser/terminal.js';
import { disposableWindowInterval, getActiveWindow } from '../../../../base/browser/dom.js';
let TerminalNativeContribution = class TerminalNativeContribution extends Disposable {
    constructor(_fileService, _terminalService, remoteAgentService, nativeHostService) {
        super();
        this._fileService = _fileService;
        this._terminalService = _terminalService;
        ipcRenderer.on('vscode:openFiles', (_, request) => {
            this._onOpenFileRequest(request);
        });
        this._register(nativeHostService.onDidResumeOS(() => this._onOsResume()));
        this._terminalService.setNativeDelegate({
            getWindowCount: () => nativeHostService.getWindowCount(),
        });
        const connection = remoteAgentService.getConnection();
        if (connection && connection.remoteAuthority) {
            registerRemoteContributions();
        }
    }
    _onOsResume() {
        for (const instance of this._terminalService.instances) {
            instance.xterm?.forceRedraw();
        }
    }
    async _onOpenFileRequest(request) {
        // if the request to open files is coming in from the integrated terminal (identified though
        // the termProgram variable) and we are instructed to wait for editors close, wait for the
        // marker file to get deleted and then focus back to the integrated terminal.
        if (request.termProgram === 'vscode' && request.filesToWait) {
            const waitMarkerFileUri = URI.revive(request.filesToWait.waitMarkerFileUri);
            await this._whenFileDeleted(waitMarkerFileUri);
            // Focus active terminal
            this._terminalService.activeInstance?.focus();
        }
    }
    _whenFileDeleted(path) {
        // Complete when wait marker file is deleted
        return new Promise((resolve) => {
            let running = false;
            const interval = disposableWindowInterval(getActiveWindow(), async () => {
                if (!running) {
                    running = true;
                    const exists = await this._fileService.exists(path);
                    running = false;
                    if (!exists) {
                        interval.dispose();
                        resolve(undefined);
                    }
                }
            }, 1000);
        });
    }
};
TerminalNativeContribution = __decorate([
    __param(0, IFileService),
    __param(1, ITerminalService),
    __param(2, IRemoteAgentService),
    __param(3, INativeHostService)
], TerminalNativeContribution);
export { TerminalNativeContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxOYXRpdmVDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L3Rlcm1pbmFsTmF0aXZlQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUV4RixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsZUFBZSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFcEYsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxVQUFVO0lBR3pELFlBQ2dDLFlBQTBCLEVBQ3RCLGdCQUFrQyxFQUNoRCxrQkFBdUMsRUFDeEMsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBTHdCLGlCQUFZLEdBQVosWUFBWSxDQUFjO1FBQ3RCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBa0I7UUFNckUsV0FBVyxDQUFDLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDLENBQVUsRUFBRSxPQUErQixF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