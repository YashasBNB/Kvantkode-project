var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../base/browser/dom.js';
import { KeybindingLabel } from '../../../base/browser/ui/keybindingLabel/keybindingLabel.js';
import { List } from '../../../base/browser/ui/list/listWidget.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Codicon } from '../../../base/common/codicons.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { OS } from '../../../base/common/platform.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import './actionWidget.css';
import { localize } from '../../../nls.js';
import { IContextViewService } from '../../contextview/browser/contextView.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
import { defaultListStyles } from '../../theme/browser/defaultStyles.js';
import { asCssVariable } from '../../theme/common/colorRegistry.js';
import { ILayoutService } from '../../layout/browser/layoutService.js';
export const acceptSelectedActionCommand = 'acceptSelectedCodeAction';
export const previewSelectedActionCommand = 'previewSelectedCodeAction';
export var ActionListItemKind;
(function (ActionListItemKind) {
    ActionListItemKind["Action"] = "action";
    ActionListItemKind["Header"] = "header";
})(ActionListItemKind || (ActionListItemKind = {}));
class HeaderRenderer {
    get templateId() {
        return "header" /* ActionListItemKind.Header */;
    }
    renderTemplate(container) {
        container.classList.add('group-header');
        const text = document.createElement('span');
        container.append(text);
        return { container, text };
    }
    renderElement(element, _index, templateData) {
        templateData.text.textContent = element.group?.title ?? '';
    }
    disposeTemplate(_templateData) {
        // noop
    }
}
let ActionItemRenderer = class ActionItemRenderer {
    get templateId() {
        return "action" /* ActionListItemKind.Action */;
    }
    constructor(_supportsPreview, _keybindingService) {
        this._supportsPreview = _supportsPreview;
        this._keybindingService = _keybindingService;
    }
    renderTemplate(container) {
        container.classList.add(this.templateId);
        const icon = document.createElement('div');
        icon.className = 'icon';
        container.append(icon);
        const text = document.createElement('span');
        text.className = 'title';
        container.append(text);
        const keybinding = new KeybindingLabel(container, OS);
        return { container, icon, text, keybinding };
    }
    renderElement(element, _index, data) {
        if (element.group?.icon) {
            data.icon.className = ThemeIcon.asClassName(element.group.icon);
            if (element.group.icon.color) {
                data.icon.style.color = asCssVariable(element.group.icon.color.id);
            }
        }
        else {
            data.icon.className = ThemeIcon.asClassName(Codicon.lightBulb);
            data.icon.style.color = 'var(--vscode-editorLightBulb-foreground)';
        }
        if (!element.item || !element.label) {
            return;
        }
        dom.setVisibility(!element.hideIcon, data.icon);
        data.text.textContent = stripNewlines(element.label);
        data.keybinding.set(element.keybinding);
        dom.setVisibility(!!element.keybinding, data.keybinding.element);
        const actionTitle = this._keybindingService
            .lookupKeybinding(acceptSelectedActionCommand)
            ?.getLabel();
        const previewTitle = this._keybindingService
            .lookupKeybinding(previewSelectedActionCommand)
            ?.getLabel();
        data.container.classList.toggle('option-disabled', element.disabled);
        if (element.disabled) {
            data.container.title = element.label;
        }
        else if (actionTitle && previewTitle) {
            if (this._supportsPreview && element.canPreview) {
                data.container.title = localize({
                    key: 'label-preview',
                    comment: ['placeholders are keybindings, e.g "F2 to Apply, Shift+F2 to Preview"'],
                }, '{0} to Apply, {1} to Preview', actionTitle, previewTitle);
            }
            else {
                data.container.title = localize({ key: 'label', comment: ['placeholder is a keybinding, e.g "F2 to Apply"'] }, '{0} to Apply', actionTitle);
            }
        }
        else {
            data.container.title = '';
        }
    }
    disposeTemplate(templateData) {
        templateData.keybinding.dispose();
    }
};
ActionItemRenderer = __decorate([
    __param(1, IKeybindingService)
], ActionItemRenderer);
class AcceptSelectedEvent extends UIEvent {
    constructor() {
        super('acceptSelectedAction');
    }
}
class PreviewSelectedEvent extends UIEvent {
    constructor() {
        super('previewSelectedAction');
    }
}
function getKeyboardNavigationLabel(item) {
    // Filter out header vs. action
    if (item.kind === 'action') {
        return item.label;
    }
    return undefined;
}
let ActionList = class ActionList extends Disposable {
    constructor(user, preview, items, _delegate, _contextViewService, _keybindingService, _layoutService) {
        super();
        this._delegate = _delegate;
        this._contextViewService = _contextViewService;
        this._keybindingService = _keybindingService;
        this._layoutService = _layoutService;
        this._actionLineHeight = 24;
        this._headerLineHeight = 26;
        this.cts = this._register(new CancellationTokenSource());
        this.domNode = document.createElement('div');
        this.domNode.classList.add('actionList');
        const virtualDelegate = {
            getHeight: (element) => element.kind === "header" /* ActionListItemKind.Header */
                ? this._headerLineHeight
                : this._actionLineHeight,
            getTemplateId: (element) => element.kind,
        };
        this._list = this._register(new List(user, this.domNode, virtualDelegate, [
            new ActionItemRenderer(preview, this._keybindingService),
            new HeaderRenderer(),
        ], {
            keyboardSupport: false,
            typeNavigationEnabled: true,
            keyboardNavigationLabelProvider: { getKeyboardNavigationLabel },
            accessibilityProvider: {
                getAriaLabel: (element) => {
                    if (element.kind === "action" /* ActionListItemKind.Action */) {
                        let label = element.label ? stripNewlines(element?.label) : '';
                        if (element.disabled) {
                            label = localize({
                                key: 'customQuickFixWidget.labels',
                                comment: [`Action widget labels for accessibility.`],
                            }, '{0}, Disabled Reason: {1}', label, element.disabled);
                        }
                        return label;
                    }
                    return null;
                },
                getWidgetAriaLabel: () => localize({ key: 'customQuickFixWidget', comment: [`An action widget option`] }, 'Action Widget'),
                getRole: (e) => (e.kind === "action" /* ActionListItemKind.Action */ ? 'option' : 'separator'),
                getWidgetRole: () => 'listbox',
            },
        }));
        this._list.style(defaultListStyles);
        this._register(this._list.onMouseClick((e) => this.onListClick(e)));
        this._register(this._list.onMouseOver((e) => this.onListHover(e)));
        this._register(this._list.onDidChangeFocus(() => this.onFocus()));
        this._register(this._list.onDidChangeSelection((e) => this.onListSelection(e)));
        this._allMenuItems = items;
        this._list.splice(0, this._list.length, this._allMenuItems);
        if (this._list.length) {
            this.focusNext();
        }
    }
    focusCondition(element) {
        return !element.disabled && element.kind === "action" /* ActionListItemKind.Action */;
    }
    hide(didCancel) {
        this._delegate.onHide(didCancel);
        this.cts.cancel();
        this._contextViewService.hideContextView();
    }
    layout(minWidth) {
        // Updating list height, depending on how many separators and headers there are.
        const numHeaders = this._allMenuItems.filter((item) => item.kind === 'header').length;
        const itemsHeight = this._allMenuItems.length * this._actionLineHeight;
        const heightWithHeaders = itemsHeight + numHeaders * this._headerLineHeight - numHeaders * this._actionLineHeight;
        this._list.layout(heightWithHeaders);
        let maxWidth = minWidth;
        if (this._allMenuItems.length >= 50) {
            maxWidth = 380;
        }
        else {
            // For finding width dynamically (not using resize observer)
            const itemWidths = this._allMenuItems.map((_, index) => {
                const element = this.domNode.ownerDocument.getElementById(this._list.getElementID(index));
                if (element) {
                    element.style.width = 'auto';
                    const width = element.getBoundingClientRect().width;
                    element.style.width = '';
                    return width;
                }
                return 0;
            });
            // resize observer - can be used in the future since list widget supports dynamic height but not width
            maxWidth = Math.max(...itemWidths, minWidth);
        }
        const maxVhPrecentage = 0.7;
        const height = Math.min(heightWithHeaders, this._layoutService.getContainer(dom.getWindow(this.domNode)).clientHeight * maxVhPrecentage);
        this._list.layout(height, maxWidth);
        this.domNode.style.height = `${height}px`;
        this._list.domFocus();
        return maxWidth;
    }
    focusPrevious() {
        this._list.focusPrevious(1, true, undefined, this.focusCondition);
    }
    focusNext() {
        this._list.focusNext(1, true, undefined, this.focusCondition);
    }
    acceptSelected(preview) {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        if (!this.focusCondition(element)) {
            return;
        }
        const event = preview ? new PreviewSelectedEvent() : new AcceptSelectedEvent();
        this._list.setSelection([focusIndex], event);
    }
    onListSelection(e) {
        if (!e.elements.length) {
            return;
        }
        const element = e.elements[0];
        if (element.item && this.focusCondition(element)) {
            this._delegate.onSelect(element.item, e.browserEvent instanceof PreviewSelectedEvent);
        }
        else {
            this._list.setSelection([]);
        }
    }
    onFocus() {
        const focused = this._list.getFocus();
        if (focused.length === 0) {
            return;
        }
        const focusIndex = focused[0];
        const element = this._list.element(focusIndex);
        this._delegate.onFocus?.(element.item);
    }
    async onListHover(e) {
        const element = e.element;
        if (element && element.item && this.focusCondition(element)) {
            if (this._delegate.onHover &&
                !element.disabled &&
                element.kind === "action" /* ActionListItemKind.Action */) {
                const result = await this._delegate.onHover(element.item, this.cts.token);
                element.canPreview = result ? result.canPreview : undefined;
            }
            if (e.index) {
                this._list.splice(e.index, 1, [element]);
            }
        }
        this._list.setFocus(typeof e.index === 'number' ? [e.index] : []);
    }
    onListClick(e) {
        if (e.element && this.focusCondition(e.element)) {
            this._list.setFocus([]);
        }
    }
};
ActionList = __decorate([
    __param(4, IContextViewService),
    __param(5, IKeybindingService),
    __param(6, ILayoutService)
], ActionList);
export { ActionList };
function stripNewlines(str) {
    return str.replace(/\r\n|\r|\n/g, ' ');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWN0aW9uTGlzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2FjdGlvbldpZGdldC9icm93c2VyL2FjdGlvbkxpc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFPN0YsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2xFLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxvQkFBb0IsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDMUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUV0RSxNQUFNLENBQUMsTUFBTSwyQkFBMkIsR0FBRywwQkFBMEIsQ0FBQTtBQUNyRSxNQUFNLENBQUMsTUFBTSw0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