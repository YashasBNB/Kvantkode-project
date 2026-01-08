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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlja2VyUXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9waWNrZXJRdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFxQix1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pHLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBVTFDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUUxRCxNQUFNLENBQU4sSUFBWSxhQW9CWDtBQXBCRCxXQUFZLGFBQWE7SUFDeEI7O09BRUc7SUFDSCwyREFBUyxDQUFBO0lBRVQ7O09BRUc7SUFDSCxpRUFBWSxDQUFBO0lBRVo7O09BRUc7SUFDSCxxRUFBYyxDQUFBO0lBRWQ7O09BRUc7SUFDSCwrREFBVyxDQUFBO0FBQ1osQ0FBQyxFQXBCVyxhQUFhLEtBQWIsYUFBYSxRQW9CeEI7QUFpRkQsU0FBUyxpQkFBaUIsQ0FBSSxHQUFZO0lBQ3pDLE1BQU0sU0FBUyxHQUFHLEdBQXlCLENBQUE7SUFFM0MsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQTtBQUN0QyxDQUFDO0FBRUQsU0FBUyxrQkFBa0IsQ0FBSSxHQUFZO0lBQzFDLE1BQU0sU0FBUyxHQUFHLEdBQTBCLENBQUE7SUFFNUMsT0FBTyxDQUFDLENBQUMsU0FBUyxDQUFDLEtBQUssSUFBSSxTQUFTLENBQUMsZUFBZSxZQUFZLE9BQU8sQ0FBQTtBQUN6RSxDQUFDO0FBRUQsTUFBTSxPQUFnQix5QkFDckIsU0FBUSxVQUFV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