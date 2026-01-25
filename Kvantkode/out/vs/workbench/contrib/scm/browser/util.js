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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXRpbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvdXRpbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWlCaEcsT0FBTyxFQUFTLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBR3RGLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRzFGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV2RCxPQUFPLEVBQWlCLFlBQVksRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRXJGLE1BQU0sVUFBVSxnQkFBZ0IsQ0FBQyxPQUFZO0lBQzVDLE9BQU8sQ0FDTixLQUFLLENBQUMsT0FBTyxDQUFFLE9BQTJCLENBQUMsWUFBWSxDQUFDO1FBQ3hELEtBQUssQ0FBQyxPQUFPLENBQUUsT0FBMkIsQ0FBQyxtQkFBbUIsQ0FBQyxDQUMvRCxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxlQUFlLENBQUMsT0FBWTtJQUMzQyxPQUFPLENBQUMsQ0FBRSxPQUEwQixDQUFDLFFBQVEsSUFBSSxDQUFDLENBQUUsT0FBMEIsQ0FBQyxLQUFLLENBQUE7QUFDckYsQ0FBQztBQUVELE1BQU0sVUFBVSxVQUFVLENBQUMsT0FBWTtJQUN0QyxPQUFPLENBQUMsQ0FBRSxPQUFxQixDQUFD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