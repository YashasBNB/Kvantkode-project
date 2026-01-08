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
import { MainContext, ExtHostContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { IExtensionStatusBarItemService } from './statusBarExtensionPoint.js';
let MainThreadStatusBar = class MainThreadStatusBar {
    constructor(extHostContext, statusbarService) {
        this.statusbarService = statusbarService;
        this._store = new DisposableStore();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostStatusBar);
        // once, at startup read existing items and send them over
        const entries = [];
        for (const [entryId, item] of statusbarService.getEntries()) {
            entries.push(asDto(entryId, item));
        }
        this._proxy.$acceptStaticEntries(entries);
        this._store.add(statusbarService.onDidChange((e) => {
            if (e.added) {
                this._proxy.$acceptStaticEntries([asDto(e.added[0], e.added[1])]);
            }
        }));
        function asDto(entryId, item) {
            return {
                entryId,
                name: item.entry.name,
                text: item.entry.text,
                tooltip: item.entry.tooltip,
                command: typeof item.entry.command === 'string'
                    ? item.entry.command
                    : typeof item.entry.command === 'object'
                        ? item.entry.command.id
                        : undefined,
                priority: item.priority,
                alignLeft: item.alignment === 0 /* StatusbarAlignment.LEFT */,
                accessibilityInformation: item.entry.ariaLabel
                    ? { label: item.entry.ariaLabel, role: item.entry.role }
                    : undefined,
            };
        }
    }
    dispose() {
        this._store.dispose();
    }
    $setEntry(entryId, id, extensionId, name, text, tooltip, hasTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation) {
        const tooltipOrTooltipProvider = hasTooltipProvider
            ? {
                markdown: (cancellation) => {
                    return this._proxy.$provideTooltip(entryId, cancellation);
                },
                markdownNotSupportedFallback: undefined,
            }
            : tooltip;
        const kind = this.statusbarService.setOrUpdateEntry(entryId, id, extensionId, name, text, tooltipOrTooltipProvider, command, color, backgroundColor, alignLeft, priority, accessibilityInformation);
        if (kind === 0 /* StatusBarUpdateKind.DidDefine */) {
            this._store.add(toDisposable(() => this.statusbarService.unsetEntry(entryId)));
        }
    }
    $disposeEntry(entryId) {
        this.statusbarService.unsetEntry(entryId);
    }
};
MainThreadStatusBar = __decorate([
    extHostNamedCustomer(MainContext.MainThreadStatusBar),
    __param(1, IExtensionStatusBarItemService)
], MainThreadStatusBar);
export { MainThreadStatusBar };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRTdGF0dXNCYXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUVOLFdBQVcsRUFDWCxjQUFjLEdBR2QsTUFBTSwrQkFBK0IsQ0FBQTtBQUV0QyxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUlqRixPQUFPLEVBQUUsOEJBQThCLEVBQXVCLE1BQU0sOEJBQThCLENBQUE7QUFNM0YsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFJL0IsWUFDQyxjQUErQixFQUUvQixnQkFBaUU7UUFBaEQscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFnQztRQUxqRCxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU85QyxJQUFJLENBQUMsTUFBTSxHQUFHLGNBQWMsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFFdEUsMERBQTBEO1FBQzFELE1BQU0sT0FBTyxHQUF1QixFQUFFLENBQUE7UUFDdEMsS0FBSyxNQUFNLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDN0QsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFDbkMsQ0FBQztRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFekMsSUFBSSxDQUFDLE1BQU0sQ0FB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