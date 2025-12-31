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
var InlineSuggestionHintsContentWidget_1;
import { h, n } from '../../../../../base/browser/dom.js';
import { renderMarkdown } from '../../../../../base/browser/markdownRenderer.js';
import { ActionViewItem } from '../../../../../base/browser/ui/actionbar/actionViewItems.js';
import { KeybindingLabel, unthemedKeybindingLabelOptions, } from '../../../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { Action, Separator } from '../../../../../base/common/actions.js';
import { equals } from '../../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../../base/common/async.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { createHotClass } from '../../../../../base/common/hotReloadHelpers.js';
import { Disposable, toDisposable } from '../../../../../base/common/lifecycle.js';
import { autorun, autorunWithStore, derived, derivedObservableWithCache, derivedWithStore, observableFromEvent, } from '../../../../../base/common/observable.js';
import { OS } from '../../../../../base/common/platform.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { MenuEntryActionViewItem, getActionBarActions, } from '../../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { WorkbenchToolBar, } from '../../../../../platform/actions/browser/toolbar.js';
import { IMenuService, MenuId, MenuItemAction, } from '../../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { registerIcon } from '../../../../../platform/theme/common/iconRegistry.js';
import { Position } from '../../../../common/core/position.js';
import { InlineCompletionTriggerKind, } from '../../../../common/languages.js';
import { showNextInlineSuggestionActionId, showPreviousInlineSuggestionActionId, } from '../controller/commandIds.js';
import './inlineCompletionsHintsWidget.css';
let InlineCompletionsHintsWidget = class InlineCompletionsHintsWidget extends Disposable {
    constructor(editor, model, instantiationService) {
        super();
        this.editor = editor;
        this.model = model;
        this.instantiationService = instantiationService;
        this.alwaysShowToolbar = observableFromEvent(this, this.editor.onDidChangeConfiguration, () => this.editor.getOption(64 /* EditorOption.inlineSuggest */).showToolbar === 'always');
        this.sessionPosition = undefined;
        this.position = derived(this, (reader) => {
            const ghostText = this.model.read(reader)?.primaryGhostText.read(reader);
            if (!this.alwaysShowToolbar.read(reader) || !ghostText || ghostText.parts.length === 0) {
                this.sessionPosition = undefined;
                return null;
            }
            const firstColumn = ghostText.parts[0].column;
            if (this.sessionPosition && this.sessionPosition.lineNumber !== ghostText.lineNumber) {
                this.sessionPosition = undefined;
            }
            const position = new Position(ghostText.lineNumber, Math.min(firstColumn, this.sessionPosition?.column ?? Number.MAX_SAFE_INTEGER));
            this.sessionPosition = position;
            return position;
        });
        this._register(autorunWithStore((reader, store) => {
            /** @description setup content widget */
            const model = this.model.read(reader);
            if (!model || !this.alwaysShowToolbar.read(reader)) {
                return;
            }
            const contentWidgetValue = derivedWithStore((reader, store) => {
                const contentWidget = store.add(this.instantiationService.createInstance(InlineSuggestionHintsContentWidget.hot.read(reader), this.editor, true, this.position, model.selectedInlineCompletionIndex, model.inlineCompletionsCount, model.activeCommands, model.warning, () => { }));
                editor.addContentWidget(contentWidget);
                store.add(toDisposable(() => editor.removeContentWidget(contentWidget)));
                store.add(autorun((reader) => {
                    /** @description request explicit */
                    const position = this.position.read(reader);
                    if (!position) {
                        return;
                    }
                    if (model.lastTriggerKind.read(reader) !== InlineCompletionTriggerKind.Explicit) {
                        model.triggerExplicitly();
                    }
                }));
                return contentWidget;
            });
            const hadPosition = derivedObservableWithCache(this, (reader, lastValue) => !!this.position.read(reader) || !!lastValue);
            store.add(autorun((reader) => {
                if (hadPosition.read(reader)) {
                    contentWidgetValue.read(reader);
                }
            }));
        }));
    }
};
InlineCompletionsHintsWidget = __decorate([
    __param(2, IInstantiationService)
], InlineCompletionsHintsWidget);
export { InlineCompletionsHintsWidget };
const inlineSuggestionHintsNextIcon = registerIcon('inline-suggestion-hints-next', Codicon.chevronRight, localize('parameterHintsNextIcon', 'Icon for show next parameter hint.'));
const inlineSuggestionHintsPreviousIcon = registerIcon('inline-suggestion-hints-previous', Codicon.chevronLeft, localize('parameterHintsPreviousIcon', 'Icon for show previous parameter hint.'));
let InlineSuggestionHintsContentWidget = class InlineSuggestionHintsContentWidget extends Disposable {
    static { InlineSuggestionHintsContentWidget_1 = this; }
    static { this.hot = createHotClass(InlineSuggestionHintsContentWidget_1); }
    static { this._dropDownVisible = false; }
    static get dropDownVisible() {
        return this._dropDownVisible;
    }
    static { this.id = 0; }
    createCommandAction(commandId, label, iconClassName) {
        const action = new Action(commandId, label, iconClassName, true, () => this._commandService.executeCommand(commandId));
        const kb = this.keybindingService.lookupKeybinding(commandId, this._contextKeyService);
        let tooltip = label;
        if (kb) {
            tooltip = localize({ key: 'content', comment: ['A label', 'A keybinding'] }, '{0} ({1})', label, kb.getLabel());
        }
        action.tooltip = tooltip;
        return action;
    }
    constructor(editor, withBorder, _position, _currentSuggestionIdx, _suggestionCount, _extraCommands, _warning, _relayout, _commandService, instantiationService, keybindingService, _contextKeyService, _menuService) {
        super();
        this.editor = editor;
        this.withBorder = withBorder;
        this._position = _position;
        this._currentSuggestionIdx = _currentSuggestionIdx;
        this._suggestionCount = _suggestionCount;
        this._extraCommands = _extraCommands;
        this._warning = _warning;
        this._relayout = _relayout;
        this._commandService = _commandService;
        this.keybindingService = keybindingService;
        this._contextKeyService = _contextKeyService;
        this._menuService = _menuService;
        this.id = `InlineSuggestionHintsContentWidget${InlineSuggestionHintsContentWidget_1.id++}`;
        this.allowEditorOverflow = true;
        this.suppressMouseDown = false;
        this._warningMessageContentNode = derivedWithStore((reader, store) => {
            const warning = this._warning.read(reader);
            if (!warning) {
                return undefined;
            }
            if (typeof warning.message === 'string') {
                return warning.message;
            }
            const markdownElement = store.add(renderMarkdown(warning.message));
            return markdownElement.element;
        });
        this._warningMessageNode = n
            .div({
            class: 'warningMessage',
            style: {
                maxWidth: 400,
                margin: 4,
                marginBottom: 4,
                display: derived((reader) => (this._warning.read(reader) ? 'block' : 'none')),
            },
        }, [this._warningMessageContentNode])
            .keepUpdated(this._store);
        this.nodes = h('div.inlineSuggestionsHints', { className: this.withBorder ? 'monaco-hover monaco-hover-content' : '' }, [this._warningMessageNode.element, h('div@toolBar')]);
        this.previousAction = this._register(this.createCommandAction(showPreviousInlineSuggestionActionId, localize('previous', 'Previous'), ThemeIcon.asClassName(inlineSuggestionHintsPreviousIcon)));
        this.availableSuggestionCountAction = this._register(new Action('inlineSuggestionHints.availableSuggestionCount', '', undefined, false));
        this.nextAction = this._register(this.createCommandAction(showNextInlineSuggestionActionId, localize('next', 'Next'), ThemeIcon.asClassName(inlineSuggestionHintsNextIcon)));
        // TODO@hediet: deprecate MenuId.InlineCompletionsActions
        this.inlineCompletionsActionsMenus = this._register(this._menuService.createMenu(MenuId.InlineCompletionsActions, this._contextKeyService));
        this.clearAvailableSuggestionCountLabelDebounced = this._register(new RunOnceScheduler(() => {
            this.availableSuggestionCountAction.label = '';
        }, 100));
        this.disableButtonsDebounced = this._register(new RunOnceScheduler(() => {
            this.previousAction.enabled = this.nextAction.enabled = false;
        }, 100));
        this._register(autorun((reader) => {
            this._warningMessageContentNode.read(reader);
            this._warningMessageNode.readEffect(reader);
            // Only update after the warning message node has been rendered
            this._relayout();
        }));
        this.toolBar = this._register(instantiationService.createInstance(CustomizedMenuWorkbenchToolBar, this.nodes.toolBar, MenuId.InlineSuggestionToolbar, {
            menuOptions: { renderShortTitle: true },
            toolbarOptions: { primaryGroup: (g) => g.startsWith('primary') },
            actionViewItemProvider: (action, options) => {
                if (action instanceof MenuItemAction) {
                    return instantiationService.createInstance(StatusBarViewItem, action, undefined);
                }
                if (action === this.availableSuggestionCountAction) {
                    const a = new ActionViewItemWithClassName(undefined, action, {
                        label: true,
                        icon: false,
                    });
                    a.setClass('availableSuggestionCount');
                    return a;
                }
                return undefined;
            },
            telemetrySource: 'InlineSuggestionToolbar',
        }));
        this.toolBar.setPrependedPrimaryActions([
            this.previousAction,
            this.availableSuggestionCountAction,
            this.nextAction,
        ]);
        this._register(this.toolBar.onDidChangeDropdownVisibility((e) => {
            InlineSuggestionHintsContentWidget_1._dropDownVisible = e;
        }));
        this._register(autorun((reader) => {
            /** @description update position */
            this._position.read(reader);
            this.editor.layoutContentWidget(this);
        }));
        this._register(autorun((reader) => {
            /** @description counts */
            const suggestionCount = this._suggestionCount.read(reader);
            const currentSuggestionIdx = this._currentSuggestionIdx.read(reader);
            if (suggestionCount !== undefined) {
                this.clearAvailableSuggestionCountLabelDebounced.cancel();
                this.availableSuggestionCountAction.label = `${currentSuggestionIdx + 1}/${suggestionCount}`;
            }
            else {
                this.clearAvailableSuggestionCountLabelDebounced.schedule();
            }
            if (suggestionCount !== undefined && suggestionCount > 1) {
                this.disableButtonsDebounced.cancel();
                this.previousAction.enabled = this.nextAction.enabled = true;
            }
            else {
                this.disableButtonsDebounced.schedule();
            }
        }));
        this._register(autorun((reader) => {
            /** @description extra commands */
            const extraCommands = this._extraCommands.read(reader);
            const extraActions = extraCommands.map((c) => ({
                class: undefined,
                id: c.id,
                enabled: true,
                tooltip: c.tooltip || '',
                label: c.title,
                run: (event) => {
                    return this._commandService.executeCommand(c.id);
                },
            }));
            for (const [_, group] of this.inlineCompletionsActionsMenus.getActions()) {
                for (const action of group) {
                    if (action instanceof MenuItemAction) {
                        extraActions.push(action);
                    }
                }
            }
            if (extraActions.length > 0) {
                extraActions.unshift(new Separator());
            }
            this.toolBar.setAdditionalSecondaryActions(extraActions);
        }));
    }
    getId() {
        return this.id;
    }
    getDomNode() {
        return this.nodes.root;
    }
    getPosition() {
        return {
            position: this._position.get(),
            preference: [1 /* ContentWidgetPositionPreference.ABOVE */, 2 /* ContentWidgetPositionPreference.BELOW */],
            positionAffinity: 3 /* PositionAffinity.LeftOfInjectedText */,
        };
    }
};
InlineSuggestionHintsContentWidget = InlineSuggestionHintsContentWidget_1 = __decorate([
    __param(8, ICommandService),
    __param(9, IInstantiationService),
    __param(10, IKeybindingService),
    __param(11, IContextKeyService),
    __param(12, IMenuService)
], InlineSuggestionHintsContentWidget);
export { InlineSuggestionHintsContentWidget };
class ActionViewItemWithClassName extends ActionViewItem {
    constructor() {
        super(...arguments);
        this._className = undefined;
    }
    setClass(className) {
        this._className = className;
    }
    render(container) {
        super.render(container);
        if (this._className) {
            container.classList.add(this._className);
        }
    }
    updateTooltip() {
        // NOOP, disable tooltip
    }
}
class StatusBarViewItem extends MenuEntryActionViewItem {
    updateLabel() {
        const kb = this._keybindingService.lookupKeybinding(this._action.id, this._contextKeyService, true);
        if (!kb) {
            return super.updateLabel();
        }
        if (this.label) {
            const div = h('div.keybinding').root;
            const k = this._register(new KeybindingLabel(div, OS, { disableTitle: true, ...unthemedKeybindingLabelOptions }));
            k.set(kb);
            this.label.textContent = this._action.label;
            this.label.appendChild(div);
            this.label.classList.add('inlineSuggestionStatusBarItemLabel');
        }
    }
    updateTooltip() {
        // NOOP, disable tooltip
    }
}
let CustomizedMenuWorkbenchToolBar = class CustomizedMenuWorkbenchToolBar extends WorkbenchToolBar {
    constructor(container, menuId, options2, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService) {
        super(container, { resetMenu: menuId, ...options2 }, menuService, contextKeyService, contextMenuService, keybindingService, commandService, telemetryService);
        this.menuId = menuId;
        this.options2 = options2;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.menu = this._store.add(this.menuService.createMenu(this.menuId, this.contextKeyService, {
            emitEventsForSubmenuChanges: true,
        }));
        this.additionalActions = [];
        this.prependedPrimaryActions = [];
        this.additionalPrimaryActions = [];
        this._store.add(this.menu.onDidChange(() => this.updateToolbar()));
        this.updateToolbar();
    }
    updateToolbar() {
        const { primary, secondary } = getActionBarActions(this.menu.getActions(this.options2?.menuOptions), this.options2?.toolbarOptions?.primaryGroup, this.options2?.toolbarOptions?.shouldInlineSubmenu, this.options2?.toolbarOptions?.useSeparatorsInPrimaryActions);
        secondary.push(...this.additionalActions);
        primary.unshift(...this.prependedPrimaryActions);
        primary.push(...this.additionalPrimaryActions);
        this.setActions(primary, secondary);
    }
    setPrependedPrimaryActions(actions) {
        if (equals(this.prependedPrimaryActions, actions, (a, b) => a === b)) {
            return;
        }
        this.prependedPrimaryActions = actions;
        this.updateToolbar();
    }
    setAdditionalPrimaryActions(actions) {
        if (equals(this.additionalPrimaryActions, actions, (a, b) => a === b)) {
            return;
        }
        this.additionalPrimaryActions = actions;
        this.updateToolbar();
    }
    setAdditionalSecondaryActions(actions) {
        if (equals(this.additionalActions, actions, (a, b) => a === b)) {
            return;
        }
        this.additionalActions = actions;
        this.updateToolbar();
    }
};
CustomizedMenuWorkbenchToolBar = __decorate([
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService),
    __param(6, IKeybindingService),
    __param(7, ICommandService),
    __param(8, ITelemetryService)
], CustomizedMenuWorkbenchToolBar);
export { CustomizedMenuWorkbenchToolBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnNIaW50c1dpZGdldC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2lubGluZUNvbXBsZXRpb25zL2Jyb3dzZXIvaGludHNXaWRnZXQvaW5saW5lQ29tcGxldGlvbnNIaW50c1dpZGdldC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDaEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFDTixlQUFlLEVBQ2YsOEJBQThCLEdBQzlCLE1BQU0sbUVBQW1FLENBQUE7QUFDMUUsT0FBTyxFQUFFLE1BQU0sRUFBVyxTQUFTLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xGLE9BQU8sRUFFTixPQUFPLEVBQ1AsZ0JBQWdCLEVBQ2hCLE9BQU8sRUFDUCwwQkFBMEIsRUFDMUIsZ0JBQWdCLEVBQ2hCLG1CQUFtQixHQUNuQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMzRCxPQUFPLEVB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