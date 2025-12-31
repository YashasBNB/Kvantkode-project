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
import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable, DisposableMap } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { ILanguageModelToolsService, } from '../../contrib/chat/common/languageModelToolsService.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
let MainThreadLanguageModelTools = class MainThreadLanguageModelTools extends Disposable {
    constructor(extHostContext, _languageModelToolsService) {
        super();
        this._languageModelToolsService = _languageModelToolsService;
        this._tools = this._register(new DisposableMap());
        this._countTokenCallbacks = new Map();
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostLanguageModelTools);
        this._register(this._languageModelToolsService.onDidChangeTools((e) => this._proxy.$onDidChangeTools([...this._languageModelToolsService.getTools()])));
    }
    async $getTools() {
        return Array.from(this._languageModelToolsService.getTools());
    }
    async $invokeTool(dto, token) {
        const result = await this._languageModelToolsService.invokeTool(dto, (input, token) => this._proxy.$countTokensForInvocation(dto.callId, input, token), token ?? CancellationToken.None);
        // Don't return extra metadata to EH
        return {
            content: result.content,
        };
    }
    $countTokensForInvocation(callId, input, token) {
        const fn = this._countTokenCallbacks.get(callId);
        if (!fn) {
            throw new Error(`Tool invocation call ${callId} not found`);
        }
        return fn(input, token);
    }
    $registerTool(id) {
        const disposable = this._languageModelToolsService.registerToolImplementation(id, {
            invoke: async (dto, countTokens, token) => {
                try {
                    this._countTokenCallbacks.set(dto.callId, countTokens);
                    const resultDto = await this._proxy.$invokeTool(dto, token);
                    return revive(resultDto);
                }
                finally {
                    this._countTokenCallbacks.delete(dto.callId);
                }
            },
            prepareToolInvocation: (parameters, token) => this._proxy.$prepareToolInvocation(id, parameters, token),
        });
        this._tools.set(id, disposable);
    }
    $unregisterTool(name) {
        this._tools.deleteAndDispose(name);
    }
};
MainThreadLanguageModelTools = __decorate([
    extHostNamedCustomer(MainContext.MainThreadLanguageModelTools),
    __param(1, ILanguageModelToolsService)
], MainThreadLanguageModelTools);
export { MainThreadLanguageModelTools };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkTGFuZ3VhZ2VNb2RlbFRvb2xzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFFTiwwQkFBMEIsR0FJMUIsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFFN0QsT0FBTyxFQUNOLGNBQWMsRUFFZCxXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUcvQixJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUNaLFNBQVEsVUFBVTtJQU9sQixZQUNDLGNBQStCLEVBRS9CLDBCQUF1RTtRQUV2RSxLQUFLLEVBQUUsQ0FBQTtRQUZVLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNEI7UUFOdkQsV0FBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQVUsQ0FBQyxDQUFBO1FBQ3BELHlCQUFvQixHQUFHLElBQUksR0FBRyxFQUE2QyxDQUFBO1FBUTNGLElBQUksQ0FBQyxNQUFNLEdBQUcsY0FBYyxDQUFDLFFBQVEsQ0FBQyxjQUFjLENBQUMseUJBQXlCLENBQUMsQ0FBQTtRQUUvRSxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENB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