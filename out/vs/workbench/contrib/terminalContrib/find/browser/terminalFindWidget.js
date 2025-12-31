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
import * as dom from '../../../../../base/browser/dom.js';
import { SimpleFindWidget } from '../../../codeEditor/browser/find/simpleFindWidget.js';
import { IContextMenuService, IContextViewService, } from '../../../../../platform/contextview/browser/contextView.js';
import { IContextKeyService, } from '../../../../../platform/contextkey/common/contextkey.js';
import { TerminalContextKeys } from '../../../terminal/common/terminalContextKey.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { Event } from '../../../../../base/common/event.js';
import { IClipboardService } from '../../../../../platform/clipboard/common/clipboardService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { TerminalClipboardContribution } from '../../clipboard/browser/terminal.clipboard.contribution.js';
import { StandardMouseEvent } from '../../../../../base/browser/mouseEvent.js';
import { createTextInputActions } from '../../../../browser/actions/textInputActions.js';
const TERMINAL_FIND_WIDGET_INITIAL_WIDTH = 419;
let TerminalFindWidget = class TerminalFindWidget extends SimpleFindWidget {
    constructor(_instance, clipboardService, configurationService, contextKeyService, contextMenuService, contextViewService, hoverService, keybindingService, themeService) {
        super({
            showCommonFindToggles: true,
            checkImeCompletionState: true,
            showResultCount: true,
            initialWidth: TERMINAL_FIND_WIDGET_INITIAL_WIDTH,
            enableSash: true,
            appendCaseSensitiveActionId: "workbench.action.terminal.toggleFindCaseSensitive" /* TerminalFindCommandId.ToggleFindCaseSensitive */,
            appendRegexActionId: "workbench.action.terminal.toggleFindRegex" /* TerminalFindCommandId.ToggleFindRegex */,
            appendWholeWordsActionId: "workbench.action.terminal.toggleFindWholeWord" /* TerminalFindCommandId.ToggleFindWholeWord */,
            previousMatchActionId: "workbench.action.terminal.findPrevious" /* TerminalFindCommandId.FindPrevious */,
            nextMatchActionId: "workbench.action.terminal.findNext" /* TerminalFindCommandId.FindNext */,
            closeWidgetActionId: "workbench.action.terminal.hideFind" /* TerminalFindCommandId.FindHide */,
            type: 'Terminal',
            matchesLimit: 20000 /* XtermTerminalConstants.SearchHighlightLimit */,
        }, contextViewService, contextKeyService, hoverService, keybindingService);
        this._instance = _instance;
        this._register(this.state.onFindReplaceStateChange(() => {
            this.show();
        }));
        this._findInputFocused = TerminalContextKeys.findInputFocus.bindTo(contextKeyService);
        this._findWidgetFocused = TerminalContextKeys.findFocus.bindTo(contextKeyService);
        this._findWidgetVisible = TerminalContextKeys.findVisible.bindTo(contextKeyService);
        const innerDom = this.getDomNode().firstChild;
        if (innerDom) {
            this._register(dom.addDisposableListener(innerDom, 'mousedown', (event) => {
                event.stopPropagation();
            }));
            this._register(dom.addDisposableListener(innerDom, 'contextmenu', (event) => {
                event.stopPropagation();
            }));
        }
        const findInputDomNode = this.getFindInputDomNode();
        this._register(dom.addDisposableListener(findInputDomNode, 'contextmenu', (event) => {
            const targetWindow = dom.getWindow(findInputDomNode);
            const standardEvent = new StandardMouseEvent(targetWindow, event);
            const actions = createTextInputActions(clipboardService);
            contextMenuService.showContextMenu({
                getAnchor: () => standardEvent,
                getActions: () => actions,
                getActionsContext: () => event.target,
            });
            event.stopPropagation();
        }));
        this._register(themeService.onDidColorThemeChange(() => {
            if (this.isVisible()) {
                this.find(true, true);
            }
        }));
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.colorCustomizations') && this.isVisible()) {
                this.find(true, true);
            }
        }));
        this.updateResultCount();
    }
    find(previous, update) {
        const xterm = this._instance.xterm;
        if (!xterm) {
            return;
        }
        if (previous) {
            this._findPreviousWithEvent(xterm, this.inputValue, {
                regex: this._getRegexValue(),
                wholeWord: this._getWholeWordValue(),
                caseSensitive: this._getCaseSensitiveValue(),
                incremental: update,
            });
        }
        else {
            this._findNextWithEvent(xterm, this.inputValue, {
                regex: this._getRegexValue(),
                wholeWord: this._getWholeWordValue(),
                caseSensitive: this._getCaseSensitiveValue(),
            });
        }
    }
    reveal() {
        const initialInput = this._instance.hasSelection() && !this._instance.selection.includes('\n')
            ? this._instance.selection
            : undefined;
        const inputValue = initialInput ?? this.inputValue;
        const xterm = this._instance.xterm;
        if (xterm && inputValue && inputValue !== '') {
            // trigger highlight all matches
            this._findPreviousWithEvent(xterm, inputValue, {
                incremental: true,
                regex: this._getRegexValue(),
                wholeWord: this._getWholeWordValue(),
                caseSensitive: this._getCaseSensitiveValue(),
            }).then((foundMatch) => {
                this.updateButtons(foundMatch);
                this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            });
        }
        this.updateButtons(false);
        super.reveal(inputValue);
        this._findWidgetVisible.set(true);
    }
    show() {
        const initialInput = this._instance.hasSelection() && !this._instance.selection.includes('\n')
            ? this._instance.selection
            : undefined;
        super.show(initialInput);
        this._findWidgetVisible.set(true);
    }
    hide() {
        super.hide();
        this._findWidgetVisible.reset();
        this._instance.focus(true);
        this._instance.xterm?.clearSearchDecorations();
    }
    async _getResultCount() {
        return this._instance.xterm?.findResult;
    }
    _onInputChanged() {
        // Ignore input changes for now
        const xterm = this._instance.xterm;
        if (xterm) {
            this._findPreviousWithEvent(xterm, this.inputValue, {
                regex: this._getRegexValue(),
                wholeWord: this._getWholeWordValue(),
                caseSensitive: this._getCaseSensitiveValue(),
                incremental: true,
            }).then((foundMatch) => {
                this.updateButtons(foundMatch);
            });
        }
        return false;
    }
    _onFocusTrackerFocus() {
        if ('overrideCopyOnSelection' in this._instance) {
            this._overrideCopyOnSelectionDisposable = TerminalClipboardContribution.get(this._instance)?.overrideCopyOnSelection(false);
        }
        this._findWidgetFocused.set(true);
    }
    _onFocusTrackerBlur() {
        this._overrideCopyOnSelectionDisposable?.dispose();
        this._instance.xterm?.clearActiveSearchDecoration();
        this._findWidgetFocused.reset();
    }
    _onFindInputFocusTrackerFocus() {
        this._findInputFocused.set(true);
    }
    _onFindInputFocusTrackerBlur() {
        this._findInputFocused.reset();
    }
    findFirst() {
        const instance = this._instance;
        if (instance.hasSelection()) {
            instance.clearSelection();
        }
        const xterm = instance.xterm;
        if (xterm) {
            this._findPreviousWithEvent(xterm, this.inputValue, {
                regex: this._getRegexValue(),
                wholeWord: this._getWholeWordValue(),
                caseSensitive: this._getCaseSensitiveValue(),
            });
        }
    }
    async _findNextWithEvent(xterm, term, options) {
        return xterm.findNext(term, options).then((foundMatch) => {
            this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            return foundMatch;
        });
    }
    async _findPreviousWithEvent(xterm, term, options) {
        return xterm.findPrevious(term, options).then((foundMatch) => {
            this._register(Event.once(xterm.onDidChangeSelection)(() => xterm.clearActiveSearchDecoration()));
            return foundMatch;
        });
    }
};
TerminalFindWidget = __decorate([
    __param(1, IClipboardService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IContextMenuService),
    __param(5, IContextViewService),
    __param(6, IHoverService),
    __param(7, IKeybindingService),
    __param(8, IThemeService)
], TerminalFindWidget);
export { TerminalFindWidget };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxGaW5kV2lkZ2V0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2ZpbmQvYnJvd3Nlci90ZXJtaW5hbEZpbmRXaWRnZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN2RixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixHQUNuQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTixrQkFBa0IsR0FFbEIsTUFBTSx5REFBeUQsQ0FBQTtBQU9oRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDNUYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUV4RixNQUFNLGtDQUFrQyxHQUFHLEdBQUcsQ0FB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