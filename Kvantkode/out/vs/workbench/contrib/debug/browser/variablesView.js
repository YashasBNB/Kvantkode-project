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
var VisualizedVariableRenderer_1, VariablesRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { HighlightedLabel, } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { Action } from '../../../../base/common/actions.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { toDisposable } from '../../../../base/common/lifecycle.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { getContextMenuActions } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { IMenuService, MenuId, registerAction2, } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ContextKeyExpr, IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService, IContextViewService, } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewAction, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
import { CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED, CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED, CONTEXT_VARIABLES_FOCUSED, IDebugService, VARIABLES_VIEW_ID, WATCH_VIEW_ID, } from '../common/debug.js';
import { getContextForVariable } from '../common/debugContext.js';
import { ErrorScope, Expression, Scope, StackFrame, Variable, VisualizedExpression, getUriForDebugMemory, } from '../common/debugModel.js';
import { IDebugVisualizerService } from '../common/debugVisualizers.js';
import { AbstractExpressionDataSource, AbstractExpressionsRenderer, expressionAndScopeLabelProvider, renderViewTree, } from './baseDebugView.js';
import { ADD_TO_WATCH_ID, ADD_TO_WATCH_LABEL, COPY_EVALUATE_PATH_ID, COPY_EVALUATE_PATH_LABEL, COPY_VALUE_ID, COPY_VALUE_LABEL, } from './debugCommands.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
const $ = dom.$;
let forgetScopes = true;
let variableInternalContext;
let dataBreakpointInfoResponse;
let VariablesView = class VariablesView extends ViewPane {
    get treeSelection() {
        return this.tree.getSelection();
    }
    constructor(options, contextMenuService, debugService, keybindingService, configurationService, instantiationService, viewDescriptorService, contextKeyService, openerService, themeService, hoverService, menuService) {
        super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.debugService = debugService;
        this.menuService = menuService;
        this.needsRefresh = false;
        this.savedViewState = new Map();
        this.autoExpandedScopes = new Set();
        // Use scheduler to prevent unnecessary flashing
        this.updateTreeScheduler = new RunOnceScheduler(async () => {
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            this.needsRefresh = false;
            const input = this.tree.getInput();
            if (input) {
                this.savedViewState.set(input.getId(), this.tree.getViewState());
            }
            if (!stackFrame) {
                await this.tree.setInput(null);
                return;
            }
            const viewState = this.savedViewState.get(stackFrame.getId());
            await this.tree.setInput(stackFrame, viewState);
            // Automatically expand the first non-expensive scope
            const scopes = await stackFrame.getScopes();
            const toExpand = scopes.find((s) => !s.expensive);
            // A race condition could be present causing the scopes here to be different from the scopes that the tree just retrieved.
            // If that happened, don't try to reveal anything, it will be straightened out on the next update
            if (toExpand && this.tree.hasNode(toExpand)) {
                this.autoExpandedScopes.add(toExpand.getId());
                await this.tree.expand(toExpand);
            }
        }, 400);
    }
    renderBody(container) {
        super.renderBody(container);
        this.element.classList.add('debug-pane');
        container.classList.add('debug-variables');
        const treeContainer = renderViewTree(container);
        const expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'VariablesView', treeContainer, new VariablesDelegate(), [
            this.instantiationService.createInstance(VariablesRenderer, expressionRenderer),
            this.instantiationService.createInstance(VisualizedVariableRenderer, expressionRenderer),
            new ScopesRenderer(),
            new ScopeErrorRenderer(),
        ], this.instantiationService.createInstance(VariablesDataSource), {
            accessibilityProvider: new VariablesAccessibilityProvider(),
            identityProvider: { getId: (element) => element.getId() },
            keyboardNavigationLabelProvider: expressionAndScopeLabelProvider,
            overrideStyles: this.getLocationBasedColors().listOverrideStyles,
        });
        this._register(VisualizedVariableRenderer.rendererOnVisualizationRange(this.debugService.getViewModel(), this.tree));
        this.tree.setInput(this.debugService.getViewModel().focusedStackFrame ?? null);
        CONTEXT_VARIABLES_FOCUSED.bindTo(this.tree.contextKeyService);
        this._register(this.debugService.getViewModel().onDidFocusStackFrame((sf) => {
            if (!this.isBodyVisible()) {
                this.needsRefresh = true;
                return;
            }
            // Refresh the tree immediately if the user explictly changed stack frames.
            // Otherwise postpone the refresh until user stops stepping.
            const timeout = sf.explicit ? 0 : undefined;
            this.updateTreeScheduler.schedule(timeout);
        }));
        this._register(this.debugService.getViewModel().onWillUpdateViews(() => {
            const stackFrame = this.debugService.getViewModel().focusedStackFrame;
            if (stackFrame && forgetScopes) {
                stackFrame.forgetScopes();
            }
            forgetScopes = true;
            this.tree.updateChildren();
        }));
        this._register(this.tree);
        this._register(this.tree.onMouseDblClick((e) => this.onMouseDblClick(e)));
        this._register(this.tree.onContextMenu(async (e) => await this.onContextMenu(e)));
        this._register(this.onDidChangeBodyVisibility((visible) => {
            if (visible && this.needsRefresh) {
                this.updateTreeScheduler.schedule();
            }
        }));
        let horizontalScrolling;
        this._register(this.debugService.getViewModel().onDidSelectExpression((e) => {
            const variable = e?.expression;
            if (variable && this.tree.hasNode(variable)) {
                horizontalScrolling = this.tree.options.horizontalScrolling;
                if (horizontalScrolling) {
                    this.tree.updateOptions({ horizontalScrolling: false });
                }
                this.tree.rerender(variable);
            }
            else if (!e && horizontalScrolling !== undefined) {
                this.tree.updateOptions({ horizontalScrolling: horizontalScrolling });
                horizontalScrolling = undefined;
            }
        }));
        this._register(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
        this._register(this.debugService.onDidEndSession(() => {
            this.savedViewState.clear();
            this.autoExpandedScopes.clear();
        }));
    }
    layoutBody(width, height) {
        super.layoutBody(height, width);
        this.tree.layout(width, height);
    }
    focus() {
        super.focus();
        this.tree.domFocus();
    }
    collapseAll() {
        this.tree.collapseAll();
    }
    onMouseDblClick(e) {
        if (this.canSetExpressionValue(e.element)) {
            this.debugService.getViewModel().setSelectedExpression(e.element, false);
        }
    }
    canSetExpressionValue(e) {
        const session = this.debugService.getViewModel().focusedSession;
        if (!session) {
            return false;
        }
        if (e instanceof VisualizedExpression) {
            return !!e.treeItem.canEdit;
        }
        return (e instanceof Variable &&
            !e.presentationHint?.attributes?.includes('readOnly') &&
            !e.presentationHint?.lazy);
    }
    async onContextMenu(e) {
        const variable = e.element;
        if (!(variable instanceof Variable) || !variable.value) {
            return;
        }
        return openContextMenuForVariableTreeElement(this.contextKeyService, this.menuService, this.contextMenuService, MenuId.DebugVariablesContext, e);
    }
};
VariablesView = __decorate([
    __param(1, IContextMenuService),
    __param(2, IDebugService),
    __param(3, IKeybindingService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, IViewDescriptorService),
    __param(7, IContextKeyService),
    __param(8, IOpenerService),
    __param(9, IThemeService),
    __param(10, IHoverService),
    __param(11, IMenuService)
], VariablesView);
export { VariablesView };
export async function openContextMenuForVariableTreeElement(parentContextKeyService, menuService, contextMenuService, menuId, e) {
    const variable = e.element;
    if (!(variable instanceof Variable) || !variable.value) {
        return;
    }
    const contextKeyService = await getContextForVariableMenuWithDataAccess(parentContextKeyService, variable);
    const context = getVariablesContext(variable);
    const menu = menuService.getMenuActions(menuId, contextKeyService, {
        arg: context,
        shouldForwardArgs: false,
    });
    const { secondary } = getContextMenuActions(menu, 'inline');
    contextMenuService.showContextMenu({
        getAnchor: () => e.anchor,
        getActions: () => secondary,
    });
}
const getVariablesContext = (variable) => ({
    sessionId: variable.getSession()?.getId(),
    container: variable.parent instanceof Expression
        ? { expression: variable.parent.name }
        : variable.parent.toDebugProtocolObject(),
    variable: variable.toDebugProtocolObject(),
});
/**
 * Gets a context key overlay that has context for the given variable, including data access info.
 */
async function getContextForVariableMenuWithDataAccess(parentContext, variable) {
    const session = variable.getSession();
    if (!session || !session.capabilities.supportsDataBreakpoints) {
        return getContextForVariableMenuBase(parentContext, variable);
    }
    const contextKeys = [];
    dataBreakpointInfoResponse = await session.dataBreakpointInfo(variable.name, variable.parent.reference);
    const dataBreakpointId = dataBreakpointInfoResponse?.dataId;
    const dataBreakpointAccessTypes = dataBreakpointInfoResponse?.accessTypes;
    if (!dataBreakpointAccessTypes) {
        contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED.key, !!dataBreakpointId]);
    }
    else {
        for (const accessType of dataBreakpointAccessTypes) {
            switch (accessType) {
                case 'read':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_IS_READ_SUPPORTED.key, !!dataBreakpointId]);
                    break;
                case 'write':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_CHANGES_SUPPORTED.key, !!dataBreakpointId]);
                    break;
                case 'readWrite':
                    contextKeys.push([CONTEXT_BREAK_WHEN_VALUE_IS_ACCESSED_SUPPORTED.key, !!dataBreakpointId]);
                    break;
            }
        }
    }
    return getContextForVariableMenuBase(parentContext, variable, contextKeys);
}
/**
 * Gets a context key overlay that has context for the given variable.
 */
function getContextForVariableMenuBase(parentContext, variable, additionalContext = []) {
    variableInternalContext = variable;
    return getContextForVariable(parentContext, variable, additionalContext);
}
function isStackFrame(obj) {
    return obj instanceof StackFrame;
}
class VariablesDataSource extends AbstractExpressionDataSource {
    hasChildren(element) {
        if (!element) {
            return false;
        }
        if (isStackFrame(element)) {
            return true;
        }
        return element.hasChildren;
    }
    doGetChildren(element) {
        if (isStackFrame(element)) {
            return element.getScopes();
        }
        return element.getChildren();
    }
}
class VariablesDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        if (element instanceof ErrorScope) {
            return ScopeErrorRenderer.ID;
        }
        if (element instanceof Scope) {
            return ScopesRenderer.ID;
        }
        if (element instanceof VisualizedExpression) {
            return VisualizedVariableRenderer.ID;
        }
        return VariablesRenderer.ID;
    }
}
class ScopesRenderer {
    static { this.ID = 'scope'; }
    get templateId() {
        return ScopesRenderer.ID;
    }
    renderTemplate(container) {
        const name = dom.append(container, $('.scope'));
        const label = new HighlightedLabel(name);
        return { name, label };
    }
    renderElement(element, index, templateData) {
        templateData.label.set(element.element.name, createMatches(element.filterData));
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
class ScopeErrorRenderer {
    static { this.ID = 'scopeError'; }
    get templateId() {
        return ScopeErrorRenderer.ID;
    }
    renderTemplate(container) {
        const wrapper = dom.append(container, $('.scope'));
        const error = dom.append(wrapper, $('.error'));
        return { error };
    }
    renderElement(element, index, templateData) {
        templateData.error.innerText = element.element.name;
    }
    disposeTemplate() {
        // noop
    }
}
let VisualizedVariableRenderer = class VisualizedVariableRenderer extends AbstractExpressionsRenderer {
    static { VisualizedVariableRenderer_1 = this; }
    static { this.ID = 'viz'; }
    /**
     * Registers a helper that rerenders the tree when visualization is requested
     * or cancelled./
     */
    static rendererOnVisualizationRange(model, tree) {
        return model.onDidChangeVisualization(({ original }) => {
            if (!tree.hasNode(original)) {
                return;
            }
            const parent = tree.getParentElement(original);
            tree.updateChildren(parent, false, false);
        });
    }
    constructor(expressionRenderer, debugService, contextViewService, hoverService, menuService, contextKeyService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
    }
    get templateId() {
        return VisualizedVariableRenderer_1.ID;
    }
    renderElement(node, index, data) {
        data.elementDisposable.clear();
        super.renderExpressionElement(node.element, node, data);
    }
    renderExpression(expression, data, highlights) {
        const viz = expression;
        let text = viz.name;
        if (viz.value && typeof viz.name === 'string') {
            text += ':';
        }
        data.label.set(text, highlights, viz.name);
        data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, viz, {
            showChanged: false,
            maxValueLength: 1024,
            colorize: true,
            session: expression.getSession(),
        }));
    }
    getInputBoxOptions(expression) {
        const viz = expression;
        return {
            initialValue: expression.value,
            ariaLabel: localize('variableValueAriaLabel', 'Type new variable value'),
            validationOptions: {
                validation: () => (viz.errorMessage ? { content: viz.errorMessage } : null),
            },
            onFinish: (value, success) => {
                viz.errorMessage = undefined;
                if (success) {
                    viz.edit(value).then(() => {
                        // Do not refresh scopes due to a node limitation #15520
                        forgetScopes = false;
                        this.debugService.getViewModel().updateViews();
                    });
                }
            },
        };
    }
    renderActionBar(actionBar, expression, _data) {
        const viz = expression;
        const contextKeyService = viz.original
            ? getContextForVariableMenuBase(this.contextKeyService, viz.original)
            : this.contextKeyService;
        const context = viz.original ? getVariablesContext(viz.original) : undefined;
        const menu = this.menuService.getMenuActions(MenuId.DebugVariablesContext, contextKeyService, {
            arg: context,
            shouldForwardArgs: false,
        });
        const { primary } = getContextMenuActions(menu, 'inline');
        if (viz.original) {
            const action = new Action('debugViz', localize('removeVisualizer', 'Remove Visualizer'), ThemeIcon.asClassName(Codicon.eye), true, () => this.debugService.getViewModel().setVisualizedExpression(viz.original, undefined));
            action.checked = true;
            primary.push(action);
            actionBar.domNode.style.display = 'initial';
        }
        actionBar.clear();
        actionBar.context = context;
        actionBar.push(primary, { icon: true, label: false });
    }
};
VisualizedVariableRenderer = VisualizedVariableRenderer_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IContextViewService),
    __param(3, IHoverService),
    __param(4, IMenuService),
    __param(5, IContextKeyService)
], VisualizedVariableRenderer);
export { VisualizedVariableRenderer };
let VariablesRenderer = class VariablesRenderer extends AbstractExpressionsRenderer {
    static { VariablesRenderer_1 = this; }
    static { this.ID = 'variable'; }
    constructor(expressionRenderer, menuService, contextKeyService, visualization, contextMenuService, debugService, contextViewService, hoverService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.visualization = visualization;
        this.contextMenuService = contextMenuService;
    }
    get templateId() {
        return VariablesRenderer_1.ID;
    }
    renderExpression(expression, data, highlights) {
        data.elementDisposable.add(this.expressionRenderer.renderVariable(data, expression, {
            highlights,
            showChanged: true,
        }));
    }
    renderElement(node, index, data) {
        data.elementDisposable.clear();
        super.renderExpressionElement(node.element, node, data);
    }
    getInputBoxOptions(expression) {
        const variable = expression;
        return {
            initialValue: expression.value,
            ariaLabel: localize('variableValueAriaLabel', 'Type new variable value'),
            validationOptions: {
                validation: () => (variable.errorMessage ? { content: variable.errorMessage } : null),
            },
            onFinish: (value, success) => {
                variable.errorMessage = undefined;
                const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
                if (success && variable.value !== value && focusedStackFrame) {
                    variable
                        .setVariable(value, focusedStackFrame)
                        // Need to force watch expressions and variables to update since a variable change can have an effect on both
                        .then(() => {
                        // Do not refresh scopes due to a node limitation #15520
                        forgetScopes = false;
                        this.debugService.getViewModel().updateViews();
                    });
                }
            },
        };
    }
    renderActionBar(actionBar, expression, data) {
        const variable = expression;
        const contextKeyService = getContextForVariableMenuBase(this.contextKeyService, variable);
        const context = getVariablesContext(variable);
        const menu = this.menuService.getMenuActions(MenuId.DebugVariablesContext, contextKeyService, {
            arg: context,
            shouldForwardArgs: false,
        });
        const { primary } = getContextMenuActions(menu, 'inline');
        actionBar.clear();
        actionBar.context = context;
        actionBar.push(primary, { icon: true, label: false });
        const cts = new CancellationTokenSource();
        data.elementDisposable.add(toDisposable(() => cts.dispose(true)));
        this.visualization.getApplicableFor(expression, cts.token).then((result) => {
            data.elementDisposable.add(result);
            const originalExpression = (expression instanceof VisualizedExpression && expression.original) || expression;
            const actions = result.object.map((v) => new Action('debugViz', v.name, v.iconClass || 'debug-viz-icon', undefined, this.useVisualizer(v, originalExpression, cts.token)));
            if (actions.length === 0) {
                // no-op
            }
            else if (actions.length === 1) {
                actionBar.push(actions[0], { icon: true, label: false });
            }
            else {
                actionBar.push(new Action('debugViz', localize('useVisualizer', 'Visualize Variable...'), ThemeIcon.asClassName(Codicon.eye), undefined, () => this.pickVisualizer(actions, originalExpression, data)), { icon: true, label: false });
            }
        });
    }
    pickVisualizer(actions, expression, data) {
        this.contextMenuService.showContextMenu({
            getAnchor: () => data.actionBar.getContainer(),
            getActions: () => actions,
        });
    }
    useVisualizer(viz, expression, token) {
        return async () => {
            const resolved = await viz.resolve(token);
            if (token.isCancellationRequested) {
                return;
            }
            if (resolved.type === 0 /* DebugVisualizationType.Command */) {
                viz.execute();
            }
            else {
                const replacement = await this.visualization.getVisualizedNodeFor(resolved.id, expression);
                if (replacement) {
                    this.debugService.getViewModel().setVisualizedExpression(expression, replacement);
                }
            }
        };
    }
};
VariablesRenderer = VariablesRenderer_1 = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService),
    __param(3, IDebugVisualizerService),
    __param(4, IContextMenuService),
    __param(5, IDebugService),
    __param(6, IContextViewService),
    __param(7, IHoverService)
], VariablesRenderer);
export { VariablesRenderer };
class VariablesAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('variablesAriaTreeLabel', 'Debug Variables');
    }
    getAriaLabel(element) {
        if (element instanceof Scope) {
            return localize('variableScopeAriaLabel', 'Scope {0}', element.name);
        }
        if (element instanceof Variable) {
            return localize({
                key: 'variableAriaLabel',
                comment: [
                    'Placeholders are variable name and variable value respectivly. They should not be translated.',
                ],
            }, '{0}, value {1}', element.name, element.value);
        }
        return null;
    }
}
export const SET_VARIABLE_ID = 'debug.setVariable';
CommandsRegistry.registerCommand({
    id: SET_VARIABLE_ID,
    handler: (accessor) => {
        const debugService = accessor.get(IDebugService);
        debugService.getViewModel().setSelectedExpression(variableInternalContext, false);
    },
});
CommandsRegistry.registerCommand({
    metadata: {
        description: COPY_VALUE_LABEL,
    },
    id: COPY_VALUE_ID,
    handler: async (accessor, arg, ctx) => {
        if (!arg) {
            const viewService = accessor.get(IViewsService);
            const view = viewService.getActiveViewWithId(WATCH_VIEW_ID) ||
                viewService.getActiveViewWithId(VARIABLES_VIEW_ID);
            if (view) {
            }
        }
        const debugService = accessor.get(IDebugService);
        const clipboardService = accessor.get(IClipboardService);
        let elementContext = '';
        let elements;
        if (!arg) {
            const viewService = accessor.get(IViewsService);
            const focusedView = viewService.getFocusedView();
            let view;
            if (focusedView?.id === WATCH_VIEW_ID) {
                view = viewService.getActiveViewWithId(WATCH_VIEW_ID);
                elementContext = 'watch';
            }
            else if (focusedView?.id === VARIABLES_VIEW_ID) {
                view = viewService.getActiveViewWithId(VARIABLES_VIEW_ID);
                elementContext = 'variables';
            }
            if (!view) {
                return;
            }
            elements = view.treeSelection.filter((e) => e instanceof Expression || e instanceof Variable);
        }
        else if (arg instanceof Variable || arg instanceof Expression) {
            elementContext = 'watch';
            elements = ctx ? ctx : [];
        }
        else {
            elementContext = 'variables';
            elements = variableInternalContext ? [variableInternalContext] : [];
        }
        const stackFrame = debugService.getViewModel().focusedStackFrame;
        const session = debugService.getViewModel().focusedSession;
        if (!stackFrame || !session || elements.length === 0) {
            return;
        }
        const evalContext = session.capabilities.supportsClipboardContext ? 'clipboard' : elementContext;
        const toEvaluate = elements.map((element) => element instanceof Variable ? element.evaluateName || element.value : element.name);
        try {
            const evaluations = await Promise.all(toEvaluate.map((expr) => session.evaluate(expr, stackFrame.frameId, evalContext)));
            const result = coalesce(evaluations).map((evaluation) => evaluation.body.result);
            if (result.length) {
                clipboardService.writeText(result.join('\n'));
            }
        }
        catch (e) {
            const result = elements.map((element) => element.value);
            clipboardService.writeText(result.join('\n'));
        }
    },
});
export const VIEW_MEMORY_ID = 'workbench.debug.viewlet.action.viewMemory';
const HEX_EDITOR_EXTENSION_ID = 'ms-vscode.hexeditor';
const HEX_EDITOR_EDITOR_ID = 'hexEditor.hexedit';
CommandsRegistry.registerCommand({
    id: VIEW_MEMORY_ID,
    handler: async (accessor, arg, ctx) => {
        const debugService = accessor.get(IDebugService);
        let sessionId;
        let memoryReference;
        if ('sessionId' in arg) {
            // IVariablesContext
            if (!arg.sessionId || !arg.variable.memoryReference) {
                return;
            }
            sessionId = arg.sessionId;
            memoryReference = arg.variable.memoryReference;
        }
        else {
            // IExpression
            if (!arg.memoryReference) {
                return;
            }
            const focused = debugService.getViewModel().focusedSession;
            if (!focused) {
                return;
            }
            sessionId = focused.getId();
            memoryReference = arg.memoryReference;
        }
        const extensionsWorkbenchService = accessor.get(IExtensionsWorkbenchService);
        const editorService = accessor.get(IEditorService);
        const notificationService = accessor.get(INotificationService);
        const extensionService = accessor.get(IExtensionService);
        const telemetryService = accessor.get(ITelemetryService);
        const ext = await extensionService.getExtension(HEX_EDITOR_EXTENSION_ID);
        if (ext || (await tryInstallHexEditor(extensionsWorkbenchService, notificationService))) {
            /* __GDPR__
                "debug/didViewMemory" : {
                    "owner": "connor4312",
                    "debugType" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
                }
            */
            telemetryService.publicLog('debug/didViewMemory', {
                debugType: debugService.getModel().getSession(sessionId)?.configuration.type,
            });
            await editorService.openEditor({
                resource: getUriForDebugMemory(sessionId, memoryReference),
                options: {
                    revealIfOpened: true,
                    override: HEX_EDITOR_EDITOR_ID,
                },
            }, SIDE_GROUP);
        }
    },
});
async function tryInstallHexEditor(extensionsWorkbenchService, notificationService) {
    try {
        await extensionsWorkbenchService.install(HEX_EDITOR_EXTENSION_ID, {
            justification: localize('viewMemory.prompt', 'Inspecting binary data requires this extension.'),
            enable: true,
        }, 15 /* ProgressLocation.Notification */);
        return true;
    }
    catch (error) {
        notificationService.error(error);
        return false;
    }
}
export const BREAK_WHEN_VALUE_CHANGES_ID = 'debug.breakWhenValueChanges';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_CHANGES_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({
                description: dataBreakpointInfoResponse.description,
                src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId },
                canPersist: !!dataBreakpointInfoResponse.canPersist,
                accessTypes: dataBreakpointInfoResponse.accessTypes,
                accessType: 'write',
            });
        }
    },
});
export const BREAK_WHEN_VALUE_IS_ACCESSED_ID = 'debug.breakWhenValueIsAccessed';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_IS_ACCESSED_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({
                description: dataBreakpointInfoResponse.description,
                src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId },
                canPersist: !!dataBreakpointInfoResponse.canPersist,
                accessTypes: dataBreakpointInfoResponse.accessTypes,
                accessType: 'readWrite',
            });
        }
    },
});
export const BREAK_WHEN_VALUE_IS_READ_ID = 'debug.breakWhenValueIsRead';
CommandsRegistry.registerCommand({
    id: BREAK_WHEN_VALUE_IS_READ_ID,
    handler: async (accessor) => {
        const debugService = accessor.get(IDebugService);
        if (dataBreakpointInfoResponse) {
            await debugService.addDataBreakpoint({
                description: dataBreakpointInfoResponse.description,
                src: { type: 0 /* DataBreakpointSetType.Variable */, dataId: dataBreakpointInfoResponse.dataId },
                canPersist: !!dataBreakpointInfoResponse.canPersist,
                accessTypes: dataBreakpointInfoResponse.accessTypes,
                accessType: 'read',
            });
        }
    },
});
CommandsRegistry.registerCommand({
    metadata: {
        description: COPY_EVALUATE_PATH_LABEL,
    },
    id: COPY_EVALUATE_PATH_ID,
    handler: async (accessor, context) => {
        const clipboardService = accessor.get(IClipboardService);
        await clipboardService.writeText(context.variable.evaluateName);
    },
});
CommandsRegistry.registerCommand({
    metadata: {
        description: ADD_TO_WATCH_LABEL,
    },
    id: ADD_TO_WATCH_ID,
    handler: async (accessor, context) => {
        const debugService = accessor.get(IDebugService);
        debugService.addWatchExpression(context.variable.evaluateName);
    },
});
registerAction2(class extends ViewAction {
    constructor() {
        super({
            id: 'variables.collapse',
            viewId: VARIABLES_VIEW_ID,
            title: localize('collapse', 'Collapse All'),
            f1: false,
            icon: Codicon.collapseAll,
            menu: {
                id: MenuId.ViewTitle,
                group: 'navigation',
                when: ContextKeyExpr.equals('view', VARIABLES_VIEW_ID),
            },
        });
    }
    runInView(_accessor, view) {
        view.collapseAll();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci92YXJpYWJsZXNWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrRUFBa0UsQ0FBQTtBQWF6RSxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ3ZHLE9BQU8sRUFDTixZQUFZLEVBQ1osTUFBTSxFQUNOLGVBQWUsR0FDZixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9B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