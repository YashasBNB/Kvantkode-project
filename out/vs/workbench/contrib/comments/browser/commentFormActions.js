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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudEZvcm1BY3Rpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9jb21tZW50Rm9ybUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxZQUFZLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDbkYsT0FBTyxFQUFTLGlCQUFpQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFJekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFHekYsTUFBTSxPQUFPLGtCQUFrQjtJQUs5QixZQUNrQixpQkFBcUMsRUFDckMsaUJBQXFDLEVBQ3JDLGtCQUF1QyxFQUNoRCxTQUFzQixFQUN0QixhQUF3QyxFQUMvQixVQUFtQixFQUNuQixnQkFBMEI7UUFOMUIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUNyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBcUI7UUFDaEQsY0FBUyxHQUFULFNBQVMsQ0FBYTtRQUN0QixrQkFBYSxHQUFiLGFBQWEsQ0FBMkI7UUFDL0IsZUFBVSxHQUFWLFVBQVUsQ0FBUztRQUNuQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQVU7UUFYcEMsb0JBQWUsR0FBa0IsRUFBRSxDQUFBO1FBQzFCLGVBQVUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzNDLGFBQVEsR0FBYyxFQUFFLENBQUE7SUFVN0IsQ0FBQztJQUVKLFVBQVUsQ0FBQyxJQUFXLEVBQUUsMEJB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