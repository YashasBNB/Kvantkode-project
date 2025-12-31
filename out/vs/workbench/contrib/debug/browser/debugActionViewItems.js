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
var StartDebugActionViewItem_1;
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import { StandardKeyboardEvent } from '../../../../base/browser/keyboardEvent.js';
import { SelectBox } from '../../../../base/browser/ui/selectBox/selectBox.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IDebugService, } from '../common/debug.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { selectBorder, selectBackground, asCssVariable, } from '../../../../platform/theme/common/colorRegistry.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { ADD_CONFIGURATION_ID } from './debugCommands.js';
import { BaseActionViewItem, SelectActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { debugStart } from './debugIcons.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { defaultSelectBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
const $ = dom.$;
let StartDebugActionViewItem = class StartDebugActionViewItem extends BaseActionViewItem {
    static { StartDebugActionViewItem_1 = this; }
    static { this.SEPARATOR = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500'; }
    constructor(context, action, options, debugService, configurationService, commandService, contextService, contextViewService, keybindingService, hoverService, contextKeyService) {
        super(context, action, options);
        this.context = context;
        this.debugService = debugService;
        this.configurationService = configurationService;
        this.commandService = commandService;
        this.contextService = contextService;
        this.keybindingService = keybindingService;
        this.hoverService = hoverService;
        this.contextKeyService = contextKeyService;
        this.debugOptions = [];
        this.selected = 0;
        this.providers = [];
        this.toDispose = [];
        this.selectBox = new SelectBox([], -1, contextViewService, defaultSelectBoxStyles, {
            ariaLabel: nls.localize('debugLaunchConfigurations', 'Debug Launch Configurations'),
        });
        this.selectBox.setFocusable(false);
        this.toDispose.push(this.selectBox);
        this.registerListeners();
    }
    registerListeners() {
        this.toDispose.push(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('launch')) {
                this.updateOptions();
            }
        }));
        this.toDispose.push(this.debugService.getConfigurationManager().onDidSelectConfiguration(() => {
            this.updateOptions();
        }));
    }
    render(container) {
        this.container = container;
        container.classList.add('start-debug-action-item');
        this.start = dom.append(container, $(ThemeIcon.asCSSSelector(debugStart)));
        const keybinding = this.keybindingService.lookupKeybinding(this.action.id)?.getLabel();
        const keybindingLabel = keybinding ? ` (${keybinding})` : '';
        const title = this.action.label + keybindingLabel;
        this.toDispose.push(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.start, title));
        this.start.setAttribute('role', 'button');
        this._setAriaLabel(title);
        this.toDispose.push(dom.addDisposableListener(this.start, dom.EventType.CLICK, () => {
            this.start.blur();
            if (this.debugService.state !== 1 /* State.Initializing */) {
                this.actionRunner.run(this.action, this.context);
            }
        }));
        this.toDispose.push(dom.addDisposableListener(this.start, dom.EventType.MOUSE_DOWN, (e) => {
            if (this.action.enabled && e.button === 0) {
                this.start.classList.add('active');
            }
        }));
        this.toDispose.push(dom.addDisposableListener(this.start, dom.EventType.MOUSE_UP, () => {
            this.start.classList.remove('active');
        }));
        this.toDispose.push(dom.addDisposableListener(this.start, dom.EventType.MOUSE_OUT, () => {
            this.start.classList.remove('active');
        }));
        this.toDispose.push(dom.addDisposableListener(this.start, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(17 /* KeyCode.RightArrow */)) {
                this.start.tabIndex = -1;
                this.selectBox.focus();
                event.stopPropagation();
            }
        }));
        this.toDispose.push(this.selectBox.onDidSelect(async (e) => {
            const target = this.debugOptions[e.index];
            const shouldBeSelected = target.handler ? await target.handler() : false;
            if (shouldBeSelected) {
                this.selected = e.index;
            }
            else {
                // Some select options should not remain selected https://github.com/microsoft/vscode/issues/31526
                this.selectBox.select(this.selected);
            }
        }));
        const selectBoxContainer = $('.configuration');
        this.selectBox.render(dom.append(container, selectBoxContainer));
        this.toDispose.push(dom.addDisposableListener(selectBoxContainer, dom.EventType.KEY_DOWN, (e) => {
            const event = new StandardKeyboardEvent(e);
            if (event.equals(15 /* KeyCode.LeftArrow */)) {
                this.selectBox.setFocusable(false);
                this.start.tabIndex = 0;
                this.start.focus();
                event.stopPropagation();
                event.preventDefault();
            }
        }));
        this.container.style.border = `1px solid ${asCssVariable(selectBorder)}`;
        selectBoxContainer.style.borderLeft = `1px solid ${asCssVariable(selectBorder)}`;
        this.container.style.backgroundColor = asCssVariable(selectBackground);
        const configManager = this.debugService.getConfigurationManager();
        const updateDynamicConfigs = () => configManager.getDynamicProviders().then((providers) => {
            if (providers.length !== this.providers.length) {
                this.providers = providers;
                this.updateOptions();
            }
        });
        this.toDispose.push(configManager.onDidChangeConfigurationProviders(updateDynamicConfigs));
        updateDynamicConfigs();
        this.updateOptions();
    }
    setActionContext(context) {
        this.context = context;
    }
    isEnabled() {
        return true;
    }
    focus(fromRight) {
        if (fromRight) {
            this.selectBox.focus();
        }
        else {
            this.start.tabIndex = 0;
            this.start.focus();
        }
    }
    blur() {
        this.start.tabIndex = -1;
        this.selectBox.blur();
        this.container.blur();
    }
    setFocusable(focusable) {
        if (focusable) {
            this.start.tabIndex = 0;
        }
        else {
            this.start.tabIndex = -1;
            this.selectBox.setFocusable(false);
        }
    }
    dispose() {
        this.toDispose = dispose(this.toDispose);
        super.dispose();
    }
    updateOptions() {
        this.selected = 0;
        this.debugOptions = [];
        const manager = this.debugService.getConfigurationManager();
        const inWorkspace = this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */;
        let lastGroup;
        const disabledIdxs = [];
        manager.getAllConfigurations().forEach(({ launch, name, presentation }) => {
            if (lastGroup !== presentation?.group) {
                lastGroup = presentation?.group;
                if (this.debugOptions.length) {
                    this.debugOptions.push({
                        label: StartDebugActionViewItem_1.SEPARATOR,
                        handler: () => Promise.resolve(false),
                    });
                    disabledIdxs.push(this.debugOptions.length - 1);
                }
            }
            if (name === manager.selectedConfiguration.name &&
                launch === manager.selectedConfiguration.launch) {
                this.selected = this.debugOptions.length;
            }
            const label = inWorkspace ? `${name} (${launch.name})` : name;
            this.debugOptions.push({
                label,
                handler: async () => {
                    await manager.selectConfiguration(launch, name);
                    return true;
                },
            });
        });
        // Only take 3 elements from the recent dynamic configurations to not clutter the dropdown
        manager
            .getRecentDynamicConfigurations()
            .slice(0, 3)
            .forEach(({ name, type }) => {
            if (type === manager.selectedConfiguration.type &&
                manager.selectedConfiguration.name === name) {
                this.selected = this.debugOptions.length;
            }
            this.debugOptions.push({
                label: name,
                handler: async () => {
                    await manager.selectConfiguration(undefined, name, undefined, { type });
                    return true;
                },
            });
        });
        if (this.debugOptions.length === 0) {
            this.debugOptions.push({
                label: nls.localize('noConfigurations', 'No Configurations'),
                handler: async () => false,
            });
        }
        this.debugOptions.push({
            label: StartDebugActionViewItem_1.SEPARATOR,
            handler: () => Promise.resolve(false),
        });
        disabledIdxs.push(this.debugOptions.length - 1);
        this.providers.forEach((p) => {
            this.debugOptions.push({
                label: `${p.label}...`,
                handler: async () => {
                    const picked = await p.pick();
                    if (picked) {
                        await manager.selectConfiguration(picked.launch, picked.config.name, picked.config, {
                            type: p.type,
                        });
                        return true;
                    }
                    return false;
                },
            });
        });
        manager
            .getLaunches()
            .filter((l) => !l.hidden)
            .forEach((l) => {
            const label = inWorkspace
                ? nls.localize('addConfigTo', 'Add Config ({0})...', l.name)
                : nls.localize('addConfiguration', 'Add Configuration...');
            this.debugOptions.push({
                label,
                handler: async () => {
                    await this.commandService.executeCommand(ADD_CONFIGURATION_ID, l.uri.toString());
                    return false;
                },
            });
        });
        this.selectBox.setOptions(this.debugOptions.map((data, index) => ({
            text: data.label,
            isDisabled: disabledIdxs.indexOf(index) !== -1,
        })), this.selected);
    }
    _setAriaLabel(title) {
        let ariaLabel = title;
        let keybinding;
        const verbose = this.configurationService.getValue("accessibility.verbosity.debug" /* AccessibilityVerbositySettingId.Debug */);
        if (verbose) {
            keybinding =
                this.keybindingService
                    .lookupKeybinding("editor.action.accessibilityHelp" /* AccessibilityCommandId.OpenAccessibilityHelp */, this.contextKeyService)
                    ?.getLabel() ?? undefined;
        }
        if (keybinding) {
            ariaLabel = nls.localize('commentLabelWithKeybinding', '{0}, use ({1}) for accessibility help', ariaLabel, keybinding);
        }
        else {
            ariaLabel = nls.localize('commentLabelWithKeybindingNoKeybinding', '{0}, run the command Open Accessibility Help which is currently not triggerable via keybinding.', ariaLabel);
        }
        this.start.ariaLabel = ariaLabel;
    }
};
StartDebugActionViewItem = StartDebugActionViewItem_1 = __decorate([
    __param(3, IDebugService),
    __param(4, IConfigurationService),
    __param(5, ICommandService),
    __param(6, IWorkspaceContextService),
    __param(7, IContextViewService),
    __param(8, IKeybindingService),
    __param(9, IHoverService),
    __param(10, IContextKeyService)
], StartDebugActionViewItem);
export { StartDebugActionViewItem };
let FocusSessionActionViewItem = class FocusSessionActionViewItem extends SelectActionViewItem {
    constructor(action, session, debugService, contextViewService, configurationService) {
        super(null, action, [], -1, contextViewService, defaultSelectBoxStyles, {
            ariaLabel: nls.localize('debugSession', 'Debug Session'),
        });
        this.debugService = debugService;
        this.configurationService = configurationService;
        this._register(this.debugService.getViewModel().onDidFocusSession(() => {
            const session = this.getSelectedSession();
            if (session) {
                const index = this.getSessions().indexOf(session);
                this.select(index);
            }
        }));
        this._register(this.debugService.onDidNewSession((session) => {
            const sessionListeners = [];
            sessionListeners.push(session.onDidChangeName(() => this.update()));
            sessionListeners.push(session.onDidEndAdapter(() => dispose(sessionListeners)));
            this.update();
        }));
        this.getSessions().forEach((session) => {
            this._register(session.onDidChangeName(() => this.update()));
        });
        this._register(this.debugService.onDidEndSession(() => this.update()));
        const selectedSession = session ? this.mapFocusedSessionToSelected(session) : undefined;
        this.update(selectedSession);
    }
    getActionContext(_, index) {
        return this.getSessions()[index];
    }
    update(session) {
        if (!session) {
            session = this.getSelectedSession();
        }
        const sessions = this.getSessions();
        const names = sessions.map((s) => {
            const label = s.getLabel();
            if (s.parentSession) {
                // Indent child sessions so they look like children
                return `\u00A0\u00A0${label}`;
            }
            return label;
        });
        this.setOptions(names.map((data) => ({ text: data })), session ? sessions.indexOf(session) : undefined);
    }
    getSelectedSession() {
        const session = this.debugService.getViewModel().focusedSession;
        return session ? this.mapFocusedSessionToSelected(session) : undefined;
    }
    getSessions() {
        const showSubSessions = this.configurationService.getValue('debug').showSubSessionsInToolBar;
        const sessions = this.debugService.getModel().getSessions();
        return showSubSessions ? sessions : sessions.filter((s) => !s.parentSession);
    }
    mapFocusedSessionToSelected(focusedSession) {
        const showSubSessions = this.configurationService.getValue('debug').showSubSessionsInToolBar;
        while (focusedSession.parentSession && !showSubSessions) {
            focusedSession = focusedSession.parentSession;
        }
        return focusedSession;
    }
};
FocusSessionActionViewItem = __decorate([
    __param(2, IDebugService),
    __param(3, IContextViewService),
    __param(4, IConfigurationService)
], FocusSessionActionViewItem);
export { FocusSessionActionViewItem };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBY3Rpb25WaWV3SXRlbXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9icm93c2VyL2RlYnVnQWN0aW9uVmlld0l0ZW1zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBR3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDakYsT0FBTyxFQUFFLFNBQVMsRUFBcUIsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUNOLGFBQWEsR0FNYixNQUFNLG9CQUFvQixDQUFBO0FBQzNCLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sWUFBWSxFQUNaLGdCQUFnQixFQUNoQixhQUFhLEdBQ2IsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQ04sd0JBQXdCLEdBRXhCLE1BQU0sb0RBQW9ELENBQUE7QUFDM0QsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3pELE9BQU8sRUFDTixrQkFBa0IsRUFFbEIsb0JBQW9CLEdBQ3BCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFN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