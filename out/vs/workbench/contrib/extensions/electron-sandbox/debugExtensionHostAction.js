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
import { Codicon } from '../../../../base/common/codicons.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { randomPort } from '../../../../base/common/ports.js';
import * as nls from '../../../../nls.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IProgressService, } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IDebugService } from '../../debug/common/debug.js';
import { RuntimeExtensionsEditor } from './runtimeExtensionsEditor.js';
export class DebugExtensionHostAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.extensions.action.debugExtensionHost',
            title: {
                value: nls.localize('debugExtensionHost', 'Start Debugging Extension Host In New Window'),
                original: 'Start Debugging Extension Host In New Window',
            },
            category: Categories.Developer,
            f1: true,
            icon: Codicon.debugStart,
            menu: {
                id: MenuId.EditorTitle,
                when: ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID),
                group: 'navigation',
            },
        });
    }
    run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const extensionService = accessor.get(IExtensionService);
        const productService = accessor.get(IProductService);
        const instantiationService = accessor.get(IInstantiationService);
        const hostService = accessor.get(IHostService);
        extensionService
            .getInspectPorts(1 /* ExtensionHostKind.LocalProcess */, false)
            .then(async (inspectPorts) => {
            if (inspectPorts.length === 0) {
                const res = await dialogService.confirm({
                    message: nls.localize('restart1', 'Debug Extensions'),
                    detail: nls.localize('restart2', "In order to debug extensions a restart is required. Do you want to restart '{0}' now?", productService.nameLong),
                    primaryButton: nls.localize({ key: 'restart3', comment: ['&& denotes a mnemonic'] }, '&&Restart'),
                });
                if (res.confirmed) {
                    await nativeHostService.relaunch({ addArgs: [`--inspect-extensions=${randomPort()}`] });
                }
                return;
            }
            if (inspectPorts.length > 1) {
                // TODO
                console.warn(`There are multiple extension hosts available for debugging. Picking the first one...`);
            }
            const s = instantiationService.createInstance(Storage);
            s.storeDebugOnNewWindow(inspectPorts[0].port);
            hostService.openWindow();
        });
    }
}
let Storage = class Storage {
    constructor(_storageService) {
        this._storageService = _storageService;
    }
    storeDebugOnNewWindow(targetPort) {
        this._storageService.store('debugExtensionHost.debugPort', targetPort, -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
    }
    getAndDeleteDebugPortIfSet() {
        const port = this._storageService.getNumber('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        if (port !== undefined) {
            this._storageService.remove('debugExtensionHost.debugPort', -1 /* StorageScope.APPLICATION */);
        }
        return port;
    }
};
Storage = __decorate([
    __param(0, IStorageService)
], Storage);
let DebugExtensionsContribution = class DebugExtensionsContribution extends Disposable {
    constructor(_debugService, _instantiationService, _progressService) {
        super();
        this._debugService = _debugService;
        this._instantiationService = _instantiationService;
        const storage = this._instantiationService.createInstance(Storage);
        const port = storage.getAndDeleteDebugPortIfSet();
        if (port !== undefined) {
            _progressService.withProgress({
                location: 15 /* ProgressLocation.Notification */,
                title: nls.localize('debugExtensionHost.progress', 'Attaching Debugger To Extension Host'),
            }, async (p) => {
                // eslint-disable-next-line local/code-no-dangerous-type-assertions
                await this._debugService.startDebugging(undefined, {
                    type: 'node',
                    name: nls.localize('debugExtensionHost.launch.name', 'Attach Extension Host'),
                    request: 'attach',
                    port,
                    trace: true,
                    // resolve source maps everywhere:
                    resolveSourceMapLocations: null,
                    // announces sources eagerly for the loaded scripts view:
                    eagerSources: true,
                    // source maps of published VS Code are on the CDN and can take a while to load
                    timeouts: {
                        sourceMapMinPause: 30_000,
                        sourceMapCumulativePause: 300_000,
                    },
                });
            });
        }
    }
};
DebugExtensionsContribution = __decorate([
    __param(0, IDebugService),
    __param(1, IInstantiationService),
    __param(2, IProgressService)
], DebugExtensionsContribution);
export { DebugExtensionsContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHRlbnNpb25Ib3N0QWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9lbGVjdHJvbi1zYW5kYm94L2RlYnVnRXh0ZW5zaW9uSG9zdEFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFHcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdD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