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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zaWduL2Jyb3dzZXIvc2lnblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDaEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDbEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEUsT0FBTyxFQUFFLG1CQUFtQixFQUFrQixNQUFNLGtDQUFrQyxDQUFBO0FBeUJ0RixNQUFNLFFBQVEsR0FBRyxFQUFFLENBQUE7QUFDbkIsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFBO0FBQ2xCLE1BQU0sU0FBUyxHQUFHLFFBQVEsR0FBRyxPQUFPLENBQUE7QUFFN0IsSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBWSxTQUFRLG1CQUFtQjtJQUNuRCxZQUE4QyxjQUErQjtRQUM1RSxLQUFLLEVBQUUsQ0FBQTtRQURzQyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7SUFFN0UsQ0FBQztJQUNrQixZQUFZO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLElBQUksSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBQzlCLE9BQU87Z0JBQ04sZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0Is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