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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZGV2ZWxvcGVyLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2RldmVsb3Blci9icm93c2VyL3Rlcm1pbmFsLmRldmVsb3Blci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFDTixVQUFVLEVBQ1YsYUFBYSxFQUNiLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsa0JBQWtCLEVBQ2xCLE9BQU8sR0FDUCxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsY0FBYyxF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