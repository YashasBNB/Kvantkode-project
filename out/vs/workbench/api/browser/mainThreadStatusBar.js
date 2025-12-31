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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFN0YXR1c0Jhci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkU3RhdHVzQmFyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixXQUFXLEVBQ1gsY0FBYyxHQUdkLE1BQU0sK0JBQStCLENBQUE7QUFFdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJakYsT0FBTyxFQUFFLDhCQUE4QixFQUF1QixNQUFNLDhCQUE4QixDQUFBO0FBTTNGLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW1CO0lBSS9CLFlBQ0MsY0FBK0IsRUFFL0IsZ0JBQWlFO1FBQWhELHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBZ0M7UUFMakQsV0FBTSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFPOUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBRXRFLDBEQUEwRDtRQUMxRCxNQUFNLE9BQU8sR0FBdUIsRUFBRSxDQUFBO1FBQ3RDLEtBQUssTUFBTSxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQzdELE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ25DLENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXpDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FB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