/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import * as dom from '../../../../base/browser/dom.js';
import * as cssJs from '../../../../base/browser/cssValue.js';
import { Action } from '../../../../base/common/actions.js';
import { URI } from '../../../../base/common/uri.js';
import { ActionViewItem } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
export class ToggleReactionsAction extends Action {
    static { this.ID = 'toolbar.toggle.pickReactions'; }
    constructor(toggleDropdownMenu, title) {
        super(ToggleReactionsAction.ID, title || nls.localize('pickReactions', 'Pick Reactions...'), 'toggle-reactions', true);
        this._menuActions = [];
        this.toggleDropdownMenu = toggleDropdownMenu;
    }
    run() {
        this.toggleDropdownMenu();
        return Promise.resolve(true);
    }
    get menuActions() {
        return this._menuActions;
    }
    set menuActions(actions) {
        this._menuActions = actions;
    }
}
export class ReactionActionViewItem extends ActionViewItem {
    constructor(action) {
        super(null, action, {});
    }
    updateLabel() {
        if (!this.label) {
            return;
        }
        const action = this.action;
        if (action.class) {
            this.label.classList.add(action.class);
        }
        if (!action.icon) {
            const reactionLabel = dom.append(this.label, dom.$('span.reaction-label'));
            reactionLabel.innerText = action.label;
        }
        else {
            const reactionIcon = dom.append(this.label, dom.$('.reaction-icon'));
            const uri = URI.revive(action.icon);
            reactionIcon.style.backgroundImage = cssJs.asCSSUrl(uri);
        }
        if (action.count) {
            const reactionCount = dom.append(this.label, dom.$('span.reaction-count'));
            reactionCount.innerText = `${action.count}`;
        }
    }
    getTooltip() {
        const action = this.action;
        const toggleMessage = action.enabled
            ? nls.localize('comment.toggleableReaction', 'Toggle reaction, ')
            : '';
        if (action.count === undefined) {
            return nls.localize({
                key: 'comment.reactionLabelNone',
                comment: [
                    'This is a tooltip for an emoji button so that the current user can toggle their reaction to a comment.',
                    'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is the name of the reaction.',
                ],
            }, '{0}{1} reaction', toggleMessage, action.label);
        }
        else if (action.reactors === undefined || action.reactors.length === 0) {
            if (action.count === 1) {
                return nls.localize({
                    key: 'comment.reactionLabelOne',
                    comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is 1.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is the name of the reaction.',
                    ],
                }, '{0}1 reaction with {1}', toggleMessage, action.label);
            }
            else if (action.count > 1) {
                return nls.localize({
                    key: 'comment.reactionLabelMany',
                    comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is greater than 1.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second is number of users who have reacted with that reaction, and the third is the name of the reaction.',
                    ],
                }, '{0}{1} reactions with {2}', toggleMessage, action.count, action.label);
            }
        }
        else {
            if (action.reactors.length <= 10 && action.reactors.length === action.count) {
                return nls.localize({
                    key: 'comment.reactionLessThanTen',
                    comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is less than or equal to 10.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second iis a list of the reactors, and the third is the name of the reaction.',
                    ],
                }, '{0}{1} reacted with {2}', toggleMessage, action.reactors.join(', '), action.label);
            }
            else if (action.count > 1) {
                const displayedReactors = action.reactors.slice(0, 10);
                return nls.localize({
                    key: 'comment.reactionMoreThanTen',
                    comment: [
                        'This is a tooltip for an emoji that is a "reaction" to a comment where the count of the reactions is less than or equal to 10.',
                        'The emoji is also a button so that the current user can also toggle their own emoji reaction.',
                        'The first arg is localized message "Toggle reaction" or empty if the user doesn\'t have permission to toggle the reaction, the second iis a list of the reactors, and the third is the name of the reaction.',
                    ],
                }, '{0}{1} and {2} more reacted with {3}', toggleMessage, displayedReactors.join(', '), action.count - displayedReactors.length, action.label);
            }
        }
        return undefined;
    }
}
export class ReactionAction extends Action {
    static { this.ID = 'toolbar.toggle.reaction'; }
    constructor(id, label = '', cssClass = '', enabled = true, actionCallback, reactors, icon, count) {
        super(ReactionAction.ID, label, cssClass, enabled, actionCallback);
        this.reactors = reactors;
        this.icon = icon;
        this.count = count;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3Rpb25zQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvYnJvd3Nlci9yZWFjdGlvbnNBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEtBQUssR0FBRyxNQUFNLGlDQUFpQyxDQUFBO0FBQ3RELE9BQU8sS0FBSyxLQUFLLE1BQU0sc0NBQXNDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRXpGLE1BQU0sT0FBTyxxQkFBc0IsU0FBUSxNQUFNO2FBQ2hDLE9BQUUsR0FBRyw4QkFBOEIsQUFBakMsQ0FBaUM7SUFHbkQsWUFBWSxrQkFBOEIsRUFBRSxLQUFjO1FBQ3pELEtBQUssQ0FDSixxQkFBcUIsQ0FBQyxFQUFFLEVBQ3hCLEtBQUssSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLGVBQWUsRUFBRSxtQkFBbUIsQ0FBQyxFQUMzRCxrQkFBa0IsRUFDbEIsSUFBSSxDQUNKLENBQUE7UUFSTSxpQkFBWSxHQUFjLEVBQUUsQ0FBQTtRQVNuQyxJQUFJLENBQUMsa0JBQWtCLEdBQUcsa0JBQWtCLENBQUE7SUFDN0MsQ0FBQztJQUNRLEdBQUc7UUFDWCxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQTtRQUN6QixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDN0IsQ0FBQztJQUNELElBQUksV0FBVztRQUNkLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQTtJQUN6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