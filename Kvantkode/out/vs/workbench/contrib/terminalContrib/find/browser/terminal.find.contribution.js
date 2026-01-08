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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuZmluZC5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9maW5kL2Jyb3dzZXIvdGVybWluYWwuZmluZC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBS2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBSU4sZ0JBQWdCLEVBRWhCLDBCQUEwQixHQUMxQixNQUFNLHVDQUF1QyxDQUFBO0FBQzlDLE9BQU8sRUFDTiw0QkFBNEIsRUFDNUIseUJBQXlCLEdBQ3pCLE1BQU0sOENBQThDLENBQUE7QUFDckQsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRXBGLE9BQU8sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFNUQsaUNBQWlDO0FBRWpDLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTs7YUFDaEMsT0FBRSxHQUFHLGVBQWUsQUFBbEIsQ0FBa0I7SUFRcEMsTUFB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