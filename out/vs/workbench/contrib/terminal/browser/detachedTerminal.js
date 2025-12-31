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
import * as dom from '../../../../base/browser/dom.js';
import { Delayer } from '../../../../base/common/async.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { MicrotaskDelay } from '../../../../base/common/symbols.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { TerminalCapabilityStore } from '../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { TerminalExtensionsRegistry } from './terminalExtensions.js';
import { TerminalWidgetManager } from './widgets/widgetManager.js';
let DetachedTerminal = class DetachedTerminal extends Disposable {
    get xterm() {
        return this._xterm;
    }
    constructor(_xterm, options, instantiationService) {
        super();
        this._xterm = _xterm;
        this._widgets = this._register(new TerminalWidgetManager());
        this.capabilities = new TerminalCapabilityStore();
        this._contributions = new Map();
        this._register(_xterm);
        // Initialize contributions
        const contributionDescs = TerminalExtensionsRegistry.getTerminalContributions();
        for (const desc of contributionDescs) {
            if (this._contributions.has(desc.id)) {
                onUnexpectedError(new Error(`Cannot have two terminal contributions with the same id ${desc.id}`));
                continue;
            }
            if (desc.canRunInDetachedTerminals === false) {
                continue;
            }
            let contribution;
            try {
                contribution = instantiationService.createInstance(desc.ctor, {
                    instance: this,
                    processManager: options.processInfo,
                    widgetManager: this._widgets,
                });
                this._contributions.set(desc.id, contribution);
                this._register(contribution);
            }
            catch (err) {
                onUnexpectedError(err);
            }
        }
        // xterm is already by the time DetachedTerminal is created, so trigger everything
        // on the next microtask, allowing the caller to do any extra initialization
        this._register(new Delayer(MicrotaskDelay)).trigger(() => {
            for (const contr of this._contributions.values()) {
                contr.xtermReady?.(this._xterm);
            }
        });
    }
    get selection() {
        return this._xterm && this.hasSelection() ? this._xterm.raw.getSelection() : undefined;
    }
    hasSelection() {
        return this._xterm.hasSelection();
    }
    clearSelection() {
        this._xterm.clearSelection();
    }
    focus(force) {
        if (force || !dom.getActiveWindow().getSelection()?.toString()) {
            this.xterm.focus();
        }
    }
    attachToElement(container, options) {
        this.domElement = container;
        const screenElement = this._xterm.attachToElement(container, options);
        this._widgets.attachToElement(screenElement);
    }
    forceScrollbarVisibility() {
        this.domElement?.classList.add('force-scrollbar');
    }
    resetScrollbarVisibility() {
        this.domElement?.classList.remove('force-scrollbar');
    }
    getContribution(id) {
        return this._contributions.get(id);
    }
};
DetachedTerminal = __decorate([
    __param(2, IInstantiationService)
], DetachedTerminal);
export { DetachedTerminal };
/**
 * Implements {@link ITerminalProcessInfo} for a detached terminal where most
 * properties are stubbed. Properties are mutable and can be updated by
 * the instantiator.
 */
export class DetachedProcessInfo {
    constructor(initialValues) {
        this.processState = 3 /* ProcessState.Running */;
        this.ptyProcessReady = Promise.resolve();
        this.initialCwd = '';
        this.shouldPersist = false;
        this.hasWrittenData = false;
        this.hasChildProcesses = false;
        this.capabilities = new TerminalCapabilityStore();
        this.shellIntegrationNonce = '';
        Object.assign(this, initialValues);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGV0YWNoZWRUZXJtaW5hbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvZGV0YWNoZWRUZXJtaW5hbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhFQUE4RSxDQUFBO0FBVXRILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBSzNELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWlCLFNBQVEsVUFBVTtJQU8vQyxJQUFXLEtBQUs7UUFDZixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDbkIsQ0FBQztJQUVELFlBQ2tCLE1BQXFCLEVBQ3RDLE9BQThCLEVBQ1Asb0JBQTJDO1FBRWxFLEtBQUssRUFBRSxDQUFBO1FBSlUsV0FBTSxHQUFOLE1BQU0sQ0FBZTtRQVh0QixhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtRQUN2RCxpQkFBWSxHQUFHLElBQUksdUJBQXVCLEVBQUUs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