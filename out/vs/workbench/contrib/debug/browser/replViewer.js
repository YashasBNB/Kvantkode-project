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
var ReplGroupRenderer_1, ReplOutputElementRenderer_1, ReplVariablesRenderer_1;
import * as dom from '../../../../base/browser/dom.js';
import { CountBadge } from '../../../../base/browser/ui/countBadge/countBadge.js';
import { HighlightedLabel, } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { CachedListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { createMatches } from '../../../../base/common/filters.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import severity from '../../../../base/common/severity.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { defaultCountBadgeStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IDebugService, } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { RawObjectReplElement, ReplEvaluationInput, ReplEvaluationResult, ReplGroup, ReplOutputElement, ReplVariableElement, } from '../common/replModel.js';
import { AbstractExpressionsRenderer, } from './baseDebugView.js';
import { debugConsoleEvaluationInput } from './debugIcons.js';
const $ = dom.$;
export class ReplEvaluationInputsRenderer {
    static { this.ID = 'replEvaluationInput'; }
    get templateId() {
        return ReplEvaluationInputsRenderer.ID;
    }
    renderTemplate(container) {
        dom.append(container, $('span.arrow' + ThemeIcon.asCSSSelector(debugConsoleEvaluationInput)));
        const input = dom.append(container, $('.expression'));
        const label = new HighlightedLabel(input);
        return { label };
    }
    renderElement(element, index, templateData) {
        const evaluation = element.element;
        templateData.label.set(evaluation.value, createMatches(element.filterData));
    }
    disposeTemplate(templateData) {
        templateData.label.dispose();
    }
}
let ReplGroupRenderer = class ReplGroupRenderer {
    static { ReplGroupRenderer_1 = this; }
    static { this.ID = 'replGroup'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplGroupRenderer_1.ID;
    }
    renderTemplate(container) {
        container.classList.add('group');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        const label = dom.append(expression, $('span.label'));
        const source = this.instaService.createInstance(SourceWidget, expression);
        return { label, source };
    }
    renderElement(element, _index, templateData) {
        templateData.elementDisposable?.dispose();
        const replGroup = element.element;
        dom.clearNode(templateData.label);
        templateData.elementDisposable = this.expressionRenderer.renderValue(templateData.label, replGroup.name, { wasANSI: true, session: element.element.session });
        templateData.source.setSource(replGroup.sourceData);
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable?.dispose();
        templateData.source.dispose();
    }
};
ReplGroupRenderer = ReplGroupRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplGroupRenderer);
export { ReplGroupRenderer };
export class ReplEvaluationResultsRenderer {
    static { this.ID = 'replEvaluationResult'; }
    get templateId() {
        return ReplEvaluationResultsRenderer.ID;
    }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    renderTemplate(container) {
        const output = dom.append(container, $('.evaluation-result.expression'));
        const value = dom.append(output, $('span.value'));
        return { value, elementStore: new DisposableStore() };
    }
    renderElement(element, index, templateData) {
        templateData.elementStore.clear();
        const expression = element.element;
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, expression, {
            colorize: true,
            hover: false,
            session: element.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
    }
}
let ReplOutputElementRenderer = class ReplOutputElementRenderer {
    static { ReplOutputElementRenderer_1 = this; }
    static { this.ID = 'outputReplElement'; }
    constructor(expressionRenderer, instaService) {
        this.expressionRenderer = expressionRenderer;
        this.instaService = instaService;
    }
    get templateId() {
        return ReplOutputElementRenderer_1.ID;
    }
    renderTemplate(container) {
        const data = Object.create(null);
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression.value-and-source'));
        data.container = container;
        data.countContainer = dom.append(expression, $('.count-badge-wrapper'));
        data.count = new CountBadge(data.countContainer, {}, defaultCountBadgeStyles);
        data.value = dom.append(expression, $('span.value.label'));
        data.source = this.instaService.createInstance(SourceWidget, expression);
        data.elementDisposable = new DisposableStore();
        return data;
    }
    renderElement({ element }, index, templateData) {
        templateData.elementDisposable.clear();
        this.setElementCount(element, templateData);
        templateData.elementDisposable.add(element.onDidChangeCount(() => this.setElementCount(element, templateData)));
        // value
        dom.clearNode(templateData.value);
        // Reset classes to clear ansi decorations since templates are reused
        templateData.value.className = 'value';
        const locationReference = element.expression?.valueLocationReference;
        templateData.elementDisposable.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            wasANSI: true,
            session: element.session,
            locationReference,
            hover: false,
        }));
        templateData.value.classList.add(element.severity === severity.Warning
            ? 'warn'
            : element.severity === severity.Error
                ? 'error'
                : element.severity === severity.Ignore
                    ? 'ignore'
                    : 'info');
        templateData.source.setSource(element.sourceData);
        templateData.getReplElementSource = () => element.sourceData;
    }
    setElementCount(element, templateData) {
        if (element.count >= 2) {
            templateData.count.setCount(element.count);
            templateData.countContainer.hidden = false;
        }
        else {
            templateData.countContainer.hidden = true;
        }
    }
    disposeTemplate(templateData) {
        templateData.source.dispose();
        templateData.elementDisposable.dispose();
        templateData.count.dispose();
    }
    disposeElement(_element, _index, templateData) {
        templateData.elementDisposable.clear();
    }
};
ReplOutputElementRenderer = ReplOutputElementRenderer_1 = __decorate([
    __param(1, IInstantiationService)
], ReplOutputElementRenderer);
export { ReplOutputElementRenderer };
let ReplVariablesRenderer = class ReplVariablesRenderer extends AbstractExpressionsRenderer {
    static { ReplVariablesRenderer_1 = this; }
    static { this.ID = 'replVariable'; }
    get templateId() {
        return ReplVariablesRenderer_1.ID;
    }
    constructor(expressionRenderer, debugService, contextViewService, hoverService) {
        super(debugService, contextViewService, hoverService);
        this.expressionRenderer = expressionRenderer;
    }
    renderElement(node, _index, data) {
        const element = node.element;
        data.elementDisposable.clear();
        super.renderExpressionElement(element instanceof ReplVariableElement ? element.expression : element, node, data);
    }
    renderExpression(expression, data, highlights) {
        const isReplVariable = expression instanceof ReplVariableElement;
        if (isReplVariable || !expression.name) {
            data.label.set('');
            const value = isReplVariable ? expression.expression : expression;
            data.elementDisposable.add(this.expressionRenderer.renderValue(data.value, value, {
                colorize: true,
                hover: false,
                session: expression.getSession(),
            }));
            data.expression.classList.remove('nested-variable');
        }
        else {
            data.elementDisposable.add(this.expressionRenderer.renderVariable(data, expression, {
                showChanged: true,
                highlights,
            }));
            data.expression.classList.toggle('nested-variable', isNestedVariable(expression));
        }
    }
    getInputBoxOptions(expression) {
        return undefined;
    }
};
ReplVariablesRenderer = ReplVariablesRenderer_1 = __decorate([
    __param(1, IDebugService),
    __param(2, IContextViewService),
    __param(3, IHoverService)
], ReplVariablesRenderer);
export { ReplVariablesRenderer };
export class ReplRawObjectsRenderer {
    static { this.ID = 'rawObject'; }
    constructor(expressionRenderer) {
        this.expressionRenderer = expressionRenderer;
    }
    get templateId() {
        return ReplRawObjectsRenderer.ID;
    }
    renderTemplate(container) {
        container.classList.add('output');
        const expression = dom.append(container, $('.output.expression'));
        const name = dom.append(expression, $('span.name'));
        const label = new HighlightedLabel(name);
        const value = dom.append(expression, $('span.value'));
        return { container, expression, name, label, value, elementStore: new DisposableStore() };
    }
    renderElement(node, index, templateData) {
        templateData.elementStore.clear();
        // key
        const element = node.element;
        templateData.label.set(element.name ? `${element.name}:` : '', createMatches(node.filterData));
        if (element.name) {
            templateData.name.textContent = `${element.name}:`;
        }
        else {
            templateData.name.textContent = '';
        }
        // value
        templateData.elementStore.add(this.expressionRenderer.renderValue(templateData.value, element.value, {
            hover: false,
            session: node.element.getSession(),
        }));
    }
    disposeTemplate(templateData) {
        templateData.elementStore.dispose();
        templateData.label.dispose();
    }
}
function isNestedVariable(element) {
    return (element instanceof Variable &&
        (element.parent instanceof ReplEvaluationResult || element.parent instanceof Variable));
}
export class ReplDelegate extends CachedListVirtualDelegate {
    constructor(configurationService, replOptions) {
        super();
        this.configurationService = configurationService;
        this.replOptions = replOptions;
    }
    getHeight(element) {
        const config = this.configurationService.getValue('debug');
        if (!config.console.wordWrap) {
            return this.estimateHeight(element, true);
        }
        return super.getHeight(element);
    }
    /**
     * With wordWrap enabled, this is an estimate. With wordWrap disabled, this is the real height that the list will use.
     */
    estimateHeight(element, ignoreValueLength = false) {
        const lineHeight = this.replOptions.replConfiguration.lineHeight;
        const countNumberOfLines = (str) => str.match(/\n/g)?.length ?? 0;
        const hasValue = (e) => typeof e.value === 'string';
        if (hasValue(element) && !isNestedVariable(element)) {
            const value = element.value;
            const valueRows = countNumberOfLines(value) +
                (ignoreValueLength ? 0 : Math.floor(value.length / 70)) + // Make an estimate for wrapping
                (element instanceof ReplOutputElement ? 0 : 1); // A SimpleReplElement ends in \n if it's a complete line
            return Math.max(valueRows, 1) * lineHeight;
        }
        return lineHeight;
    }
    getTemplateId(element) {
        if (element instanceof Variable || element instanceof ReplVariableElement) {
            return ReplVariablesRenderer.ID;
        }
        if (element instanceof ReplEvaluationResult) {
            return ReplEvaluationResultsRenderer.ID;
        }
        if (element instanceof ReplEvaluationInput) {
            return ReplEvaluationInputsRenderer.ID;
        }
        if (element instanceof ReplOutputElement) {
            return ReplOutputElementRenderer.ID;
        }
        if (element instanceof ReplGroup) {
            return ReplGroupRenderer.ID;
        }
        return ReplRawObjectsRenderer.ID;
    }
    hasDynamicHeight(element) {
        if (isNestedVariable(element)) {
            // Nested variables should always be in one line #111843
            return false;
        }
        // Empty elements should not have dynamic height since they will be invisible
        return element.toString().length > 0;
    }
}
function isDebugSession(obj) {
    return typeof obj.getReplElements === 'function';
}
export class ReplDataSource {
    hasChildren(element) {
        if (isDebugSession(element)) {
            return true;
        }
        return !!element.hasChildren;
    }
    getChildren(element) {
        if (isDebugSession(element)) {
            return Promise.resolve(element.getReplElements());
        }
        return Promise.resolve(element.getChildren());
    }
}
export class ReplAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('debugConsole', 'Debug Console');
    }
    getAriaLabel(element) {
        if (element instanceof Variable) {
            return localize('replVariableAriaLabel', 'Variable {0}, value {1}', element.name, element.value);
        }
        if (element instanceof ReplOutputElement ||
            element instanceof ReplEvaluationInput ||
            element instanceof ReplEvaluationResult) {
            return (element.value +
                (element instanceof ReplOutputElement && element.count > 1
                    ? localize({
                        key: 'occurred',
                        comment: [
                            'Front will the value of the debug console element. Placeholder will be replaced by a number which represents occurrance count.',
                        ],
                    }, ', occurred {0} times', element.count)
                    : ''));
        }
        if (element instanceof RawObjectReplElement) {
            return localize('replRawObjectAriaLabel', 'Debug console variable {0}, value {1}', element.name, element.value);
        }
        if (element instanceof ReplGroup) {
            return localize('replGroup', 'Debug console group {0}', element.name);
        }
        return '';
    }
}
let SourceWidget = class SourceWidget extends Disposable {
    constructor(container, editorService, hoverService, labelService) {
        super();
        this.hoverService = hoverService;
        this.labelService = labelService;
        this.el = dom.append(container, $('.source'));
        this._register(dom.addDisposableListener(this.el, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.source) {
                this.source.source.openInEditor(editorService, {
                    startLineNumber: this.source.lineNumber,
                    startColumn: this.source.column,
                    endLineNumber: this.source.lineNumber,
                    endColumn: this.source.column,
                });
            }
        }));
    }
    setSource(source) {
        this.source = source;
        this.el.textContent = source ? `${basename(source.source.name)}:${source.lineNumber}` : '';
        this.hover ??= this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), this.el, ''));
        this.hover.update(source ? `${this.labelService.getUriLabel(source.source.uri)}:${source.lineNumber}` : '');
    }
};
SourceWidget = __decorate([
    __param(1, IEditorService),
    __param(2, IHoverService),
    __param(3, ILabelService)
], SourceWidget);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbFZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcmVwbFZpZXdlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDakYsT0FBTyxFQUNOLGdCQUFnQixHQUVoQixNQUFNLGtFQUFrRSxDQUFBO0FBRXpFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBT3BGLE9BQU8sRUFBRSxhQUFhLEVBQWMsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0scURBQXFELENB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