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
var SessionsRenderer_1, ThreadsRenderer_1, StackFramesRenderer_1, ErrorsRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { HighlightedLabel } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Action } from '../../../../base/common/actions.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Event } from '../../../../base/common/event.js';
import { createMatches } from '../../../../base/common/filters.js';
import { DisposableStore, dispose } from '../../../../base/common/lifecycle.js';
import { posix } from '../../../../base/common/path.js';
import { commonSuffixLength } from '../../../../base/common/strings.js';
import { localize } from '../../../../nls.js';
import { getActionBarActions, getContextMenuActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, MenuItemAction, MenuRegistry, registerAction2, SubmenuItemAction, } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { WorkbenchCompressibleAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { asCssVariable, textLinkForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { renderViewTree } from './baseDebugView.js';
import { CONTINUE_ID, CONTINUE_LABEL, DISCONNECT_ID, DISCONNECT_LABEL, PAUSE_ID, PAUSE_LABEL, RESTART_LABEL, RESTART_SESSION_ID, STEP_INTO_ID, STEP_INTO_LABEL, STEP_OUT_ID, STEP_OUT_LABEL, STEP_OVER_ID, STEP_OVER_LABEL, STOP_ID, STOP_LABEL, } from './debugCommands.js';
import * as icons from './debugIcons.js';
import { createDisconnectMenuItemAction } from './debugToolBar.js';
import { CALLSTACK_VIEW_ID, CONTEXT_CALLSTACK_FOCUSED, CONTEXT_CALLSTACK_ITEM_STOPPED, CONTEXT_CALLSTACK_ITEM_TYPE, CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD, CONTEXT_CALLSTACK_SESSION_IS_ATTACH, CONTEXT_DEBUG_STATE, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG, CONTEXT_STACK_FRAME_SUPPORTS_RESTART, getStateLabel, IDebugService, isFrameDeemphasized, } from '../common/debug.js';
import { StackFrame, Thread, ThreadAndSessionIds } from '../common/debugModel.js';
import { isSessionAttach } from '../common/debugUtils.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const $ = dom.$;
function assignSessionContext(element, context) {
    context.sessionId = element.getId();
    return context;
}
function assignThreadContext(element, context) {
    context.threadId = element.getId();
    assignSessionContext(element.session, context);
    return context;
}
function assignStackFrameContext(element, context) {
    context.frameId = element.getId();
    context.frameName = element.name;
    context.frameLocation = { range: element.range, source: element.source.raw };
    assignThreadContext(element.thread, context);
    return context;
}
export function getContext(element) {
    if (element instanceof StackFrame) {
        return assignStackFrameContext(element, {});
    }
    else if (element instanceof Thread) {
        return assignThreadContext(element, {});
    }
    else if (isDebugSession(element)) {
        return assignSessionContext(element, {});
    }
    else {
        return undefined;
    }
}
// Extensions depend on this context, should not be changed even though it is not fully deterministic
export function getContextForContributedActions(element) {
    if (element instanceof StackFrame) {
        if (element.source.inMemory) {
            return element.source.raw.path || element.source.reference || element.source.name;
        }
        return element.source.uri.toString();
    }
    if (element instanceof Thread) {
        return element.threadId;
    }
    if (isDebugSession(element)) {
        return element.getId();
    }
    return '';
}
export function getSpecificSourceName(stackFrame) {
    // To reduce flashing of the path name and the way we fetch stack frames
    // We need to compute the source name based on the other frames in the stale call stack
    let callStack = stackFrame.thread.getStaleCallStack();
    callStack = callStack.length > 0 ? callStack : stackFrame.thread.getCallStack();
    const otherSources = callStack.map((sf) => sf.source).filter((s) => s !== stackFrame.source);
    let suffixLength = 0;
    otherSources.forEach((s) => {
        if (s.name === stackFrame.source.name) {
            suffixLength = Math.max(suffixLength, commonSuffixLength(stackFrame.source.uri.path, s.uri.path));
        }
    });
    if (suffixLength === 0) {
        return stackFrame.source.name;
    }
    const from = Math.max(0, stackFrame.source.uri.path.lastIndexOf(posix.sep, stackFrame.source.uri.path.length - suffixLength - 1));
    return (from > 0 ? '...' : '') + stackFrame.source.uri.path.substring(from);
}
async function expandTo(session, tree) {
    if (session.parentSession) {
        await expandTo(session.parentSession, tree);
    }
    await tree.expand(session);
}
let CallStackView = class CallStackView extends ViewPane {
    constructor(options, contextMenuService, debugService, keybindingService, instantiationService, viewDescriptorService, configurationService, contextKeyService, openerService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.options = options;
        this.debugService = debugService;
        this.menuService = menuService;
        this.needsRefresh = false;
        this.ignoreSelectionChangedEvent = false;
        this.ignoreFocusStackFrameEvent = false;
        this.autoExpandedSessions = new Set();
        this.selectionNeedsUpdate = false;
        // Create scheduler to prevent unnecessary flashing of tree when reacting to changes
        this.onCallStackChangeScheduler = this._register(new RunOnceScheduler(async () => {
            // Only show the global pause message if we do not display threads.
            // Otherwise there will be a pause message per thread and there is no need for a global one.
            const sessions = this.debugService.getModel().getSessions();
            if (sessions.length === 0) {
                this.autoExpandedSessions.clear();
            }
            const thread = sessions.length === 1 && sessions[0].getAllThreads().length === 1
                ? sessions[0].getAllThreads()[0]
                : undefined;
            const stoppedDetails = sessions.length === 1 ? sessions[0].getStoppedDetails() : undefined;
            if (stoppedDetails && (thread || typeof stoppedDetails.threadId !== 'number')) {
                this.stateMessageLabel.textContent = stoppedDescription(stoppedDetails);
                this.stateMessageLabelHover.update(stoppedText(stoppedDetails));
                this.stateMessageLabel.classList.toggle('exception', stoppedDetails.reason === 'exception');
                this.stateMessage.hidden = false;
            }
            else if (sessions.length === 1 && sessions[0].state === 3 /* State.Running */) {
                this.stateMessageLabel.textContent = localize({ key: 'running', comment: ['indicates state'] }, 'Running');
                this.stateMessageLabelHover.update(sessions[0].getLabel());
                this.stateMessageLabel.classList.remove('exception');
                this.stateMessage.hidden = false;
            }
            else {
                this.stateMessage.hidden = true;
            }
            this.updateActions();
            this.needsRefresh = false;
            this.dataSource.deemphasizedStackFramesToShow = [];
            await this.tree.updateChildren();
            try {
                const toExpand = new Set();
                sessions.forEach((s) => {
                    // Automatically expand sessions that have children, but only do this once.
                    if (s.parentSession && !this.autoExpandedSessions.has(s.parentSession)) {
                        toExpand.add(s.parentSession);
                    }
                });
                for (const session of toExpand) {
                    await expandTo(session, this.tree);
                    this.autoExpandedSessions.add(session);
                }
            }
            catch (e) {
                // Ignore tree expand errors if element no longer present
            }
            if (this.selectionNeedsUpdate) {
                this.selectionNeedsUpdate = false;
                await this.updateTreeSelection();
            }
        }, 50));
    }
    renderHeaderTitle(container) {
        super.renderHeaderTitle(container, this.options.title);
        this.stateMessage = dom.append(container, $('span.call-stack-state-message'));
        this.stateMessage.hidden = true;
        this.stateMessageLabel = dom.append(this.stateMessage, $('span.label'));
        this.stateMessageLabelHover = this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.stateMessage, ''));
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-call-stack');
        const treeContainer = renderViewTree(container);
        this.dataSource = new CallStackDataSource(this.debugService);
        this.tree = this.instantiationService.createInstance((WorkbenchCompressibleAsyncDataTree), 'CallStackView', treeContainer, new CallStackDelegate(), new CallStackCompressionDelegate(this.debugService), [
            this.instantiationService.createInstance(SessionsRenderer),
            this.instantiationService.createInstance(ThreadsRenderer),
            this.instantiationService.createInstance(StackFramesRenderer),
            this.instantiationService.createInstance(ErrorsRenderer),
            new LoadMoreRenderer(),
            new ShowMoreRenderer(),
        ], this.dataSource, {
            accessibilityProvider: new CallStackAccessibilityProvider(),
            compressionEnabled: true,
            autoExpandSingleChildren: true,
            identityProvider: {
                getId: (element) => {
                    if (typeof element === 'string') {
                        return element;
                    }
                    if (element instanceof Array) {
                        return `showMore ${element[0].getId()}`;
                    }
                    return element.getId();
                },
            },
            keyboardNavigationLabelProvider: {
                getKeyboardNavigationLabel: (e) => {
                    if (isDebugSession(e)) {
                        return e.getLabel();
                    }
                    if (e instanceof Thread) {
                        return `${e.name} ${e.stateLabel}`;
                    }
                    if (e instanceof StackFrame || typeof e === 'string') {
                        return e;
                    }
                    if (e instanceof ThreadAndSessionIds) {
                        return LoadMoreRenderer.LABEL;
                    }
                    return localize('showMoreStackFrames2', 'Show More Stack Frames');
                },
                getCompressedNodeKeyboardNavigationLabel: (e) => {
                    const firstItem = e[0];
                    if (isDebugSession(firstItem)) {
                        return firstItem.getLabel();
                    }
                    return '';
                },
            },
            expandOnlyOnTwistieClick: true,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        CONTEXT_CALLSTACK_FOCUSED.bindTo(this.tree.contextKeyService);
        this.tree.setInput(this.debugService.getModel());
        this._register(this.tree);
        this._register(this.tree.onDidOpen(async (e) => {
            if (this.ignoreSelectionChangedEvent) {
                return;
            }
            const focusStackFrame = (stackFrame, thread, session, options = {}) => {
                this.ignoreFocusStackFrameEvent = true;
                try {
                    this.debugService.focusStackFrame(stackFrame, thread, session, {
                        ...options,
                        ...{ explicit: true },
                    });
                }
                finally {
                    this.ignoreFocusStackFrameEvent = false;
                }
            };
            const element = e.element;
            if (element instanceof StackFrame) {
                const opts = {
                    preserveFocus: e.editorOptions.preserveFocus,
                    sideBySide: e.sideBySide,
                    pinned: e.editorOptions.pinned,
                };
                focusStackFrame(element, element.thread, element.thread.session, opts);
            }
            if (element instanceof Thread) {
                focusStackFrame(undefined, element, element.session);
            }
            if (isDebugSession(element)) {
                focusStackFrame(undefined, undefined, element);
            }
            if (element instanceof ThreadAndSessionIds) {
                const session = this.debugService.getModel().getSession(element.sessionId);
                const thread = session && session.getThread(element.threadId);
                if (thread) {
                    const totalFrames = thread.stoppedDetails?.totalFrames;
                    const remainingFramesCount = typeof totalFrames === 'number'
                        ? totalFrames - thread.getCallStack().length
                        : undefined;
                    // Get all the remaining frames
                    await thread.fetchCallStack(remainingFramesCount);
                    await this.tree.updateChildren();
                }
            }
            if (element instanceof Array) {
                this.dataSource.deemphasizedStackFramesToShow.push(...element);
                this.tree.updateChildren();
            }
        }));
        this._register(this.debugService.getModel().onDidChangeCallStack(() => {
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                return;
            }
            if (!this.onCallStackChangeScheduler.isScheduled()) {
                this.onCallStackChangeScheduler.schedule();
            }
        }));
        const onFocusChange = Event.any(this.debugService.getViewModel().onDidFocusStackFrame, this.debugService.getViewModel().onDidFocusSession);
        this._register(onFocusChange(async () => {
            if (this.ignoreFocusStackFrameEvent) {
                return;
            }
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                this.selectionNeedsUpdate = true;
                return;
            }
            if (this.onCallStackChangeScheduler.isScheduled()) {
                this.selectionNeedsUpdate = true;
                return;
            }
            await this.updateTreeSelection();
        }));
        this._register(this.tree.onContextMenu((e) => this.onContextMenu(e)));
        // Schedule the update of the call stack tree if the viewlet is opened after a session started #14684
        if (this.debugService.state === 2 /* State.Stopped */) {
            this.onCallStackChangeScheduler.schedule(0);
        }
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible && this.needsRefresh) {
                this.onCallStackChangeScheduler.schedule();
            }
        }));
        this._register(this.debugService.onDidNewSession((s) => {
            const sessionListeners = [];
            sessionListeners.push(s.onDidChangeName(() => {
                // this.tree.updateChildren is called on a delay after a session is added,
                // so don't rerender if the tree doesn't have the node yet
                if (this.tree.hasNode(s)) {
                    this.tree.rerender(s);
                }
            }));
            sessionListeners.push(s.onDidEndAdapter(() => dispose(sessionListeners)));
            if (s.parentSession) {
                // A session we already expanded has a new child session, allow to expand it again.
                this.autoExpandedSessions.delete(s.parentSession);
            }
        }));
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.tree.layout(height, width);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    async updateTreeSelection() {
        if (!this.tree || !this.tree.getInput()) {
            // Tree not initialized yet
            return;
        }
        const updateSelectionAndReveal = (element) => {
            this.ignoreSelectionChangedEvent = true;
            try {
                this.tree.setSelection([element]);
                // If the element is outside of the screen bounds,
                // position it in the middle
                if (this.tree.getRelativeTop(element) === null) {
                    this.tree.reveal(element, 0.5);
                }
                else {
                    this.tree.reveal(element);
                }
            }
            catch (e) {
            }
            finally {
                this.ignoreSelectionChangedEvent = false;
            }
        };
        const thread = this.debugService.getViewModel().focusedThread;
        const session = this.debugService.getViewModel().focusedSession;
        const stackFrame = this.debugService.getViewModel().focusedStackFrame;
        if (!thread) {
            if (!session) {
                this.tree.setSelection([]);
            }
            else {
                updateSelectionAndReveal(session);
            }
        }
        else {
            // Ignore errors from this expansions because we are not aware if we rendered the threads and sessions or we hide them to declutter the view
            try {
                await expandTo(thread.session, this.tree);
            }
            catch (e) { }
            try {
                await this.tree.expand(thread);
            }
            catch (e) { }
            const toReveal = stackFrame || session;
            if (toReveal) {
                updateSelectionAndReveal(toReveal);
            }
        }
    }
    onContextMenu(e) {
        const element = e.element;
        let overlay = [];
        if (isDebugSession(element)) {
            overlay = getSessionContextOverlay(element);
        }
        else if (element instanceof Thread) {
            overlay = getThreadContextOverlay(element);
        }
        else if (element instanceof StackFrame) {
            overlay = getStackFrameContextOverlay(element);
        }
        const contextKeyService = this.contextKeyService.createOverlay(overlay);
        const menu = this.menuService.getMenuActions(MenuId.DebugCallStackContext, contextKeyService, {
            arg: getContextForContributedActions(element),
            shouldForwardArgs: true,
        });
        const result = getContextMenuActions(menu, 'inline');
        this.contextMenuService.showContextMenu({
            getAnchor: () => e.anchor,
            getActions: () => result.secondary,
            getActionsContext: () => getContext(element),
        });
    }
};
CallStackView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IInstantiationService),
    __param(5, IViewDescriptorService),
    __param(6, IConfigurationService),
    __param(7, IContextKeyService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IMenuService)
], CallStackView);
export { CallStackView };
function getSessionContextOverlay(session) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'session'],
        [CONTEXT_CALLSTACK_SESSION_IS_ATTACH.key, isSessionAttach(session)],
        [CONTEXT_CALLSTACK_ITEM_STOPPED.key, session.state === 2 /* State.Stopped */],
        [CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD.key, session.getAllThreads().length === 1],
    ];
}
let SessionsRenderer = class SessionsRenderer {
    static { SessionsRenderer_1 = this; }
    static { this.ID = 'session'; }
    constructor(instantiationService, contextKeyService, hoverService, menuService) {
        this.instantiationService = instantiationService;
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.menuService = menuService;
    }
    get templateId() {
        return SessionsRenderer_1.ID;
    }
    renderTemplate(container) {
        const session = dom.append(container, $('.session'));
        dom.append(session, $(ThemeIcon.asCSSSelector(icons.callstackViewSession)));
        const name = dom.append(session, $('.name'));
        const stateLabel = dom.append(session, $('span.state.label.monaco-count-badge.long'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(name));
        const stopActionViewItemDisposables = templateDisposable.add(new DisposableStore());
        const actionBar = templateDisposable.add(new ActionBar(session, {
            actionViewItemProvider: (action, options) => {
                if ((action.id === STOP_ID || action.id === DISCONNECT_ID) &&
                    action instanceof MenuItemAction) {
                    stopActionViewItemDisposables.clear();
                    const item = this.instantiationService.invokeFunction((accessor) => createDisconnectMenuItemAction(action, stopActionViewItemDisposables, accessor, { ...options, menuAsChild: false }));
                    if (item) {
                        return item;
                    }
                }
                if (action instanceof MenuItemAction) {
                    return this.instantiationService.createInstance(MenuEntryActionViewItem, action, {
                        hoverDelegate: options.hoverDelegate,
                    });
                }
                else if (action instanceof SubmenuItemAction) {
                    return this.instantiationService.createInstance(SubmenuEntryActionViewItem, action, {
                        hoverDelegate: options.hoverDelegate,
                    });
                }
                return undefined;
            },
        }));
        const elementDisposable = templateDisposable.add(new DisposableStore());
        return { session, name, stateLabel, label, actionBar, elementDisposable, templateDisposable };
    }
    renderElement(element, _, data) {
        this.doRenderElement(element.element, createMatches(element.filterData), data);
    }
    renderCompressedElements(node, _index, templateData) {
        const lastElement = node.element.elements[node.element.elements.length - 1];
        const matches = createMatches(node.filterData);
        this.doRenderElement(lastElement, matches, templateData);
    }
    doRenderElement(session, matches, data) {
        const sessionHover = data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.session, localize({ key: 'session', comment: ['Session is a noun'] }, 'Session')));
        data.label.set(session.getLabel(), matches);
        const stoppedDetails = session.getStoppedDetails();
        const thread = session.getAllThreads().find((t) => t.stopped);
        const contextKeyService = this.contextKeyService.createOverlay(getSessionContextOverlay(session));
        const menu = data.elementDisposable.add(this.menuService.createMenu(MenuId.DebugCallStackContext, contextKeyService));
        const setupActionBar = () => {
            data.actionBar.clear();
            const { primary } = getActionBarActions(menu.getActions({ arg: getContextForContributedActions(session), shouldForwardArgs: true }), 'inline');
            data.actionBar.push(primary, { icon: true, label: false });
            // We need to set our internal context on the action bar, since our commands depend on that one
            // While the external context our extensions rely on
            data.actionBar.context = getContext(session);
        };
        data.elementDisposable.add(menu.onDidChange(() => setupActionBar()));
        setupActionBar();
        data.stateLabel.style.display = '';
        if (stoppedDetails) {
            data.stateLabel.textContent = stoppedDescription(stoppedDetails);
            sessionHover.update(`${session.getLabel()}: ${stoppedText(stoppedDetails)}`);
            data.stateLabel.classList.toggle('exception', stoppedDetails.reason === 'exception');
        }
        else if (thread && thread.stoppedDetails) {
            data.stateLabel.textContent = stoppedDescription(thread.stoppedDetails);
            sessionHover.update(`${session.getLabel()}: ${stoppedText(thread.stoppedDetails)}`);
            data.stateLabel.classList.toggle('exception', thread.stoppedDetails.reason === 'exception');
        }
        else {
            data.stateLabel.textContent = localize({ key: 'running', comment: ['indicates state'] }, 'Running');
            data.stateLabel.classList.remove('exception');
        }
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
    disposeElement(_element, _, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeCompressedElements(node, index, templateData, height) {
        templateData.elementDisposable.clear();
    }
};
SessionsRenderer = SessionsRenderer_1 = __decorate([
    __param(0, IInstantiationService),
    __param(1, IContextKeyService),
    __param(2, IHoverService),
    __param(3, IMenuService)
], SessionsRenderer);
function getThreadContextOverlay(thread) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'thread'],
        [CONTEXT_CALLSTACK_ITEM_STOPPED.key, thread.stopped],
    ];
}
let ThreadsRenderer = class ThreadsRenderer {
    static { ThreadsRenderer_1 = this; }
    static { this.ID = 'thread'; }
    constructor(contextKeyService, hoverService, menuService) {
        this.contextKeyService = contextKeyService;
        this.hoverService = hoverService;
        this.menuService = menuService;
    }
    get templateId() {
        return ThreadsRenderer_1.ID;
    }
    renderTemplate(container) {
        const thread = dom.append(container, $('.thread'));
        const name = dom.append(thread, $('.name'));
        const stateLabel = dom.append(thread, $('span.state.label.monaco-count-badge.long'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(name));
        const actionBar = templateDisposable.add(new ActionBar(thread));
        const elementDisposable = templateDisposable.add(new DisposableStore());
        return { thread, name, stateLabel, label, actionBar, elementDisposable, templateDisposable };
    }
    renderElement(element, _index, data) {
        const thread = element.element;
        data.elementDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.thread, thread.name));
        data.label.set(thread.name, createMatches(element.filterData));
        data.stateLabel.textContent = thread.stateLabel;
        data.stateLabel.classList.toggle('exception', thread.stoppedDetails?.reason === 'exception');
        const contextKeyService = this.contextKeyService.createOverlay(getThreadContextOverlay(thread));
        const menu = data.elementDisposable.add(this.menuService.createMenu(MenuId.DebugCallStackContext, contextKeyService));
        const setupActionBar = () => {
            data.actionBar.clear();
            const { primary } = getActionBarActions(menu.getActions({ arg: getContextForContributedActions(thread), shouldForwardArgs: true }), 'inline');
            data.actionBar.push(primary, { icon: true, label: false });
            // We need to set our internal context on the action bar, since our commands depend on that one
            // While the external context our extensions rely on
            data.actionBar.context = getContext(thread);
        };
        data.elementDisposable.add(menu.onDidChange(() => setupActionBar()));
        setupActionBar();
    }
    renderCompressedElements(_node, _index, _templateData, _height) {
        throw new Error('Method not implemented.');
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.templateDisposable.dispose();
    }
};
ThreadsRenderer = ThreadsRenderer_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, IHoverService),
    __param(2, IMenuService)
], ThreadsRenderer);
function getStackFrameContextOverlay(stackFrame) {
    return [
        [CONTEXT_CALLSTACK_ITEM_TYPE.key, 'stackFrame'],
        [CONTEXT_STACK_FRAME_SUPPORTS_RESTART.key, stackFrame.canRestart],
    ];
}
let StackFramesRenderer = class StackFramesRenderer {
    static { StackFramesRenderer_1 = this; }
    static { this.ID = 'stackFrame'; }
    constructor(hoverService, labelService, notificationService) {
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.notificationService = notificationService;
    }
    get templateId() {
        return StackFramesRenderer_1.ID;
    }
    renderTemplate(container) {
        const stackFrame = dom.append(container, $('.stack-frame'));
        const labelDiv = dom.append(stackFrame, $('span.label.expression'));
        const file = dom.append(stackFrame, $('.file'));
        const fileName = dom.append(file, $('span.file-name'));
        const wrapper = dom.append(file, $('span.line-number-wrapper'));
        const lineNumber = dom.append(wrapper, $('span.line-number.monaco-count-badge'));
        const templateDisposable = new DisposableStore();
        const label = templateDisposable.add(new HighlightedLabel(labelDiv));
        const actionBar = templateDisposable.add(new ActionBar(stackFrame));
        return { file, fileName, label, lineNumber, stackFrame, actionBar, templateDisposable };
    }
    renderElement(element, index, data) {
        const stackFrame = element.element;
        data.stackFrame.classList.toggle('disabled', !stackFrame.source || !stackFrame.source.available || isFrameDeemphasized(stackFrame));
        data.stackFrame.classList.toggle('label', stackFrame.presentationHint === 'label');
        const hasActions = !!stackFrame.thread.session.capabilities.supportsRestartFrame &&
            stackFrame.presentationHint !== 'label' &&
            stackFrame.presentationHint !== 'subtle' &&
            stackFrame.canRestart;
        data.stackFrame.classList.toggle('has-actions', hasActions);
        let title = stackFrame.source.inMemory
            ? stackFrame.source.uri.path
            : this.labelService.getUriLabel(stackFrame.source.uri);
        if (stackFrame.source.raw.origin) {
            title += `\n${stackFrame.source.raw.origin}`;
        }
        data.templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.file, title));
        data.label.set(stackFrame.name, createMatches(element.filterData), stackFrame.name);
        data.fileName.textContent = getSpecificSourceName(stackFrame);
        if (stackFrame.range.startLineNumber !== undefined) {
            data.lineNumber.textContent = `${stackFrame.range.startLineNumber}`;
            if (stackFrame.range.startColumn) {
                data.lineNumber.textContent += `:${stackFrame.range.startColumn}`;
            }
            data.lineNumber.classList.remove('unavailable');
        }
        else {
            data.lineNumber.classList.add('unavailable');
        }
        data.actionBar.clear();
        if (hasActions) {
            const action = new Action('debug.callStack.restartFrame', localize('restartFrame', 'Restart Frame'), ThemeIcon.asClassName(icons.debugRestartFrame), true, async () => {
                try {
                    await stackFrame.restart();
                }
                catch (e) {
                    this.notificationService.error(e);
                }
            });
            data.actionBar.push(action, { icon: true, label: false });
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        templateData.actionBar.dispose();
    }
};
StackFramesRenderer = StackFramesRenderer_1 = __decorate([
    __param(0, IHoverService),
    __param(1, ILabelService),
    __param(2, INotificationService)
], StackFramesRenderer);
let ErrorsRenderer = class ErrorsRenderer {
    static { ErrorsRenderer_1 = this; }
    static { this.ID = 'error'; }
    get templateId() {
        return ErrorsRenderer_1.ID;
    }
    constructor(hoverService) {
        this.hoverService = hoverService;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.error'));
        return { label, templateDisposable: new DisposableStore() };
    }
    renderElement(element, index, data) {
        const error = element.element;
        data.label.textContent = error;
        data.templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), data.label, error));
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
};
ErrorsRenderer = ErrorsRenderer_1 = __decorate([
    __param(0, IHoverService)
], ErrorsRenderer);
class LoadMoreRenderer {
    static { this.ID = 'loadMore'; }
    static { this.LABEL = localize('loadAllStackFrames', 'Load More Stack Frames'); }
    constructor() { }
    get templateId() {
        return LoadMoreRenderer.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.load-all'));
        label.style.color = asCssVariable(textLinkForeground);
        return { label };
    }
    renderElement(element, index, data) {
        data.label.textContent = LoadMoreRenderer.LABEL;
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
}
class ShowMoreRenderer {
    static { this.ID = 'showMore'; }
    constructor() { }
    get templateId() {
        return ShowMoreRenderer.ID;
    }
    renderTemplate(container) {
        const label = dom.append(container, $('.show-more'));
        label.style.color = asCssVariable(textLinkForeground);
        return { label };
    }
    renderElement(element, index, data) {
        const stackFrames = element.element;
        if (stackFrames.every((sf) => !!(sf.source && sf.source.origin && sf.source.origin === stackFrames[0].source.origin))) {
            data.label.textContent = localize('showMoreAndOrigin', 'Show {0} More: {1}', stackFrames.length, stackFrames[0].source.origin);
        }
        else {
            data.label.textContent = localize('showMoreStackFrames', 'Show {0} More Stack Frames', stackFrames.length);
        }
    }
    renderCompressedElements(node, index, templateData, height) {
        throw new Error('Method not implemented.');
    }
    disposeTemplate(templateData) {
        // noop
    }
}
class CallStackDelegate {
    getHeight(element) {
        if (element instanceof StackFrame && element.presentationHint === 'label') {
            return 16;
        }
        if (element instanceof ThreadAndSessionIds || element instanceof Array) {
            return 16;
        }
        return 22;
    }
    getTemplateId(element) {
        if (isDebugSession(element)) {
            return SessionsRenderer.ID;
        }
        if (element instanceof Thread) {
            return ThreadsRenderer.ID;
        }
        if (element instanceof StackFrame) {
            return StackFramesRenderer.ID;
        }
        if (typeof element === 'string') {
            return ErrorsRenderer.ID;
        }
        if (element instanceof ThreadAndSessionIds) {
            return LoadMoreRenderer.ID;
        }
        // element instanceof Array
        return ShowMoreRenderer.ID;
    }
}
function stoppedText(stoppedDetails) {
    return stoppedDetails.text ?? stoppedDescription(stoppedDetails);
}
function stoppedDescription(stoppedDetails) {
    return (stoppedDetails.description ||
        (stoppedDetails.reason
            ? localize({ key: 'pausedOn', comment: ['indicates reason for program being paused'] }, 'Paused on {0}', stoppedDetails.reason)
            : localize('paused', 'Paused')));
}
function isDebugModel(obj) {
    return typeof obj.getSessions === 'function';
}
function isDebugSession(obj) {
    return obj && typeof obj.getAllThreads === 'function';
}
class CallStackDataSource {
    constructor(debugService) {
        this.debugService = debugService;
        this.deemphasizedStackFramesToShow = [];
    }
    hasChildren(element) {
        if (isDebugSession(element)) {
            const threads = element.getAllThreads();
            return (threads.length > 1 ||
                (threads.length === 1 && threads[0].stopped) ||
                !!this.debugService
                    .getModel()
                    .getSessions()
                    .find((s) => s.parentSession === element));
        }
        return isDebugModel(element) || (element instanceof Thread && element.stopped);
    }
    async getChildren(element) {
        if (isDebugModel(element)) {
            const sessions = element.getSessions();
            if (sessions.length === 0) {
                return Promise.resolve([]);
            }
            if (sessions.length > 1 || this.debugService.getViewModel().isMultiSessionView()) {
                return Promise.resolve(sessions.filter((s) => !s.parentSession));
            }
            const threads = sessions[0].getAllThreads();
            // Only show the threads in the call stack if there is more than 1 thread.
            return threads.length === 1
                ? this.getThreadChildren(threads[0])
                : Promise.resolve(threads);
        }
        else if (isDebugSession(element)) {
            const childSessions = this.debugService
                .getModel()
                .getSessions()
                .filter((s) => s.parentSession === element);
            const threads = element.getAllThreads();
            if (threads.length === 1) {
                // Do not show thread when there is only one to be compact.
                const children = await this.getThreadChildren(threads[0]);
                return children.concat(childSessions);
            }
            return Promise.resolve(threads.concat(childSessions));
        }
        else {
            return this.getThreadChildren(element);
        }
    }
    getThreadChildren(thread) {
        return this.getThreadCallstack(thread).then((children) => {
            // Check if some stack frames should be hidden under a parent element since they are deemphasized
            const result = [];
            children.forEach((child, index) => {
                if (child instanceof StackFrame && child.source && isFrameDeemphasized(child)) {
                    // Check if the user clicked to show the deemphasized source
                    if (this.deemphasizedStackFramesToShow.indexOf(child) === -1) {
                        if (result.length) {
                            const last = result[result.length - 1];
                            if (last instanceof Array) {
                                // Collect all the stackframes that will be "collapsed"
                                last.push(child);
                                return;
                            }
                        }
                        const nextChild = index < children.length - 1 ? children[index + 1] : undefined;
                        if (nextChild instanceof StackFrame &&
                            nextChild.source &&
                            isFrameDeemphasized(nextChild)) {
                            // Start collecting stackframes that will be "collapsed"
                            result.push([child]);
                            return;
                        }
                    }
                }
                result.push(child);
            });
            return result;
        });
    }
    async getThreadCallstack(thread) {
        let callStack = thread.getCallStack();
        if (!callStack || !callStack.length) {
            await thread.fetchCallStack();
            callStack = thread.getCallStack();
        }
        if (callStack.length === 1 &&
            thread.session.capabilities.supportsDelayedStackTraceLoading &&
            thread.stoppedDetails &&
            thread.stoppedDetails.totalFrames &&
            thread.stoppedDetails.totalFrames > 1) {
            // To reduce flashing of the call stack view simply append the stale call stack
            // once we have the correct data the tree will refresh and we will no longer display it.
            callStack = callStack.concat(thread.getStaleCallStack().slice(1));
        }
        if (thread.stoppedDetails && thread.stoppedDetails.framesErrorMessage) {
            callStack = callStack.concat([thread.stoppedDetails.framesErrorMessage]);
        }
        if (!thread.reachedEndOfCallStack && thread.stoppedDetails) {
            callStack = callStack.concat([
                new ThreadAndSessionIds(thread.session.getId(), thread.threadId),
            ]);
        }
        return callStack;
    }
}
class CallStackAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize({ comment: ['Debug is a noun in this context, not a verb.'], key: 'callStackAriaLabel' }, 'Debug Call Stack');
    }
    getWidgetRole() {
        // Use treegrid as a role since each element can have additional actions inside #146210
        return 'treegrid';
    }
    getRole(_element) {
        return 'row';
    }
    getAriaLabel(element) {
        if (element instanceof Thread) {
            return localize({
                key: 'threadAriaLabel',
                comment: [
                    'Placeholders stand for the thread name and the thread state.For example "Thread 1" and "Stopped',
                ],
            }, 'Thread {0} {1}', element.name, element.stateLabel);
        }
        if (element instanceof StackFrame) {
            return localize('stackFrameAriaLabel', 'Stack Frame {0}, line {1}, {2}', element.name, element.range.startLineNumber, getSpecificSourceName(element));
        }
        if (isDebugSession(element)) {
            const thread = element.getAllThreads().find((t) => t.stopped);
            const state = thread
                ? thread.stateLabel
                : localize({ key: 'running', comment: ['indicates state'] }, 'Running');
            return localize({
                key: 'sessionLabel',
                comment: [
                    'Placeholders stand for the session name and the session state. For example "Launch Program" and "Running"',
                ],
            }, 'Session {0} {1}', element.getLabel(), state);
        }
        if (typeof element === 'string') {
            return element;
        }
        if (element instanceof Array) {
            return localize('showMoreStackFrames', 'Show {0} More Stack Frames', element.length);
        }
        // element instanceof ThreadAndSessionIds
        return LoadMoreRenderer.LABEL;
    }
}
class CallStackCompressionDelegate {
    constructor(debugService) {
        this.debugService = debugService;
    }
    isIncompressible(stat) {
        if (isDebugSession(stat)) {
            if (stat.compact) {
                return false;
            }
            const sessions = this.debugService.getModel().getSessions();
            if (sessions.some((s) => s.parentSession === stat && s.compact)) {
                return false;
            }
            return true;
        }
        return true;
    }
}
registerAction2(class Collapse extends ViewAction {
    constructor() {
        super({
            id: 'callStack.collapse',
            viewId: CALLSTACK_VIEW_ID,
            title: localize('collapse', 'Collapse All'),
            f1: false,
            icon: Codicon.collapseAll,
            precondition: CONTEXT_DEBUG_STATE.isEqualTo(getStateLabel(2 /* State.Stopped */)),
            menu: {
                id: MenuId.ViewTitle,
                order: 10,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', CALLSTACK_VIEW_ID),
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
function registerCallStackInlineMenuItem(id, title, icon, when, order, precondition) {
    MenuRegistry.appendMenuItem(MenuId.DebugCallStackContext, {
        group: 'inline',
        order,
        when,
        command: { id, title, icon, precondition },
    });
}
const threadOrSessionWithOneThread = ContextKeyExpr.or(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('thread'), ContextKeyExpr.and(CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), CONTEXT_CALLSTACK_SESSION_HAS_ONE_THREAD));
registerCallStackInlineMenuItem(PAUSE_ID, PAUSE_LABEL, icons.debugPause, ContextKeyExpr.and(threadOrSessionWithOneThread, CONTEXT_CALLSTACK_ITEM_STOPPED.toNegated()), 10, CONTEXT_FOCUSED_SESSION_IS_NO_DEBUG.toNegated());
registerCallStackInlineMenuItem(CONTINUE_ID, CONTINUE_LABEL, icons.debugContinue, ContextKeyExpr.and(threadOrSessionWithOneThread, CONTEXT_CALLSTACK_ITEM_STOPPED), 10);
registerCallStackInlineMenuItem(STEP_OVER_ID, STEP_OVER_LABEL, icons.debugStepOver, threadOrSessionWithOneThread, 20, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(STEP_INTO_ID, STEP_INTO_LABEL, icons.debugStepInto, threadOrSessionWithOneThread, 30, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(STEP_OUT_ID, STEP_OUT_LABEL, icons.debugStepOut, threadOrSessionWithOneThread, 40, CONTEXT_CALLSTACK_ITEM_STOPPED);
registerCallStackInlineMenuItem(RESTART_SESSION_ID, RESTART_LABEL, icons.debugRestart, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session'), 50);
registerCallStackInlineMenuItem(STOP_ID, STOP_LABEL, icons.debugStop, ContextKeyExpr.and(CONTEXT_CALLSTACK_SESSION_IS_ATTACH.toNegated(), CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session')), 60);
registerCallStackInlineMenuItem(DISCONNECT_ID, DISCONNECT_LABEL, icons.debugDisconnect, ContextKeyExpr.and(CONTEXT_CALLSTACK_SESSION_IS_ATTACH, CONTEXT_CALLSTACK_ITEM_TYPE.isEqualTo('session')), 60);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FsbFN0YWNrVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvY2FsbFN0YWNrVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFXbkcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGFBQWEsRUFBc0IsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN0RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIsdUJBQXVCLEVBQ3ZCLDBCQUEwQixHQUMxQixNQUFNLGlFQUFpRSxDQUFBO0FBQ3hFLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLGNBQWMsRUFDZCxZQUFZLEVBQ1osZUFBZSxFQUNmLGlCQUFpQixH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