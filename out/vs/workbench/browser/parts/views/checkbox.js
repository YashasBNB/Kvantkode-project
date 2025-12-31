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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hlY2tib3guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy92aWV3cy9jaGVja2JveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBR3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFHekYsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFBcEQ7O1FBQ2tCLDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQWUsQ0FBQyxDQUFBO1FBQzlFLDZCQUF3QixHQUF1QixJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO0lBSzdGLENBQUM7SUFITyxnQkFBZ0IsQ0FBQyxJQUFlO1FBQ3RDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxnQkFBaUIsU0FBUSxVQUFVO2FBS3hCLGtCQUFhLEdBQUcscUNBQXFDLENBQUE7SUFFNUUsWUFDQyxTQUFzQixFQUNMLG9CQUEwQyxFQUMxQyxhQUE2QixFQUM3QixZQUEyQjtRQUU1QyxLQUFLLEVBQUUsQ0FBQTtRQUpVLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBc0I7UUFDMUMsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzdCLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBRzVDLElBQUksQ0FBQyxpQkFBaUIsR0FBbUIsU0FBUyxDQUFBO0lBQ25ELENBQUM7SUFFTSxNQUFNLENBQUMsSUFBZTtRQUM1QixJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNuQixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNsQixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzFCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQTtnQkFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3JFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWMsQ0FBQyxJQUFlO1FBQ3JDLElBQUksSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ25CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSxNQUFNLENBQUM7Z0JBQ3hCLFNBQVMsRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVM7Z0JBQ2xDLEtBQUssRUFBRSxFQUFFO2dCQUNULElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUztnQkFDekQsR0FBRyxtQkFBbUI7YUFDdEIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDNUIsSUFBSSxDQUFDLDJCQUEyQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtZQUMvQyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQ2pFLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUE7WUFDaEMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUN2RCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDNUIsQ0FBQztJQUNGLENBQUM7SUFFTyxnQkFBZ0IsQ0FBQyxJQUFlO1FBQ3ZDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUN4RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFBRTtnQkFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUN2QixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxRQUFRLENBQUMsUUFBZ0M7UUFDaEQsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsU0FBUyxDQUMxQixJQUFJLENBQUMsWUFBWSxDQUFDLGlCQUFpQixDQUNsQyxJQUFJLENBQUMsYUFBYSxFQUNsQixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFDbkIsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FBQyxDQUNuQyxDQUNELENBQUE7WUFDRixDQUFDO2lCQUFNLENBQUM7Z0JBQ1AsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLFdBQVcsQ0FBQyxJQUFlO1FBQ2xDLElBQUksSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDbEMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUE7WUFDN0MsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3BFLElBQUksQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBRTVCLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDL0MsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRU8sb0JBQW9CLENBQUMsUUFBZ0M7UUFDNUQsT0FBTyxRQUFRLENBQUMsT0FBTztZQUN0QixDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU87WUFDbEIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTO2dCQUNuQixDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsRUFBRSxTQUFTLENBQUM7Z0JBQ2hDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFTywyQkFBMkIsQ0FBQyxRQUFnQztRQUNuRSxJQUFJLElBQUksQ0FBQyxNQUFNLElBQUksUUFBUSxDQUFDLHdCQUF3QixFQUFFLENBQUM7WUFDdEQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsU0FBUyxHQUFHLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLENBQUE7WUFDdkUsSUFBSSxRQUFRLENBQUMsd0JBQXdCLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQzVDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFBO1lBQ2xFLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLGNBQWM7UUFDckIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQTtRQUNoRCxLQUFLLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQzlCLEtBQUssQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNmLENBQUM7SUFDRixDQUFDIn0=