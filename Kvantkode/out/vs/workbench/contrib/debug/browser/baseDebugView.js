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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZURlYnVnVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9iYXNlRGVidWdWaWV3LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFFdEQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzlFLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSxrRUFBa0UsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQTJCLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBT3BHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQWMsYUFBYSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFaEYsT0FBTyxFQUNOLGVBQWUsRUFFZixPQUFPLEVBQ1AsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0scURB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