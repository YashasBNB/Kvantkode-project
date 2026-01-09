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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tQaWNrUGluLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tQaWNrUGluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFHMUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVoRixNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQTtBQUN6RCxNQUFNLGlCQUFpQixHQUFHLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0FBQy9ELE1BQU0sYUFBYSxHQUFHLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUE7QUFDekQ7Ozs7O0dBS0c7QUFDSCxNQUFNLFVBQVUsbUJBQW1CLENBQ2xDLGNBQStCLEVBQy9CLFVBQWtCLEVBQ2xCLFNBQThELEVBQzlELGdCQUEwQjtJQUUxQixNQUFNLGtCQUFrQixHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUE7SUFDMUMsSUFBSSxlQUFlLEdBQUcsa0JBQWtCLENBQ3ZDLFVBQVUsRUFDVixTQUFTLEVBQ1QsY0FBYyxFQUNkLFNBQVMsRUFDVCxnQkFBZ0IsQ0FDaEIsQ0FBQTtJQUNELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFDekMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxTQUFTLENBQUMsc0JBQXNCLENBQUMsS0FBSyxFQUFFLFdBQVcsRUFBRSxFQUFFO1FBQ3RELE1BQU0sY0FBYyxHQUNuQixXQUFXLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxhQUFhLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDckYsSUFBSSxjQUFjLEVBQUUsQ0FBQztZQUNwQixTQUFTLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFBO1lBQ3BDLGVBQWUsR0FBRyxrQkFBa0IsQ0FDbkMsVUFBVSxFQUNWLFNBQVMsRUFDVCxjQUFjLEVBQ2QsV0FBVyxDQUFDLElBQUksRUFDaEIsZ0JBQWdCLENBQ2hCLENBQUE7WUFDRCxTQUFTLENBQUMsS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUE7UUFDekUsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRCxXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUU7UUFDMUMsSUFBSSxTQUFTLENBQUMsS0FBSyxLQUFLLGVBQWUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNsRCxTQUFTLENBQUMsS0FBSyxHQUFHLGtCQUFrQixDQUFBO1FBQ3JDLENBQUM7YUFBTSxJQUFJLFNBQVMsQ0FBQyxLQUFLLEtBQUssa0JBQWtCLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUM3RCxTQUFTLENBQUMsS0FBSyxHQUFHLGVBQWUsQ0FBQTtRQUNsQyxDQUFDO0lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUVELFNBQVMsQ0FBQyxLQUFLLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQTtJQUN4RSxTQUFTLENBQUMsSUFBSSxFQUFFLENBQUE7SUFDaEIsT0FBTyxXQUFXLENBQUE7QUFDbkIsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQzFCLFVBQWtCLEVBQ2xCLFNBQThELEVBQzlELGNBQStCLEVBQy9CLFdBQTRCLEVBQzVCLGdCQUEwQjtJQUUxQixNQUFNLGNBQWMsR0FBb0IsRUFBRSxDQUFBO0lBQzFDLElBQUksV0FBVyxDQUFBO0lBQ2YsSUFBSSxXQUFXLEVBQUUsQ0FBQztRQUNqQixXQUFXLEdBQUcsaUJBQWlCLENBQUMsVUFBVSxFQUFFLFdBQVcsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUN6RSxDQUFDO1NBQU0sQ0FBQztRQUNQLFdBQVcsR0FBRyxjQUFjLENBQUMsVUFBVSxFQUFFLGNBQWMsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFDRCxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztRQUN4QixjQUFjLENBQUMsSUFBSSxDQUFDO1lBQ25CLElBQUksRUFBRSxXQUFXO1lBQ2pCLEtBQUssRUFBRSxRQUFRLENBQUMsMEJBQTBCLEVBQUUsUUFBUSxDQUFDO1NBQ3JELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxNQUFNLFNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFBO0lBQzNCLEtBQUssTUFBTSxVQUFVLElBQUksV0FBVyxFQUFFLENBQUM7UUFDdEMsTUFBTSxTQUFTLEdBQUcsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUM5RSxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDakQsTUFBTSxVQUFVLEdBQW1CLEVBQUUsR0FBSSxTQUE0QixFQUFFLENBQUE7WUFDdkUsSUFBSSxDQUFDLGdCQUFnQixJQUFJLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO2dCQUN2RCxTQUFTLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO2dCQUMzQixhQUFhLENBQUMsVUFBVSxFQUFFLEtBQUssQ0FBQyxDQUFBO2dCQUNoQyxjQUFjLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1lBQ2hDLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssTUFBTSxJQUFJLElBQUksU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BDLGFBQWEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDekIsY0FBYyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUMxQixDQUFDO0lBQ0QsT0FBTyxjQUFjLENBQUE7QUFDdEIsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBbUI7SUFDN0MsT0FBTyxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVc7UUFDL0IsQ0FBQyxDQUFDLEVBQUU7UUFDSixDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUE7QUFDaEUsQ0FBQztBQUVELFNBQVMsYUFBYSxDQUFDLElBQW1CLEVBQUUsU0FBa0I7SUFDN0QsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLFdBQVcsRUFBRSxDQUFDO1FBQy9CLE9BQU07SUFDUCxDQUFDO0lBRUQsa0RBQWtEO0lBQ2xELE1BQU0sVUFBVSxHQUNmLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUNuQixDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLFNBQVMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUN6RSxJQUFJLEVBQUUsQ0FBQTtJQUNSLFVBQVUsQ0FBQyxPQUFPLENBQUM7UUFDbEIsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7UUFDekQsT0FBTyxFQUFFLFNBQVM7WUFDakIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsYUFBYSxDQUFDO1lBQ3ZDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDO1FBQzlDLGFBQWEsRUFBRSxLQUFLO0tBQ3BCLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyxPQUFPLEdBQUcsVUFBVSxDQUFBO0FBQzFCLENBQUM7QUFFRCxTQUFTLFVBQVUsQ0FBQyxLQUFvQixFQUFFLEtBQW9CO0lBQzdELE9BQU8saUJBQWlCLENBQUMsS0FBSyxDQUFDLEtBQUssaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDN0QsQ0FBQztBQUVELFNBQVMsaUJBQWlCLENBQ3pCLFVBQWtCLEVBQ2xCLFdBQTJCLEVBQzNCLGNBQStCO0lBRS9CLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxLQUFLLGlCQUFpQixDQUFDLENBQUE7SUFDckYsSUFBSSxLQUFLLEdBQUcsY0FBYyxDQUFDLFVBQVUsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUN0RCxJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsS0FBSyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxLQUFLLGlCQUFpQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUE7SUFDM0YsQ0FBQztTQUFNLENBQUM7UUFDUCxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO0lBQ3hCLENBQUM7SUFDRCxjQUFjLENBQUMsS0FBSyxDQUNuQixVQUFVLEVBQ1YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsZ0VBR3JCLENBQUE7SUFDRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxTQUFTLGNBQWMsQ0FBQyxVQUFrQixFQUFFLGNBQStCO0lBQzFFLE1BQU0sS0FBSyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsVUFBVSxpQ0FBeUIsQ0FBQTtJQUNwRSxPQUFPLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFBO0FBQ3RDLENBQUMifQ==