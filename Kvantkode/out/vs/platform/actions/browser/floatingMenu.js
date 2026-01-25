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
import { $, append, clearNode } from '../../../base/browser/dom.js';
import { Widget } from '../../../base/browser/ui/widget.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { getFlatActionBarActions } from './menuEntryActionViewItem.js';
import { IMenuService } from '../common/actions.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { asCssVariable, asCssVariableWithDefault, buttonBackground, buttonForeground, contrastBorder, editorBackground, editorForeground, } from '../../theme/common/colorRegistry.js';
export class FloatingClickWidget extends Widget {
    constructor(label) {
        super();
        this.label = label;
        this._onClick = this._register(new Emitter());
        this.onClick = this._onClick.event;
        this._domNode = $('.floating-click-widget');
        this._domNode.style.padding = '6px 11px';
        this._domNode.style.borderRadius = '2px';
        this._domNode.style.cursor = 'pointer';
        this._domNode.style.zIndex = '1';
    }
    getDomNode() {
        return this._domNode;
    }
    render() {
        clearNode(this._domNode);
        this._domNode.style.backgroundColor = asCssVariableWithDefault(buttonBackground, asCssVariable(editorBackground));
        this._domNode.style.color = asCssVariableWithDefault(buttonForeground, asCssVariable(editorForeground));
        this._domNode.style.border = `1px solid ${asCssVariable(contrastBorder)}`;
        append(this._domNode, $('')).textContent = this.label;
        this.onclick(this._domNode, () => this._onClick.fire());
    }
}
let AbstractFloatingClickMenu = class AbstractFloatingClickMenu extends Disposable {
    constructor(menuId, menuService, contextKeyService) {
        super();
        this.renderEmitter = new Emitter();
        this.onDidRender = this.renderEmitter.event;
        this.menu = this._register(menuService.createMenu(menuId, contextKeyService));
    }
    /** Should be called in implementation constructors after they initialized */
    render() {
        const menuDisposables = this._register(new DisposableStore());
        const renderMenuAsFloatingClickBtn = () => {
            menuDisposables.clear();
            if (!this.isVisible()) {
                return;
            }
            const actions = getFlatActionBarActions(this.menu.getActions({ renderShortTitle: true, shouldForwardArgs: true }));
            if (actions.length === 0) {
                return;
            }
            // todo@jrieken find a way to handle N actions, like showing a context menu
            const [first] = actions;
            const widget = this.createWidget(first, menuDisposables);
            menuDisposables.add(widget);
            menuDisposables.add(widget.onClick(() => first.run(this.getActionArg())));
            widget.render();
        };
        this._register(this.menu.onDidChange(renderMenuAsFloatingClickBtn));
        renderMenuAsFloatingClickBtn();
    }
    getActionArg() {
        return undefined;
    }
    isVisible() {
        return true;
    }
};
AbstractFloatingClickMenu = __decorate([
    __param(1, IMenuService),
    __param(2, IContextKeyService)
], AbstractFloatingClickMenu);
export { AbstractFloatingClickMenu };
let FloatingClickMenu = class FloatingClickMenu extends AbstractFloatingClickMenu {
    constructor(options, instantiationService, menuService, contextKeyService) {
        super(options.menuId, menuService, contextKeyService);
        this.options = options;
        this.instantiationService = instantiationService;
        this.render();
    }
    createWidget(action, disposable) {
        const w = this.instantiationService.createInstance(FloatingClickWidget, action.label);
        const node = w.getDomNode();
        this.options.container.appendChild(node);
        disposable.add(toDisposable(() => node.remove()));
        return w;
    }
    getActionArg() {
        return this.options.getActionArg();
    }
};
FloatingClickMenu = __decorate([
    __param(1, IInstantiationService),
    __param(2, IMenuService),
    __param(3, IContextKeyService)
], FloatingClickMenu);
export { FloatingClickMenu };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmxvYXRpbmdNZW51LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvZmxvYXRpbmdNZW51LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxDQUFDLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ25FLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0YsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFTLFlBQVksRUFBVSxNQUFNLHNCQUFzQixDQUFBO0FBQ2xFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFDTixhQUFhLEVBQ2Isd0JBQXdCLEVBQ3hCLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsY0FBYyxFQUNkLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU1QyxNQUFNLE9BQU8sbUJBQW9CLFNBQVEsTUFBTTtJQU05QyxZQUFvQixLQUFhO1FBQ2hDLEtBQUssRUFBRSxDQUFBO1FBRFksVUFBSyxHQUFMLEtBQUssQ0FBUTtRQUxoQixhQUFRLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDdEQsWUFBTyxHQUFHLElBQUksQ0FBQyxR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