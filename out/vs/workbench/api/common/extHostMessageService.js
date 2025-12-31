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
import { MainContext, } from './extHost.protocol.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
function isMessageItem(item) {
    return item && item.title;
}
let ExtHostMessageService = class ExtHostMessageService {
    constructor(mainContext, _logService) {
        this._logService = _logService;
        this._proxy = mainContext.getProxy(MainContext.MainThreadMessageService);
    }
    showMessage(extension, severity, message, optionsOrFirstItem, rest) {
        const options = {
            source: { identifier: extension.identifier, label: extension.displayName || extension.name },
        };
        let items;
        if (typeof optionsOrFirstItem === 'string' || isMessageItem(optionsOrFirstItem)) {
            items = [optionsOrFirstItem, ...rest];
        }
        else {
            options.modal = optionsOrFirstItem?.modal;
            options.useCustom = optionsOrFirstItem?.useCustom;
            options.detail = optionsOrFirstItem?.detail;
            items = rest;
        }
        if (options.useCustom) {
            checkProposedApiEnabled(extension, 'resolvers');
        }
        const commands = [];
        let hasCloseAffordance = false;
        for (let handle = 0; handle < items.length; handle++) {
            const command = items[handle];
            if (typeof command === 'string') {
                commands.push({ title: command, handle, isCloseAffordance: false });
            }
            else if (typeof command === 'object') {
                const { title, isCloseAffordance } = command;
                commands.push({ title, isCloseAffordance: !!isCloseAffordance, handle });
                if (isCloseAffordance) {
                    if (hasCloseAffordance) {
                        this._logService.warn(`[${extension.identifier}] Only one message item can have 'isCloseAffordance':`, command);
                    }
                    else {
                        hasCloseAffordance = true;
                    }
                }
            }
            else {
                this._logService.warn(`[${extension.identifier}] Invalid message item:`, command);
            }
        }
        return this._proxy.$showMessage(severity, message, options, commands).then((handle) => {
            if (typeof handle === 'number') {
                return items[handle];
            }
            return undefined;
        });
    }
};
ExtHostMessageService = __decorate([
    __param(1, ILogService)
], ExtHostMessageService);
export { ExtHostMessageService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE1lc3NhZ2VTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE1lc3NhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFDTixXQUFXLEdBSVgsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFeEYsU0FBUyxhQUFhLENBQUMsSUFBUztJQUMvQixPQUFPLElBQUksSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFBO0FBQzFCLENBQUM7QUFFTSxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFxQjtJQUdqQyxZQUNDLFdBQXlCLEVBQ0ssV0FBd0I7UUFBeEIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFFdEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxXQUFXLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3pFLENBQUM7SUF1QkQsV0FBVyxDQUNWLFNBQWdDLEVBQ2hDLFFBQWtCLEVBQ2xCLE9BQWUsRUFDZixrQkFBbUYsRUFDbkYsSUFBd0M7UUFFeEMsTUFBTSxPQUFPLEdBQTZCO1lBQ3pDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVSxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsV0FBVyxJQUFJLFNBQVMsQ0FBQyxJQUFJLEVBQUU7U0FDNUYsQ0FBQTtRQUNELElBQUksS0FBc0MsQ0FBQTtRQUUxQyxJQUFJLE9BQU8sa0JBQWtCLEtBQUssUUFBUSxJQUFJLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLENBQUM7WUFDakYs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