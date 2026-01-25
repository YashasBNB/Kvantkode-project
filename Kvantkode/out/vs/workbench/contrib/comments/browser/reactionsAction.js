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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVhY3Rpb25zQWN0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL3JlYWN0aW9uc0FjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxLQUFLLEtBQUssTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFekYsTUFBTSxPQUFPLHFCQUFzQixTQUFRLE1BQU07YUFDaEMsT0FBRSxHQUFHLDhCQUE4QixBQUFqQyxDQUFpQztJQUduRCxZQUFZLGtCQUE4QixFQUFFLEtBQWM7UUFDekQsS0FBSyxDQUNKLHFCQUFxQixDQUFDLEVBQUUsRUFDeEIsS0FBSyxJQUFJLEdBQUcsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLG1CQUFtQixDQUFDLEVBQzNELGtCQUFrQixFQUNsQixJQUFJLENBQ0osQ0FBQTtRQVJNLGlCQUFZLEdBQWMsRUFBRSxDQUFBO1FBU25DLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxrQkFBa0IsQ0FBQTtJQUM3QyxDQUFDO0lBQ1EsR0FBRztRQUNYLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ3pCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUM3QixDQUFDO0lBQ0QsSUFBSSxXQUFXO1FBQ2QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFB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