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
var TerminalFindContribution_1;
import { Lazy } from '../../../../../base/common/lazy.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { findInFilesCommand } from '../../../search/browser/searchActionsFind.js';
import { ITerminalService, isDetachedTerminalInstance, } from '../../../terminal/browser/terminal.js';
import { registerActiveInstanceAction, registerActiveXtermAction, } from '../../../terminal/browser/terminalActions.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import './media/terminalFind.css';
import { TerminalFindWidget } from './terminalFindWidget.js';
// #region Terminal Contributions
let TerminalFindContribution = class TerminalFindContribution extends Disposable {
    static { TerminalFindContribution_1 = this; }
    static { this.ID = 'terminal.find'; }
    static get(instance) {
        return instance.getContribution(TerminalFindContribution_1.ID);
    }
    get findWidget() {
        return this._findWidget.value;
    }
    constructor(ctx, instantiationService, terminalService) {
        super();
        this._findWidget = new Lazy(() => {
            const findWidget = instantiationService.createInstance(TerminalFindWidget, ctx.instance);
            // Track focus and set state so we can force the scroll bar to be visible
            findWidget.focusTracker.onDidFocus(() => {
                TerminalFindContribution_1.activeFindWidget = this;
                ctx.instance.forceScrollbarVisibility();
                if (!isDetachedTerminalInstance(ctx.instance)) {
                    terminalService.setActiveInstance(ctx.instance);
                }
            });
            findWidget.focusTracker.onDidBlur(() => {
                TerminalFindContribution_1.activeFindWidget = undefined;
                ctx.instance.resetScrollbarVisibility();
            });
            if (!ctx.instance.domElement) {
                throw new Error('FindWidget expected terminal DOM to be initialized');
            }
            ctx.instance.domElement?.appendChild(findWidget.getDomNode());
            if (this._lastLayoutDimensions) {
                findWidget.layout(this._lastLayoutDimensions.width);
            }
            return findWidget;
        });
    }
    layout(_xterm, dimension) {
        this._lastLayoutDimensions = dimension;
        this._findWidget.rawValue?.layout(dimension.width);
    }
    xtermReady(xterm) {
        this._register(xterm.onDidChangeFindResults(() => this._findWidget.rawValue?.updateResultCount()));
    }
    dispose() {
        if (TerminalFindContribution_1.activeFindWidget === this) {
            TerminalFindContribution_1.activeFindWidget = undefined;
        }
        super.dispose();
        this._findWidget.rawValue?.dispose();
    }
};
TerminalFindContribution = TerminalFindContribution_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITerminalService)
], TerminalFindContribution);
registerTerminalContribution(TerminalFindContribution.ID, TerminalFindContribution, true);
// #endregion
// #region Actions
registerActiveXtermAction({
    id: "workbench.action.terminal.focusFind" /* TerminalFindCommandId.FindFocus */,
    title: localize2('workbench.action.terminal.focusFind', 'Focus Find'),
    keybinding: {
        primary: 2048 /* KeyMod.CtrlCmd */ | 36 /* KeyCode.KeyF */,
        when: ContextKeyExpr.or(TerminalContextKeys.findFocus, TerminalContextKeys.focusInAny),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        contr?.findWidget.reveal();
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.hideFind" /* TerminalFindCommandId.FindHide */,
    title: localize2('workbench.action.terminal.hideFind', 'Hide Find'),
    keybinding: {
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
        when: ContextKeyExpr.and(TerminalContextKeys.focusInAny, TerminalContextKeys.findVisible),
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        contr?.findWidget.hide();
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindRegex" /* TerminalFindCommandId.ToggleFindRegex */,
    title: localize2('workbench.action.terminal.toggleFindRegex', 'Toggle Find Using Regex'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 48 /* KeyCode.KeyR */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ isRegex: !state.isRegex }, false);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindWholeWord" /* TerminalFindCommandId.ToggleFindWholeWord */,
    title: localize2('workbench.action.terminal.toggleFindWholeWord', 'Toggle Find Using Whole Word'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 53 /* KeyCode.KeyW */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ wholeWord: !state.wholeWord }, false);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.toggleFindCaseSensitive" /* TerminalFindCommandId.ToggleFindCaseSensitive */,
    title: localize2('workbench.action.terminal.toggleFindCaseSensitive', 'Toggle Find Using Case Sensitive'),
    keybinding: {
        primary: 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */,
        mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 512 /* KeyMod.Alt */ | 33 /* KeyCode.KeyC */ },
        when: TerminalContextKeys.findVisible,
        weight: 200 /* KeybindingWeight.WorkbenchContrib */,
    },
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const state = contr?.findWidget.state;
        state?.change({ matchCase: !state.matchCase }, false);
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.findNext" /* TerminalFindCommandId.FindNext */,
    title: localize2('workbench.action.terminal.findNext', 'Find Next'),
    keybinding: [
        {
            primary: 61 /* KeyCode.F3 */,
            mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 37 /* KeyCode.KeyG */, secondary: [61 /* KeyCode.F3 */] },
            when: ContextKeyExpr.or(TerminalContextKeys.focusInAny, TerminalContextKeys.findFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        {
            primary: 1024 /* KeyMod.Shift */ | 3 /* KeyCode.Enter */,
            when: TerminalContextKeys.findInputFocus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
    ],
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const widget = contr?.findWidget;
        if (widget) {
            widget.show();
            widget.find(false);
        }
    },
});
registerActiveXtermAction({
    id: "workbench.action.terminal.findPrevious" /* TerminalFindCommandId.FindPrevious */,
    title: localize2('workbench.action.terminal.findPrevious', 'Find Previous'),
    keybinding: [
        {
            primary: 1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */,
            mac: {
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 37 /* KeyCode.KeyG */,
                secondary: [1024 /* KeyMod.Shift */ | 61 /* KeyCode.F3 */],
            },
            when: ContextKeyExpr.or(TerminalContextKeys.focusInAny, TerminalContextKeys.findFocus),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
        {
            primary: 3 /* KeyCode.Enter */,
            when: TerminalContextKeys.findInputFocus,
            weight: 200 /* KeybindingWeight.WorkbenchContrib */,
        },
    ],
    precondition: ContextKeyExpr.or(TerminalContextKeys.processSupported, TerminalContextKeys.terminalHasBeenCreated),
    run: (_xterm, _accessor, activeInstance) => {
        const contr = TerminalFindContribution.activeFindWidget || TerminalFindContribution.get(activeInstance);
        const widget = contr?.findWidget;
        if (widget) {
            widget.show();
            widget.find(true);
        }
    },
});
// Global workspace file search
registerActiveInstanceAction({
    id: "workbench.action.terminal.searchWorkspace" /* TerminalFindCommandId.SearchWorkspace */,
    title: localize2('workbench.action.terminal.searchWorkspace', 'Search Workspace'),
    keybinding: [
        {
            primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 36 /* KeyCode.KeyF */,
            when: ContextKeyExpr.and(TerminalContextKeys.processSupported, TerminalContextKeys.focus, TerminalContextKeys.textSelected),
            weight: 200 /* KeybindingWeight.WorkbenchContrib */ + 50,
        },
    ],
    run: (activeInstance, c, accessor) => findInFilesCommand(accessor, { query: activeInstance.selection }),
});
// #endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZmluZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvZmluZC9icm93c2VyL3Rlcm1pbmFsLmZpbmQuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUtoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDeEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUlOLGdCQUFnQixFQUVoQiwwQkFBMEIsR0FDMUIsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5QyxPQUFPLEVBQ04sNEJBQTRCLEVBQzVCLHlCQUF5QixHQUN6QixNQUFNLDhDQUE4QyxDQUFBO0FBQ3JELE9BQU8sRUFDTiw0QkFBNEIsR0FHNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVwRixPQUFPLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRTVELGlDQUFpQztBQUVqQyxJQUFNLHdCQUF3QixHQUE5QixNQUFNLHdCQUF5QixTQUFRLFVBQVU7O2FBQ2hDLE9BQUUsR0FBRyxlQUFlLEFBQWxCLENBQWtCO0lBUXBDLE1BQU0sQ0FB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