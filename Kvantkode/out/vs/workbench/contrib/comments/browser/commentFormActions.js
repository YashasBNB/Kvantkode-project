/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Button, ButtonWithDropdown } from '../../../../base/browser/ui/button/button.js';
import { ActionRunner } from '../../../../base/common/actions.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { SubmenuItemAction } from '../../../../platform/actions/common/actions.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';
export class CommentFormActions {
    constructor(keybindingService, contextKeyService, contextMenuService, container, actionHandler, maxActions, supportDropdowns) {
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
        this.contextMenuService = contextMenuService;
        this.container = container;
        this.actionHandler = actionHandler;
        this.maxActions = maxActions;
        this.supportDropdowns = supportDropdowns;
        this._buttonElements = [];
        this._toDispose = new DisposableStore();
        this._actions = [];
    }
    setActions(menu, hasOnlySecondaryActions = false) {
        this._toDispose.clear();
        this._buttonElements.forEach((b) => b.remove());
        this._buttonElements = [];
        const groups = menu.getActions({ shouldForwardArgs: true });
        let isPrimary = !hasOnlySecondaryActions;
        for (const group of groups) {
            const [, actions] = group;
            this._actions = actions;
            for (const current of actions) {
                const dropDownActions = this.supportDropdowns && current instanceof SubmenuItemAction ? current.actions : [];
                const action = dropDownActions.length ? dropDownActions[0] : current;
                let keybinding = this.keybindingService
                    .lookupKeybinding(action.id, this.contextKeyService)
                    ?.getLabel();
                if (!keybinding && isPrimary) {
                    keybinding = this.keybindingService
                        .lookupKeybinding("editor.action.submitComment" /* CommentCommandId.Submit */, this.contextKeyService)
                        ?.getLabel();
                }
                const title = keybinding ? `${action.label} (${keybinding})` : action.label;
                const actionHandler = this.actionHandler;
                const button = dropDownActions.length
                    ? new ButtonWithDropdown(this.container, {
                        contextMenuProvider: this.contextMenuService,
                        actions: dropDownActions,
                        actionRunner: this._toDispose.add(new (class extends ActionRunner {
                            async runAction(action, context) {
                                return actionHandler(action);
                            }
                        })()),
                        secondary: !isPrimary,
                        title,
                        addPrimaryActionToDropdown: false,
                        ...defaultButtonStyles,
                    })
                    : new Button(this.container, { secondary: !isPrimary, title, ...defaultButtonStyles });
                isPrimary = false;
                this._buttonElements.push(button.element);
                this._toDispose.add(button);
                this._toDispose.add(button.onDidClick(() => this.actionHandler(action)));
                button.enabled = action.enabled;
                button.label = action.label;
                if (this.maxActions !== undefined && this._buttonElements.length >= this.maxActions) {
                    console.warn(`An extension has contributed more than the allowable number of actions to a comments menu.`);
                    return;
                }
            }
        }
    }
    triggerDefaultAction() {
        if (this._actions.length) {
            const lastAction = this._actions[0];
            if (lastAction.enabled) {
                return this.actionHandler(lastAction);
            }
        }
    }
    dispose() {
        this._toDispose.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudEZvcm1BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRGb3JtQWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsTUFBTSxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDekYsT0FBTyxFQUFFLFlBQVksRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRixPQUFPLEVBQVMsaUJBQWlCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUl6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUd6RixNQUFNLE9BQU8sa0JBQWtCO0lBSzlCLFlBQ2tCLGlCQUFxQyxFQUNyQyxpQkFBcUMsRUFDckMsa0JBQXVDLEVBQ2hELFNBQXNCLEVBQ3RCLGFBQXdDLEVBQy9CLFVBQW1CLEVBQ25CLGdCQUEwQjtRQU4xQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFxQjtRQUNoRCxjQUFTLEdBQVQsU0FBUyxDQUFhO1FBQ3RCLGtCQUFhLEdBQWIsYUFBYSxDQUEyQjtRQUMvQixlQUFVLEdBQVYsVUFBVSxDQUFTO1FBQ25CLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBVTtRQVhwQyxvQkFBZSxHQUFrQixFQUFFLENBQUE7UUFDMUIsZUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDM0MsYUFBUSxHQUFjLEVBQUUsQ0FBQTtJQVU3QixDQUFDO0lBRUosVUFBVSxDQUFDLElBQVcsRUFB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