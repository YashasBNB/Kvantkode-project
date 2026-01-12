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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFF1aWNrT3Blbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRRdWlja09wZW4udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLGtCQUFrQixHQUlsQixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFDTixjQUFjLEVBSWQsV0FBVyxHQUtYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFRbkUsU0FBUyxrQkFBa0IsQ0FBQyxRQUFnRDtJQUMzRSxRQUFRLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQ3pDLElBQUksUUFBUSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ3BCLFFBQVEsQ0FBQyxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDNUMsQ0FBQztBQUNGLENBQUM7QUFHTSxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQVcvQixZQUNDLGNBQStCLEVBQ1gsaUJBQXFDO1FBVnpDLFdBQU0sR0FNbkIsRUFBRSxDQUFBO1FBaUdOLGtCQUFrQjtRQUVWLGFBQVEsR0FBRyxJQUFJLEdBQUcsRUFBNkIsQ0FBQTtRQTdGdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxjQUFjLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBQ3RFLElB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