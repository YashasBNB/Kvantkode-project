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
var BreakpointsRenderer_1, FunctionBreakpointsRenderer_1, DataBreakpointsRenderer_1, InstructionBreakpointsRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { Gesture } from '../../../../base/browser/touch.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IconLabel } from '../../../../base/browser/ui/iconLabel/iconLabel.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Action } from '../../../../base/common/actions.js';
import { equals } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import * as resources from '../../../../base/common/resources.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { localize, localize2 } from '../../../../nls.js';
import { getActionBarActions, getContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { Action2, IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { ACTIVE_GROUP, IEditorService, SIDE_GROUP, } from '../../../services/editor/common/editorService.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { BREAKPOINTS_VIEW_ID, BREAKPOINT_EDITOR_CONTRIBUTION_ID, CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINTS_FOCUSED, CONTEXT_BREAKPOINT_HAS_MODES, CONTEXT_BREAKPOINT_INPUT_FOCUSED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES, CONTEXT_BREAKPOINT_ITEM_TYPE, CONTEXT_BREAKPOINT_SUPPORTS_CONDITION, CONTEXT_DEBUGGERS_AVAILABLE, CONTEXT_IN_DEBUG_MODE, CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, DEBUG_SCHEME, DebuggerString, IDebugService, } from '../common/debug.js';
import { Breakpoint, DataBreakpoint, ExceptionBreakpoint, FunctionBreakpoint, InstructionBreakpoint, } from '../common/debugModel.js';
import { DisassemblyViewInput } from '../common/disassemblyViewInput.js';
import * as icons from './debugIcons.js';
const $ = dom.$;
function createCheckbox(disposables) {
    const checkbox = $('input');
    checkbox.type = 'checkbox';
    checkbox.tabIndex = -1;
    disposables.add(Gesture.ignoreTarget(checkbox));
    return checkbox;
}
const MAX_VISIBLE_BREAKPOINTS = 9;
export function getExpandedBodySize(model, sessionId, countLimit) {
    const length = model.getBreakpoints().length +
        model.getExceptionBreakpointsForSession(sessionId).length +
        model.getFunctionBreakpoints().length +
        model.getDataBreakpoints().length +
        model.getInstructionBreakpoints().length;
    return Math.min(countLimit, length) * 22;
}
function getModeKindForBreakpoint(breakpoint) {
    const kind = breakpoint instanceof Breakpoint
        ? 'source'
        : breakpoint instanceof InstructionBreakpoint
            ? 'instruction'
            : 'exception';
    return kind;
}
let BreakpointsView = class BreakpointsView extends ViewPane {
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, themeService, editorService, contextViewService, configurationService, viewDescriptorService, contextKeyService, openerService, labelService, menuService, hoverService, languageService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.editorService = editorService;
        this.contextViewService = contextViewService;
        this.labelService = labelService;
        this.languageService = languageService;
        this.needsRefresh = false;
        this.needsStateChange = false;
        this.ignoreLayout = false;
        this.autoFocusedIndex = -1;
        this.menu = menuService.createMenu(MenuId.DebugBreakpointsContext, contextKeyService);
        this._register(this.menu);
        this.breakpointItemType = CONTEXT_BREAKPOINT_ITEM_TYPE.bindTo(contextKeyService);
        this.breakpointIsDataBytes = CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES.bindTo(contextKeyService);
        this.breakpointHasMultipleModes = CONTEXT_BREAKPOINT_HAS_MODES.bindTo(contextKeyService);
        this.breakpointSupportsCondition =
            CONTEXT_BREAKPOINT_SUPPORTS_CONDITION.bindTo(contextKeyService);
        this.breakpointInputFocused = CONTEXT_BREAKPOINT_INPUT_FOCUSED.bindTo(contextKeyService);
        this._register(this.debugService.getModel().onDidChangeBreakpoints(() => this.onBreakpointsChange()));
        this._register(this.debugService.getViewModel().onDidFocusSession(() => this.onBreakpointsChange()));
        this._register(this.debugService.onDidChangeState(() => this.onStateChange()));
        this.hintDelayer = this._register(new RunOnceScheduler(() => this.updateBreakpointsHint(true), 4000));
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-breakpoints');
        const delegate = new BreakpointsDelegate(this);
        this.list = this.instantiationService.createInstance(WorkbenchList, 'Breakpoints', container, delegate, [
            this.instantiationService.createInstance(BreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType),
            new ExceptionBreakpointsRenderer(this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.debugService, this.hoverService),
            new ExceptionBreakpointInputRenderer(this, this.debugService, this.contextViewService),
            this.instantiationService.createInstance(FunctionBreakpointsRenderer, this.menu, this.breakpointSupportsCondition, this.breakpointItemType),
            new FunctionBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(DataBreakpointsRenderer, this.menu, this.breakpointHasMultipleModes, this.breakpointSupportsCondition, this.breakpointItemType, this.breakpointIsDataBytes),
            new DataBreakpointInputRenderer(this, this.debugService, this.contextViewService, this.hoverService, this.labelService),
            this.instantiationService.createInstance(InstructionBreakpointsRenderer),
        ], {
            identityProvider: { getId: (element) => element.getId() },
            multipleSelectionSupport: false,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e },
            accessibilityProvider: new BreakpointsAccessibilityProvider(this.debugService, this.labelService),
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        CONTEXT_BREAKPOINTS_FOCUSED.bindTo(this.list.contextKeyService);
        this._register(this.list.onContextMenu(this.onListContextMenu, this));
        this._register(this.list.onMouseMiddleClick(async ({ element }) => {
            if (element instanceof Breakpoint) {
                await this.debugService.removeBreakpoints(element.getId());
            }
            else if (element instanceof FunctionBreakpoint) {
                await this.debugService.removeFunctionBreakpoints(element.getId());
            }
            else if (element instanceof DataBreakpoint) {
                await this.debugService.removeDataBreakpoints(element.getId());
            }
            else if (element instanceof InstructionBreakpoint) {
                await this.debugService.removeInstructionBreakpoints(element.instructionReference, element.offset);
            }
        }));
        this._register(this.list.onDidOpen(async (e) => {
            if (!e.element) {
                return;
            }
            if (dom.isMouseEvent(e.browserEvent) && e.browserEvent.button === 1) {
                // middle click
                return;
            }
            if (e.element instanceof Breakpoint) {
                openBreakpointSource(e.element, e.sideBySide, e.editorOptions.preserveFocus || false, e.editorOptions.pinned || !e.editorOptions.preserveFocus, this.debugService, this.editorService);
            }
            if (e.element instanceof InstructionBreakpoint) {
                const disassemblyView = await this.editorService.openEditor(DisassemblyViewInput.instance);
                disassemblyView.goToInstructionAndOffset(e.element.instructionReference, e.element.offset, dom.isMouseEvent(e.browserEvent) && e.browserEvent.detail === 2);
            }
            if (dom.isMouseEvent(e.browserEvent) &&
                e.browserEvent.detail === 2 &&
                e.element instanceof FunctionBreakpoint &&
                e.element !== this.inputBoxData?.breakpoint) {
                // double click
                this.renderInputBox({ breakpoint: e.element, type: 'name' });
            }
        }));
        this.list.splice(0, this.list.length, this.elements);
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible) {
                if (this.needsRefresh) {
                    this.onBreakpointsChange();
                }
                if (this.needsStateChange) {
                    this.onStateChange();
                }
            }
        }));
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        this._register(containerModel.onDidChangeAllViewDescriptors(() => {
            this.updateSize();
        }));
    }
    renderHeaderTitle(container, title) {
        super.renderHeaderTitle(container, title);
        const iconLabelContainer = dom.append(container, $('span.breakpoint-warning'));
        this.hintContainer = this._register(new IconLabel(iconLabelContainer, {
            supportIcons: true,
            hoverDelegate: {
                showHover: (options, focus) => this.hoverService.showInstantHover({ content: options.content, target: this.hintContainer.element }, focus),
                delay: this.configurationService.getValue('workbench.hover.delay'),
            },
        }));
        dom.hide(this.hintContainer.element);
    }
    focus() {
        super.focus();
        this.list?.domFocus();
    }
    renderInputBox(data) {
        this._inputBoxData = data;
        this.onBreakpointsChange();
        this._inputBoxData = undefined;
    }
    get inputBoxData() {
        return this._inputBoxData;
    }
    layoutBody(height, width) {
        if (this.ignoreLayout) {
            return;
        }
        super.layoutBody(height, width);
        this.list?.layout(height, width);
        try {
            this.ignoreLayout = true;
            this.updateSize();
        }
        finally {
            this.ignoreLayout = false;
        }
    }
    onListContextMenu(e) {
        const element = e.element;
        const type = element instanceof Breakpoint
            ? 'breakpoint'
            : element instanceof ExceptionBreakpoint
                ? 'exceptionBreakpoint'
                : element instanceof FunctionBreakpoint
                    ? 'functionBreakpoint'
                    : element instanceof DataBreakpoint
                        ? 'dataBreakpoint'
                        : element instanceof InstructionBreakpoint
                            ? 'instructionBreakpoint'
                            : undefined;
        this.breakpointItemType.set(type);
        const session = this.debugService.getViewModel().focusedSession;
        const conditionSupported = element instanceof ExceptionBreakpoint
            ? element.supportsCondition
            : !session || !!session.capabilities.supportsConditionalBreakpoints;
        this.breakpointSupportsCondition.set(conditionSupported);
        this.breakpointIsDataBytes.set(element instanceof DataBreakpoint && element.src.type === 1 /* DataBreakpointSetType.Address */);
        this.breakpointHasMultipleModes.set(this.debugService
            .getModel()
            .getBreakpointModes(getModeKindForBreakpoint(element)).length > 1);
        const { secondary } = getContextMenuActions(this.menu.getActions({ arg: e.element, shouldForwardArgs: false }), 'inline');
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => secondary,
            getActionsContext: () => element,
        });
    }
    updateSize() {
        const containerModel = this.viewDescriptorService.getViewContainerModel(this.viewDescriptorService.getViewContainerByViewId(this.id));
        // Adjust expanded body size
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        this.minimumBodySize =
            this.orientation === 0 /* Orientation.VERTICAL */
                ? getExpandedBodySize(this.debugService.getModel(), sessionId, MAX_VISIBLE_BREAKPOINTS)
                : 170;
        this.maximumBodySize =
            this.orientation === 0 /* Orientation.VERTICAL */ && containerModel.visibleViewDescriptors.length > 1
                ? getExpandedBodySize(this.debugService.getModel(), sessionId, Number.POSITIVE_INFINITY)
                : Number.POSITIVE_INFINITY;
    }
    updateBreakpointsHint(delayed = false) {
        if (!this.hintContainer) {
            return;
        }
        const currentType = this.debugService.getViewModel().focusedSession?.configuration.type;
        const dbg = currentType
            ? this.debugService.getAdapterManager().getDebugger(currentType)
            : undefined;
        const message = dbg?.strings?.[DebuggerString.UnverifiedBreakpoints];
        const debuggerHasUnverifiedBps = message &&
            this.debugService
                .getModel()
                .getBreakpoints()
                .filter((bp) => {
                if (bp.verified || !bp.enabled) {
                    return false;
                }
                const langId = this.languageService.guessLanguageIdByFilepathOrFirstLine(bp.uri);
                return langId && dbg.interestedInLanguage(langId);
            });
        if (message &&
            debuggerHasUnverifiedBps?.length &&
            this.debugService.getModel().areBreakpointsActivated()) {
            if (delayed) {
                const mdown = new MarkdownString(undefined, { isTrusted: true }).appendMarkdown(message);
                this.hintContainer.setLabel('$(warning)', undefined, {
                    title: { markdown: mdown, markdownNotSupportedFallback: message },
                });
                dom.show(this.hintContainer.element);
            }
            else {
                this.hintDelayer.schedule();
            }
        }
        else {
            dom.hide(this.hintContainer.element);
        }
    }
    onBreakpointsChange() {
        if (this.isBodyVisible()) {
            this.updateSize();
            if (this.list) {
                const lastFocusIndex = this.list.getFocus()[0];
                // Check whether focused element was removed
                const needsRefocus = lastFocusIndex && !this.elements.includes(this.list.element(lastFocusIndex));
                this.list.splice(0, this.list.length, this.elements);
                this.needsRefresh = false;
                if (needsRefocus) {
                    this.list.focusNth(Math.min(lastFocusIndex, this.list.length - 1));
                }
            }
            this.updateBreakpointsHint();
        }
        else {
            this.needsRefresh = true;
        }
    }
    onStateChange() {
        if (this.isBodyVisible()) {
            this.needsStateChange = false;
            const thread = this.debugService.getViewModel().focusedThread;
            let found = false;
            if (thread &&
                thread.stoppedDetails &&
                thread.stoppedDetails.hitBreakpointIds &&
                thread.stoppedDetails.hitBreakpointIds.length > 0) {
                const hitBreakpointIds = thread.stoppedDetails.hitBreakpointIds;
                const elements = this.elements;
                const index = elements.findIndex((e) => {
                    const id = e.getIdFromAdapter(thread.session.getId());
                    return typeof id === 'number' && hitBreakpointIds.indexOf(id) !== -1;
                });
                if (index >= 0) {
                    this.list.setFocus([index]);
                    this.list.setSelection([index]);
                    found = true;
                    this.autoFocusedIndex = index;
                }
            }
            if (!found) {
                // Deselect breakpoint in breakpoint view when no longer stopped on it #125528
                const focus = this.list.getFocus();
                const selection = this.list.getSelection();
                if (this.autoFocusedIndex >= 0 &&
                    equals(focus, selection) &&
                    focus.indexOf(this.autoFocusedIndex) >= 0) {
                    this.list.setFocus([]);
                    this.list.setSelection([]);
                }
                this.autoFocusedIndex = -1;
            }
            this.updateBreakpointsHint();
        }
        else {
            this.needsStateChange = true;
        }
    }
    get elements() {
        const model = this.debugService.getModel();
        const sessionId = this.debugService.getViewModel().focusedSession?.getId();
        const elements = (model.getExceptionBreakpointsForSession(sessionId))
            .concat(model.getFunctionBreakpoints())
            .concat(model.getDataBreakpoints())
            .concat(model.getBreakpoints())
            .concat(model.getInstructionBreakpoints());
        return elements;
    }
};
BreakpointsView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IInstantiationService),
    __param(5, IThemeService),
    __param(6, IEditorService),
    __param(7, IContextViewService),
    __param(8, IConfigurationService),
    __param(9, IViewDescriptorService),
    __param(10, IContextKeyService),
    __param(11, IOpenerService),
    __param(12, ILabelService),
    __param(13, IMenuService),
    __param(14, IHoverService),
    __param(15, ILanguageService)
], BreakpointsView);
export { BreakpointsView };
class BreakpointsDelegate {
    constructor(view) {
        this.view = view;
        // noop
    }
    getHeight(_element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof Breakpoint) {
            return BreakpointsRenderer.ID;
        }
        if (element instanceof FunctionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (!element.name || (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId())) {
                return FunctionBreakpointInputRenderer.ID;
            }
            return FunctionBreakpointsRenderer.ID;
        }
        if (element instanceof ExceptionBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return ExceptionBreakpointInputRenderer.ID;
            }
            return ExceptionBreakpointsRenderer.ID;
        }
        if (element instanceof DataBreakpoint) {
            const inputBoxBreakpoint = this.view.inputBoxData?.breakpoint;
            if (inputBoxBreakpoint && inputBoxBreakpoint.getId() === element.getId()) {
                return DataBreakpointInputRenderer.ID;
            }
            return DataBreakpointsRenderer.ID;
        }
        if (element instanceof InstructionBreakpoint) {
            return InstructionBreakpointsRenderer.ID;
        }
        return '';
    }
}
const breakpointIdToActionBarDomeNode = new Map();
let BreakpointsRenderer = class BreakpointsRenderer {
    static { BreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'breakpoints'; }
    get templateId() {
        return BreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.filePath = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(breakpoint, index, data) {
        data.context = breakpoint;
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        data.name.textContent = resources.basenameOrAuthority(breakpoint.uri);
        let badgeContent = breakpoint.lineNumber.toString();
        if (breakpoint.column) {
            badgeContent += `:${breakpoint.column}`;
        }
        if (breakpoint.modeLabel) {
            badgeContent = `${breakpoint.modeLabel}: ${badgeContent}`;
        }
        data.badge.textContent = badgeContent;
        data.filePath.textContent = this.labelService.getUriLabel(resources.dirname(breakpoint.uri), {
            relative: true,
        });
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        const session = this.debugService.getViewModel().focusedSession;
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('breakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('source').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: breakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(breakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(a, index, template) {
        template.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
BreakpointsRenderer = BreakpointsRenderer_1 = __decorate([
    __param(4, IDebugService),
    __param(5, IHoverService),
    __param(6, ILabelService)
], BreakpointsRenderer);
class ExceptionBreakpointsRenderer {
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, debugService, hoverService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        // noop
    }
    static { this.ID = 'exceptionbreakpoints'; }
    get templateId() {
        return ExceptionBreakpointsRenderer.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.breakpoint.classList.add('exception');
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(exceptionBreakpoint, index, data) {
        data.context = exceptionBreakpoint;
        data.name.textContent = exceptionBreakpoint.label || `${exceptionBreakpoint.filter} exceptions`;
        const exceptionBreakpointtitle = exceptionBreakpoint.verified
            ? exceptionBreakpoint.description || data.name.textContent
            : exceptionBreakpoint.message ||
                localize('unverifiedExceptionBreakpoint', 'Unverified Exception Breakpoint');
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, exceptionBreakpointtitle));
        data.breakpoint.classList.toggle('disabled', !exceptionBreakpoint.verified);
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.condition.textContent = exceptionBreakpoint.condition || '';
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.condition, localize('expressionCondition', 'Expression condition: {0}', exceptionBreakpoint.condition)));
        if (exceptionBreakpoint.modeLabel) {
            data.badge.textContent = exceptionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        this.breakpointSupportsCondition.set(exceptionBreakpoint.supportsCondition);
        this.breakpointItemType.set('exceptionBreakpoint');
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('exception').length > 1);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: exceptionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(exceptionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
let FunctionBreakpointsRenderer = class FunctionBreakpointsRenderer {
    static { FunctionBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointSupportsCondition, breakpointItemType, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'functionbreakpoints'; }
    get templateId() {
        return FunctionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(functionBreakpoint, _index, data) {
        data.context = functionBreakpoint;
        data.name.textContent = functionBreakpoint.name;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (functionBreakpoint.condition && functionBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', 'Condition: {0} | Hit Count: {1}', functionBreakpoint.condition, functionBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent =
                functionBreakpoint.condition || functionBreakpoint.hitCondition || '';
        }
        if (functionBreakpoint.modeLabel) {
            data.badge.textContent = functionBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark function breakpoints as disabled if deactivated or if debug type does not support them #9099
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsFunctionBreakpoints) ||
            !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsFunctionBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('functionBreakpointsNotSupported', 'Function breakpoints are not supported by this debug type')));
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointItemType.set('functionBreakpoint');
        const { primary } = getActionBarActions(this.menu.getActions({ arg: functionBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(functionBreakpoint.getId(), data.actionBar.domNode);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
FunctionBreakpointsRenderer = FunctionBreakpointsRenderer_1 = __decorate([
    __param(3, IDebugService),
    __param(4, IHoverService),
    __param(5, ILabelService)
], FunctionBreakpointsRenderer);
let DataBreakpointsRenderer = class DataBreakpointsRenderer {
    static { DataBreakpointsRenderer_1 = this; }
    constructor(menu, breakpointHasMultipleModes, breakpointSupportsCondition, breakpointItemType, breakpointIsDataBytes, debugService, hoverService, labelService) {
        this.menu = menu;
        this.breakpointHasMultipleModes = breakpointHasMultipleModes;
        this.breakpointSupportsCondition = breakpointSupportsCondition;
        this.breakpointItemType = breakpointItemType;
        this.breakpointIsDataBytes = breakpointIsDataBytes;
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'databreakpoints'; }
    get templateId() {
        return DataBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.accessType = dom.append(data.breakpoint, $('span.access-type'));
        data.condition = dom.append(data.breakpoint, $('span.condition'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(dataBreakpoint, _index, data) {
        data.context = dataBreakpoint;
        data.name.textContent = dataBreakpoint.description;
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, message ? message : ''));
        if (dataBreakpoint.modeLabel) {
            data.badge.textContent = dataBreakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
        // Mark data breakpoints as disabled if deactivated or if debug type does not support them
        const session = this.debugService.getViewModel().focusedSession;
        data.breakpoint.classList.toggle('disabled', (session && !session.capabilities.supportsDataBreakpoints) ||
            !this.debugService.getModel().areBreakpointsActivated());
        if (session && !session.capabilities.supportsDataBreakpoints) {
            data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, localize('dataBreakpointsNotSupported', 'Data breakpoints are not supported by this debug type')));
        }
        if (dataBreakpoint.accessType) {
            const accessType = dataBreakpoint.accessType === 'read'
                ? localize('read', 'Read')
                : dataBreakpoint.accessType === 'write'
                    ? localize('write', 'Write')
                    : localize('access', 'Access');
            data.accessType.textContent = accessType;
        }
        else {
            data.accessType.textContent = '';
        }
        if (dataBreakpoint.condition && dataBreakpoint.hitCondition) {
            data.condition.textContent = localize('expressionAndHitCount', 'Condition: {0} | Hit Count: {1}', dataBreakpoint.condition, dataBreakpoint.hitCondition);
        }
        else {
            data.condition.textContent = dataBreakpoint.condition || dataBreakpoint.hitCondition || '';
        }
        this.breakpointSupportsCondition.set(!session || !!session.capabilities.supportsConditionalBreakpoints);
        this.breakpointHasMultipleModes.set(this.debugService.getModel().getBreakpointModes('data').length > 1);
        this.breakpointItemType.set('dataBreakpoint');
        this.breakpointIsDataBytes.set(dataBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */);
        const { primary } = getActionBarActions(this.menu.getActions({ arg: dataBreakpoint, shouldForwardArgs: true }), 'inline');
        data.actionBar.clear();
        data.actionBar.push(primary, { icon: true, label: false });
        breakpointIdToActionBarDomeNode.set(dataBreakpoint.getId(), data.actionBar.domNode);
        this.breakpointIsDataBytes.reset();
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
DataBreakpointsRenderer = DataBreakpointsRenderer_1 = __decorate([
    __param(5, IDebugService),
    __param(6, IHoverService),
    __param(7, ILabelService)
], DataBreakpointsRenderer);
let InstructionBreakpointsRenderer = class InstructionBreakpointsRenderer {
    static { InstructionBreakpointsRenderer_1 = this; }
    constructor(debugService, hoverService, labelService) {
        this.debugService = debugService;
        this.hoverService = hoverService;
        this.labelService = labelService;
        // noop
    }
    static { this.ID = 'instructionBreakpoints'; }
    get templateId() {
        return InstructionBreakpointsRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        data.elementDisposables = new DisposableStore();
        data.templateDisposables = new DisposableStore();
        data.templateDisposables.add(data.elementDisposables);
        data.breakpoint = dom.append(container, $('.breakpoint'));
        data.icon = $('.icon');
        data.checkbox = createCheckbox(data.templateDisposables);
        data.templateDisposables.add(dom.addStandardDisposableListener(data.checkbox, 'change', (e) => {
            this.debugService.enableOrDisableBreakpoints(!data.context.enabled, data.context);
        }));
        dom.append(data.breakpoint, data.icon);
        dom.append(data.breakpoint, data.checkbox);
        data.name = dom.append(data.breakpoint, $('span.name'));
        data.address = dom.append(data.breakpoint, $('span.file-path'));
        data.actionBar = new ActionBar(data.breakpoint);
        data.templateDisposables.add(data.actionBar);
        const badgeContainer = dom.append(data.breakpoint, $('.badge-container'));
        data.badge = dom.append(badgeContainer, $('span.line-number.monaco-count-badge'));
        return data;
    }
    renderElement(breakpoint, index, data) {
        data.context = breakpoint;
        data.breakpoint.classList.toggle('disabled', !this.debugService.getModel().areBreakpointsActivated());
        data.name.textContent = '0x' + breakpoint.address.toString(16);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.name, `Decimal address: breakpoint.address.toString()`));
        data.checkbox.checked = breakpoint.enabled;
        const { message, icon } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), breakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.breakpoint, breakpoint.message || message || ''));
        const debugActive = this.debugService.state === 3 /* State.Running */ || this.debugService.state === 2 /* State.Stopped */;
        if (debugActive && !breakpoint.verified) {
            data.breakpoint.classList.add('disabled');
        }
        if (breakpoint.modeLabel) {
            data.badge.textContent = breakpoint.modeLabel;
            data.badge.style.display = 'block';
        }
        else {
            data.badge.style.display = 'none';
        }
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
};
InstructionBreakpointsRenderer = InstructionBreakpointsRenderer_1 = __decorate([
    __param(0, IDebugService),
    __param(1, IHoverService),
    __param(2, ILabelService)
], InstructionBreakpointsRenderer);
class FunctionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'functionbreakpointinput'; }
    get templateId() {
        return FunctionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            inputBoxStyles: defaultInputBoxStyles,
        });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'name') {
                        this.debugService.updateFunctionBreakpoint(id, { name: inputBox.value });
                    }
                    if (template.type === 'condition') {
                        this.debugService.updateFunctionBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateFunctionBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    if (template.type === 'name' && !template.breakpoint.name) {
                        this.debugService.removeFunctionBreakpoints(id);
                    }
                    else {
                        this.view.renderInputBox(undefined);
                    }
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(functionBreakpoint, _index, data) {
        data.breakpoint = functionBreakpoint;
        data.type = this.view.inputBoxData?.type || 'name'; // If there is no type set take the 'name' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), functionBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ? message : ''));
        data.checkbox.checked = functionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = functionBreakpoint.name || '';
        let placeholder = localize('functionBreakpointPlaceholder', 'Function to break on');
        let ariaLabel = localize('functionBreakPointInputAriaLabel', 'Type function breakpoint.');
        if (data.type === 'condition') {
            data.inputBox.value = functionBreakpoint.condition || '';
            placeholder = localize('functionBreakpointExpressionPlaceholder', 'Break when expression evaluates to true');
            ariaLabel = localize('functionBreakPointExpresionAriaLabel', 'Type expression. Function breakpoint will break when expression evaluates to true');
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = functionBreakpoint.hitCondition || '';
            placeholder = localize('functionBreakpointHitCountPlaceholder', 'Break when hit count is met');
            ariaLabel = localize('functionBreakPointHitCountAriaLabel', 'Type hit count. Function breakpoint will break when hit count is met.');
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class DataBreakpointInputRenderer {
    constructor(view, debugService, contextViewService, hoverService, labelService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
        this.labelService = labelService;
    }
    static { this.ID = 'databreakpointinput'; }
    get templateId() {
        return DataBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const template = Object.create(null);
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        template.icon = $('.icon');
        template.checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, template.icon);
        dom.append(breakpoint, template.checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            inputBoxStyles: defaultInputBoxStyles,
        });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            template.updating = true;
            try {
                this.view.breakpointInputFocused.set(false);
                const id = template.breakpoint.getId();
                if (success) {
                    if (template.type === 'condition') {
                        this.debugService.updateDataBreakpoint(id, { condition: inputBox.value });
                    }
                    if (template.type === 'hitCount') {
                        this.debugService.updateDataBreakpoint(id, { hitCondition: inputBox.value });
                    }
                }
                else {
                    this.view.renderInputBox(undefined);
                }
            }
            finally {
                template.updating = false;
            }
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            if (!template.updating) {
                wrapUp(!!inputBox.value);
            }
        }));
        template.inputBox = inputBox;
        template.elementDisposables = new DisposableStore();
        template.templateDisposables = toDispose;
        template.templateDisposables.add(template.elementDisposables);
        return template;
    }
    renderElement(dataBreakpoint, _index, data) {
        data.breakpoint = dataBreakpoint;
        data.type = this.view.inputBoxData?.type || 'condition'; // If there is no type set take the 'condition' as the default
        const { icon, message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), dataBreakpoint, this.labelService, this.debugService.getModel());
        data.icon.className = ThemeIcon.asClassName(icon);
        data.elementDisposables.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.icon, message ?? ''));
        data.checkbox.checked = dataBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = '';
        let placeholder = '';
        let ariaLabel = '';
        if (data.type === 'condition') {
            data.inputBox.value = dataBreakpoint.condition || '';
            placeholder = localize('dataBreakpointExpressionPlaceholder', 'Break when expression evaluates to true');
            ariaLabel = localize('dataBreakPointExpresionAriaLabel', 'Type expression. Data breakpoint will break when expression evaluates to true');
        }
        else if (data.type === 'hitCount') {
            data.inputBox.value = dataBreakpoint.hitCondition || '';
            placeholder = localize('dataBreakpointHitCountPlaceholder', 'Break when hit count is met');
            ariaLabel = localize('dataBreakPointHitCountAriaLabel', 'Type hit count. Data breakpoint will break when hit count is met.');
        }
        data.inputBox.setAriaLabel(ariaLabel);
        data.inputBox.setPlaceHolder(placeholder);
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class ExceptionBreakpointInputRenderer {
    constructor(view, debugService, contextViewService) {
        this.view = view;
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        // noop
    }
    static { this.ID = 'exceptionbreakpointinput'; }
    get templateId() {
        return ExceptionBreakpointInputRenderer.ID;
    }
    renderTemplate(container) {
        const toDispose = new DisposableStore();
        const breakpoint = dom.append(container, $('.breakpoint'));
        breakpoint.classList.add('exception');
        const checkbox = createCheckbox(toDispose);
        dom.append(breakpoint, checkbox);
        this.view.breakpointInputFocused.set(true);
        const inputBoxContainer = dom.append(breakpoint, $('.inputBoxContainer'));
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            ariaLabel: localize('exceptionBreakpointAriaLabel', 'Type exception breakpoint condition'),
            inputBoxStyles: defaultInputBoxStyles,
        });
        toDispose.add(inputBox);
        const wrapUp = (success) => {
            if (!templateData.currentBreakpoint) {
                return;
            }
            this.view.breakpointInputFocused.set(false);
            let newCondition = templateData.currentBreakpoint.condition;
            if (success) {
                newCondition = inputBox.value !== '' ? inputBox.value : undefined;
            }
            this.debugService.setExceptionBreakpointCondition(templateData.currentBreakpoint, newCondition);
        };
        toDispose.add(dom.addStandardDisposableListener(inputBox.inputElement, 'keydown', (e) => {
            const isEscape = e.equals(9 /* KeyCode.Escape */);
            const isEnter = e.equals(3 /* KeyCode.Enter */);
            if (isEscape || isEnter) {
                e.preventDefault();
                e.stopPropagation();
                wrapUp(isEnter);
            }
        }));
        toDispose.add(dom.addDisposableListener(inputBox.inputElement, 'blur', () => {
            // Need to react with a timeout on the blur event due to possible concurent splices #56443
            setTimeout(() => {
                wrapUp(true);
            });
        }));
        const elementDisposables = new DisposableStore();
        toDispose.add(elementDisposables);
        const templateData = {
            inputBox,
            checkbox,
            templateDisposables: toDispose,
            elementDisposables: new DisposableStore(),
        };
        return templateData;
    }
    renderElement(exceptionBreakpoint, _index, data) {
        const placeHolder = exceptionBreakpoint.conditionDescription ||
            localize('exceptionBreakpointPlaceholder', 'Break when expression evaluates to true');
        data.inputBox.setPlaceHolder(placeHolder);
        data.currentBreakpoint = exceptionBreakpoint;
        data.checkbox.checked = exceptionBreakpoint.enabled;
        data.checkbox.disabled = true;
        data.inputBox.value = exceptionBreakpoint.condition || '';
        setTimeout(() => {
            data.inputBox.focus();
            data.inputBox.select();
        }, 0);
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposables.dispose();
    }
}
class BreakpointsAccessibilityProvider {
    constructor(debugService, labelService) {
        this.debugService = debugService;
        this.labelService = labelService;
    }
    getWidgetAriaLabel() {
        return localize('breakpoints', 'Breakpoints');
    }
    getRole() {
        return 'checkbox';
    }
    isChecked(breakpoint) {
        return breakpoint.enabled;
    }
    getAriaLabel(element) {
        if (element instanceof ExceptionBreakpoint) {
            return element.toString();
        }
        const { message } = getBreakpointMessageAndIcon(this.debugService.state, this.debugService.getModel().areBreakpointsActivated(), element, this.labelService, this.debugService.getModel());
        const toString = element.toString();
        return message ? `${toString}, ${message}` : toString;
    }
}
export function openBreakpointSource(breakpoint, sideBySide, preserveFocus, pinned, debugService, editorService) {
    if (breakpoint.uri.scheme === DEBUG_SCHEME && debugService.state === 0 /* State.Inactive */) {
        return Promise.resolve(undefined);
    }
    const selection = breakpoint.endLineNumber
        ? {
            startLineNumber: breakpoint.lineNumber,
            endLineNumber: breakpoint.endLineNumber,
            startColumn: breakpoint.column || 1,
            endColumn: breakpoint.endColumn || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
        }
        : {
            startLineNumber: breakpoint.lineNumber,
            startColumn: breakpoint.column || 1,
            endLineNumber: breakpoint.lineNumber,
            endColumn: breakpoint.column || 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */,
        };
    return editorService.openEditor({
        resource: breakpoint.uri,
        options: {
            preserveFocus,
            selection,
            revealIfOpened: true,
            selectionRevealType: 1 /* TextEditorSelectionRevealType.CenterIfOutsideViewport */,
            pinned,
        },
    }, sideBySide ? SIDE_GROUP : ACTIVE_GROUP);
}
export function getBreakpointMessageAndIcon(state, breakpointsActivated, breakpoint, labelService, debugModel) {
    const debugActive = state === 3 /* State.Running */ || state === 2 /* State.Stopped */;
    const breakpointIcon = breakpoint instanceof DataBreakpoint
        ? icons.dataBreakpoint
        : breakpoint instanceof FunctionBreakpoint
            ? icons.functionBreakpoint
            : breakpoint.logMessage
                ? icons.logBreakpoint
                : icons.breakpoint;
    if (!breakpoint.enabled || !breakpointsActivated) {
        return {
            icon: breakpointIcon.disabled,
            message: breakpoint.logMessage
                ? localize('disabledLogpoint', 'Disabled Logpoint')
                : localize('disabledBreakpoint', 'Disabled Breakpoint'),
        };
    }
    const appendMessage = (text) => {
        return 'message' in breakpoint && breakpoint.message
            ? text.concat(', ' + breakpoint.message)
            : text;
    };
    if (debugActive && breakpoint instanceof Breakpoint && breakpoint.pending) {
        return {
            icon: icons.breakpoint.pending,
        };
    }
    if (debugActive && !breakpoint.verified) {
        return {
            icon: breakpointIcon.unverified,
            message: 'message' in breakpoint && breakpoint.message
                ? breakpoint.message
                : breakpoint.logMessage
                    ? localize('unverifiedLogpoint', 'Unverified Logpoint')
                    : localize('unverifiedBreakpoint', 'Unverified Breakpoint'),
            showAdapterUnverifiedMessage: true,
        };
    }
    if (breakpoint instanceof DataBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('dataBreakpointUnsupported', 'Data breakpoints not supported by this debug type'),
            };
        }
        return {
            icon: breakpointIcon.regular,
            message: breakpoint.message || localize('dataBreakpoint', 'Data Breakpoint'),
        };
    }
    if (breakpoint instanceof FunctionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('functionBreakpointUnsupported', 'Function breakpoints not supported by this debug type'),
            };
        }
        const messages = [];
        messages.push(breakpoint.message || localize('functionBreakpoint', 'Function Breakpoint'));
        if (breakpoint.condition) {
            messages.push(localize('expression', 'Condition: {0}', breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', 'Hit Count: {0}', breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n')),
        };
    }
    if (breakpoint instanceof InstructionBreakpoint) {
        if (!breakpoint.supported) {
            return {
                icon: breakpointIcon.unverified,
                message: localize('instructionBreakpointUnsupported', 'Instruction breakpoints not supported by this debug type'),
            };
        }
        const messages = [];
        if (breakpoint.message) {
            messages.push(breakpoint.message);
        }
        else if (breakpoint.instructionReference) {
            messages.push(localize('instructionBreakpointAtAddress', 'Instruction breakpoint at address {0}', breakpoint.instructionReference));
        }
        else {
            messages.push(localize('instructionBreakpoint', 'Instruction breakpoint'));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', 'Hit Count: {0}', breakpoint.hitCondition));
        }
        return {
            icon: breakpointIcon.regular,
            message: appendMessage(messages.join('\n')),
        };
    }
    // can change this when all breakpoint supports dependent breakpoint condition
    let triggeringBreakpoint;
    if (breakpoint instanceof Breakpoint && breakpoint.triggeredBy) {
        triggeringBreakpoint = debugModel
            .getBreakpoints()
            .find((bp) => bp.getId() === breakpoint.triggeredBy);
    }
    if (breakpoint.logMessage ||
        breakpoint.condition ||
        breakpoint.hitCondition ||
        triggeringBreakpoint) {
        const messages = [];
        let icon = breakpoint.logMessage
            ? icons.logBreakpoint.regular
            : icons.conditionalBreakpoint.regular;
        if (!breakpoint.supported) {
            icon = icons.debugBreakpointUnsupported;
            messages.push(localize('breakpointUnsupported', 'Breakpoints of this type are not supported by the debugger'));
        }
        if (breakpoint.logMessage) {
            messages.push(localize('logMessage', 'Log Message: {0}', breakpoint.logMessage));
        }
        if (breakpoint.condition) {
            messages.push(localize('expression', 'Condition: {0}', breakpoint.condition));
        }
        if (breakpoint.hitCondition) {
            messages.push(localize('hitCount', 'Hit Count: {0}', breakpoint.hitCondition));
        }
        if (triggeringBreakpoint) {
            messages.push(localize('triggeredBy', 'Hit after breakpoint: {0}', `${labelService.getUriLabel(triggeringBreakpoint.uri, { relative: true })}: ${triggeringBreakpoint.lineNumber}`));
        }
        return {
            icon,
            message: appendMessage(messages.join('\n')),
        };
    }
    const message = 'message' in breakpoint && breakpoint.message
        ? breakpoint.message
        : breakpoint instanceof Breakpoint && labelService
            ? labelService.getUriLabel(breakpoint.uri)
            : localize('breakpoint', 'Breakpoint');
    return {
        icon: breakpointIcon.regular,
        message,
    };
}
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addFunctionBreakpointAction',
            title: {
                ...localize2('addFunctionBreakpoint', 'Add Function Breakpoint'),
                mnemonicTitle: localize({ key: 'miFunctionBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&Function Breakpoint...'),
            },
            f1: true,
            icon: icons.watchExpressionsAddFuncBreakpoint,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 10,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID),
                },
                {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        const viewService = accessor.get(IViewsService);
        await viewService.openView(BREAKPOINTS_VIEW_ID);
        debugService.addFunctionBreakpoint();
    }
});
class MemoryBreakpointAction extends Action2 {
    async run(accessor, existingBreakpoint) {
        const debugService = accessor.get(IDebugService);
        const session = debugService.getViewModel().focusedSession;
        if (!session) {
            return;
        }
        let defaultValue = undefined;
        if (existingBreakpoint && existingBreakpoint.src.type === 1 /* DataBreakpointSetType.Address */) {
            defaultValue = `${existingBreakpoint.src.address} + ${existingBreakpoint.src.bytes}`;
        }
        const quickInput = accessor.get(IQuickInputService);
        const notifications = accessor.get(INotificationService);
        const range = await this.getRange(quickInput, defaultValue);
        if (!range) {
            return;
        }
        let info;
        try {
            info = await session.dataBytesBreakpointInfo(range.address, range.bytes);
        }
        catch (e) {
            notifications.error(localize('dataBreakpointError', 'Failed to set data breakpoint at {0}: {1}', range.address, e.message));
        }
        if (!info?.dataId) {
            return;
        }
        let accessType = 'write';
        if (info.accessTypes && info.accessTypes?.length > 1) {
            const accessTypes = info.accessTypes.map((type) => ({ label: type }));
            const selectedAccessType = await quickInput.pick(accessTypes, {
                placeHolder: localize('dataBreakpointAccessType', 'Select the access type to monitor'),
            });
            if (!selectedAccessType) {
                return;
            }
            accessType = selectedAccessType.label;
        }
        const src = { type: 1 /* DataBreakpointSetType.Address */, ...range };
        if (existingBreakpoint) {
            await debugService.removeDataBreakpoints(existingBreakpoint.getId());
        }
        await debugService.addDataBreakpoint({
            description: info.description,
            src,
            canPersist: true,
            accessTypes: info.accessTypes,
            accessType: accessType,
            initialSessionData: { session, dataId: info.dataId },
        });
    }
    getRange(quickInput, defaultValue) {
        return new Promise((resolve) => {
            const disposables = new DisposableStore();
            const input = disposables.add(quickInput.createInputBox());
            input.prompt = localize('dataBreakpointMemoryRangePrompt', 'Enter a memory range in which to break');
            input.placeholder = localize('dataBreakpointMemoryRangePlaceholder', 'Absolute range (0x1234 - 0x1300) or range of bytes after an address (0x1234 + 0xff)');
            if (defaultValue) {
                input.value = defaultValue;
                input.valueSelection = [0, defaultValue.length];
            }
            disposables.add(input.onDidChangeValue((e) => {
                const err = this.parseAddress(e, false);
                input.validationMessage = err?.error;
            }));
            disposables.add(input.onDidAccept(() => {
                const r = this.parseAddress(input.value, true);
                if ('error' in r) {
                    input.validationMessage = r.error;
                }
                else {
                    resolve(r);
                }
                input.dispose();
            }));
            disposables.add(input.onDidHide(() => {
                resolve(undefined);
                disposables.dispose();
            }));
            input.ignoreFocusOut = true;
            input.show();
        });
    }
    parseAddress(range, isFinal) {
        const parts = /^(\S+)\s*(?:([+-])\s*(\S+))?/.exec(range);
        if (!parts) {
            return {
                error: localize('dataBreakpointAddrFormat', 'Address should be a range of numbers the form "[Start] - [End]" or "[Start] + [Bytes]"'),
            };
        }
        const isNum = (e) => isFinal ? /^0x[0-9a-f]*|[0-9]*$/i.test(e) : /^0x[0-9a-f]+|[0-9]+$/i.test(e);
        const [, startStr, sign = '+', endStr = '1'] = parts;
        for (const n of [startStr, endStr]) {
            if (!isNum(n)) {
                return {
                    error: localize('dataBreakpointAddrStartEnd', 'Number must be a decimal integer or hex value starting with \"0x\", got {0}', n),
                };
            }
        }
        if (!isFinal) {
            return;
        }
        const start = BigInt(startStr);
        const end = BigInt(endStr);
        const address = `0x${start.toString(16)}`;
        if (sign === '-') {
            return { address, bytes: Number(start - end) };
        }
        return { address, bytes: Number(end) };
    }
}
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.addDataBreakpointOnAddress',
            title: {
                ...localize2('addDataBreakpointOnAddress', 'Add Data Breakpoint at Address'),
                mnemonicTitle: localize({ key: 'miDataBreakpoint', comment: ['&& denotes a mnemonic'] }, '&&Data Breakpoint...'),
            },
            f1: true,
            icon: icons.watchExpressionsAddDataBreakpoint,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 11,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID)),
                },
                {
                    id: MenuId.MenubarNewBreakpointMenu,
                    group: '1_breakpoints',
                    order: 4,
                    when: CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED,
                },
            ],
        });
    }
});
registerAction2(class extends MemoryBreakpointAction {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.editDataBreakpointOnAddress',
            title: localize2('editDataBreakpointOnAddress', 'Edit Address...'),
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    when: ContextKeyExpr.and(CONTEXT_SET_DATA_BREAKPOINT_BYTES_SUPPORTED, CONTEXT_BREAKPOINT_ITEM_IS_DATA_BYTES),
                    group: 'navigation',
                    order: 15,
                },
            ],
        });
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.toggleBreakpointsActivatedAction',
            title: localize2('activateBreakpoints', 'Toggle Activate Breakpoints'),
            f1: true,
            icon: icons.breakpointsActivate,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                order: 20,
                when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID),
            },
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.setBreakpointsActivated(!debugService.getModel().areBreakpointsActivated());
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeBreakpoint',
            title: localize('removeBreakpoint', 'Remove Breakpoint'),
            icon: Codicon.removeClose,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'),
                },
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 20,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint'),
                },
            ],
        });
    }
    async run(accessor, breakpoint) {
        const debugService = accessor.get(IDebugService);
        if (breakpoint instanceof Breakpoint) {
            await debugService.removeBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            await debugService.removeFunctionBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof DataBreakpoint) {
            await debugService.removeDataBreakpoints(breakpoint.getId());
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            await debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.removeAllBreakpoints',
            title: {
                ...localize2('removeAllBreakpoints', 'Remove All Breakpoints'),
                mnemonicTitle: localize({ key: 'miRemoveAllBreakpoints', comment: ['&& denotes a mnemonic'] }, 'Remove &&All Breakpoints'),
            },
            f1: true,
            icon: icons.breakpointsRemoveAll,
            menu: [
                {
                    id: MenuId.ViewTitle,
                    group: 'navigation',
                    order: 30,
                    when: ContextKeyExpr.equals('view', BREAKPOINTS_VIEW_ID),
                },
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: '3_modification',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')),
                },
                {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 3,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    run(accessor) {
        const debugService = accessor.get(IDebugService);
        debugService.removeBreakpoints();
        debugService.removeFunctionBreakpoints();
        debugService.removeDataBreakpoints();
        debugService.removeInstructionBreakpoints();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.enableAllBreakpoints',
            title: {
                ...localize2('enableAllBreakpoints', 'Enable All Breakpoints'),
                mnemonicTitle: localize({ key: 'miEnableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, '&&Enable All Breakpoints'),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 10,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')),
                },
                {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 1,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(true);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.disableAllBreakpoints',
            title: {
                ...localize2('disableAllBreakpoints', 'Disable All Breakpoints'),
                mnemonicTitle: localize({ key: 'miDisableAllBreakpoints', comment: ['&& denotes a mnemonic'] }, 'Disable A&&ll Breakpoints'),
            },
            f1: true,
            precondition: CONTEXT_DEBUGGERS_AVAILABLE,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')),
                },
                {
                    id: MenuId.MenubarDebugMenu,
                    group: '5_breakpoints',
                    order: 2,
                    when: CONTEXT_DEBUGGERS_AVAILABLE,
                },
            ],
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.enableOrDisableBreakpoints(false);
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.debug.viewlet.action.reapplyBreakpointsAction',
            title: localize2('reapplyAllBreakpoints', 'Reapply All Breakpoints'),
            f1: true,
            precondition: CONTEXT_IN_DEBUG_MODE,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'z_commands',
                    order: 30,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINTS_EXIST, CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('exceptionBreakpoint')),
                },
            ],
        });
    }
    async run(accessor) {
        const debugService = accessor.get(IDebugService);
        await debugService.setBreakpointsActivated(true);
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editCondition', 'Edit Condition...'),
            icon: Codicon.edit,
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.notEqualsTo('functionBreakpoint'),
                    group: 'navigation',
                    order: 10,
                },
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'inline',
                    order: 10,
                },
            ],
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const editorService = accessor.get(IEditorService);
        if (breakpoint instanceof Breakpoint) {
            const editor = await openBreakpointSource(breakpoint, false, false, true, debugService, editorService);
            if (editor) {
                const codeEditor = editor.getControl();
                if (isCodeEditor(codeEditor)) {
                    codeEditor
                        .getContribution(BREAKPOINT_EDITOR_CONTRIBUTION_ID)
                        ?.showBreakpointWidget(breakpoint.lineNumber, breakpoint.column);
                }
            }
        }
        else if (breakpoint instanceof FunctionBreakpoint) {
            const contextMenuService = accessor.get(IContextMenuService);
            const actions = [
                new Action('breakpoint.editCondition', localize('editCondition', 'Edit Condition...'), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'condition' })),
                new Action('breakpoint.editCondition', localize('editHitCount', 'Edit Hit Count...'), undefined, true, async () => view.renderInputBox({ breakpoint, type: 'hitCount' })),
            ];
            const domNode = breakpointIdToActionBarDomeNode.get(breakpoint.getId());
            if (domNode) {
                contextMenuService.showContextMenu({
                    getActions: () => actions,
                    getAnchor: () => domNode,
                    onHide: () => dispose(actions),
                });
            }
        }
        else {
            view.renderInputBox({ breakpoint, type: 'condition' });
        }
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpoint',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editBreakpoint', 'Edit Function Condition...'),
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 10,
                    when: CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint'),
                },
            ],
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'name' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editFunctionBreakpointHitCount',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editHitCount', 'Edit Hit Count...'),
            precondition: CONTEXT_BREAKPOINT_SUPPORTS_CONDITION,
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('functionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('dataBreakpoint')),
                },
            ],
        });
    }
    runInView(_accessor, view, breakpoint) {
        view.renderInputBox({ breakpoint, type: 'hitCount' });
    }
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'debug.editBreakpointMode',
            viewId: BREAKPOINTS_VIEW_ID,
            title: localize('editMode', 'Edit Mode...'),
            menu: [
                {
                    id: MenuId.DebugBreakpointsContext,
                    group: 'navigation',
                    order: 20,
                    when: ContextKeyExpr.and(CONTEXT_BREAKPOINT_HAS_MODES, ContextKeyExpr.or(CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('breakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('exceptionBreakpoint'), CONTEXT_BREAKPOINT_ITEM_TYPE.isEqualTo('instructionBreakpoint'))),
                },
            ],
        });
    }
    async runInView(accessor, view, breakpoint) {
        const debugService = accessor.get(IDebugService);
        const kind = getModeKindForBreakpoint(breakpoint);
        const modes = debugService.getModel().getBreakpointModes(kind);
        const picked = await accessor.get(IQuickInputService).pick(modes.map((mode) => ({
            label: mode.label,
            description: mode.description,
            mode: mode.mode,
        })), { placeHolder: localize('selectBreakpointMode', 'Select Breakpoint Mode') });
        if (!picked) {
            return;
        }
        if (kind === 'source') {
            const data = new Map();
            data.set(breakpoint.getId(), { mode: picked.mode, modeLabel: picked.label });
            debugService.updateBreakpoints(breakpoint.originalUri, data, false);
        }
        else if (breakpoint instanceof InstructionBreakpoint) {
            debugService.removeInstructionBreakpoints(breakpoint.instructionReference, breakpoint.offset);
            debugService.addInstructionBreakpoint({
                ...breakpoint.toJSON(),
                mode: picked.mode,
                modeLabel: picked.label,
            });
        }
        else if (breakpoint instanceof ExceptionBreakpoint) {
            breakpoint.mode = picked.mode;
            breakpoint.modeLabel = picked.label;
            debugService.setExceptionBreakpointCondition(breakpoint, breakpoint.condition); // no-op to trigger a re-send
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJlYWtwb2ludHNWaWV3LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9icmVha3BvaW50c1ZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUU5RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDOUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBUTNFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbkUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxp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