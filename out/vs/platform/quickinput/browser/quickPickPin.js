/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../base/common/codicons.js';
import { localize } from '../../../nls.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
const pinButtonClass = ThemeIcon.asClassName(Codicon.pin);
const pinnedButtonClass = ThemeIcon.asClassName(Codicon.pinned);
const buttonClasses = [pinButtonClass, pinnedButtonClass];
/**
 * Initially, adds pin buttons to all @param quickPick items.
 * When pinned, a copy of the item will be moved to the end of the pinned list and any duplicate within the pinned list will
 * be removed if @param filterDupliates has been provided. Pin and pinned button events trigger updates to the underlying storage.
 * Shows the quickpick once formatted.
 */
export function showWithPinnedItems(storageService, storageKey, quickPick, filterDuplicates) {
    const itemsWithoutPinned = quickPick.items;
    let itemsWithPinned = _formatPinnedItems(storageKey, quickPick, storageService, undefined, filterDuplicates);
    const disposables = new DisposableStore();
    disposables.add(quickPick.onDidTriggerItemButton(async (buttonEvent) => {
        const expectedButton = buttonEvent.button.iconClass && buttonClasses.includes(buttonEvent.button.iconClass);
        if (expectedButton) {
            quickPick.items = itemsWithoutPinned;
            itemsWithPinned = _formatPinnedItems(storageKey, quickPick, storageService, buttonEvent.item, filterDuplicates);
            quickPick.items = quickPick.value ? itemsWithoutPinned : itemsWithPinned;
        }
    }));
    disposables.add(quickPick.onDidChangeValue(async (value) => {
        if (quickPick.items === itemsWithPinned && value) {
            quickPick.items = itemsWithoutPinned;
        }
        else if (quickPick.items === itemsWithoutPinned && !value) {
            quickPick.items = itemsWithPinned;
        }
    }));
    quickPick.items = quickPick.value ? itemsWithoutPinned : itemsWithPinned;
    quickPick.show();
    return disposables;
}
function _formatPinnedItems(storageKey, quickPick, storageService, changedItem, filterDuplicates) {
    const formattedItems = [];
    let pinnedItems;
    if (changedItem) {
        pinnedItems = updatePinnedItems(storageKey, changedItem, storageService);
    }
    else {
        pinnedItems = getPinnedItems(storageKey, storageService);
    }
    if (pinnedItems.length) {
        formattedItems.push({
            type: 'separator',
            label: localize('terminal.commands.pinned', 'pinned'),
        });
    }
    const pinnedIds = new Set();
    for (const itemToFind of pinnedItems) {
        const itemToPin = quickPick.items.find((item) => itemsMatch(item, itemToFind));
        if (itemToPin) {
            const pinnedItemId = getItemIdentifier(itemToPin);
            const pinnedItem = { ...itemToPin };
            if (!filterDuplicates || !pinnedIds.has(pinnedItemId)) {
                pinnedIds.add(pinnedItemId);
                updateButtons(pinnedItem, false);
                formattedItems.push(pinnedItem);
            }
        }
    }
    for (const item of quickPick.items) {
        updateButtons(item, true);
        formattedItems.push(item);
    }
    return formattedItems;
}
function getItemIdentifier(item) {
    return item.type === 'separator'
        ? ''
        : item.id || `${item.label}${item.description}${item.detail}}`;
}
function updateButtons(item, removePin) {
    if (item.type === 'separator') {
        return;
    }
    // remove button classes before adding the new one
    const newButtons = item.buttons?.filter((button) => button.iconClass && !buttonClasses.includes(button.iconClass)) ?? [];
    newButtons.unshift({
        iconClass: removePin ? pinButtonClass : pinnedButtonClass,
        tooltip: removePin
            ? localize('pinCommand', 'Pin command')
            : localize('pinnedCommand', 'Pinned command'),
        alwaysVisible: false,
    });
    item.buttons = newButtons;
}
function itemsMatch(itemA, itemB) {
    return getItemIdentifier(itemA) === getItemIdentifier(itemB);
}
function updatePinnedItems(storageKey, changedItem, storageService) {
    const removePin = changedItem.buttons?.find((b) => b.iconClass === pinnedButtonClass);
    let items = getPinnedItems(storageKey, storageService);
    if (removePin) {
        items = items.filter((item) => getItemIdentifier(item) !== getItemIdentifier(changedItem));
    }
    else {
        items.push(changedItem);
    }
    storageService.store(storageKey, JSON.stringify(items), 1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
    return items;
}
function getPinnedItems(storageKey, storageService) {
    const items = storageService.get(storageKey, 1 /* StorageScope.WORKSPACE */);
    return items ? JSON.parse(items) : [];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tQaWNrUGluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vcXVpY2tpbnB1dC9icm93c2VyL3F1aWNrUGlja1Bpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRzFDLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sbUNBQW1DLENBQUE7QUFFaEYsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDekQsTUFBTSxpQkFBaUIsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtBQUMvRCxNQUFNLGFBQWEsR0FBRyxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO0FBQ3pEOzs7OztHQUtHO0FBQ0gsTUFBTSxVQUFVLG1CQUFtQixDQUNsQyxjQUErQixFQUMvQixVQUFrQixFQUNsQixTQUE4RCxFQUM5RCxnQkFBMEI7SUFFMUIsTUFBTSxrQkFBa0IsR0FBRyxTQUFTLENBQUMsS0FBSyxDQUFBO0lBQzFDLElBQUksZUFBZSxHQUFHLGtCQUFrQixDQUN2QyxVQUFVLEVBQ1YsU0FBUyxFQUNULGNBQWMsRUFDZCxTQUFTLEVBQ1QsZ0JBQWdCLENBQ2hCLENBQUE7SUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLFdBQVcsQ0FBQyxHQUFHLENBQ2QsU0FBUyxDQUFDLHNCQUFzQixDQUFDLEtBQUssRUFBRSxXQUFXLEVBQUUsRUFBRTtRQUN0RCxNQUFN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