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
var TerminalEditorInput_1;
import { localize } from '../../../../nls.js';
import Severity from '../../../../base/common/severity.js';
import { dispose, toDisposable } from '../../../../base/common/lifecycle.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { ITerminalInstanceService, terminalEditorId } from './terminal.js';
import { getColorClass, getUriClasses } from './terminalIcon.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalExitReason, TerminalLocation, } from '../../../../platform/terminal/common/terminal.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { TerminalContextKeys } from '../common/terminalContextKey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { Emitter } from '../../../../base/common/event.js';
let TerminalEditorInput = class TerminalEditorInput extends EditorInput {
    static { TerminalEditorInput_1 = this; }
    static { this.ID = 'workbench.editors.terminal'; }
    setGroup(group) {
        this._group = group;
        if (group?.scopedContextKeyService) {
            this._terminalInstance?.setParentContextKeyService(group.scopedContextKeyService);
        }
    }
    get group() {
        return this._group;
    }
    get typeId() {
        return TerminalEditorInput_1.ID;
    }
    get editorId() {
        return terminalEditorId;
    }
    get capabilities() {
        return (2 /* EditorInputCapabilities.Readonly */ |
            8 /* EditorInputCapabilities.Singleton */ |
            128 /* EditorInputCapabilities.CanDropIntoEditor */ |
            64 /* EditorInputCapabilities.ForceDescription */);
    }
    setTerminalInstance(instance) {
        if (this._terminalInstance) {
            throw new Error('cannot set instance that has already been set');
        }
        this._terminalInstance = instance;
        this._setupInstanceListeners();
    }
    copy() {
        const instance = this._terminalInstanceService.createInstance(this._copyLaunchConfig || {}, TerminalLocation.Editor);
        instance.focusWhenReady();
        this._copyLaunchConfig = undefined;
        return this._instantiationService.createInstance(TerminalEditorInput_1, instance.resource, instance);
    }
    /**
     * Sets the launch config to use for the next call to EditorInput.copy, which will be used when
     * the editor's split command is run.
     */
    setCopyLaunchConfig(launchConfig) {
        this._copyLaunchConfig = launchConfig;
    }
    /**
     * Returns the terminal instance for this input if it has not yet been detached from the input.
     */
    get terminalInstance() {
        return this._isDetached ? undefined : this._terminalInstance;
    }
    showConfirm() {
        if (this._isReverted) {
            return false;
        }
        const confirmOnKill = this._configurationService.getValue("terminal.integrated.confirmOnKill" /* TerminalSettingId.ConfirmOnKill */);
        if (confirmOnKill === 'editor' || confirmOnKill === 'always') {
            return this._terminalInstance?.hasChildProcesses || false;
        }
        return false;
    }
    async confirm(terminals) {
        const { confirmed } = await this._dialogService.confirm({
            type: Severity.Warning,
            message: localize('confirmDirtyTerminal.message', 'Do you want to terminate running processes?'),
            primaryButton: localize({ key: 'confirmDirtyTerminal.button', comment: ['&& denotes a mnemonic'] }, '&&Terminate'),
            detail: terminals.length > 1
                ? terminals.map((terminal) => terminal.editor.getName()).join('\n') +
                    '\n\n' +
                    localize('confirmDirtyTerminals.detail', 'Closing will terminate the running processes in the terminals.')
                : localize('confirmDirtyTerminal.detail', 'Closing will terminate the running processes in this terminal.'),
        });
        return confirmed ? 1 /* ConfirmResult.DONT_SAVE */ : 2 /* ConfirmResult.CANCEL */;
    }
    async revert() {
        // On revert just treat the terminal as permanently non-dirty
        this._isReverted = true;
    }
    constructor(resource, _terminalInstance, _themeService, _terminalInstanceService, _instantiationService, _configurationService, _lifecycleService, _contextKeyService, _dialogService) {
        super();
        this.resource = resource;
        this._terminalInstance = _terminalInstance;
        this._themeService = _themeService;
        this._terminalInstanceService = _terminalInstanceService;
        this._instantiationService = _instantiationService;
        this._configurationService = _configurationService;
        this._lifecycleService = _lifecycleService;
        this._contextKeyService = _contextKeyService;
        this._dialogService = _dialogService;
        this.closeHandler = this;
        this._isDetached = false;
        this._isShuttingDown = false;
        this._isReverted = false;
        this._onDidRequestAttach = this._register(new Emitter());
        this.onDidRequestAttach = this._onDidRequestAttach.event;
        this._terminalEditorFocusContextKey = TerminalContextKeys.editorFocus.bindTo(_contextKeyService);
        if (_terminalInstance) {
            this._setupInstanceListeners();
        }
    }
    _setupInstanceListeners() {
        const instance = this._terminalInstance;
        if (!instance) {
            return;
        }
        const instanceOnDidFocusListener = instance.onDidFocus(() => this._terminalEditorFocusContextKey.set(true));
        const instanceOnDidBlurListener = instance.onDidBlur(() => this._terminalEditorFocusContextKey.reset());
        this._register(toDisposable(() => {
            if (!this._isDetached && !this._isShuttingDown) {
                // Will be ignored if triggered by onExit or onDisposed terminal events
                // as disposed was already called
                instance.dispose(TerminalExitReason.User);
            }
            dispose([instanceOnDidFocusListener, instanceOnDidBlurListener]);
        }));
        const disposeListeners = [
            instance.onExit((e) => {
                if (!instance.waitOnExit) {
                    this.dispose();
                }
            }),
            instance.onDisposed(() => this.dispose()),
            instance.onTitleChanged(() => this._onDidChangeLabel.fire()),
            instance.onIconChanged(() => this._onDidChangeLabel.fire()),
            instanceOnDidFocusListener,
            instanceOnDidBlurListener,
            instance.statusList.onDidChangePrimaryStatus(() => this._onDidChangeLabel.fire()),
        ];
        // Don't dispose editor when instance is torn down on shutdown to avoid extra work and so
        // the editor/tabs don't disappear
        this._lifecycleService.onWillShutdown((e) => {
            this._isShuttingDown = true;
            dispose(disposeListeners);
            // Don't touch processes if the shutdown was a result of reload as they will be reattached
            const shouldPersistTerminals = this._configurationService.getValue("terminal.integrated.enablePersistentSessions" /* TerminalSettingId.EnablePersistentSessions */) &&
                e.reason === 3 /* ShutdownReason.RELOAD */;
            if (shouldPersistTerminals) {
                instance.detachProcessAndDispose(TerminalExitReason.Shutdown);
            }
            else {
                instance.dispose(TerminalExitReason.Shutdown);
            }
        });
    }
    getName() {
        return this._terminalInstance?.title || this.resource.fragment;
    }
    getIcon() {
        if (!this._terminalInstance || !ThemeIcon.isThemeIcon(this._terminalInstance.icon)) {
            return undefined;
        }
        return this._terminalInstance.icon;
    }
    getLabelExtraClasses() {
        if (!this._terminalInstance) {
            return [];
        }
        const extraClasses = ['terminal-tab', 'predefined-file-icon'];
        const colorClass = getColorClass(this._terminalInstance);
        if (colorClass) {
            extraClasses.push(colorClass);
        }
        const uriClasses = getUriClasses(this._terminalInstance, this._themeService.getColorTheme().type);
        if (uriClasses) {
            extraClasses.push(...uriClasses);
        }
        return extraClasses;
    }
    /**
     * Detach the instance from the input such that when the input is disposed it will not dispose
     * of the terminal instance/process.
     */
    detachInstance() {
        if (!this._isShuttingDown) {
            this._terminalInstance?.detachFromElement();
            this._terminalInstance?.setParentContextKeyService(this._contextKeyService);
            this._isDetached = true;
        }
    }
    getDescription() {
        return this._terminalInstance?.description;
    }
    toUntyped() {
        return {
            resource: this.resource,
            options: {
                override: terminalEditorId,
                pinned: true,
                forceReload: true,
            },
        };
    }
};
TerminalEditorInput = TerminalEditorInput_1 = __decorate([
    __param(2, IThemeService),
    __param(3, ITerminalInstanceService),
    __param(4, IInstantiationService),
    __param(5, IConfigurationService),
    __param(6, ILifecycleService),
    __param(7, IContextKeyService),
    __param(8, IDialogService)
], TerminalEditorInput);
export { TerminalEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFPNUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUF1QixNQUFNLHVDQUF1QyxDQUFBO0FBQ3hGLE9BQU8sRUFBcUIsd0JBQXdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGdCQUFnQixHQUVoQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE9BQU8sRUFDTixpQkFBaUIsR0FHakIsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RCxPQUFPLEVBRU4sa0JBQWtCLEdBQ2xCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFpQixj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