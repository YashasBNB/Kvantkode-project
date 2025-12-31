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
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { URI } from '../../../base/common/uri.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
function reviveIconPathUris(iconPath) {
    iconPath.dark = URI.revive(iconPath.dark);
    if (iconPath.light) {
        iconPath.light = URI.revive(iconPath.light);
    }
}
let MainThreadQuickOpen = class MainThreadQuickOpen {
    constructor(extHostContext, quickInputService) {
        this._items = {};
        // ---- QuickInput
        this.sessions = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostQuickOpen);
        this._quickInputService = quickInputService;
    }
    dispose() {
        for (const [_id, session] of this.sessions) {
            session.store.dispose();
        }
    }
    $show(instance, options, token) {
        const contents = new Promise((resolve, reject) => {
            this._items[instance] = { resolve, reject };
        });
        options = {
            ...options,
            onDidFocus: (el) => {
                if (el) {
                    this._proxy.$onItemSelected(el.handle);
                }
            },
        };
        if (options.canPickMany) {
            return this._quickInputService
                .pick(contents, options, token)
                .then((items) => {
                if (items) {
                    return items.map((item) => item.handle);
                }
                return undefined;
            });
        }
        else {
            return this._quickInputService.pick(contents, options, token).then((item) => {
                if (item) {
                    return item.handle;
                }
                return undefined;
            });
        }
    }
    $setItems(instance, items) {
        if (this._items[instance]) {
            this._items[instance].resolve(items);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    $setError(instance, error) {
        if (this._items[instance]) {
            this._items[instance].reject(error);
            delete this._items[instance];
        }
        return Promise.resolve();
    }
    // ---- input
    $input(options, validateInput, token) {
        const inputOptions = Object.create(null);
        if (options) {
            inputOptions.title = options.title;
            inputOptions.password = options.password;
            inputOptions.placeHolder = options.placeHolder;
            inputOptions.valueSelection = options.valueSelection;
            inputOptions.prompt = options.prompt;
            inputOptions.value = options.value;
            inputOptions.ignoreFocusLost = options.ignoreFocusOut;
        }
        if (validateInput) {
            inputOptions.validateInput = (value) => {
                return this._proxy.$validateInput(value);
            };
        }
        return this._quickInputService.input(inputOptions, token);
    }
    $createOrUpdate(params) {
        const sessionId = params.id;
        let session = this.sessions.get(sessionId);
        if (!session) {
            const store = new DisposableStore();
            const input = params.type === 'quickPick'
                ? this._quickInputService.createQuickPick()
                : this._quickInputService.createInputBox();
            store.add(input);
            store.add(input.onDidAccept(() => {
                this._proxy.$onDidAccept(sessionId);
            }));
            store.add(input.onDidTriggerButton((button) => {
                this._proxy.$onDidTriggerButton(sessionId, button.handle);
            }));
            store.add(input.onDidChangeValue((value) => {
                this._proxy.$onDidChangeValue(sessionId, value);
            }));
            store.add(input.onDidHide(() => {
                this._proxy.$onDidHide(sessionId);
            }));
            if (params.type === 'quickPick') {
                // Add extra events specific for quickpick
                const quickpick = input;
                store.add(quickpick.onDidChangeActive((items) => {
                    this._proxy.$onDidChangeActive(sessionId, items.map((item) => item.handle));
                }));
                store.add(quickpick.onDidChangeSelection((items) => {
                    this._proxy.$onDidChangeSelection(sessionId, items.map((item) => item.handle));
                }));
                store.add(quickpick.onDidTriggerItemButton((e) => {
                    this._proxy.$onDidTriggerItemButton(sessionId, e.item.handle, e.button.handle);
                }));
            }
            session = {
                input,
                handlesToItems: new Map(),
                store,
            };
            this.sessions.set(sessionId, session);
        }
        const { input, handlesToItems } = session;
        for (const param in params) {
            if (param === 'id' || param === 'type') {
                continue;
            }
            if (param === 'visible') {
                if (params.visible) {
                    input.show();
                }
                else {
                    input.hide();
                }
            }
            else if (param === 'items') {
                handlesToItems.clear();
                params[param].forEach((item) => {
                    if (item.type === 'separator') {
                        return;
                    }
                    if (item.buttons) {
                        item.buttons = item.buttons.map((button) => {
                            if (button.iconPath) {
                                reviveIconPathUris(button.iconPath);
                            }
                            return button;
                        });
                    }
                    handlesToItems.set(item.handle, item);
                });
                input[param] = params[param];
            }
            else if (param === 'activeItems' || param === 'selectedItems') {
                ;
                input[param] = params[param]
                    .filter((handle) => handlesToItems.has(handle))
                    .map((handle) => handlesToItems.get(handle));
            }
            else if (param === 'buttons') {
                ;
                input[param] = params.buttons.map((button) => {
                    if (button.handle === -1) {
                        return this._quickInputService.backButton;
                    }
                    if (button.iconPath) {
                        reviveIconPathUris(button.iconPath);
                    }
                    return button;
                });
            }
            else {
                ;
                input[param] = params[param];
            }
        }
        return Promise.resolve(undefined);
    }
    $dispose(sessionId) {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.store.dispose();
            this.sessions.delete(sessionId);
        }
        return Promise.resolve(undefined);
    }
};
MainThreadQuickOpen = __decorate([
    extHostNamedCustomer(MainContext.MainThreadQuickOpen),
    __param(1, IQuickInputService)
], MainThreadQuickOpen);
export { MainThreadQuickOpen };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkUXVpY2tPcGVuLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTixrQkFBa0IsR0FJbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sY0FBYyxFQUlkLFdBQVcsR0FLWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFakQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUW5FLFNBQVMsa0JBQWtCLENBQUMsUUFBZ0Q7SUFDM0UsUUFBUSxDQUFDLElBQUksR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN6QyxJQUFJLFFBQVEsQ0FBQyxLQUFLLEVBQUUsQ0FBQztRQUNwQixRQUFRLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzVDLENBQUM7QUFDRixDQUFDO0FBR00sSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFXL0IsWUFDQyxjQUErQixFQUNYLGlCQUFxQztRQVZ6QyxXQUFNLEdBTW5CLEVBQUUsQ0FBQTtRQWlHTixrQkFBa0I7UUFFVixhQUFRLEdBQUcsSUFBSSxHQUFHLEVBQTZCLENBQUE7UUE3RnRELElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUN0RSxJQUFJLENB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