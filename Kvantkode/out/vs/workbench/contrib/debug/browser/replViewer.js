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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbFZpZXdlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yZXBsVmlld2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFFekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFPcEYsT0FBTyxFQUFFLGFBQWEsRUFBYyxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDL0YsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzFELE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxREFB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