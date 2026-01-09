/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { DeferredPromise } from '../../../base/common/async.js';
import { CancellationTokenSource } from '../../../base/common/cancellation.js';
import { Event } from '../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable, } from '../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../instantiation/common/instantiation.js';
import { DefaultQuickAccessFilterValue, Extensions, } from '../common/quickAccess.js';
import { IQuickInputService, ItemActivation, } from '../common/quickInput.js';
import { Registry } from '../../registry/common/platform.js';
let QuickAccessController = class QuickAccessController extends Disposable {
    constructor(quickInputService, instantiationService) {
        super();
        this.quickInputService = quickInputService;
        this.instantiationService = instantiationService;
        this.registry = Registry.as(Extensions.Quickaccess);
        this.mapProviderToDescriptor = new Map();
        this.lastAcceptedPickerValues = new Map();
        this.visibleQuickAccess = undefined;
    }
    pick(value = '', options) {
        return this.doShowOrPick(value, true, options);
    }
    show(value = '', options) {
        this.doShowOrPick(value, false, options);
    }
    doShowOrPick(value, pick, options) {
        // Find provider for the value to show
        const [provider, descriptor] = this.getOrInstantiateProvider(value, options?.enabledProviderPrefixes);
        // Return early if quick access is already showing on that same prefix
        const visibleQuickAccess = this.visibleQuickAccess;
        const visibleDescriptor = visibleQuickAccess?.descriptor;
        if (visibleQuickAccess && descriptor && visibleDescriptor === descriptor) {
            // Apply value only if it is more specific than the prefix
            // from the provider and we are not instructed to preserve
            if (value !== descriptor.prefix && !options?.preserveValue) {
                visibleQuickAccess.picker.value = value;
            }
            // Always adjust selection
            this.adjustValueSelection(visibleQuickAccess.picker, descriptor, options);
            return;
        }
        // Rewrite the filter value based on certain rules unless disabled
        if (descriptor && !options?.preserveValue) {
            let newValue = undefined;
            // If we have a visible provider with a value, take it's filter value but
            // rewrite to new provider prefix in case they differ
            if (visibleQuickAccess && visibleDescriptor && visibleDescriptor !== descriptor) {
                const newValueCandidateWithoutPrefix = visibleQuickAccess.value.substr(visibleDescriptor.prefix.length);
                if (newValueCandidateWithoutPrefix) {
                    newValue = `${descriptor.prefix}${newValueCandidateWithoutPrefix}`;
                }
            }
            // Otherwise, take a default value as instructed
            if (!newValue) {
                const defaultFilterValue = provider?.defaultFilterValue;
                if (defaultFilterValue === DefaultQuickAccessFilterValue.LAST) {
                    newValue = this.lastAcceptedPickerValues.get(descriptor);
                }
                else if (typeof defaultFilterValue === 'string') {
                    newValue = `${descriptor.prefix}${defaultFilterValue}`;
                }
            }
            if (typeof newValue === 'string') {
                value = newValue;
            }
        }
        // Store the existing selection if there was one.
        const visibleSelection = visibleQuickAccess?.picker?.valueSelection;
        const visibleValue = visibleQuickAccess?.picker?.value;
        // Create a picker for the provider to use with the initial value
        // and adjust the filtering to exclude the prefix from filtering
        const disposables = new DisposableStore();
        const picker = disposables.add(this.quickInputService.createQuickPick({ useSeparators: true }));
        picker.value = value;
        this.adjustValueSelection(picker, descriptor, options);
        picker.placeholder = options?.placeholder ?? descriptor?.placeholder;
        picker.quickNavigate = options?.quickNavigateConfiguration;
        picker.hideInput = !!picker.quickNavigate && !visibleQuickAccess; // only hide input if there was no picker opened already
        if (typeof options?.itemActivation === 'number' || options?.quickNavigateConfiguration) {
            picker.itemActivation =
                options?.itemActivation ?? ItemActivation.SECOND; /* quick nav is always second */
        }
        picker.contextKey = descriptor?.contextKey;
        picker.filterValue = (value) => value.substring(descriptor ? descriptor.prefix.length : 0);
        // Pick mode: setup a promise that can be resolved
        // with the selected items and prevent execution
        let pickPromise = undefined;
        if (pick) {
            pickPromise = new DeferredPromise();
            disposables.add(Event.once(picker.onWillAccept)((e) => {
                e.veto();
                picker.hide();
            }));
        }
        // Register listeners
        disposables.add(this.registerPickerListeners(picker, provider, descriptor, value, options));
        // Ask provider to fill the picker as needed if we have one
        // and pass over a cancellation token that will indicate when
        // the picker is hiding without a pick being made.
        const cts = disposables.add(new CancellationTokenSource());
        if (provider) {
            disposables.add(provider.provide(picker, cts.token, options?.providerOptions));
        }
        // Finally, trigger disposal and cancellation when the picker
        // hides depending on items selected or not.
        Event.once(picker.onDidHide)(() => {
            if (picker.selectedItems.length === 0) {
                cts.cancel();
            }
            // Start to dispose once picker hides
            disposables.dispose();
            // Resolve pick promise with selected items
            pickPromise?.complete(picker.selectedItems.slice(0));
        });
        // Finally, show the picker. This is important because a provider
        // may not call this and then our disposables would leak that rely
        // on the onDidHide event.
        picker.show();
        // If the previous picker had a selection and the value is unchanged, we should set that in the new picker.
        if (visibleSelection && visibleValue === value) {
            picker.valueSelection = visibleSelection;
        }
        // Pick mode: return with promise
        if (pick) {
            return pickPromise?.p;
        }
    }
    adjustValueSelection(picker, descriptor, options) {
        let valueSelection;
        // Preserve: just always put the cursor at the end
        if (options?.preserveValue) {
            valueSelection = [picker.value.length, picker.value.length];
        }
        // Otherwise: select the value up until the prefix
        else {
            valueSelection = [descriptor?.prefix.length ?? 0, picker.value.length];
        }
        picker.valueSelection = valueSelection;
    }
    registerPickerListeners(picker, provider, descriptor, value, options) {
        const disposables = new DisposableStore();
        // Remember as last visible picker and clean up once picker get's disposed
        const visibleQuickAccess = (this.visibleQuickAccess = { picker, descriptor, value });
        disposables.add(toDisposable(() => {
            if (visibleQuickAccess === this.visibleQuickAccess) {
                this.visibleQuickAccess = undefined;
            }
        }));
        // Whenever the value changes, check if the provider has
        // changed and if so - re-create the picker from the beginning
        disposables.add(picker.onDidChangeValue((value) => {
            const [providerForValue] = this.getOrInstantiateProvider(value, options?.enabledProviderPrefixes);
            if (providerForValue !== provider) {
                this.show(value, {
                    enabledProviderPrefixes: options?.enabledProviderPrefixes,
                    // do not rewrite value from user typing!
                    preserveValue: true,
                    // persist the value of the providerOptions from the original showing
                    providerOptions: options?.providerOptions,
                });
            }
            else {
                visibleQuickAccess.value = value; // remember the value in our visible one
            }
        }));
        // Remember picker input for future use when accepting
        if (descriptor) {
            disposables.add(picker.onDidAccept(() => {
                this.lastAcceptedPickerValues.set(descriptor, picker.value);
            }));
        }
        return disposables;
    }
    getOrInstantiateProvider(value, enabledProviderPrefixes) {
        const providerDescriptor = this.registry.getQuickAccessProvider(value);
        if (!providerDescriptor ||
            (enabledProviderPrefixes && !enabledProviderPrefixes?.includes(providerDescriptor.prefix))) {
            return [undefined, undefined];
        }
        let provider = this.mapProviderToDescriptor.get(providerDescriptor);
        if (!provider) {
            provider = this.instantiationService.createInstance(providerDescriptor.ctor);
            this.mapProviderToDescriptor.set(providerDescriptor, provider);
        }
        return [provider, providerDescriptor];
    }
};
QuickAccessController = __decorate([
    __param(0, IQuickInputService),
    __param(1, IInstantiationService)
], QuickAccessController);
export { QuickAccessController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3F1aWNraW5wdXQvYnJvd3Nlci9xdWlja0FjY2Vzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3JELE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUVmLFlBQVksR0FDWixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ25GLE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsVUFBVSxHQU1WLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLGtCQUFrQixFQUdsQixjQUFjLEdBQ2QsTUFBTSx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckQsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBaUJwRCxZQUNxQixpQkFBc0QsRUFDbkQsb0JBQTREO1FBRW5GLEtBQUssRUFBRSxDQUFBO1FBSDhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDbEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQWxCbkUsYUFBUSxHQUFHLFFBQVEsQ0FBQyxFQUFFLENBQXVCLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNwRSw0QkFBdUIsR0FBRyxJQUFJLEdBQUcsRUFHL0MsQ0FBQTtRQUVjLDZCQUF3QixH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