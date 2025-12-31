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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9xdWlja2lucHV0L2Jyb3dzZXIvcXVpY2tBY2Nlc3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNyRCxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFFZixZQUFZLEdBQ1osTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLFVBQVUsR0FNVixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTixrQkFBa0IsRUFHbEIsY0FBYyxHQUNkLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXJELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXNCLFNBQVEsVUFBVTtJQWlCcEQsWUFDcUIsaUJBQXNELEVBQ25ELG9CQUE0RDtRQUVuRixLQUFLLEVBQUUsQ0FBQTtRQUg4QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ2xDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFsQm5FLGFBQVEsR0FBRyxRQUFRLENBQUMsRUFBRSxDQUF1QixVQUFVLENBQUMsV0FBVyxDQUFDLENBQUE7UUFDcEUsNEJBQXVCLEdBQUcsSUFBSSxHQUFHLEVBRy9DLENBQUE7UUFFYyw2QkFBd0IsR0FBRyxJQUFJLEdBQUcsRUFBMEMsQ0FB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