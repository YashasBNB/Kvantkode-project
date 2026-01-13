/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as DOM from '../../../../base/browser/dom.js';
import { Toggle } from '../../../../base/browser/ui/toggle/toggle.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { defaultToggleStyles } from '../../../../platform/theme/browser/defaultStyles.js';
export class CheckboxStateHandler extends Disposable {
    constructor() {
        super(...arguments);
        this._onDidChangeCheckboxState = this._register(new Emitter());
        this.onDidChangeCheckboxState = this._onDidChangeCheckboxState.event;
    }
    setCheckboxState(node) {
        this._onDidChangeCheckboxState.fire([node]);
    }
}
export class TreeItemCheckbox extends Disposable {
    static { this.checkboxClass = 'custom-view-tree-node-item-checkbox'; }
    constructor(container, checkboxStateHandler, hoverDelegate, hoverService) {
        super();
        this.checkboxStateHandler = checkboxStateHandler;
        this.hoverDelegate = hoverDelegate;
        this.hoverService = hoverService;
        this.checkboxContainer = container;
    }
    render(node) {
        if (node.checkbox) {
            if (!this.toggle) {
                this.createCheckbox(node);
            }
            else {
                this.toggle.checked = node.checkbox.isChecked;
                this.toggle.setIcon(this.toggle.checked ? Codicon.check : undefined);
            }
        }
    }
    createCheckbox(node) {
        if (node.checkbox) {
            this.toggle = new Toggle({
                isChecked: node.checkbox.isChecked,
                title: '',
                icon: node.checkbox.isChecked ? Codicon.check : undefined,
                ...defaultToggleStyles,
            });
            this.setHover(node.checkbox);
            this.setAccessibilityInformation(node.checkbox);
            this.toggle.domNode.classList.add(TreeItemCheckbox.checkboxClass);
            this.toggle.domNode.tabIndex = 1;
            DOM.append(this.checkboxContainer, this.toggle.domNode);
            this.registerListener(node);
        }
    }
    registerListener(node) {
        if (this.toggle) {
            this._register({ dispose: () => this.removeCheckbox() });
            this._register(this.toggle);
            this._register(this.toggle.onChange(() => {
                this.setCheckbox(node);
            }));
        }
    }
    setHover(checkbox) {
        if (this.toggle) {
            if (!this.hover) {
                this.hover = this._register(this.hoverService.setupManagedHover(this.hoverDelegate, this.toggle.domNode, this.checkboxHoverContent(checkbox)));
            }
            else {
                this.hover.update(checkbox.tooltip);
            }
        }
    }
    setCheckbox(node) {
        if (this.toggle && node.checkbox) {
            node.checkbox.isChecked = this.toggle.checked;
            this.toggle.setIcon(this.toggle.checked ? Codicon.check : undefined);
            this.setHover(node.checkbox);
            this.setAccessibilityInformation(node.checkbox);
            this.checkboxStateHandler.setCheckboxState(node);
        }
    }
    checkboxHoverContent(checkbox) {
        return checkbox.tooltip
            ? checkbox.tooltip
            : checkbox.isChecked
                ? localize('checked', 'Checked')
                : localize('unchecked', 'Unchecked');
    }
    setAccessibilityInformation(checkbox) {
        if (this.toggle && checkbox.accessibilityInformation) {
            this.toggle.domNode.ariaLabel = checkbox.accessibilityInformation.label;
            if (checkbox.accessibilityInformation.role) {
                this.toggle.domNode.role = checkbox.accessibilityInformation.role;
            }
        }
    }
    removeCheckbox() {
        const children = this.checkboxContainer.children;
        for (const child of children) {
            child.remove();
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tib3guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL3ZpZXdzL2NoZWNrYm94LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFHdEQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUd6RixNQUFNLE9BQU8sb0JBQXFCLFNBQVEsVUFBVTtJQUFwRDs7UUFDa0IsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBZSxDQUFDLENBQUE7UUFDOUUsNkJBQXdCLEdBQXVCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLENBQUE7SUFLN0YsQ0FBQztJQUhPLGdCQUFnQixDQUFDLElBQWU7UUFDdEMsSUFBSSxDQUFDLHlCQUF5QixDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLFVBQVU7YUFLeEIsa0JBQWEsR0FBRyxxQ0FBcUMsQ0FBQTtJQUU1RSxZQUNDLFNBQXNCLEVBQ0wsb0JBQTBDLEVBQzFDLGFBQTZCLEVBQzdCLFlBQTJCO1FBRTVDLEtBQUssRUFBRSxDQUFBO1FBSlUseUJBQW9CLEdBQXBCLG9CQUFvQixDQUFzQjtRQUMxQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFDN0IsaUJBQVksR0FBWixZQUFZLENBQWU7UUFHNUMsSUFBSSxDQUFDLGlCQUFpQixHQUFtQixTQUFTLENBQUE7SUFDbkQsQ0FBQztJQUVNLE1BQU0sQ0FBQyxJQUFlO1FBQzVCLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDMUIsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFBO2dCQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDckUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYyxDQUFDLElBQWU7UUFDckMsSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbkIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQztnQkFDeEIsU0FBUyxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUztnQkFDbEMsS0FBSyxFQUFFLEVBQUU7Z0JBQ1QsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTO2dCQUN6RCxHQUFHLG1CQUFtQjthQUN0QixDQUFDLENBQUE7WUFDRixJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUM1QixJQUFJLENBQUMsMkJBQTJCLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQy9DLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDakUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQTtZQUNoQyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3ZELElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGdCQUFnQixDQUFDLElBQWU7UUFDdkMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQ3hELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUN6QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFFBQVEsQ0FBQyxRQUFnQztRQUNoRCxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzFCLElBQUksQ0FBQyxZQUFZLENBQUMsaUJBQWlCLENBQ2xDLElBQUksQ0FBQyxhQUFhLEVBQ2xCLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUNuQixJQUFJLENBQUMsb0JBQW9CLENBQUMsUUFBUSxDQUFDLENBQ25DLENBQ0QsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDcEMsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sV0FBVyxDQUFDLElBQWU7UUFDbEMsSUFBSSxJQUFJLENBQUMsTUFBTSxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQTtZQUM3QyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDcEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFFNUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7SUFFTyxvQkFBb0IsQ0FBQyxRQUFnQztRQUM1RCxPQUFPLFFBQVEsQ0FBQyxPQUFPO1lBQ3RCLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTztZQUNsQixDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVM7Z0JBQ25CLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQztnQkFDaEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVPLDJCQUEyQixDQUFDLFFBQWdDO1FBQ25FLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFDLHdCQUF3QixDQUFDLEtBQUssQ0FBQTtZQUN2RSxJQUFJLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUE7WUFDbEUsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRU8sY0FBYztRQUNyQixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFBO1FBQ2hELEtBQUssTUFBTSxLQUFLLElBQUksUUFBUSxFQUFFLENBQUM7WUFDOUIsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsQ0FBQztJQUNGLENBQUMifQ==