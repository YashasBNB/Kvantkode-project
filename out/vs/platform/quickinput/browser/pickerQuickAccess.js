/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { timeout } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Disposable, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { isFunction } from '../../../base/common/types.js';
export var TriggerAction;
(function (TriggerAction) {
    /**
     * Do nothing after the button was clicked.
     */
    TriggerAction[TriggerAction["NO_ACTION"] = 0] = "NO_ACTION";
    /**
     * Close the picker.
     */
    TriggerAction[TriggerAction["CLOSE_PICKER"] = 1] = "CLOSE_PICKER";
    /**
     * Update the results of the picker.
     */
    TriggerAction[TriggerAction["REFRESH_PICKER"] = 2] = "REFRESH_PICKER";
    /**
     * Remove the item from the picker.
     */
    TriggerAction[TriggerAction["REMOVE_ITEM"] = 3] = "REMOVE_ITEM";
})(TriggerAction || (TriggerAction = {}));
function isPicksWithActive(obj) {
    const candidate = obj;
    return Array.isArray(candidate.items);
}
function isFastAndSlowPicks(obj) {
    const candidate = obj;
    return !!candidate.picks && candidate.additionalPicks instanceof Promise;
}
export class PickerQuickAccessProvider extends Disposable {
    constructor(prefix, options) {
        super();
        this.prefix = prefix;
        this.options = options;
    }
    provide(picker, token, runOptions) {
        const disposables = new DisposableStore();
        // Apply options if any
        picker.canAcceptInBackground = !!this.options?.canAcceptInBackground;
        // Disable filtering & sorting, we control the results
        picker.matchOnLabel =
            picker.matchOnDescription =
                picker.matchOnDetail =
                    picker.sortByLabel =
                        false;
        // Set initial picks and update on type
        let picksCts = undefined;
        const picksDisposable = disposables.add(new MutableDisposable());
        const updatePickerItems = async () => {
            const picksDisposables = (picksDisposable.value = new DisposableStore());
            // Cancel any previous ask for picks and busy
            picksCts?.dispose(true);
            picker.busy = false;
            // Create new cancellation source for this run
            picksCts = picksDisposables.add(new CancellationTokenSource(token));
            // Collect picks and support both long running and short or combined
            const picksToken = picksCts.token;
            let picksFilter = picker.value.substring(this.prefix.length);
            if (!this.options?.shouldSkipTrimPickFilter) {
                picksFilter = picksFilter.trim();
            }
            const providedPicks = this._getPicks(picksFilter, picksDisposables, picksToken, runOptions);
            const applyPicks = (picks, skipEmpty) => {
                let items;
                let activeItem = undefined;
                if (isPicksWithActive(picks)) {
                    items = picks.items;
                    activeItem = picks.active;
                }
                else {
                    items = picks;
                }
                if (items.length === 0) {
                    if (skipEmpty) {
                        return false;
                    }
                    // We show the no results pick if we have no input to prevent completely empty pickers #172613
                    if ((picksFilter.length > 0 || picker.hideInput) && this.options?.noResultsPick) {
                        if (isFunction(this.options.noResultsPick)) {
                            items = [this.options.noResultsPick(picksFilter)];
                        }
                        else {
                            items = [this.options.noResultsPick];
                        }
                    }
                }
                picker.items = items;
                if (activeItem) {
                    picker.activeItems = [activeItem];
                }
                return true;
            };
            const applyFastAndSlowPicks = async (fastAndSlowPicks) => {
                let fastPicksApplied = false;
                let slowPicksApplied = false;
                await Promise.all([
                    // Fast Picks: if `mergeDelay` is configured, in order to reduce
                    // amount of flicker, we race against the slow picks over some delay
                    // and then set the fast picks.
                    // If the slow picks are faster, we reduce the flicker by only
                    // setting the items once.
                    (async () => {
                        if (typeof fastAndSlowPicks.mergeDelay === 'number') {
                            await timeout(fastAndSlowPicks.mergeDelay);
                            if (picksToken.isCancellationRequested) {
                                return;
                            }
                        }
                        if (!slowPicksApplied) {
                            fastPicksApplied = applyPicks(fastAndSlowPicks.picks, true /* skip over empty to reduce flicker */);
                        }
                    })(),
                    // Slow Picks: we await the slow picks and then set them at
                    // once together with the fast picks, but only if we actually
                    // have additional results.
                    (async () => {
                        picker.busy = true;
                        try {
                            const awaitedAdditionalPicks = await fastAndSlowPicks.additionalPicks;
                            if (picksToken.isCancellationRequested) {
                                return;
                            }
                            let picks;
                            let activePick = undefined;
                            if (isPicksWithActive(fastAndSlowPicks.picks)) {
                                picks = fastAndSlowPicks.picks.items;
                                activePick = fastAndSlowPicks.picks.active;
                            }
                            else {
                                picks = fastAndSlowPicks.picks;
                            }
                            let additionalPicks;
                            let additionalActivePick = undefined;
                            if (isPicksWithActive(awaitedAdditionalPicks)) {
                                additionalPicks = awaitedAdditionalPicks.items;
                                additionalActivePick = awaitedAdditionalPicks.active;
                            }
                            else {
                                additionalPicks = awaitedAdditionalPicks;
                            }
                            if (additionalPicks.length > 0 || !fastPicksApplied) {
                                // If we do not have any activePick or additionalActivePick
                                // we try to preserve the currently active pick from the
                                // fast results. This fixes an issue where the user might
                                // have made a pick active before the additional results
                                // kick in.
                                // See https://github.com/microsoft/vscode/issues/102480
                                let fallbackActivePick = undefined;
                                if (!activePick && !additionalActivePick) {
                                    const fallbackActivePickCandidate = picker.activeItems[0];
                                    if (fallbackActivePickCandidate &&
                                        picks.indexOf(fallbackActivePickCandidate) !== -1) {
                                        fallbackActivePick = fallbackActivePickCandidate;
                                    }
                                }
                                applyPicks({
                                    items: [...picks, ...additionalPicks],
                                    active: activePick || additionalActivePick || fallbackActivePick,
                                });
                            }
                        }
                        finally {
                            if (!picksToken.isCancellationRequested) {
                                picker.busy = false;
                            }
                            slowPicksApplied = true;
                        }
                    })(),
                ]);
            };
            // No Picks
            if (providedPicks === null) {
                // Ignore
            }
            // Fast and Slow Picks
            else if (isFastAndSlowPicks(providedPicks)) {
                await applyFastAndSlowPicks(providedPicks);
            }
            // Fast Picks
            else if (!(providedPicks instanceof Promise)) {
                applyPicks(providedPicks);
            }
            // Slow Picks
            else {
                picker.busy = true;
                try {
                    const awaitedPicks = await providedPicks;
                    if (picksToken.isCancellationRequested) {
                        return;
                    }
                    if (isFastAndSlowPicks(awaitedPicks)) {
                        await applyFastAndSlowPicks(awaitedPicks);
                    }
                    else {
                        applyPicks(awaitedPicks);
                    }
                }
                finally {
                    if (!picksToken.isCancellationRequested) {
                        picker.busy = false;
                    }
                }
            }
        };
        disposables.add(picker.onDidChangeValue(() => updatePickerItems()));
        updatePickerItems();
        // Accept the pick on accept and hide picker
        disposables.add(picker.onDidAccept((event) => {
            if (runOptions?.handleAccept) {
                if (!event.inBackground) {
                    picker.hide(); // hide picker unless we accept in background
                }
                runOptions.handleAccept?.(picker.activeItems[0], event.inBackground);
                return;
            }
            const [item] = picker.selectedItems;
            if (typeof item?.accept === 'function') {
                if (!event.inBackground) {
                    picker.hide(); // hide picker unless we accept in background
                }
                item.accept(picker.keyMods, event);
            }
        }));
        const buttonTrigger = async (button, item) => {
            if (typeof item.trigger !== 'function') {
                return;
            }
            const buttonIndex = item.buttons?.indexOf(button) ?? -1;
            if (buttonIndex >= 0) {
                const result = item.trigger(buttonIndex, picker.keyMods);
                const action = typeof result === 'number' ? result : await result;
                if (token.isCancellationRequested) {
                    return;
                }
                switch (action) {
                    case TriggerAction.NO_ACTION:
                        break;
                    case TriggerAction.CLOSE_PICKER:
                        picker.hide();
                        break;
                    case TriggerAction.REFRESH_PICKER:
                        updatePickerItems();
                        break;
                    case TriggerAction.REMOVE_ITEM: {
                        const index = picker.items.indexOf(item);
                        if (index !== -1) {
                            const items = picker.items.slice();
                            const removed = items.splice(index, 1);
                            const activeItems = picker.activeItems.filter((activeItem) => activeItem !== removed[0]);
                            const keepScrollPositionBefore = picker.keepScrollPosition;
                            picker.keepScrollPosition = true;
                            picker.items = items;
                            if (activeItems) {
                                picker.activeItems = activeItems;
                            }
                            picker.keepScrollPosition = keepScrollPositionBefore;
                        }
                        break;
                    }
                }
            }
        };
        // Trigger the pick with button index if button triggered
        disposables.add(picker.onDidTriggerItemButton(({ button, item }) => buttonTrigger(button, item)));
        disposables.add(picker.onDidTriggerSeparatorButton(({ button, separator }) => buttonTrigger(button, separator)));
        return disposables;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlja2VyUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcGlja2VyUXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixpQkFBaUIsR0FDakIsTUFBTSxtQ0FBbUMsQ0FBQTtBQVUxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFMUQsTUFBTSxDQUFOLElBQVksYUFvQlg7QUFwQkQsV0FBWSxhQUFhO0lBQ3hCOztPQUVHO0lBQ0gsMkRBQVMsQ0FBQTtJQUVUOztPQUVHO0lBQ0gsaUVBQVksQ0FBQTtJQUVaOztPQUVHO0lBQ0gscUVBQWMsQ0FBQTtJQUVkOztPQUVHO0lBQ0gsK0RBQVcsQ0FBQTtBQUNaLENBQUMsRUFwQlcsYUFBYSxLQUFiLGFBQWEsUUFvQnhCO0FBaUZELFNBQVMsaUJBQWlCLENBQUksR0FBWTtJQUN6QyxNQUFNLFNBQVMsR0FBRyxHQUF5QixDQUFBO0lBRTNDLE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7QUFDdEMsQ0FBQztBQUVELFNBQVMsa0JBQWtCLENBQUksR0FBWTtJQUMxQyxNQUFNLFNBQVMsR0FBRyxHQUEwQixDQUFBO0lBRTVDLE9BQU8sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLElBQUksU0FBUyxDQUFDLGVBQWUsWUFBWSxPQUFPLENBQUE7QUFDekUsQ0FBQztBQUVELE1BQU0sT0FBZ0IseUJBQ3JCLFNBQVEsVUFBVTtJQUdsQixZQUNTLE1BQWMsRUFDWixPQUE4QztRQUV4RCxLQUFLLEVBQUUsQ0FBQTtRQUhDLFdBQU0sR0FBTixNQUFNLENBQVE7UUFDWixZQUFPLEdBQVAsT0FBTyxDQUF1QztJQUd6RCxDQUFDO0lBRUQsT0FBTyxDQUNOLE1BQThDLEVBQzlDLEtBQXdCLEVBQ3hCLFVBQTJDO1FBRTNDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFekMsdUJBQXVCO1FBQ3ZCLE1BQU0sQ0FBQyxxQkFBcUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQTtRQUVwRSxzREFBc0Q7UUFDdEQsTUFBTSxDQUFDLFlBQVk7WUFDbEIsTUFBTSxDQUFDLGtCQUFrQjtnQkFDekIsTUFBTSxDQUFDLGFBQWE7b0JBQ3BCLE1BQU0sQ0FBQyxXQUFXO3dCQUNqQixLQUFLLENBQUE7UUFFUCx1Q0FBdUM7UUFDdkMsSUFBSSxRQUFRLEdBQXdDLFNBQVMsQ0FBQTtRQUM3RCxNQUFNLGVBQWUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0saUJBQWlCLEdBQUcsS0FBSyxJQUFJLEVBQUU7WUFDcEMsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLGVBQWUsQ0FBQyxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQyxDQUFBO1lBRXhFLDZDQUE2QztZQUM3QyxRQUFRLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3ZCLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFBO1lBRW5CLDhDQUE4QztZQUM5QyxRQUFRLEdBQUcsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLElBQUksdUJBQXVCLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtZQUVuRSxvRUFBb0U7WUFDcEUsTUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQTtZQUNqQyxJQUFJLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBRTVELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUM7Z0JBQzdDLFdBQVcsR0FBRyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDakMsQ0FBQztZQUVELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxVQUFVLENBQUMsQ0FBQTtZQUUzRixNQUFNLFVBQVUsR0FBRyxDQUFDLEtBQWUsRUFBRSxTQUFtQixFQUFXLEVBQUU7Z0JBQ3BFLElBQUksS0FBeUIsQ0FBQTtnQkFDN0IsSUFBSSxVQUFVLEdBQWtCLFNBQVMsQ0FBQTtnQkFFekMsSUFBSSxpQkFBaUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUM5QixLQUFLLEdBQUcsS0FBSyxDQUFDLEtBQUssQ0FBQTtvQkFDbkIsVUFBVSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUE7Z0JBQzFCLENBQUM7cUJBQU0sQ0FBQztvQkFDUCxLQUFLLEdBQUcsS0FBSyxDQUFBO2dCQUNkLENBQUM7Z0JBRUQsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUN4QixJQUFJLFNBQVMsRUFBRSxDQUFDO3dCQUNmLE9BQU8sS0FBSyxDQUFBO29CQUNiLENBQUM7b0JBRUQsOEZBQThGO29CQUM5RixJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksTUFBTSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsYUFBYSxFQUFFLENBQUM7d0JBQ2pGLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQzs0QkFDNUMsS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTt3QkFDbEQsQ0FBQzs2QkFBTSxDQUFDOzRCQUNQLEtBQUssR0FBRyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUE7d0JBQ3JDLENBQUM7b0JBQ0YsQ0FBQztnQkFDRixDQUFDO2dCQUVELE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBO2dCQUNwQixJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixNQUFNLENBQUMsV0FBVyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ2xDLENBQUM7Z0JBRUQsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDLENBQUE7WUFFRCxNQUFNLHFCQUFxQixHQUFHLEtBQUssRUFDbEMsZ0JBQXFDLEVBQ3JCLEVBQUU7Z0JBQ2xCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO2dCQUM1QixJQUFJLGdCQUFnQixHQUFHLEtBQUssQ0FBQTtnQkFFNUIsTUFBTSxPQUFPLENBQUMsR0FBRyxDQUFDO29CQUNqQixnRUFBZ0U7b0JBQ2hFLG9FQUFvRTtvQkFDcEUsK0JBQStCO29CQUMvQiw4REFBOEQ7b0JBQzlELDBCQUEwQjtvQkFFMUIsQ0FBQyxLQUFLLElBQUksRUFBRTt3QkFDWCxJQUFJLE9BQU8sZ0JBQWdCLENBQUMsVUFBVSxLQUFLLFFBQVEsRUFBRSxDQUFDOzRCQUNyRCxNQUFNLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTs0QkFDMUMsSUFBSSxVQUFVLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQ0FDeEMsT0FBTTs0QkFDUCxDQUFDO3dCQUNGLENBQUM7d0JBRUQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7NEJBQ3ZCLGdCQUFnQixHQUFHLFVBQVUsQ0FDNUIsZ0JBQWdCLENBQUMsS0FBSyxFQUN0QixJQUFJLENBQUMsdUNBQXVDLENBQzVDLENBQUE7d0JBQ0YsQ0FBQztvQkFDRixDQUFDLENBQUMsRUFBRTtvQkFFSiwyREFBMkQ7b0JBQzNELDZEQUE2RDtvQkFDN0QsMkJBQTJCO29CQUUzQixDQUFDLEtBQUssSUFBSSxFQUFFO3dCQUNYLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFBO3dCQUNsQixJQUFJLENBQUM7NEJBQ0osTUFBTSxzQkFBc0IsR0FBRyxNQUFNLGdCQUFnQixDQUFDLGVBQWUsQ0FBQTs0QkFDckUsSUFBSSxVQUFVLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQ0FDeEMsT0FBTTs0QkFDUCxDQUFDOzRCQUVELElBQUksS0FBeUIsQ0FBQTs0QkFDN0IsSUFBSSxVQUFVLEdBQXdCLFNBQVMsQ0FBQTs0QkFDL0MsSUFBSSxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dDQUMvQyxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQTtnQ0FDcEMsVUFBVSxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUE7NEJBQzNDLENBQUM7aUNBQU0sQ0FBQztnQ0FDUCxLQUFLLEdBQUcsZ0JBQWdCLENBQUMsS0FBSyxDQUFBOzRCQUMvQixDQUFDOzRCQUVELElBQUksZUFBbUMsQ0FBQTs0QkFDdkMsSUFBSSxvQkFBb0IsR0FBd0IsU0FBUyxDQUFBOzRCQUN6RCxJQUFJLGlCQUFpQixDQUFDLHNCQUFzQixDQUFDLEVBQUUsQ0FBQztnQ0FDL0MsZUFBZSxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQTtnQ0FDOUMsb0JBQW9CLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxDQUFBOzRCQUNyRCxDQUFDO2lDQUFNLENBQUM7Z0NBQ1AsZUFBZSxHQUFHLHNCQUFzQixDQUFBOzRCQUN6QyxDQUFDOzRCQUVELElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO2dDQUNyRCwyREFBMkQ7Z0NBQzNELHdEQUF3RDtnQ0FDeEQseURBQXlEO2dDQUN6RCx3REFBd0Q7Z0NBQ3hELFdBQVc7Z0NBQ1gsd0RBQXdEO2dDQUN4RCxJQUFJLGtCQUFrQixHQUF3QixTQUFTLENBQUE7Z0NBQ3ZELElBQUksQ0FBQyxVQUFVLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO29DQUMxQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUE7b0NBQ3pELElBQ0MsMkJBQTJCO3dDQUMzQixLQUFLLENBQUMsT0FBTyxDQUFDLDJCQUEyQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQ2hELENBQUM7d0NBQ0Ysa0JBQWtCLEdBQUcsMkJBQTJCLENBQUE7b0NBQ2pELENBQUM7Z0NBQ0YsQ0FBQztnQ0FFRCxVQUFVLENBQUM7b0NBQ1YsS0FBSyxFQUFFLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxlQUFlLENBQUM7b0NBQ3JDLE1BQU0sRUFBRSxVQUFVLElBQUksb0JBQW9CLElBQUksa0JBQWtCO2lDQUNoRSxDQUFDLENBQUE7NEJBQ0gsQ0FBQzt3QkFDRixDQUFDO2dDQUFTLENBQUM7NEJBQ1YsSUFBSSxDQUFDLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO2dDQUN6QyxNQUFNLENBQUMsSUFBSSxHQUFHLEtBQUssQ0FBQTs0QkFDcEIsQ0FBQzs0QkFFRCxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7d0JBQ3hCLENBQUM7b0JBQ0YsQ0FBQyxDQUFDLEVBQUU7aUJBQ0osQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFBO1lBRUQsV0FBVztZQUNYLElBQUksYUFBYSxLQUFLLElBQUksRUFBRSxDQUFDO2dCQUM1QixTQUFTO1lBQ1YsQ0FBQztZQUVELHNCQUFzQjtpQkFDakIsSUFBSSxrQkFBa0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDO2dCQUM1QyxNQUFNLHFCQUFxQixDQUFDLGFBQWEsQ0FBQyxDQUFBO1lBQzNDLENBQUM7WUFFRCxhQUFhO2lCQUNSLElBQUksQ0FBQyxDQUFDLGFBQWEsWUFBWSxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUM5QyxVQUFVLENBQUMsYUFBYSxDQUFDLENBQUE7WUFDMUIsQ0FBQztZQUVELGFBQWE7aUJBQ1IsQ0FBQztnQkFDTCxNQUFNLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQTtnQkFDbEIsSUFBSSxDQUFDO29CQUNKLE1BQU0sWUFBWSxHQUFHLE1BQU0sYUFBYSxDQUFBO29CQUN4QyxJQUFJLFVBQVUsQ0FBQyx1QkFBdUIsRUFBRSxDQUFDO3dCQUN4QyxPQUFNO29CQUNQLENBQUM7b0JBRUQsSUFBSSxrQkFBa0IsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO3dCQUN0QyxNQUFNLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUMxQyxDQUFDO3lCQUFNLENBQUM7d0JBQ1AsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO29CQUN6QixDQUFDO2dCQUNGLENBQUM7d0JBQVMsQ0FBQztvQkFDVixJQUFJLENBQUMsVUFBVSxDQUFDLHVCQUF1QixFQUFFLENBQUM7d0JBQ3pDLE1BQU0sQ0FBQyxJQUFJLEdBQUcsS0FBSyxDQUFBO29CQUNwQixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsaUJBQWlCLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbkUsaUJBQWlCLEVBQUUsQ0FBQTtRQUVuQiw0Q0FBNEM7UUFDNUMsV0FBVyxDQUFDLEdBQUcsQ0FDZCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUU7WUFDNUIsSUFBSSxVQUFVLEVBQUUsWUFBWSxFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3pCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLDZDQUE2QztnQkFDNUQsQ0FBQztnQkFDRCxVQUFVLENBQUMsWUFBWSxFQUFFLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUE7Z0JBQ3BFLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUE7WUFDbkMsSUFBSSxPQUFPLElBQUksRUFBRSxNQUFNLEtBQUssVUFBVSxFQUFFLENBQUM7Z0JBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsWUFBWSxFQUFFLENBQUM7b0JBQ3pCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQSxDQUFDLDZDQUE2QztnQkFDNUQsQ0FBQztnQkFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDbkMsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGFBQWEsR0FBRyxLQUFLLEVBQzFCLE1BQXlCLEVBQ3pCLElBQXFDLEVBQ3BDLEVBQUU7WUFDSCxJQUFJLE9BQU8sSUFBSSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztnQkFDeEMsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUN2RCxJQUFJLFdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxXQUFXLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO2dCQUN4RCxNQUFNLE1BQU0sR0FBRyxPQUFPLE1BQU0sS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxNQUFNLENBQUE7Z0JBRWpFLElBQUksS0FBSyxDQUFDLHVCQUF1QixFQUFFLENBQUM7b0JBQ25DLE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCxRQUFRLE1BQU0sRUFBRSxDQUFDO29CQUNoQixLQUFLLGFBQWEsQ0FBQyxTQUFTO3dCQUMzQixNQUFLO29CQUNOLEtBQUssYUFBYSxDQUFDLFlBQVk7d0JBQzlCLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQTt3QkFDYixNQUFLO29CQUNOLEtBQUssYUFBYSxDQUFDLGNBQWM7d0JBQ2hDLGlCQUFpQixFQUFFLENBQUE7d0JBQ25CLE1BQUs7b0JBQ04sS0FBSyxhQUFhLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQzt3QkFDaEMsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7d0JBQ3hDLElBQUksS0FBSyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUM7NEJBQ2xCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUE7NEJBQ2xDLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBOzRCQUN0QyxNQUFNLFdBQVcsR0FBRyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FDNUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDLFVBQVUsS0FBSyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQ3pDLENBQUE7NEJBQ0QsTUFBTSx3QkFBd0IsR0FBRyxNQUFNLENBQUMsa0JBQWtCLENBQUE7NEJBQzFELE1BQU0sQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7NEJBQ2hDLE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFBOzRCQUNwQixJQUFJLFdBQVcsRUFBRSxDQUFDO2dDQUNqQixNQUFNLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTs0QkFDakMsQ0FBQzs0QkFDRCxNQUFNLENBQUMsa0JBQWtCLEdBQUcsd0JBQXdCLENBQUE7d0JBQ3JELENBQUM7d0JBQ0QsTUFBSztvQkFDTixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFBO1FBRUQseURBQXlEO1FBQ3pELFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FDaEYsQ0FBQTtRQUNELFdBQVcsQ0FBQyxHQUFHLENBQ2QsTUFBTSxDQUFDLDJCQUEyQixDQUFDLENBQUMsRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEVBQUUsRUFBRSxDQUM1RCxhQUFhLENBQUMsTUFBTSxFQUFFLFNBQVMsQ0FBQyxDQUNoQyxDQUNELENBQUE7UUFFRCxPQUFPLFdBQVcsQ0FBQTtJQUNuQixDQUFDO0NBd0JEIn0=