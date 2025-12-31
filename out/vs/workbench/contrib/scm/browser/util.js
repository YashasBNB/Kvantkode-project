/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MenuItemAction } from '../../../../platform/actions/common/actions.js';
import { Action } from '../../../../base/common/actions.js';
import { createActionViewItem, getActionBarActions, getContextMenuActions, } from '../../../../platform/actions/browser/menuEntryActionViewItem.js';
import { equals } from '../../../../base/common/arrays.js';
import { ActionViewItem, } from '../../../../base/browser/ui/actionbar/actionViewItems.js';
import { renderLabelWithIcons } from '../../../../base/browser/ui/iconLabel/iconLabels.js';
import { reset } from '../../../../base/browser/dom.js';
import { ResourceTree } from '../../../../base/common/resourceTree.js';
export function isSCMViewService(element) {
    return (Array.isArray(element.repositories) &&
        Array.isArray(element.visibleRepositories));
}
export function isSCMRepository(element) {
    return !!element.provider && !!element.input;
}
export function isSCMInput(element) {
    return !!element.validateInput && typeof element.value === 'string';
}
export function isSCMActionButton(element) {
    return element.type === 'actionButton';
}
export function isSCMResourceGroup(element) {
    return !!element.provider && !!element.resources;
}
export function isSCMResource(element) {
    return (!!element.sourceUri &&
        isSCMResourceGroup(element.resourceGroup));
}
export function isSCMResourceNode(element) {
    return ResourceTree.isResourceNode(element) && isSCMResourceGroup(element.context);
}
export function isSCMHistoryItemViewModelTreeElement(element) {
    return element.type === 'historyItemViewModel';
}
export function isSCMHistoryItemLoadMoreTreeElement(element) {
    return element.type === 'historyItemLoadMore';
}
const compareActions = (a, b) => {
    if (a instanceof MenuItemAction && b instanceof MenuItemAction) {
        return (a.id === b.id &&
            a.enabled === b.enabled &&
            a.hideActions?.isHidden === b.hideActions?.isHidden);
    }
    return a.id === b.id && a.enabled === b.enabled;
};
export function connectPrimaryMenu(menu, callback, primaryGroup) {
    let cachedPrimary = [];
    let cachedSecondary = [];
    const updateActions = () => {
        const { primary, secondary } = getActionBarActions(menu.getActions({ shouldForwardArgs: true }), primaryGroup);
        if (equals(cachedPrimary, primary, compareActions) &&
            equals(cachedSecondary, secondary, compareActions)) {
            return;
        }
        cachedPrimary = primary;
        cachedSecondary = secondary;
        callback(primary, secondary);
    };
    updateActions();
    return menu.onDidChange(updateActions);
}
export function collectContextMenuActions(menu) {
    return getContextMenuActions(menu.getActions({ shouldForwardArgs: true }), 'inline').secondary;
}
export class StatusBarAction extends Action {
    constructor(command, commandService) {
        super(`statusbaraction{${command.id}}`, command.title, '', true);
        this.command = command;
        this.commandService = commandService;
        this.tooltip = command.tooltip || '';
    }
    run() {
        return this.commandService.executeCommand(this.command.id, ...(this.command.arguments || []));
    }
}
class StatusBarActionViewItem extends ActionViewItem {
    constructor(action, options) {
        super(null, action, { ...options, icon: false, label: true });
    }
    updateLabel() {
        if (this.options.label && this.label) {
            reset(this.label, ...renderLabelWithIcons(this.action.label));
        }
    }
}
export function getActionViewItemProvider(instaService) {
    return (action, options) => {
        if (action instanceof StatusBarAction) {
            return new StatusBarActionViewItem(action, options);
        }
        return createActionViewItem(instaService, action, options);
    };
}
export function getProviderKey(provider) {
    return `${provider.contextValue}:${provider.label}${provider.rootUri ? `:${provider.rootUri.toString()}` : ''}`;
}
export function getRepositoryResourceCount(provider) {
    return provider.groups.reduce((r, g) => r + g.resources.length, 0);
}
export function getHistoryItemEditorTitle(historyItem, maxLength = 20) {
    const title = historyItem.subject.length <= maxLength
        ? historyItem.subject
        : `${historyItem.subject.substring(0, maxLength)}\u2026`;
    return `${historyItem.displayId ?? historyItem.id} - ${title}`;
}
export function compareHistoryItemRefs(ref1, ref2, currentHistoryItemRef, currentHistoryItemRemoteRef, currentHistoryItemBaseRef) {
    const getHistoryItemRefOrder = (ref) => {
        if (ref.id === currentHistoryItemRef?.id) {
            return 1;
        }
        else if (ref.id === currentHistoryItemRemoteRef?.id) {
            return 2;
        }
        else if (ref.id === currentHistoryItemBaseRef?.id) {
            return 3;
        }
        else if (ref.color !== undefined) {
            return 4;
        }
        return 99;
    };
    // Assign order (current > remote > base > color)
    const ref1Order = getHistoryItemRefOrder(ref1);
    const ref2Order = getHistoryItemRefOrder(ref2);
    return ref1Order - ref2Order;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NjbS9icm93c2VyL3V0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFpQmhHLE9BQU8sRUFBUyxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUd0RixPQUFPLEVBQUUsTUFBTSxFQUFXLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIscUJBQXFCLEdBQ3JCLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFDTixjQUFjLEdBRWQsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUcxRixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFdkQsT0FBTyxFQUFpQixZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVyRixNQUFNLFVBQVUsZ0JBQWdCLENBQUMsT0FBWTtJQUM1QyxPQUFPLENBQ04sS0FBSyxDQUFDLE9BQU8sQ0FBRSxPQUEyQixDQUFDLFlBQVksQ0FBQztRQUN4RCxLQUFLLENBQUMsT0FBTyxDQUFFLE9BQTJCLENBQUMsbUJBQW1CLENBQUMsQ0FDL0QsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZUFBZSxDQUFDLE9BQVk7SUFDM0MsT0FBTyxDQUFDLENBQUUsT0FBMEIsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFFLE9BQTBCLENBQUMsS0FBSyxDQUFBO0FBQ3JGLENBQUM7QUFFRCxNQUFNLFVBQVUsVUFBVSxDQUFDLE9BQVk7SUFDdEMsT0FBTyxDQUFDLENBQUUsT0FBcUIsQ0FBQyxhQUFh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