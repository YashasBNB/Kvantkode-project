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
var DebugHoverWidget_1;
import * as dom from '../../../../base/browser/dom.js';
import { DomScrollableElement } from '../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { coalesce } from '../../../../base/common/arrays.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import * as lifecycle from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { isMacintosh } from '../../../../base/common/platform.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import * as nls from '../../../../nls.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchAsyncDataTree } from '../../../../platform/list/browser/listService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { asCssVariable, editorHoverBackground, editorHoverBorder, editorHoverForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IDebugService, } from '../common/debug.js';
import { Expression, Variable, VisualizedExpression } from '../common/debugModel.js';
import { getEvaluatableExpressionAtPosition } from '../common/debugUtils.js';
import { AbstractExpressionDataSource } from './baseDebugView.js';
import { DebugExpressionRenderer } from './debugExpressionRenderer.js';
import { VariablesRenderer, VisualizedVariableRenderer, openContextMenuForVariableTreeElement, } from './variablesView.js';
const $ = dom.$;
export var ShowDebugHoverResult;
(function (ShowDebugHoverResult) {
    ShowDebugHoverResult[ShowDebugHoverResult["NOT_CHANGED"] = 0] = "NOT_CHANGED";
    ShowDebugHoverResult[ShowDebugHoverResult["NOT_AVAILABLE"] = 1] = "NOT_AVAILABLE";
    ShowDebugHoverResult[ShowDebugHoverResult["CANCELLED"] = 2] = "CANCELLED";
})(ShowDebugHoverResult || (ShowDebugHoverResult = {}));
async function doFindExpression(container, namesToFind) {
    if (!container) {
        return null;
    }
    const children = await container.getChildren();
    // look for our variable in the list. First find the parents of the hovered variable if there are any.
    const filtered = children.filter((v) => namesToFind[0] === v.name);
    if (filtered.length !== 1) {
        return null;
    }
    if (namesToFind.length === 1) {
        return filtered[0];
    }
    else {
        return doFindExpression(filtered[0], namesToFind.slice(1));
    }
}
export async function findExpressionInStackFrame(stackFrame, namesToFind) {
    const scopes = await stackFrame.getScopes();
    const nonExpensive = scopes.filter((s) => !s.expensive);
    const expressions = coalesce(await Promise.all(nonExpensive.map((scope) => doFindExpression(scope, namesToFind))));
    // only show if all expressions found have the same value
    return expressions.length > 0 && expressions.every((e) => e.value === expressions[0].value)
        ? expressions[0]
        : undefined;
}
let DebugHoverWidget = class DebugHoverWidget {
    static { DebugHoverWidget_1 = this; }
    static { this.ID = 'debug.hoverWidget'; }
    get isShowingComplexValue() {
        return this.complexValueContainer?.hidden === false;
    }
    constructor(editor, debugService, instantiationService, menuService, contextKeyService, contextMenuService) {
        this.editor = editor;
        this.debugService = debugService;
        this.instantiationService = instantiationService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        // editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this.isUpdatingTree = false;
        this.highlightDecorations = this.editor.createDecorationsCollection();
        this.toDispose = [];
        this.showAtPosition = null;
        this.positionPreference = [
            1 /* ContentWidgetPositionPreference.ABOVE */,
            2 /* ContentWidgetPositionPreference.BELOW */,
        ];
        this.debugHoverComputer = this.instantiationService.createInstance(DebugHoverComputer, this.editor);
        this.expressionRenderer = this.instantiationService.createInstance(DebugExpressionRenderer);
    }
    create() {
        this.domNode = $('.debug-hover-widget');
        this.complexValueContainer = dom.append(this.domNode, $('.complex-value'));
        this.complexValueTitle = dom.append(this.complexValueContainer, $('.title'));
        this.treeContainer = dom.append(this.complexValueContainer, $('.debug-hover-tree'));
        this.treeContainer.setAttribute('role', 'tree');
        const tip = dom.append(this.complexValueContainer, $('.tip'));
        tip.textContent = nls.localize({
            key: 'quickTip',
            comment: [
                '"switch to editor language hover" means to show the programming language hover widget instead of the debug hover',
            ],
        }, 'Hold {0} key to switch to editor language hover', isMacintosh ? 'Option' : 'Alt');
        const dataSource = this.instantiationService.createInstance(DebugHoverDataSource);
        this.tree = this.instantiationService.createInstance((WorkbenchAsyncDataTree), 'DebugHover', this.treeContainer, new DebugHoverDelegate(), [
            this.instantiationService.createInstance(VariablesRenderer, this.expressionRenderer),
            this.instantiationService.createInstance(VisualizedVariableRenderer, this.expressionRenderer),
        ], dataSource, {
            accessibilityProvider: new DebugHoverAccessibilityProvider(),
            mouseSupport: false,
            horizontalScrolling: true,
            useShadows: false,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel: (e) => e.name },
            overrideStyles: {
                listBackground: editorHoverBackground,
            },
        });
        this.toDispose.push(VisualizedVariableRenderer.rendererOnVisualizationRange(this.debugService.getViewModel(), this.tree));
        this.valueContainer = $('.value');
        this.valueContainer.tabIndex = 0;
        this.valueContainer.setAttribute('role', 'tooltip');
        this.scrollbar = new DomScrollableElement(this.valueContainer, {
            horizontal: 2 /* ScrollbarVisibility.Hidden */,
        });
        this.domNode.appendChild(this.scrollbar.getDomNode());
        this.toDispose.push(this.scrollbar);
        this.editor.applyFontInfo(this.domNode);
        this.domNode.style.backgroundColor = asCssVariable(editorHoverBackground);
        this.domNode.style.border = `1px solid ${asCssVariable(editorHoverBorder)}`;
        this.domNode.style.color = asCssVariable(editorHoverForeground);
        this.toDispose.push(this.tree.onContextMenu(async (e) => await this.onContextMenu(e)));
        this.toDispose.push(this.tree.onDidChangeContentHeight(() => {
            if (!this.isUpdatingTree) {
                // Don't do a layout in the middle of the async setInput
                this.layoutTreeAndContainer();
            }
        }));
        this.toDispose.push(this.tree.onDidChangeContentWidth(() => {
            if (!this.isUpdatingTree) {
                // Don't do a layout in the middle of the async setInput
                this.layoutTreeAndContainer();
            }
        }));
        this.registerListeners();
        this.editor.addContentWidget(this);
    }
    async onContextMenu(e) {
        const variable = e.element;
        if (!(variable instanceof Variable) || !variable.value) {
            return;
        }
        return openContextMenuForVariableTreeElement(this.contextKeyService, this.menuService, this.contextMenuService, MenuId.DebugHoverContext, e);
    }
    registerListeners() {
        this.toDispose.push(dom.addStandardDisposableListener(this.domNode, 'keydown', (e) => {
            if (e.equals(9 /* KeyCode.Escape */)) {
                this.hide();
            }
        }));
        this.toDispose.push(this.editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(52 /* EditorOption.fontInfo */)) {
                this.editor.applyFontInfo(this.domNode);
            }
        }));
        this.toDispose.push(this.debugService.getViewModel().onDidEvaluateLazyExpression(async (e) => {
            if (e instanceof Variable && this.tree.hasNode(e)) {
                await this.tree.updateChildren(e, false, true);
                await this.tree.expand(e);
            }
        }));
    }
    isHovered() {
        return !!this.domNode?.matches(':hover');
    }
    isVisible() {
        return !!this._isVisible;
    }
    willBeVisible() {
        return !!this.showCancellationSource;
    }
    getId() {
        return DebugHoverWidget_1.ID;
    }
    getDomNode() {
        return this.domNode;
    }
    /**
     * Gets whether the given coordinates are in the safe triangle formed from
     * the position at which the hover was initiated.
     */
    isInSafeTriangle(x, y) {
        return this._isVisible && !!this.safeTriangle?.contains(x, y);
    }
    async showAt(position, focus, mouseEvent) {
        this.showCancellationSource?.dispose(true);
        const cancellationSource = (this.showCancellationSource = new CancellationTokenSource());
        const session = this.debugService.getViewModel().focusedSession;
        if (!session || !this.editor.hasModel()) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        const result = await this.debugHoverComputer.compute(position, cancellationSource.token);
        if (cancellationSource.token.isCancellationRequested) {
            this.hide();
            return 2 /* ShowDebugHoverResult.CANCELLED */;
        }
        if (!result.range) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        if (this.isVisible() && !result.rangeChanged) {
            return 0 /* ShowDebugHoverResult.NOT_CHANGED */;
        }
        const expression = await this.debugHoverComputer.evaluate(session);
        if (cancellationSource.token.isCancellationRequested) {
            this.hide();
            return 2 /* ShowDebugHoverResult.CANCELLED */;
        }
        if (!expression || (expression instanceof Expression && !expression.available)) {
            this.hide();
            return 1 /* ShowDebugHoverResult.NOT_AVAILABLE */;
        }
        this.highlightDecorations.set([
            {
                range: result.range,
                options: DebugHoverWidget_1._HOVER_HIGHLIGHT_DECORATION_OPTIONS,
            },
        ]);
        return this.doShow(session, result.range.getStartPosition(), expression, focus, mouseEvent);
    }
    static { this._HOVER_HIGHLIGHT_DECORATION_OPTIONS = ModelDecorationOptions.register({
        description: 'bdebug-hover-highlight',
        className: 'hoverHighlight',
    }); }
    async doShow(session, position, expression, focus, mouseEvent) {
        if (!this.domNode) {
            this.create();
        }
        this.showAtPosition = position;
        const store = new lifecycle.DisposableStore();
        this._isVisible = { store };
        if (!expression.hasChildren) {
            this.complexValueContainer.hidden = true;
            this.valueContainer.hidden = false;
            store.add(this.expressionRenderer.renderValue(this.valueContainer, expression, {
                showChanged: false,
                colorize: true,
                hover: false,
                session,
            }));
            this.valueContainer.title = '';
            this.editor.layoutContentWidget(this);
            this.safeTriangle =
                mouseEvent && new dom.SafeTriangle(mouseEvent.posx, mouseEvent.posy, this.domNode);
            this.scrollbar.scanDomNode();
            if (focus) {
                this.editor.render();
                this.valueContainer.focus();
            }
            return undefined;
        }
        this.valueContainer.hidden = true;
        this.expressionToRender = expression;
        store.add(this.expressionRenderer.renderValue(this.complexValueTitle, expression, {
            hover: false,
            session,
        }));
        this.editor.layoutContentWidget(this);
        this.safeTriangle =
            mouseEvent && new dom.SafeTriangle(mouseEvent.posx, mouseEvent.posy, this.domNode);
        this.tree.scrollTop = 0;
        this.tree.scrollLeft = 0;
        this.complexValueContainer.hidden = false;
        if (focus) {
            this.editor.render();
            this.tree.domFocus();
        }
    }
    layoutTreeAndContainer() {
        this.layoutTree();
        this.editor.layoutContentWidget(this);
    }
    layoutTree() {
        const scrollBarHeight = 10;
        let maxHeightToAvoidCursorOverlay = Infinity;
        if (this.showAtPosition) {
            const editorTop = this.editor.getDomNode()?.offsetTop || 0;
            const containerTop = this.treeContainer.offsetTop + editorTop;
            const hoveredCharTop = this.editor.getTopForLineNumber(this.showAtPosition.lineNumber, true) -
                this.editor.getScrollTop();
            if (containerTop < hoveredCharTop) {
                maxHeightToAvoidCursorOverlay = hoveredCharTop + editorTop - 22; // 22 is monaco top padding https://github.com/microsoft/vscode/blob/a1df2d7319382d42f66ad7f411af01e4cc49c80a/src/vs/editor/browser/viewParts/contentWidgets/contentWidgets.ts#L364
            }
        }
        const treeHeight = Math.min(Math.max(266, this.editor.getLayoutInfo().height * 0.55), this.tree.contentHeight + scrollBarHeight, maxHeightToAvoidCursorOverlay);
        const realTreeWidth = this.tree.contentWidth;
        const treeWidth = clamp(realTreeWidth, 400, 550);
        this.tree.layout(treeHeight, treeWidth);
        this.treeContainer.style.height = `${treeHeight}px`;
        this.scrollbar.scanDomNode();
    }
    beforeRender() {
        // beforeRender will be called each time the hover size changes, and the content widget is layed out again.
        if (this.expressionToRender) {
            const expression = this.expressionToRender;
            this.expressionToRender = undefined;
            // Do this in beforeRender once the content widget is no longer display=none so that its elements' sizes will be measured correctly.
            this.isUpdatingTree = true;
            this.tree.setInput(expression).finally(() => {
                this.isUpdatingTree = false;
            });
        }
        return null;
    }
    afterRender(positionPreference) {
        if (positionPreference) {
            // Remember where the editor placed you to keep position stable #109226
            this.positionPreference = [positionPreference];
        }
    }
    hide() {
        if (this.showCancellationSource) {
            this.showCancellationSource.dispose(true);
            this.showCancellationSource = undefined;
        }
        if (!this._isVisible) {
            return;
        }
        if (dom.isAncestorOfActiveElement(this.domNode)) {
            this.editor.focus();
        }
        this._isVisible.store.dispose();
        this._isVisible = undefined;
        this.highlightDecorations.clear();
        this.editor.layoutContentWidget(this);
        this.positionPreference = [
            1 /* ContentWidgetPositionPreference.ABOVE */,
            2 /* ContentWidgetPositionPreference.BELOW */,
        ];
    }
    getPosition() {
        return this._isVisible
            ? {
                position: this.showAtPosition,
                preference: this.positionPreference,
            }
            : null;
    }
    dispose() {
        this.toDispose = lifecycle.dispose(this.toDispose);
    }
};
DebugHoverWidget = DebugHoverWidget_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IInstantiationService),
    __param(3, IMenuService),
    __param(4, IContextKeyService),
    __param(5, IContextMenuService)
], DebugHoverWidget);
export { DebugHoverWidget };
class DebugHoverAccessibilityProvider {
    getWidgetAriaLabel() {
        return nls.localize('treeAriaLabel', 'Debug Hover');
    }
    getAriaLabel(element) {
        return nls.localize({
            key: 'variableAriaLabel',
            comment: ['Do not translate placeholders. Placeholders are name and value of a variable.'],
        }, '{0}, value {1}, variables, debug', element.name, element.value);
    }
}
class DebugHoverDataSource extends AbstractExpressionDataSource {
    hasChildren(element) {
        return element.hasChildren;
    }
    doGetChildren(element) {
        return element.getChildren();
    }
}
class DebugHoverDelegate {
    getHeight(element) {
        return 18;
    }
    getTemplateId(element) {
        if (element instanceof VisualizedExpression) {
            return VisualizedVariableRenderer.ID;
        }
        return VariablesRenderer.ID;
    }
}
let DebugHoverComputer = class DebugHoverComputer {
    constructor(editor, debugService, languageFeaturesService, logService) {
        this.editor = editor;
        this.debugService = debugService;
        this.languageFeaturesService = languageFeaturesService;
        this.logService = logService;
    }
    async compute(position, token) {
        const session = this.debugService.getViewModel().focusedSession;
        if (!session || !this.editor.hasModel()) {
            return { rangeChanged: false };
        }
        const model = this.editor.getModel();
        const result = await getEvaluatableExpressionAtPosition(this.languageFeaturesService, model, position, token);
        if (!result) {
            return { rangeChanged: false };
        }
        const { range, matchingExpression } = result;
        const rangeChanged = !this._current?.range.equalsRange(range);
        this._current = { expression: matchingExpression, range: Range.lift(range) };
        return { rangeChanged, range: this._current.range };
    }
    async evaluate(session) {
        if (!this._current) {
            this.logService.error('No expression to evaluate');
            return;
        }
        const textModel = this.editor.getModel();
        const debugSource = textModel && session.getSourceForUri(textModel?.uri);
        if (session.capabilities.supportsEvaluateForHovers) {
            const expression = new Expression(this._current.expression);
            await expression.evaluate(session, this.debugService.getViewModel().focusedStackFrame, 'hover', undefined, debugSource
                ? {
                    line: this._current.range.startLineNumber,
                    column: this._current.range.startColumn,
                    source: debugSource.raw,
                }
                : undefined);
            return expression;
        }
        else {
            const focusedStackFrame = this.debugService.getViewModel().focusedStackFrame;
            if (focusedStackFrame) {
                return await findExpressionInStackFrame(focusedStackFrame, coalesce(this._current.expression.split('.').map((word) => word.trim())));
            }
        }
        return undefined;
    }
};
DebugHoverComputer = __decorate([
    __param(1, IDebugService),
    __param(2, ILanguageFeaturesService),
    __param(3, ILogService)
], DebugHoverComputer);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9kZWJ1Z0hvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBS3RELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBR2pHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEcsT0FBTyxLQUFLLFNBQVMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBY2pFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUvRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0s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