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
var TerminalStickyScrollContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { TerminalInstance, TerminalInstanceColorProvider, } from '../../../terminal/browser/terminalInstance.js';
import './media/stickyScroll.css';
import { TerminalStickyScrollOverlay } from './terminalStickyScrollOverlay.js';
let TerminalStickyScrollContribution = class TerminalStickyScrollContribution extends Disposable {
    static { TerminalStickyScrollContribution_1 = this; }
    static { this.ID = 'terminal.stickyScroll'; }
    static get(instance) {
        return instance.getContribution(TerminalStickyScrollContribution_1.ID);
    }
    constructor(_ctx, _configurationService, _contextKeyService, _instantiationService, _keybindingService) {
        super();
        this._ctx = _ctx;
        this._configurationService = _configurationService;
        this._contextKeyService = _contextKeyService;
        this._instantiationService = _instantiationService;
        this._keybindingService = _keybindingService;
        this._overlay = this._register(new MutableDisposable());
        this._enableListeners = this._register(new MutableDisposable());
        this._disableListeners = this._register(new MutableDisposable());
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */)) {
                this._refreshState();
            }
        }));
    }
    xtermReady(xterm) {
        this._xterm = xterm;
        this._refreshState();
    }
    xtermOpen(xterm) {
        this._refreshState();
    }
    hideLock() {
        this._overlay.value?.lockHide();
    }
    hideUnlock() {
        this._overlay.value?.unlockHide();
    }
    _refreshState() {
        if (this._overlay.value) {
            this._tryDisable();
        }
        else {
            this._tryEnable();
        }
        if (this._overlay.value) {
            this._enableListeners.clear();
            if (!this._disableListeners.value) {
                this._disableListeners.value = this._ctx.instance.capabilities.onDidRemoveCapability((e) => {
                    if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                        this._refreshState();
                    }
                });
            }
        }
        else {
            this._disableListeners.clear();
            if (!this._enableListeners.value) {
                this._enableListeners.value = this._ctx.instance.capabilities.onDidAddCapability((e) => {
                    if (e.id === 2 /* TerminalCapability.CommandDetection */) {
                        this._refreshState();
                    }
                });
            }
        }
    }
    _tryEnable() {
        if (this._shouldBeEnabled()) {
            const xtermCtorEventually = TerminalInstance.getXtermConstructor(this._keybindingService, this._contextKeyService);
            this._overlay.value = this._instantiationService.createInstance(TerminalStickyScrollOverlay, this._ctx.instance, this._xterm, this._instantiationService.createInstance(TerminalInstanceColorProvider, this._ctx.instance.targetRef), this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */), xtermCtorEventually);
        }
    }
    _tryDisable() {
        if (!this._shouldBeEnabled()) {
            this._overlay.clear();
        }
    }
    _shouldBeEnabled() {
        const capability = this._ctx.instance.capabilities.get(2 /* TerminalCapability.CommandDetection */);
        return !!(this._configurationService.getValue("terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */) &&
            capability &&
            this._xterm?.raw?.element);
    }
};
TerminalStickyScrollContribution = TerminalStickyScrollContribution_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, IInstantiationService),
    __param(4, IKeybindingService)
], TerminalStickyScrollContribution);
export { TerminalStickyScrollContribution };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci90ZXJtaW5hbFN0aWNreVNjcm9sbENvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQVE1RixPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLDZCQUE2QixHQUM3QixNQUFNLCtDQUErQyxDQUFBO0FBRXRELE9BQU8sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVOzthQUMvQyxPQUFFLEdBQUcsdUJBQXVCLEFBQTFCLENBQTBCO0lBRTVDLE1BQU0sQ0FBQyxHQUFHLENBQUMsUUFBMkI7UUFDckMsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUM5QixrQ0FBZ0MsQ0FBQyxFQUFFLENBQ25DLENBQUE7SUFDRixDQUFDO0lBU0QsWUFDa0IsSUFBa0MsRUFDNUIscUJBQTZELEVB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