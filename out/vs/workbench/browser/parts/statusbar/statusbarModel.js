/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isStatusbarEntryLocation, } from '../../../services/statusbar/browser/statusbar.js';
import { hide, show, isAncestorOfActiveElement } from '../../../../base/browser/dom.js';
import { Emitter } from '../../../../base/common/event.js';
export class StatusbarViewModel extends Disposable {
    static { this.HIDDEN_ENTRIES_KEY = 'workbench.statusbar.hidden'; }
    get entries() {
        return this._entries.slice(0);
    }
    get lastFocusedEntry() {
        return this._lastFocusedEntry && !this.isHidden(this._lastFocusedEntry.id)
            ? this._lastFocusedEntry
            : undefined;
    }
    constructor(storageService) {
        super();
        this.storageService = storageService;
        this._onDidChangeEntryVisibility = this._register(new Emitter());
        this.onDidChangeEntryVisibility = this._onDidChangeEntryVisibility.event;
        this._entries = []; // Intentionally not using a map here since multiple entries can have the same ID
        this.hidden = new Set();
        this.restoreState();
        this.registerListeners();
    }
    restoreState() {
        const hiddenRaw = this.storageService.get(StatusbarViewModel.HIDDEN_ENTRIES_KEY, 0 /* StorageScope.PROFILE */);
        if (hiddenRaw) {
            try {
                this.hidden = new Set(JSON.parse(hiddenRaw));
            }
            catch (error) {
                // ignore parsing errors
            }
        }
    }
    registerListeners() {
        this._register(this.storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, StatusbarViewModel.HIDDEN_ENTRIES_KEY, this._store)(() => this.onDidStorageValueChange()));
    }
    onDidStorageValueChange() {
        // Keep current hidden entries
        const currentlyHidden = new Set(this.hidden);
        // Load latest state of hidden entries
        this.hidden.clear();
        this.restoreState();
        const changed = new Set();
        // Check for each entry that is now visible
        for (const id of currentlyHidden) {
            if (!this.hidden.has(id)) {
                changed.add(id);
            }
        }
        // Check for each entry that is now hidden
        for (const id of this.hidden) {
            if (!currentlyHidden.has(id)) {
                changed.add(id);
            }
        }
        // Update visibility for entries have changed
        if (changed.size > 0) {
            for (const entry of this._entries) {
                if (changed.has(entry.id)) {
                    this.updateVisibility(entry.id, true);
                    changed.delete(entry.id);
                }
            }
        }
    }
    add(entry) {
        // Add to set of entries
        this._entries.push(entry);
        // Update visibility directly
        this.updateVisibility(entry, false);
        // Sort according to priority
        this.sort();
        // Mark first/last visible entry
        this.markFirstLastVisibleEntry();
    }
    remove(entry) {
        const index = this._entries.indexOf(entry);
        if (index >= 0) {
            // Remove from entries
            this._entries.splice(index, 1);
            // Re-sort entries if this one was used
            // as reference from other entries
            if (this._entries.some((otherEntry) => isStatusbarEntryLocation(otherEntry.priority.primary) &&
                otherEntry.priority.primary.location.id === entry.id)) {
                this.sort();
            }
            // Mark first/last visible entry
            this.markFirstLastVisibleEntry();
        }
    }
    isHidden(id) {
        return this.hidden.has(id);
    }
    hide(id) {
        if (!this.hidden.has(id)) {
            this.hidden.add(id);
            this.updateVisibility(id, true);
            this.saveState();
        }
    }
    show(id) {
        if (this.hidden.has(id)) {
            this.hidden.delete(id);
            this.updateVisibility(id, true);
            this.saveState();
        }
    }
    findEntry(container) {
        return this._entries.find((entry) => entry.container === container);
    }
    getEntries(alignment) {
        return this._entries.filter((entry) => entry.alignment === alignment);
    }
    focusNextEntry() {
        this.focusEntry(+1, 0);
    }
    focusPreviousEntry() {
        this.focusEntry(-1, this.entries.length - 1);
    }
    isEntryFocused() {
        return !!this.getFocusedEntry();
    }
    getFocusedEntry() {
        return this._entries.find((entry) => isAncestorOfActiveElement(entry.container));
    }
    focusEntry(delta, restartPosition) {
        const getVisibleEntry = (start) => {
            let indexToFocus = start;
            let entry = indexToFocus >= 0 && indexToFocus < this._entries.length
                ? this._entries[indexToFocus]
                : undefined;
            while (entry && this.isHidden(entry.id)) {
                indexToFocus += delta;
                entry =
                    indexToFocus >= 0 && indexToFocus < this._entries.length
                        ? this._entries[indexToFocus]
                        : undefined;
            }
            return entry;
        };
        const focused = this.getFocusedEntry();
        if (focused) {
            const entry = getVisibleEntry(this._entries.indexOf(focused) + delta);
            if (entry) {
                this._lastFocusedEntry = entry;
                entry.labelContainer.focus();
                return;
            }
        }
        const entry = getVisibleEntry(restartPosition);
        if (entry) {
            this._lastFocusedEntry = entry;
            entry.labelContainer.focus();
        }
    }
    updateVisibility(arg1, trigger) {
        // By identifier
        if (typeof arg1 === 'string') {
            const id = arg1;
            for (const entry of this._entries) {
                if (entry.id === id) {
                    this.updateVisibility(entry, trigger);
                }
            }
        }
        // By entry
        else {
            const entry = arg1;
            const isHidden = this.isHidden(entry.id);
            // Use CSS to show/hide item container
            if (isHidden) {
                hide(entry.container);
            }
            else {
                show(entry.container);
            }
            if (trigger) {
                this._onDidChangeEntryVisibility.fire({ id: entry.id, visible: !isHidden });
            }
            // Mark first/last visible entry
            this.markFirstLastVisibleEntry();
        }
    }
    saveState() {
        if (this.hidden.size > 0) {
            this.storageService.store(StatusbarViewModel.HIDDEN_ENTRIES_KEY, JSON.stringify(Array.from(this.hidden.values())), 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        else {
            this.storageService.remove(StatusbarViewModel.HIDDEN_ENTRIES_KEY, 0 /* StorageScope.PROFILE */);
        }
    }
    sort() {
        const allEntryIds = new Set(this._entries.map((entry) => entry.id));
        // Split up entries into 2 buckets:
        // - those with priority as number that can be compared or with a missing relative entry
        // - those with a relative priority that must be sorted relative to another entry that exists
        const mapEntryWithNumberedPriorityToIndex = new Map();
        const mapEntryWithRelativePriority = new Map();
        for (let i = 0; i < this._entries.length; i++) {
            const entry = this._entries[i];
            if (typeof entry.priority.primary === 'number' ||
                !allEntryIds.has(entry.priority.primary.location.id)) {
                mapEntryWithNumberedPriorityToIndex.set(entry, i);
            }
            else {
                const referenceEntryId = entry.priority.primary.location.id;
                let entries = mapEntryWithRelativePriority.get(referenceEntryId);
                if (!entries) {
                    // It is possible that this entry references another entry
                    // that itself references an entry. In that case, we want
                    // to add it to the entries of the referenced entry.
                    for (const relativeEntries of mapEntryWithRelativePriority.values()) {
                        if (relativeEntries.has(referenceEntryId)) {
                            entries = relativeEntries;
                            break;
                        }
                    }
                    if (!entries) {
                        entries = new Map();
                        mapEntryWithRelativePriority.set(referenceEntryId, entries);
                    }
                }
                entries.set(entry.id, entry);
            }
        }
        // Sort the entries with `priority: number` or referencing a missing entry accordingly
        const sortedEntriesWithNumberedPriority = Array.from(mapEntryWithNumberedPriorityToIndex.keys());
        sortedEntriesWithNumberedPriority.sort((entryA, entryB) => {
            if (entryA.alignment === entryB.alignment) {
                // Sort by primary/secondary priority: higher values move towards the left
                const entryAPrimaryPriority = typeof entryA.priority.primary === 'number'
                    ? entryA.priority.primary
                    : entryA.priority.primary.location.priority;
                const entryBPrimaryPriority = typeof entryB.priority.primary === 'number'
                    ? entryB.priority.primary
                    : entryB.priority.primary.location.priority;
                if (entryAPrimaryPriority !== entryBPrimaryPriority) {
                    return entryBPrimaryPriority - entryAPrimaryPriority;
                }
                if (entryA.priority.secondary !== entryB.priority.secondary) {
                    return entryB.priority.secondary - entryA.priority.secondary;
                }
                // otherwise maintain stable order (both values known to be in map)
                return (mapEntryWithNumberedPriorityToIndex.get(entryA) -
                    mapEntryWithNumberedPriorityToIndex.get(entryB));
            }
            if (entryA.alignment === 0 /* StatusbarAlignment.LEFT */) {
                return -1;
            }
            if (entryB.alignment === 0 /* StatusbarAlignment.LEFT */) {
                return 1;
            }
            return 0;
        });
        let sortedEntries;
        // Entries with location: sort in accordingly
        if (mapEntryWithRelativePriority.size > 0) {
            sortedEntries = [];
            for (const entry of sortedEntriesWithNumberedPriority) {
                const relativeEntriesMap = mapEntryWithRelativePriority.get(entry.id);
                const relativeEntries = relativeEntriesMap
                    ? Array.from(relativeEntriesMap.values())
                    : undefined;
                // Fill relative entries to LEFT
                if (relativeEntries) {
                    sortedEntries.push(...relativeEntries
                        .filter((entry) => isStatusbarEntryLocation(entry.priority.primary) &&
                        entry.priority.primary.alignment === 0 /* StatusbarAlignment.LEFT */)
                        .sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
                }
                // Fill referenced entry
                sortedEntries.push(entry);
                // Fill relative entries to RIGHT
                if (relativeEntries) {
                    sortedEntries.push(...relativeEntries
                        .filter((entry) => isStatusbarEntryLocation(entry.priority.primary) &&
                        entry.priority.primary.alignment === 1 /* StatusbarAlignment.RIGHT */)
                        .sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
                }
                // Delete from map to mark as handled
                mapEntryWithRelativePriority.delete(entry.id);
            }
            // Finally, just append all entries that reference another entry
            // that does not exist to the end of the list
            //
            // Note: this should really not happen because of our check in
            // `allEntryIds`, but we play it safe here to really consume
            // all entries.
            //
            for (const [, entries] of mapEntryWithRelativePriority) {
                sortedEntries.push(...Array.from(entries.values()).sort((entryA, entryB) => entryB.priority.secondary - entryA.priority.secondary));
            }
        }
        // No entries with relative priority: take sorted entries as is
        else {
            sortedEntries = sortedEntriesWithNumberedPriority;
        }
        // Take over as new truth of entries
        this._entries = sortedEntries;
    }
    markFirstLastVisibleEntry() {
        this.doMarkFirstLastVisibleStatusbarItem(this.getEntries(0 /* StatusbarAlignment.LEFT */));
        this.doMarkFirstLastVisibleStatusbarItem(this.getEntries(1 /* StatusbarAlignment.RIGHT */));
    }
    doMarkFirstLastVisibleStatusbarItem(entries) {
        let firstVisibleItem;
        let lastVisibleItem;
        for (const entry of entries) {
            // Clear previous first
            entry.container.classList.remove('first-visible-item', 'last-visible-item');
            const isVisible = !this.isHidden(entry.id);
            if (isVisible) {
                if (!firstVisibleItem) {
                    firstVisibleItem = entry;
                }
                lastVisibleItem = entry;
            }
        }
        // Mark: first visible item
        firstVisibleItem?.container.classList.add('first-visible-item');
        // Mark: last visible item
        lastVisibleItem?.container.classList.add('last-visible-item');
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhdHVzYmFyTW9kZWwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9wYXJ0cy9zdGF0dXNiYXIvc3RhdHVzYmFyTW9kZWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSxrREFBa0QsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSx5QkFBeUIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBTXZGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQWExRCxNQUFNLE9BQU8sa0JBQW1CLFNBQVEsVUFBVTthQUN6Qix1QkFBa0IsR0FBRyw0QkFBNEIsQUFBL0IsQ0FBK0I7SUFRekUsSUFBSSxPQUFPO1FBQ1YsT0FBTyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM5QixDQUFDO0lBR0QsSUFBSSxnQkFBZ0I7UUFDbkIsT0FBTyxJQUFJLENBQUMsaUJBQWlCLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLENBQUM7WUFDekUsQ0FBQyxDQUFDLElBQUksQ0FBQyxpQkFBaUI7WUFDeEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQTtJQUNiLENBQUM7SUFJRCxZQUE2QixjQUErQjtRQUMzRCxLQUFLLEVBQUUsQ0FBQTtRQURxQixtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7UUFuQjNDLGdDQUEyQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVELElBQUksT0FBTyxFQUFvQyxDQUMvQyxDQUFBO1FBQ1EsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLDJCQUEyQixD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