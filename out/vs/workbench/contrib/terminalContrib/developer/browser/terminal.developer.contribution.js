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
var DevModeContribution_1;
import { Delayer } from '../../../../../base/common/async.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, combinedDisposable, dispose, } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { localize, localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../../platform/quickinput/common/quickInput.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
import { IWorkspaceContextService } from '../../../../../platform/workspace/common/workspace.js';
import { IStatusbarService, } from '../../../../services/statusbar/browser/statusbar.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/developer.css';
registerTerminalAction({
    id: "workbench.action.terminal.showTextureAtlas" /* TerminalDeveloperCommandId.ShowTextureAtlas */,
    title: localize2('workbench.action.terminal.showTextureAtlas', 'Show Terminal Texture Atlas'),
    category: Categories.Developer,
    precondition: ContextKeyExpr.or(TerminalContextKeys.isOpen),
    run: async (c, accessor) => {
        const fileService = accessor.get(IFileService);
        const openerService = accessor.get(IOpenerService);
        const workspaceContextService = accessor.get(IWorkspaceContextService);
        const bitmap = await c.service.activeInstance?.xterm?.textureAtlas;
        if (!bitmap) {
            return;
        }
        const cwdUri = workspaceContextService.getWorkspace().folders[0].uri;
        const fileUri = URI.joinPath(cwdUri, 'textureAtlas.png');
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('bitmaprenderer');
        if (!ctx) {
            return;
        }
        ctx.transferFromImageBitmap(bitmap);
        const blob = await new Promise((res) => canvas.toBlob(res));
        if (!blob) {
            return;
        }
        await fileService.writeFile(fileUri, VSBuffer.wrap(new Uint8Array(await blob.arrayBuffer())));
        openerService.open(fileUri);
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.writeDataToTerminal" /* TerminalDeveloperCommandId.WriteDataToTerminal */,
    title: localize2('workbench.action.terminal.writeDataToTerminal', 'Write Data to Terminal'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const quickInputService = accessor.get(IQuickInputService);
        const instance = await c.service.getActiveOrCreateInstance();
        await c.service.revealActiveTerminal();
        await instance.processReady;
        if (!instance.xterm) {
            throw new Error("Cannot write data to terminal if xterm isn't initialized");
        }
        const data = await quickInputService.input({
            value: '',
            placeHolder: 'Enter data, use \\x to escape',
            prompt: localize('workbench.action.terminal.writeDataToTerminal.prompt', 'Enter data to write directly to the terminal, bypassing the pty'),
        });
        if (!data) {
            return;
        }
        let escapedData = data.replace(/\\n/g, '\n').replace(/\\r/g, '\r');
        while (true) {
            const match = escapedData.match(/\\x([0-9a-fA-F]{2})/);
            if (match === null || match.index === undefined || match.length < 2) {
                break;
            }
            escapedData =
                escapedData.slice(0, match.index) +
                    String.fromCharCode(parseInt(match[1], 16)) +
                    escapedData.slice(match.index + 4);
        }
        const xterm = instance.xterm;
        xterm._writeText(escapedData);
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.recordSession" /* TerminalDeveloperCommandId.RecordSession */,
    title: localize2('workbench.action.terminal.recordSession', 'Record Terminal Session'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const clipboardService = accessor.get(IClipboardService);
        const commandService = accessor.get(ICommandService);
        const statusbarService = accessor.get(IStatusbarService);
        const store = new DisposableStore();
        // Set up status bar entry
        const text = localize('workbench.action.terminal.recordSession.recording', 'Recording terminal session...');
        const statusbarEntry = {
            text,
            name: text,
            ariaLabel: text,
            showProgress: true,
        };
        const statusbarHandle = statusbarService.addEntry(statusbarEntry, 'recordSession', 0 /* StatusbarAlignment.LEFT */);
        store.add(statusbarHandle);
        // Create, reveal and focus instance
        const instance = await c.service.createTerminal();
        c.service.setActiveInstance(instance);
        await c.service.revealActiveTerminal();
        await Promise.all([instance.processReady, instance.focusWhenReady(true)]);
        // Record session
        return new Promise((resolve) => {
            const events = [];
            const endRecording = () => {
                const session = JSON.stringify(events, null, 2);
                clipboardService.writeText(session);
                store.dispose();
                resolve();
            };
            const timer = store.add(new Delayer(5000));
            store.add(Event.runAndSubscribe(instance.onDimensionsChanged, () => {
                events.push({
                    type: 'resize',
                    cols: instance.cols,
                    rows: instance.rows,
                });
                timer.trigger(endRecording);
            }));
            store.add(commandService.onWillExecuteCommand((e) => {
                events.push({
                    type: 'command',
                    id: e.commandId,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.onWillData((data) => {
                events.push({
                    type: 'output',
                    data,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.onDidSendText((data) => {
                events.push({
                    type: 'sendText',
                    data,
                });
                timer.trigger(endRecording);
            }));
            store.add(instance.xterm.raw.onData((data) => {
                events.push({
                    type: 'input',
                    data,
                });
                timer.trigger(endRecording);
            }));
            let commandDetectedRegistered = false;
            store.add(Event.runAndSubscribe(instance.capabilities.onDidAddCapability, (e) => {
                if (commandDetectedRegistered) {
                    return;
                }
                const commandDetection = instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
                if (!commandDetection) {
                    return;
                }
                store.add(commandDetection.promptInputModel.onDidChangeInput((e) => {
                    events.push({
                        type: 'promptInputChange',
                        data: commandDetection.promptInputModel.getCombinedString(),
                    });
                    timer.trigger(endRecording);
                }));
                commandDetectedRegistered = true;
            }));
        });
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.restartPtyHost" /* TerminalDeveloperCommandId.RestartPtyHost */,
    title: localize2('workbench.action.terminal.restartPtyHost', 'Restart Pty Host'),
    category: Categories.Developer,
    run: async (c, accessor) => {
        const logService = accessor.get(ITerminalLogService);
        const backends = Array.from(c.instanceService.getRegisteredBackends());
        const unresponsiveBackends = backends.filter((e) => !e.isResponsive);
        // Restart only unresponsive backends if there are any
        const restartCandidates = unresponsiveBackends.length > 0 ? unresponsiveBackends : backends;
        for (const backend of restartCandidates) {
            logService.warn(`Restarting pty host for authority "${backend.remoteAuthority}"`);
            backend.restartPtyHost();
        }
    },
});
var DevModeContributionState;
(function (DevModeContributionState) {
    DevModeContributionState[DevModeContributionState["Off"] = 0] = "Off";
    DevModeContributionState[DevModeContributionState["WaitingForCapability"] = 1] = "WaitingForCapability";
    DevModeContributionState[DevModeContributionState["On"] = 2] = "On";
})(DevModeContributionState || (DevModeContributionState = {}));
let DevModeContribution = class DevModeContribution extends Disposable {
    static { DevModeContribution_1 = this; }
    static { this.ID = 'terminal.devMode'; }
    static get(instance) {
        return instance.getContribution(DevModeContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._activeDevModeDisposables = this._register(new MutableDisposable());
        this._currentColor = 0;
        this._state = 0 /* DevModeContributionState.Off */;
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */)) {
                this._updateDevMode();
            }
        }));
    }
    xtermReady(xterm) {
        this._xterm = xterm;
        this._updateDevMode();
    }
    _updateDevMode() {
        const devMode = this._isEnabled();
        this._xterm?.raw.element?.classList.toggle('dev-mode', devMode);
        const commandDetection = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (devMode) {
            if (commandDetection) {
                if (this._state === 2 /* DevModeContributionState.On */) {
                    return;
                }
                this._state = 2 /* DevModeContributionState.On */;
                const commandDecorations = new DisposableMap();
                const otherDisposables = new DisposableStore();
                this._activeDevModeDisposables.value = combinedDisposable(commandDecorations, otherDisposables, 
                // Prompt input
                this._ctx.instance.onDidBlur(() => this._updateDevMode()), this._ctx.instance.onDidFocus(() => this._updateDevMode()), commandDetection.promptInputModel.onDidChangeInput(() => this._updateDevMode()), 
                // Sequence markers
                commandDetection.onCommandFinished((command) => {
                    const colorClass = `color-${this._currentColor}`;
                    const decorations = [];
                    commandDecorations.set(command, combinedDisposable(...decorations));
                    if (command.promptStartMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.promptStartMarker,
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender((e) => {
                                e.textContent = 'A';
                                e.classList.add('xterm-sequence-decoration', 'top', 'left', colorClass);
                            }));
                        }
                    }
                    if (command.marker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.marker,
                            x: command.startX,
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender((e) => {
                                e.textContent = 'B';
                                e.classList.add('xterm-sequence-decoration', 'top', 'right', colorClass);
                            }));
                        }
                    }
                    if (command.executedMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.executedMarker,
                            x: command.executedX,
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender((e) => {
                                e.textContent = 'C';
                                e.classList.add('xterm-sequence-decoration', 'bottom', 'left', colorClass);
                            }));
                        }
                    }
                    if (command.endMarker) {
                        const d = this._ctx.instance.xterm.raw?.registerDecoration({
                            marker: command.endMarker,
                        });
                        if (d) {
                            decorations.push(d);
                            otherDisposables.add(d.onRender((e) => {
                                e.textContent = 'D';
                                e.classList.add('xterm-sequence-decoration', 'bottom', 'right', colorClass);
                            }));
                        }
                    }
                    this._currentColor = (this._currentColor + 1) % 2;
                }), commandDetection.onCommandInvalidated((commands) => {
                    for (const c of commands) {
                        const decorations = commandDecorations.get(c);
                        if (decorations) {
                            dispose(decorations);
                        }
                        commandDecorations.deleteAndDispose(c);
                    }
                }));
            }
            else {
                if (this._state === 1 /* DevModeContributionState.WaitingForCapability */) {
                    return;
                }
                this._state = 1 /* DevModeContributionState.WaitingForCapability */;
                this._activeDevModeDisposables.value =
                    this._ctx.instance.capabilities.onDidAddCapabilityType((e) => {
                        if (e === 2 /* TerminalCapability.CommandDetection */) {
                            this._updateDevMode();
                        }
                    });
            }
        }
        else {
            if (this._state === 0 /* DevModeContributionState.Off */) {
                return;
            }
            this._state = 0 /* DevModeContributionState.Off */;
            this._activeDevModeDisposables.clear();
        }
    }
    _isEnabled() {
        return this._configurationService.getValue("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */) || false;
    }
};
DevModeContribution = DevModeContribution_1 = __decorate([
    __param(1, IConfigurationService)
], DevModeContribution);
registerTerminalContribution(DevModeContribution.ID, DevModeContribution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZGV2ZWxvcGVyLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9kZXZlbG9wZXIvYnJvd3Nlci90ZXJtaW5hbC5kZXZlbG9wZXIuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEVBRWYsaUJBQWlCLEVBQ2pCLGtCQUFrQixFQUNsQixPQUFPLEdBQ1AsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FB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