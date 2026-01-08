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
import { importAMDNodeModule, resolveAmdNodeModulePath } from '../../../amdX.js';
import { WindowIntervalTimer } from '../../../base/browser/dom.js';
import { mainWindow } from '../../../base/browser/window.js';
import { memoize } from '../../../base/common/decorators.js';
import { IProductService } from '../../product/common/productService.js';
import { AbstractSignService } from '../common/abstractSignService.js';
const KEY_SIZE = 32;
const IV_SIZE = 16;
const STEP_SIZE = KEY_SIZE + IV_SIZE;
let SignService = class SignService extends AbstractSignService {
    constructor(productService) {
        super();
        this.productService = productService;
    }
    getValidator() {
        return this.vsda().then((vsda) => {
            const v = new vsda.validator();
            return {
                createNewMessage: (arg) => v.createNewMessage(arg),
                validate: (arg) => v.validate(arg),
                dispose: () => v.free(),
            };
        });
    }
    signValue(arg) {
        return this.vsda().then((vsda) => vsda.sign(arg));
    }
    async vsda() {
        const checkInterval = new WindowIntervalTimer();
        let [wasm] = await Promise.all([
            this.getWasmBytes(),
            new Promise((resolve, reject) => {
                importAMDNodeModule('vsda', 'rust/web/vsda.js').then(() => resolve(), reject);
                // todo@connor4312: there seems to be a bug(?) in vscode-loader with
                // require() not resolving in web once the script loads, so check manually
                checkInterval.cancelAndSet(() => {
                    if (typeof vsda_web !== 'undefined') {
                        resolve();
                    }
                }, 50, mainWindow);
            }).finally(() => checkInterval.dispose()),
        ]);
        const keyBytes = new TextEncoder().encode(this.productService.serverLicense?.join('\n') || '');
        for (let i = 0; i + STEP_SIZE < keyBytes.length; i += STEP_SIZE) {
            const key = await crypto.subtle.importKey('raw', keyBytes.slice(i + IV_SIZE, i + IV_SIZE + KEY_SIZE), { name: 'AES-CBC' }, false, ['decrypt']);
            wasm = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: keyBytes.slice(i, i + IV_SIZE) }, key, wasm);
        }
        await vsda_web.default(wasm);
        return vsda_web;
    }
    async getWasmBytes() {
        const url = resolveAmdNodeModulePath('vsda', 'rust/web/vsda_bg.wasm');
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('error loading vsda');
        }
        return response.arrayBuffer();
    }
};
__decorate([
    memoize
], SignService.prototype, "vsda", null);
SignService = __decorate([
    __param(0, IProductService)
], SignService);
export { SignService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3NpZ24vYnJvd3Nlci9zaWduU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUNoRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQWtCLE1BQU0sa0NBQWtDLENBQUE7QUF5QnRGLE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQTtBQUNuQixNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUE7QUFDbEIsTUFBTSxTQUFTLEdBQUcsUUFBUSxHQUFHLE9BQU8sQ0FBQTtBQUU3QixJQUFNLFdBQVcsR0FBakIsTUFBTSxXQUFZLFNBQVEsbUJBQW1CO0lBQ25ELFlBQThDLGNBQStCO1FBQzVFLEtBQUssRUFBRSxDQUFBO1FBRHNDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtJQUU3RSxDQUFDO0lBQ2tCLFlBQVk7UUFDOUIsT0FBTyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDaEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUE7WUFDOUIsT0FBTztnQkFDTixnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGdC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