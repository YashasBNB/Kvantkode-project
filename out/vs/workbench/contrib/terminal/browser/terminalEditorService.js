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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { ITerminalInstanceService, } from './terminal.js';
import { TerminalEditorInput } from './terminalEditorInput.js';
import { getInstanceFromResource } from './terminalUri.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService, ACTIVE_GROUP, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let TerminalEditorService = class TerminalEditorService extends Disposable {
    constructor(_editorService, _editorGroupsService, _terminalInstanceService, _instantiationService, lifecycleService, contextKeyService) {
        super();
        this._editorService = _editorService;
        this._editorGroupsService = _editorGroupsService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this.instances = [];
        this._activeInstanceIndex = -1;
        this._isShuttingDown = false;
        this._editorInputs = new Map();
        this._instanceDisposables = new Map();
        this._onDidDisposeInstance = this._register(new Emitter());
        this.onDidDisposeInstance = this._onDidDisposeInstance.event;
        this._onDidFocusInstance = this._register(new Emitter());
        this.onDidFocusInstance = this._onDidFocusInstance.event;
        this._onDidChangeInstanceCapability = this._register(new Emitter());
        this.onDidChangeInstanceCapability = this._onDidChangeInstanceCapability.event;
        this._onDidChangeActiveInstance = this._register(new Emitter());
        this.onDidChangeActiveInstance = this._onDidChangeActiveInstance.event;
        this._onDidChangeInstances = this._register(new Emitter());
        this.onDidChangeInstances = this._onDidChangeInstances.event;
        this._terminalEditorActive = TerminalContextKeys.terminalEditorActive.bindTo(contextKeyService);
        this._register(toDisposable(() => {
            for (const d of this._instanceDisposables.values()) {
                dispose(d);
            }
        }));
        this._register(lifecycleService.onWillShutdown(() => (this._isShuttingDown = true)));
        this._register(this._editorService.onDidActiveEditorChange(() => {
            const activeEditor = this._editorService.activeEditor;
            const instance = activeEditor instanceof TerminalEditorInput ? activeEditor?.terminalInstance : undefined;
            const terminalEditorActive = !!instance && activeEditor instanceof TerminalEditorInput;
            this._terminalEditorActive.set(terminalEditorActive);
            if (terminalEditorActive) {
                activeEditor?.setGroup(this._editorService.activeEditorPane?.group);
                this.setActiveInstance(instance);
            }
            else {
                for (const instance of this.instances) {
                    instance.resetFocusContextKey();
                }
            }
        }));
        this._register(this._editorService.onDidVisibleEditorsChange(() => {
            // add any terminal editors created via the editor service split command
            const knownIds = this.instances.map((i) => i.instanceId);
            const terminalEditors = this._getActiveTerminalEditors();
            const unknownEditor = terminalEditors.find((input) => {
                const inputId = input instanceof TerminalEditorInput ? input.terminalInstance?.instanceId : undefined;
                if (inputId === undefined) {
                    return false;
                }
                return !knownIds.includes(inputId);
            });
            if (unknownEditor instanceof TerminalEditorInput && unknownEditor.terminalInstance) {
                this._editorInputs.set(unknownEditor.terminalInstance.resource.path, unknownEditor);
                this.instances.push(unknownEditor.terminalInstance);
            }
        }));
        // Remove the terminal from the managed instances when the editor closes. This fires when
        // dragging and dropping to another editor or closing the editor via cmd/ctrl+w.
        this._register(this._editorService.onDidCloseEditor((e) => {
            const instance = e.editor instanceof TerminalEditorInput ? e.editor.terminalInstance : undefined;
            if (instance) {
                const instanceIndex = this.instances.findIndex((e) => e === instance);
                if (instanceIndex !== -1) {
                    const wasActiveInstance = this.instances[instanceIndex] === this.activeInstance;
                    this._removeInstance(instance);
                    if (wasActiveInstance) {
                        this.setActiveInstance(undefined);
                    }
                }
            }
        }));
    }
    _getActiveTerminalEditors() {
        return this._editorService.visibleEditors.filter((e) => e instanceof TerminalEditorInput && e.terminalInstance?.instanceId);
    }
    get activeInstance() {
        if (this.instances.length === 0 || this._activeInstanceIndex === -1) {
            return undefined;
        }
        return this.instances[this._activeInstanceIndex];
    }
    setActiveInstance(instance) {
        this._activeInstanceIndex = instance ? this.instances.findIndex((e) => e === instance) : -1;
        this._onDidChangeActiveInstance.fire(this.activeInstance);
    }
    async focusInstance(instance) {
        return instance.focusWhenReady(true);
    }
    async focusActiveInstance() {
        return this.activeInstance?.focusWhenReady(true);
    }
    async openEditor(instance, editorOptions) {
        const resource = this.resolveResource(instance);
        if (resource) {
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = {
                instanceId: instance.instanceId,
                promise: this._editorService.openEditor({
                    resource,
                    description: instance.description || instance.shellLaunchConfig.type,
                    options: {
                        pinned: true,
                        forceReload: true,
                        preserveFocus: editorOptions?.preserveFocus,
                    },
                }, editorOptions?.viewColumn ?? ACTIVE_GROUP),
            };
            await this._activeOpenEditorRequest?.promise;
            this._activeOpenEditorRequest = undefined;
        }
    }
    resolveResource(instance) {
        const resource = instance.resource;
        const inputKey = resource.path;
        const cachedEditor = this._editorInputs.get(inputKey);
        if (cachedEditor) {
            return cachedEditor.resource;
        }
        instance.target = TerminalLocation.Editor;
        const input = this._instantiationService.createInstance(TerminalEditorInput, resource, instance);
        this._registerInstance(inputKey, input, instance);
        return input.resource;
    }
    getInputFromResource(resource) {
        const input = this._editorInputs.get(resource.path);
        if (!input) {
            throw new Error(`Could not get input from resource: ${resource.path}`);
        }
        return input;
    }
    _registerInstance(inputKey, input, instance) {
        this._editorInputs.set(inputKey, input);
        this._instanceDisposables.set(inputKey, [
            instance.onDidFocus(this._onDidFocusInstance.fire, this._onDidFocusInstance),
            instance.onDisposed(this._onDidDisposeInstance.fire, this._onDidDisposeInstance),
            instance.capabilities.onDidAddCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
            instance.capabilities.onDidRemoveCapabilityType(() => this._onDidChangeInstanceCapability.fire(instance)),
        ]);
        this.instances.push(instance);
        this._onDidChangeInstances.fire();
    }
    _removeInstance(instance) {
        const inputKey = instance.resource.path;
        this._editorInputs.delete(inputKey);
        const instanceIndex = this.instances.findIndex((e) => e === instance);
        if (instanceIndex !== -1) {
            this.instances.splice(instanceIndex, 1);
        }
        const disposables = this._instanceDisposables.get(inputKey);
        this._instanceDisposables.delete(inputKey);
        if (disposables) {
            dispose(disposables);
        }
        this._onDidChangeInstances.fire();
    }
    getInstanceFromResource(resource) {
        return getInstanceFromResource(this.instances, resource);
    }
    splitInstance(instanceToSplit, shellLaunchConfig = {}) {
        if (instanceToSplit.target === TerminalLocation.Editor) {
            // Make sure the instance to split's group is active
            const group = this._editorInputs.get(instanceToSplit.resource.path)?.group;
            if (group) {
                this._editorGroupsService.activateGroup(group);
            }
        }
        const instance = this._terminalInstanceService.createInstance(shellLaunchConfig, TerminalLocation.Editor);
        const resource = this.resolveResource(instance);
        if (resource) {
            this._editorService.openEditor({
                resource: URI.revive(resource),
                description: instance.description,
                options: {
                    pinned: true,
                    forceReload: true,
                },
            }, SIDE_GROUP);
        }
        return instance;
    }
    reviveInput(deserializedInput) {
        if ('pid' in deserializedInput) {
            const newDeserializedInput = { ...deserializedInput, findRevivedId: true };
            const instance = this._terminalInstanceService.createInstance({ attachPersistentProcess: newDeserializedInput }, TerminalLocation.Editor);
            const input = this._instantiationService.createInstance(TerminalEditorInput, instance.resource, instance);
            this._registerInstance(instance.resource.path, input, instance);
            return input;
        }
        else {
            throw new Error(`Could not revive terminal editor input, ${deserializedInput}`);
        }
    }
    detachInstance(instance) {
        const inputKey = instance.resource.path;
        const editorInput = this._editorInputs.get(inputKey);
        editorInput?.detachInstance();
        this._removeInstance(instance);
        // Don't dispose the input when shutting down to avoid layouts in the editor area
        if (!this._isShuttingDown) {
            editorInput?.dispose();
        }
    }
    async revealActiveEditor(preserveFocus) {
        const instance = this.activeInstance;
        if (!instance) {
            return;
        }
        // If there is an active openEditor call for this instance it will be revealed by that
        if (this._activeOpenEditorRequest?.instanceId === instance.instanceId) {
            return;
        }
        const editorInput = this._editorInputs.get(instance.resource.path);
        this._editorService.openEditor(editorInput, {
            pinned: true,
            forceReload: true,
            preserveFocus,
            activation: EditorActivation.PRESERVE,
        });
    }
};
TerminalEditorService = __decorate([
    __param(0, IEditorService),
    __param(1, IEditorGroupsService),
    __param(2, ITerminalInstanceService),
    __param(3, IInstantiationService),
    __param(4, ILifecycleService),
    __param(5, IContextKeyService)
], TerminalEditorService);
export { TerminalEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvYnJvd3Nlci90ZXJtaW5hbEVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFDTixVQUFVLEVBQ1YsT0FBTyxFQUVQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDL0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUVOLGdCQUFnQixHQUNoQixNQUFNLGtEQUFrRCxDQUFBO0FBR3pELE9BQU8sRUFJTix3QkFBd0IsR0FFeEIsTUFBTSxlQUFlLENBQUE7QUFDdEIsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDMUQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUNOLGNBQWMsRUFDZCxZQUFZLEVBQ1osVUFBVSxHQUNWLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFFNUUsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBNkJwRCxZQUNpQixjQUErQyxFQUN6QyxvQkFBMkQsRUFDdkQsd0JBQW1FLEVBQ3RFLHFCQUE2RCxFQUNqRSxnQkFBbUMsRUFDbEMsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBUDBCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUN4Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBQ3RDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBMEI7UUFDckQsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQTlCckYsY0FBUyxHQUF3QixFQUFFLENBQUE7UUFDM0IseUJBQW9CLEdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDakMsb0JBQWUsR0FBRyxLQUFLLENBQUE7UUFRdkIsa0JBQWEsR0FBa0QsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUN4RSx5QkFBb0IsR0FBNEMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQUVoRSwwQkFBcUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUE7UUFDaEYseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQUMvQyx3QkFBbUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUE7UUFDOUUsdUJBQWtCLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQTtRQUMzQyxtQ0FBOEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFxQixDQUFDLENBQUE7UUFDekYsa0NBQTZCLEdBQUcsSUFBSSxDQUFDLDhCQUE4QixDQUFDLEtBQUssQ0FBQTtRQUNqRSwrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMzRCxJQUFJLE9BQU8sRUFBaUMsQ0FDNUMsQ0FBQTtRQUNRLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFDekQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDbkUseUJBQW9CLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQTtRQVcvRCxJQUFJLENBQUMscUJBQXFCLEdBQUcsbUJBQW1CLENBQUMsb0JBQW9CLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDL0YsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ2pCLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUM7Z0JBQ3BELE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNYLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFO1lBQ2hELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFBO1lBQ3JELE1BQU0sUUFBUSxHQUNiLFlBQVksWUFBWSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsWUFBWSxFQUFFLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7WUFDekYsTUFBTSxvQkFBb0IsR0FBRyxDQUFDLENBQUMsUUFBUSxJQUFJLFlBQVksWUFBWSxtQkFBbUIsQ0FBQTtZQUN0RixJQUFJLENBQUMscUJBQXFCLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDcEQsSUFBSSxvQkFBb0IsRUFBRSxDQUFDO2dCQUMxQixZQUFZLEVBQUUsUUFBUSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ25FLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUNqQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsS0FBSyxNQUFNLFFBQVEsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQ3ZDLFFBQVEsQ0FBQyxvQkFBb0IsRUFBRSxDQUFBO2dCQUNoQyxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFO1lBQ2xELHdFQUF3RTtZQUN4RSxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFBO1lBQ3hELE1BQU0sYUFBYSxHQUFHLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtnQkFDcEQsTUFBTSxPQUFPLEdBQ1osS0FBSyxZQUFZLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUE7Z0JBQ3RGLElBQUksT0FBTyxLQUFLLFNBQVMsRUFBRSxDQUFDO29CQUMzQixPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUNELE9BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ25DLENBQUMsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxhQUFhLFlBQVksbUJBQW1CLElBQUksYUFBYSxDQUFDLGdCQUFnQixFQUFFLENBQUM7Z0JBQ3BGLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLGFBQWEsQ0FBQyxDQUFBO2dCQUNuRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtZQUNwRCxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHlGQUF5RjtRQUN6RixnRkFBZ0Y7UUFDaEYsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUMsTUFBTSxRQUFRLEdBQ2IsQ0FBQyxDQUFDLE1BQU0sWUFBWSxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFBO1lBQ2hGLElBQUksUUFBUSxFQUFFLENBQUM7Z0JBQ2QsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQTtnQkFDckUsSUFBSSxhQUFhLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztvQkFDMUIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLGFBQWEsQ0FBQyxLQUFLLElBQUksQ0FBQyxjQUFjLENBQUE7b0JBQy9FLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUSxDQUFDLENBQUE7b0JBQzlCLElBQUksaUJBQWlCLEVBQUUsQ0FBQzt3QkFDdkIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxDQUFBO29CQUNsQyxDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyx5QkFBeUI7UUFDaEMsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQy9DLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFlBQVksbUJBQW1CLElBQUksQ0FBQyxDQUFDLGdCQUFnQixFQUFFLFVBQVUsQ0FDekUsQ0FBQTtJQUNGLENBQUM7SUFFRCxJQUFJLGNBQWM7UUFDakIsSUFBSSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLG9CQUFvQixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDckUsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtJQUNqRCxDQUFDO0lBRUQsaUJBQWlCLENBQUMsUUFBdUM7UUFDeEQsSUFBSSxDQUFDLG9CQUFvQixHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0YsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDMUQsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBMkI7UUFDOUMsT0FBTyxRQUFRLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxLQUFLLENBQUMsbUJBQW1CO1FBQ3hCLE9BQU8sSUFBSSxDQUFDLGNBQWMsRUFBRSxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDakQsQ0FBQztJQUVELEtBQUssQ0FBQyxVQUFVLENBQ2YsUUFBMkIsRUFDM0IsYUFBc0M7UUFFdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMvQyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsTUFBTSxJQUFJLENBQUMsd0JBQXdCLEVBQUUsT0FBTyxDQUFBO1lBQzVDLElBQUksQ0FBQyx3QkFBd0IsR0FBRztnQkFDL0IsVUFBVSxFQUFFLFFBQVEsQ0FBQyxVQUFVO2dCQUMvQixPQUFPLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxVQUFVLENBQ3RDO29CQUNDLFFBQVE7b0JBQ1IsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLElBQUksUUFBUSxDQUFDLGlCQUFpQixDQUFDLElBQUk7b0JBQ3BFLE9BQU8sRUFBRTt3QkFDUixNQUFNLEVBQUUsSUFBSTt3QkFDWixXQUFXLEVBQUUsSUFBSTt3QkFDakIsYUFBYSxFQUFFLGFBQWEsRUFBRSxhQUFhO3FCQUMzQztpQkFDRCxFQUNELGFBQWEsRUFBRSxVQUFVLElBQUksWUFBWSxDQUN6QzthQUNELENBQUE7WUFDRCxNQUFNLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxPQUFPLENBQUE7WUFDNUMsSUFBSSxDQUFDLHdCQUF3QixHQUFHLFNBQVMsQ0FBQTtRQUMxQyxDQUFDO0lBQ0YsQ0FBQztJQUVELGVBQWUsQ0FBQyxRQUEyQjtRQUMxQyxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFBO1FBQ2xDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUE7UUFDOUIsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUE7UUFFckQsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNsQixPQUFPLFlBQVksQ0FBQyxRQUFRLENBQUE7UUFDN0IsQ0FBQztRQUVELFFBQVEsQ0FBQyxNQUFNLEdBQUcsZ0JBQWdCLENBQUMsTUFBTSxDQUFBO1FBQ3pDLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2hHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ2pELE9BQU8sS0FBSyxDQUFDLFFBQVEsQ0FBQTtJQUN0QixDQUFDO0lBRUQsb0JBQW9CLENBQUMsUUFBYTtRQUNqQyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbkQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1lBQ1osTUFBTSxJQUFJLEtBQUssQ0FBQyxzQ0FBc0MsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDLENBQUE7UUFDdkUsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLGlCQUFpQixDQUN4QixRQUFnQixFQUNoQixLQUEwQixFQUMxQixRQUEyQjtRQUUzQixJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUU7WUFDdkMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxtQkFBbUIsQ0FBQztZQUM1RSxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLHFCQUFxQixDQUFDO1lBQ2hGLFFBQVEsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsR0FBRyxFQUFFLENBQ2pELElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQ2xEO1lBQ0QsUUFBUSxDQUFDLFlBQVksQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUUsQ0FDcEQsSUFBSSxDQUFDLDhCQUE4QixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FDbEQ7U0FDRCxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM3QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDbEMsQ0FBQztJQUVPLGVBQWUsQ0FBQyxRQUEyQjtRQUNsRCxNQUFNLFFBQVEsR0FBRyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQTtRQUN2QyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNuQyxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFBO1FBQ3JFLElBQUksYUFBYSxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLENBQUM7UUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUMsSUFBSSxXQUFXLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDckIsQ0FBQztRQUNELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUNsQyxDQUFDO0lBRUQsdUJBQXVCLENBQUMsUUFBYztRQUNyQyxPQUFPLHVCQUF1QixDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVELGFBQWEsQ0FDWixlQUFrQyxFQUNsQyxvQkFBd0MsRUFBRTtRQUUxQyxJQUFJLGVBQWUsQ0FBQyxNQUFNLEtBQUssZ0JBQWdCLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDeEQsb0RBQW9EO1lBQ3BELE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxDQUFBO1lBQzFFLElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUMvQyxDQUFDO1FBQ0YsQ0FBQztRQUNELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQzVELGlCQUFpQixFQUNqQixnQkFBZ0IsQ0FBQyxNQUFNLENBQ3ZCLENBQUE7UUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLElBQUksUUFBUSxFQUFFLENBQUM7WUFDZCxJQUFJLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FDN0I7Z0JBQ0MsUUFBUSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO2dCQUM5QixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7Z0JBQ2pDLE9BQU8sRUFBRTtvQkFDUixNQUFNLEVBQUUsSUFBSTtvQkFDWixXQUFXLEVBQUUsSUFBSTtpQkFDakI7YUFDRCxFQUNELFVBQVUsQ0FDVixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7SUFFRCxXQUFXLENBQUMsaUJBQW1EO1FBQzlELElBQUksS0FBSyxJQUFJLGlCQUFpQixFQUFFLENBQUM7WUFDaEMsTUFBTSxvQkFBb0IsR0FBRyxFQUFFLEdBQUcsaUJBQWlCLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUFBO1lBQzFFLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQzVELEVBQUUsdUJBQXVCLEVBQUUsb0JBQW9CLEVBQUUsRUFDakQsZ0JBQWdCLENBQUMsTUFBTSxDQUN2QixDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGNBQWMsQ0FDdEQsbUJBQW1CLEVBQ25CLFFBQVEsQ0FBQyxRQUFRLEVBQ2pCLFFBQVEsQ0FDUixDQUFBO1lBQ0QsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxRQUFRLENBQUMsQ0FBQTtZQUMvRCxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxJQUFJLEtBQUssQ0FBQywyQ0FBMkMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hGLENBQUM7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUFDLFFBQTJCO1FBQ3pDLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3BELFdBQVcsRUFBRSxjQUFjLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLGlGQUFpRjtRQUNqRixJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLFdBQVcsRUFBRSxPQUFPLEVBQUUsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxhQUF1QjtRQUMvQyxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsY0FBYyxDQUFBO1FBQ3BDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE9BQU07UUFDUCxDQUFDO1FBRUQsc0ZBQXNGO1FBQ3RGLElBQUksSUFBSSxDQUFDLHdCQUF3QixFQUFFLFVBQVUsS0FBSyxRQUFRLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDdkUsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBRSxDQUFBO1FBQ25FLElBQUksQ0FBQyxjQUFjLENBQUMsVUFBVSxDQUFDLFdBQVcsRUFBRTtZQUMzQyxNQUFNLEVBQUUsSUFBSTtZQUNaLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLGFBQWE7WUFDYixVQUFVLEVBQUUsZ0JBQWdCLENBQUMsUUFBUTtTQUNyQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQTVTWSxxQkFBcUI7SUE4Qi9CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxvQkFBb0IsQ0FBQTtJQUNwQixXQUFBLHdCQUF3QixDQUFBO0lBQ3hCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLGtCQUFrQixDQUFBO0dBbkNSLHFCQUFxQixDQTRTakMifQ==