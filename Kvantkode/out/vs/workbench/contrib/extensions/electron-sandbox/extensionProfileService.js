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
import { disposableWindowInterval } from '../../../../base/browser/dom.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifierMap, } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { RuntimeExtensionsInput } from '../common/runtimeExtensionsInput.js';
import { ProfileSessionState } from './runtimeExtensionsEditor.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { ExtensionHostProfiler } from '../../../services/extensions/electron-sandbox/extensionHostProfiler.js';
import { IStatusbarService, } from '../../../services/statusbar/browser/statusbar.js';
let ExtensionHostProfileService = class ExtensionHostProfileService extends Disposable {
    get state() {
        return this._state;
    }
    get lastProfile() {
        return this._profile;
    }
    constructor(_extensionService, _editorService, _instantiationService, _nativeHostService, _dialogService, _statusbarService, _productService) {
        super();
        this._extensionService = _extensionService;
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._nativeHostService = _nativeHostService;
        this._dialogService = _dialogService;
        this._statusbarService = _statusbarService;
        this._productService = _productService;
        this._onDidChangeState = this._register(new Emitter());
        this.onDidChangeState = this._onDidChangeState.event;
        this._onDidChangeLastProfile = this._register(new Emitter());
        this.onDidChangeLastProfile = this._onDidChangeLastProfile.event;
        this._unresponsiveProfiles = new ExtensionIdentifierMap();
        this._state = ProfileSessionState.None;
        this.profilingStatusBarIndicatorLabelUpdater = this._register(new MutableDisposable());
        this._profile = null;
        this._profileSession = null;
        this._setState(ProfileSessionState.None);
        CommandsRegistry.registerCommand('workbench.action.extensionHostProfiler.stop', () => {
            this.stopProfiling();
            this._editorService.openEditor(RuntimeExtensionsInput.instance, { pinned: true });
        });
    }
    _setState(state) {
        if (this._state === state) {
            return;
        }
        this._state = state;
        if (this._state === ProfileSessionState.Running) {
            this.updateProfilingStatusBarIndicator(true);
        }
        else if (this._state === ProfileSessionState.Stopping) {
            this.updateProfilingStatusBarIndicator(false);
        }
        this._onDidChangeState.fire(undefined);
    }
    updateProfilingStatusBarIndicator(visible) {
        this.profilingStatusBarIndicatorLabelUpdater.clear();
        if (visible) {
            const indicator = {
                name: nls.localize('status.profiler', 'Extension Profiler'),
                text: nls.localize('profilingExtensionHost', 'Profiling Extension Host'),
                showProgress: true,
                ariaLabel: nls.localize('profilingExtensionHost', 'Profiling Extension Host'),
                tooltip: nls.localize('selectAndStartDebug', 'Click to stop profiling.'),
                command: 'workbench.action.extensionHostProfiler.stop',
            };
            const timeStarted = Date.now();
            const handle = disposableWindowInterval(mainWindow, () => {
                this.profilingStatusBarIndicator?.update({
                    ...indicator,
                    text: nls.localize('profilingExtensionHostTime', 'Profiling Extension Host ({0} sec)', Math.round((new Date().getTime() - timeStarted) / 1000)),
                });
            }, 1000);
            this.profilingStatusBarIndicatorLabelUpdater.value = handle;
            if (!this.profilingStatusBarIndicator) {
                this.profilingStatusBarIndicator = this._statusbarService.addEntry(indicator, 'status.profiler', 1 /* StatusbarAlignment.RIGHT */);
            }
            else {
                this.profilingStatusBarIndicator.update(indicator);
            }
        }
        else {
            if (this.profilingStatusBarIndicator) {
                this.profilingStatusBarIndicator.dispose();
                this.profilingStatusBarIndicator = undefined;
            }
        }
    }
    async startProfiling() {
        if (this._state !== ProfileSessionState.None) {
            return null;
        }
        const inspectPorts = await this._extensionService.getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, true);
        if (inspectPorts.length === 0) {
            return this._dialogService
                .confirm({
                type: 'info',
                message: nls.localize('restart1', 'Profile Extensions'),
                detail: nls.localize('restart2', "In order to profile extensions a restart is required. Do you want to restart '{0}' now?", this._productService.nameLong),
                primaryButton: nls.localize({ key: 'restart3', comment: ['&& denotes a mnemonic'] }, '&&Restart'),
            })
                .then((res) => {
                if (res.confirmed) {
                    this._nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
            });
        }
        if (inspectPorts.length > 1) {
            // TODO
            console.warn(`There are multiple extension hosts available for profiling. Picking the first one...`);
        }
        this._setState(ProfileSessionState.Starting);
        return this._instantiationService
            .createInstance(ExtensionHostProfiler, inspectPorts[0].host, inspectPorts[0].port)
            .start()
            .then((value) => {
            this._profileSession = value;
            this._setState(ProfileSessionState.Running);
        }, (err) => {
            onUnexpectedError(err);
            this._setState(ProfileSessionState.None);
        });
    }
    stopProfiling() {
        if (this._state !== ProfileSessionState.Running || !this._profileSession) {
            return;
        }
        this._setState(ProfileSessionState.Stopping);
        this._profileSession.stop().then((result) => {
            this._setLastProfile(result);
            this._setState(ProfileSessionState.None);
        }, (err) => {
            onUnexpectedError(err);
            this._setState(ProfileSessionState.None);
        });
        this._profileSession = null;
    }
    _setLastProfile(profile) {
        this._profile = profile;
        this.lastProfileSavedTo = undefined;
        this._onDidChangeLastProfile.fire(undefined);
    }
    getUnresponsiveProfile(extensionId) {
        return this._unresponsiveProfiles.get(extensionId);
    }
    setUnresponsiveProfile(extensionId, profile) {
        this._unresponsiveProfiles.set(extensionId, profile);
        this._setLastProfile(profile);
    }
};
ExtensionHostProfileService = __decorate([
    __param(0, IExtensionService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, INativeHostService),
    __param(4, IDialogService),
    __param(5, IStatusbarService),
    __param(6, IProductService)
], ExtensionHostProfileService);
export { ExtensionHostProfileService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUHJvZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9leHRlbnNpb25Qcm9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNwRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0QsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RSxP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