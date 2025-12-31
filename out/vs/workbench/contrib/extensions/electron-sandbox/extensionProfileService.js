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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uUHJvZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvZXh0ZW5zaW9uUHJvZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDcEYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFFTixzQkFBc0IsR0FDdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFnQyxtQkFBbUIsRUFBRSxN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