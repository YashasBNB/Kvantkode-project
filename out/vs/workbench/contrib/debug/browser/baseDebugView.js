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
import * as dom from '../../../../base/browser/dom.js';
import { ActionBar } from '../../../../base/browser/ui/actionbar/actionbar.js';
import { HighlightedLabel, } from '../../../../base/browser/ui/highlightedlabel/highlightedLabel.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { InputBox } from '../../../../base/browser/ui/inputbox/inputBox.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { createMatches } from '../../../../base/common/filters.js';
import { createSingleCallFunction } from '../../../../base/common/functional.js';
import { DisposableStore, dispose, toDisposable, } from '../../../../base/common/lifecycle.js';
import { removeAnsiEscapeCodes } from '../../../../base/common/strings.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { localize } from '../../../../nls.js';
import { IContextViewService } from '../../../../platform/contextview/browser/contextView.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { defaultInputBoxStyles } from '../../../../platform/theme/browser/defaultStyles.js';
import { IDebugService } from '../common/debug.js';
import { Variable } from '../common/debugModel.js';
import { IDebugVisualizerService } from '../common/debugVisualizers.js';
const $ = dom.$;
export function renderViewTree(container) {
    const treeContainer = $('.');
    treeContainer.classList.add('debug-view-content', 'file-icon-themable-tree');
    container.appendChild(treeContainer);
    return treeContainer;
}
/** Splits highlights based on matching of the {@link expressionAndScopeLabelProvider} */
export const splitExpressionOrScopeHighlights = (e, highlights) => {
    const nameEndsAt = e.name.length;
    const labelBeginsAt = e.name.length + 2;
    const name = [];
    const value = [];
    for (const hl of highlights) {
        if (hl.start < nameEndsAt) {
            name.push({ start: hl.start, end: Math.min(hl.end, nameEndsAt) });
        }
        if (hl.end > labelBeginsAt) {
            value.push({ start: Math.max(hl.start - labelBeginsAt, 0), end: hl.end - labelBeginsAt });
        }
    }
    return { name, value };
};
/** Keyboard label provider for expression and scope tree elements. */
export const expressionAndScopeLabelProvider = {
    getKeyboardNavigationLabel(e) {
        const stripAnsi = e.getSession()?.rememberedCapabilities?.supportsANSIStyling;
        return `${e.name}: ${stripAnsi ? removeAnsiEscapeCodes(e.value) : e.value}`;
    },
};
let AbstractExpressionDataSource = class AbstractExpressionDataSource {
    constructor(debugService, debugVisualizer) {
        this.debugService = debugService;
        this.debugVisualizer = debugVisualizer;
    }
    async getChildren(element) {
        const vm = this.debugService.getViewModel();
        const children = await this.doGetChildren(element);
        return Promise.all(children.map(async (r) => {
            const vizOrTree = vm.getVisualizedExpression(r);
            if (typeof vizOrTree === 'string') {
                const viz = await this.debugVisualizer.getVisualizedNodeFor(vizOrTree, r);
                if (viz) {
                    vm.setVisualizedExpression(r, viz);
                    return viz;
                }
            }
            else if (vizOrTree) {
                return vizOrTree;
            }
            return r;
        }));
    }
};
AbstractExpressionDataSource = __decorate([
    __param(0, IDebugService),
    __param(1, IDebugVisualizerService)
], AbstractExpressionDataSource);
export { AbstractExpressionDataSource };
let AbstractExpressionsRenderer = class AbstractExpressionsRenderer {
    constructor(debugService, contextViewService, hoverService) {
        this.debugService = debugService;
        this.contextViewService = contextViewService;
        this.hoverService = hoverService;
    }
    renderTemplate(container) {
        const templateDisposable = new DisposableStore();
        const expression = dom.append(container, $('.expression'));
        const name = dom.append(expression, $('span.name'));
        const lazyButton = dom.append(expression, $('span.lazy-button'));
        lazyButton.classList.add(...ThemeIcon.asClassNameArray(Codicon.eye));
        templateDisposable.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), lazyButton, localize('debug.lazyButton.tooltip', 'Click to expand')));
        const type = dom.append(expression, $('span.type'));
        const value = dom.append(expression, $('span.value'));
        const label = templateDisposable.add(new HighlightedLabel(name));
        const inputBoxContainer = dom.append(expression, $('.inputBoxContainer'));
        let actionBar;
        if (this.renderActionBar) {
            dom.append(expression, $('.span.actionbar-spacer'));
            actionBar = templateDisposable.add(new ActionBar(expression));
        }
        const template = {
            expression,
            name,
            type,
            value,
            label,
            inputBoxContainer,
            actionBar,
            elementDisposable: new DisposableStore(),
            templateDisposable,
            lazyButton,
            currentElement: undefined,
        };
        templateDisposable.add(dom.addDisposableListener(lazyButton, dom.EventType.CLICK, () => {
            if (template.currentElement) {
                this.debugService.getViewModel().evaluateLazyExpression(template.currentElement);
            }
        }));
        return template;
    }
    renderExpressionElement(element, node, data) {
        data.currentElement = element;
        this.renderExpression(node.element, data, createMatches(node.filterData));
        if (data.actionBar) {
            this.renderActionBar(data.actionBar, element, data);
        }
        const selectedExpression = this.debugService.getViewModel().getSelectedExpression();
        if (element === selectedExpression?.expression ||
            (element instanceof Variable && element.errorMessage)) {
            const options = this.getInputBoxOptions(element, !!selectedExpression?.settingWatch);
            if (options) {
                data.elementDisposable.add(this.renderInputBox(data.name, data.value, data.inputBoxContainer, options));
            }
        }
    }
    renderInputBox(nameElement, valueElement, inputBoxContainer, options) {
        nameElement.style.display = 'none';
        valueElement.style.display = 'none';
        inputBoxContainer.style.display = 'initial';
        dom.clearNode(inputBoxContainer);
        const inputBox = new InputBox(inputBoxContainer, this.contextViewService, {
            ...options,
            inputBoxStyles: defaultInputBoxStyles,
        });
        inputBox.value = options.initialValue;
        inputBox.focus();
        inputBox.select();
        const done = createSingleCallFunction((success, finishEditing) => {
            nameElement.style.display = '';
            valueElement.style.display = '';
            inputBoxContainer.style.display = 'none';
            const value = inputBox.value;
            dispose(toDispose);
            if (finishEditing) {
                this.debugService.getViewModel().setSelectedExpression(undefined, false);
                options.onFinish(value, success);
            }
        });
        const toDispose = [
            inputBox,
            dom.addStandardDisposableListener(inputBox.inputElement, dom.EventType.KEY_DOWN, (e) => {
                const isEscape = e.equals(9 /* KeyCode.Escape */);
                const isEnter = e.equals(3 /* KeyCode.Enter */);
                if (isEscape || isEnter) {
                    e.preventDefault();
                    e.stopPropagation();
                    done(isEnter, true);
                }
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.BLUR, () => {
                done(true, true);
            }),
            dom.addDisposableListener(inputBox.inputElement, dom.EventType.CLICK, (e) => {
                // Do not expand / collapse selected elements
                e.preventDefault();
                e.stopPropagation();
            }),
        ];
        return toDisposable(() => {
            done(false, false);
        });
    }
    disposeElement(node, index, templateData) {
        templateData.elementDisposable.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposable.dispose();
        templateData.templateDisposable.dispose();
    }
};
AbstractExpressionsRenderer = __decorate([
    __param(0, IDebugService),
    __param(1, IContextViewService),
    __param(2, IHoverService)
], AbstractExpressionsRenderer);
export { AbstractExpressionsRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvYmFzZURlYnVnVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBRXRELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sZ0JBQWdCLEdBRWhCLE1BQU0sa0VBQWtFLENBQUE7QUFDekUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUEyQixRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQU9wRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFjLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRWhGLE9BQU8sRUFDTixlQUFlLEVBRWYsT0FBTyxFQUNQLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFDN0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzNGLE9BQU8sRUFB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