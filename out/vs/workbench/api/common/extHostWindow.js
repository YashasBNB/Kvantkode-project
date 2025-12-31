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
var ExtHostWindow_1;
import { Emitter } from '../../../base/common/event.js';
import { Schemas } from '../../../base/common/network.js';
import { isFalsyOrWhitespace } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { createDecorator } from '../../../platform/instantiation/common/instantiation.js';
import { IExtHostRpcService } from './extHostRpcService.js';
import { MainContext, } from './extHost.protocol.js';
import { IExtHostInitDataService } from './extHostInitDataService.js';
import { decodeBase64 } from '../../../base/common/buffer.js';
let ExtHostWindow = class ExtHostWindow {
    static { ExtHostWindow_1 = this; }
    static { this.InitialState = {
        focused: true,
        active: true,
    }; }
    getState() {
        // todo@connor4312: this can be changed to just return this._state after proposed api is finalized
        const state = this._state;
        return {
            get focused() {
                return state.focused;
            },
            get active() {
                return state.active;
            },
        };
    }
    constructor(initData, extHostRpc) {
        this._onDidChangeWindowState = new Emitter();
        this.onDidChangeWindowState = this._onDidChangeWindowState.event;
        this._state = ExtHostWindow_1.InitialState;
        if (initData.handle) {
            this._nativeHandle = decodeBase64(initData.handle).buffer;
        }
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadWindow);
        this._proxy.$getInitialState().then(({ isFocused, isActive }) => {
            this.onDidChangeWindowProperty('focused', isFocused);
            this.onDidChangeWindowProperty('active', isActive);
        });
    }
    get nativeHandle() {
        return this._nativeHandle;
    }
    $onDidChangeActiveNativeWindowHandle(handle) {
        this._nativeHandle = handle ? decodeBase64(handle).buffer : undefined;
    }
    $onDidChangeWindowFocus(value) {
        this.onDidChangeWindowProperty('focused', value);
    }
    $onDidChangeWindowActive(value) {
        this.onDidChangeWindowProperty('active', value);
    }
    onDidChangeWindowProperty(property, value) {
        if (value === this._state[property]) {
            return;
        }
        this._state = { ...this._state, [property]: value };
        this._onDidChangeWindowState.fire(this._state);
    }
    openUri(stringOrUri, options) {
        let uriAsString;
        if (typeof stringOrUri === 'string') {
            uriAsString = stringOrUri;
            try {
                stringOrUri = URI.parse(stringOrUri);
            }
            catch (e) {
                return Promise.reject(`Invalid uri - '${stringOrUri}'`);
            }
        }
        if (isFalsyOrWhitespace(stringOrUri.scheme)) {
            return Promise.reject('Invalid scheme - cannot be empty');
        }
        else if (stringOrUri.scheme === Schemas.command) {
            return Promise.reject(`Invalid scheme '${stringOrUri.scheme}'`);
        }
        return this._proxy.$openUri(stringOrUri, uriAsString, options);
    }
    async asExternalUri(uri, options) {
        if (isFalsyOrWhitespace(uri.scheme)) {
            return Promise.reject('Invalid scheme - cannot be empty');
        }
        const result = await this._proxy.$asExternalUri(uri, options);
        return URI.from(result);
    }
};
ExtHostWindow = ExtHostWindow_1 = __decorate([
    __param(0, IExtHostInitDataService),
    __param(1, IExtHostRpcService)
], ExtHostWindow);
export { ExtHostWindow };
export const IExtHostWindow = createDecorator('IExtHostWindow');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdFdpbmRvdy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RXaW5kb3cudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDckUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUUzRCxPQUFPLEVBR04sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXRELElBQU0sYUFBYSxHQUFuQixNQUFNLGFBQWE7O2FBQ1YsaUJBQVksR0FBZ0I7UUFDMUMsT0FBTyxFQUFFLElBQUk7UUFDYixNQUFNLEVBQUUsSUFBSTtLQUNaLEFBSDBCLENBRzFCO0lBVUQsUUFBUTtRQUNQLGtHQUFrRztRQUNsRyxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFBO1FBRXpCLE9BQU87WUFDTixJQUFJLE9BQU87Z0JBQ1YsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFBO1lBQ3JCLENBQUM7WUFDRCxJQUFJLE1BQU07Z0JBQ1QsT0FBTyxLQUFLLENBQUMsTUFBTSxDQUFBO1lBQ3BCLENBQUM7U0FDRCxDQUFB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