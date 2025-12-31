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
var NotebookVariableRenderer_1;
import * as dom from '../../../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../../nls.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { WorkbenchObjectTree } from '../../../../../../platform/list/browser/listService.js';
import { DebugExpressionRenderer } from '../../../../debug/browser/debugExpressionRenderer.js';
const $ = dom.$;
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
export class NotebookVariablesTree extends WorkbenchObjectTree {
}
export class NotebookVariablesDelegate {
    getHeight(element) {
        return 22;
    }
    getTemplateId(element) {
        return NotebookVariableRenderer.ID;
    }
}
let NotebookVariableRenderer = class NotebookVariableRenderer {
    static { NotebookVariableRenderer_1 = this; }
    static { this.ID = 'variableElement'; }
    get templateId() {
        return NotebookVariableRenderer_1.ID;
    }
    constructor(instantiationService) {
        this.expressionRenderer = instantiationService.createInstance(DebugExpressionRenderer);
    }
    renderTemplate(container) {
        const expression = dom.append(container, $('.expression'));
        const name = dom.append(expression, $('span.name'));
        const value = dom.append(expression, $('span.value'));
        const template = {
            expression,
            name,
            value,
            elementDisposables: new DisposableStore(),
        };
        return template;
    }
    renderElement(element, _index, data) {
        const text = element.element.value.trim() !== '' ? `${element.element.name}:` : element.element.name;
        data.name.textContent = text;
        data.name.title = element.element.type ?? '';
        data.elementDisposables.add(this.expressionRenderer.renderValue(data.value, element.element, {
            colorize: true,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            session: undefined,
        }));
    }
    disposeElement(element, index, templateData, height) {
        templateData.elementDisposables.clear();
    }
    disposeTemplate(templateData) {
        templateData.elementDisposables.dispose();
    }
};
NotebookVariableRenderer = NotebookVariableRenderer_1 = __decorate([
    __param(0, IInstantiationService)
], NotebookVariableRenderer);
export { NotebookVariableRenderer };
export class NotebookVariableAccessibilityProvider {
    getWidgetAriaLabel() {
        return localize('debugConsole', 'Notebook Variables');
    }
    getAriaLabel(element) {
        return localize('notebookVariableAriaLabel', 'Variable {0}, value {1}', element.name, element.value);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZXNUcmVlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cmliL25vdGVib29rVmFyaWFibGVzL25vdGVib29rVmFyaWFibGVzVHJlZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSx1Q0FBdUMsQ0FBQTtBQUs1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRzlGLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFDZixNQUFNLGtDQUFrQyxHQUFHLElBQUksQ0FBQTtBQUUvQyxNQUFNLE9BQU8scUJBQXNCLFNBQVEsbUJBQTZDO0NBQUc7QUFFM0YsTUFBTSxPQUFPLHlCQUF5QjtJQUNyQyxTQUFTLENBQUMsT0FBaUM7UUFDMUMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsYUFBYSxDQUFDLE9BQWlDO1FBQzlDLE9BQU8sd0JBQXdCLENBQUMsRUFBRSxDQUFBO0lBQ25DLENBQUM7Q0FDRDtBQVNNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXdCOzthQUtwQixPQUFFLEdBQUcsaUJBQWlCLEFBQXBCLENBQW9CO0lBRXRDLElBQUksVUFBVTtRQUNiLE9BQU8sMEJBQXdCLENBQUMsRUFBRSxDQUFBO0lBQ25DLENBQUM7SUFFRCxZQUFtQyxvQkFBMkM7UUFDN0UsSUFBSSxDQUFDLGtCQUFrQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO0lBQ3ZGLENBQUM7SUFFRCxjQUFjLENBQUMsU0FBc0I7UUFDcEMsTUFBTSxVQUFVLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7UUFDbkQsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxVQUFVLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUE7UUFFckQsTUFBTSxRQUFRLEdBQTBCO1lBQ3ZDLFVBQVU7WUFDVixJQUFJO1lBQ0osS0FBSztZQUNMLGtCQUFrQixFQUFFLElBQUksZUFBZSxFQUFFO1NBQ3pDLENBQUE7UUFFRCxPQUFPLFFBQVEsQ0FBQTtJQUNoQixDQUFDO0lBRUQsYUFBYSxDQUNaLE9BQXdELEVBQ3hELE1BQWMsRUFDZCxJQUEyQjtRQUUzQixNQUFNLElBQUksR0FDVCxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUE7UUFDeEYsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFBO1FBQzVCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxHQUFHLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQTtRQUU1QyxJQUFJLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsT0FBTyxDQUFDLE9BQU8sRUFBRTtZQUNoRSxRQUFRLEVBQUUsSUFBSTtZQUNkLGNBQWMsRUFBRSxrQ0FBa0M7WUFDbEQsT0FBTyxFQUFFLFNBQVM7U0FDbEIsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsY0FBYyxDQUNiLE9BQXdELEVBQ3hELEtBQWEsRUFDYixZQUFtQyxFQUNuQyxNQUEwQjtRQUUxQixZQUFZLENBQUMsa0JBQWtCLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDeEMsQ0FBQztJQUVELGVBQWUsQ0FBQyxZQUFtQztRQUNsRCxZQUFZLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDMUMsQ0FBQzs7QUE1RFcsd0JBQXdCO0lBV3ZCLFdBQUEscUJBQXFCLENBQUE7R0FYdEIsd0JBQXdCLENBNkRwQzs7QUFFRCxNQUFNLE9BQU8scUNBQXFDO0lBR2pELGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxjQUFjLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtJQUN0RCxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQWlDO1FBQzdDLE9BQU8sUUFBUSxDQUNkLDJCQUEyQixFQUMzQix5QkFBeUIsRUFDekIsT0FBTyxDQUFDLElBQUksRUFDWixPQUFPLENBQUMsS0FBSyxDQUNiLENBQUE7SUFDRixDQUFDO0NBQ0QifQ==