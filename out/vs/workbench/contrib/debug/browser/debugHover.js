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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdIb3Zlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdIb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUt0RCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXBHLE9BQU8sS0FBSyxTQUFTLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQWNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFL0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDckYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtEQUFr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