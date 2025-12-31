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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidmFyaWFibGVzVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvdmFyaWFibGVzVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFhekUsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBYyxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN2RyxPQUFPLEVBQ04sWUFBWSxFQUNaLE1BQU0sRUFDTixlQUFlLEdBQ2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVB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