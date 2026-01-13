/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { raceCancellation } from '../../../base/common/async.js';
import { CancellationToken } from '../../../base/common/cancellation.js';
import { CancellationError } from '../../../base/common/errors.js';
import { toDisposable } from '../../../base/common/lifecycle.js';
import { revive } from '../../../base/common/marshalling.js';
import { generateUuid } from '../../../base/common/uuid.js';
import { isToolInvocationContext, } from '../../contrib/chat/common/languageModelToolsService.js';
import { checkProposedApiEnabled, isProposedApiEnabled, } from '../../services/extensions/common/extensions.js';
import { MainContext, } from './extHost.protocol.js';
import * as typeConvert from './extHostTypeConverters.js';
import { InternalFetchWebPageToolId, } from '../../contrib/chat/common/tools/tools.js';
import { EditToolData, InternalEditToolId, EditToolInputProcessor, ExtensionEditToolId, } from '../../contrib/chat/common/tools/editFileTool.js';
export class ExtHostLanguageModelTools {
    constructor(mainContext, _languageModels) {
        this._languageModels = _languageModels;
        /** A map of tools that were registered in this EH */
        this._registeredTools = new Map();
        this._tokenCountFuncs = new Map();
        /** A map of all known tools, from other EHs or registered in vscode core */
        this._allTools = new Map();
        this._toolInputProcessors = new Map();
        this._proxy = mainContext.getProxy(MainContext.MainThreadLanguageModelTools);
        this._proxy.$getTools().then((tools) => {
            for (const tool of tools) {
                this._allTools.set(tool.id, revive(tool));
            }
        });
        this._toolInputProcessors.set(EditToolData.id, new EditToolInputProcessor());
    }
    async $countTokensForInvocation(callId, input, token) {
        const fn = this._tokenCountFuncs.get(callId);
        if (!fn) {
            throw new Error(`Tool invocation call ${callId} not found`);
        }
        return await fn(input, token);
    }
    async invokeTool(extension, toolId, options, token) {
        const callId = generateUuid();
        if (options.tokenizationOptions) {
            this._tokenCountFuncs.set(callId, options.tokenizationOptions.countTokens);
        }
        try {
            if (options.toolInvocationToken && !isToolInvocationContext(options.toolInvocationToken)) {
                throw new Error(`Invalid tool invocation token`);
            }
            if ((toolId === InternalEditToolId || toolId === ExtensionEditToolId) &&
                !isProposedApiEnabled(extension, 'chatParticipantPrivate')) {
                throw new Error(`Invalid tool: ${toolId}`);
            }
            // Making the round trip here because not all tools were necessarily registered in this EH
            const processedInput = this._toolInputProcessors.get(toolId)?.processInput(options.input) ?? options.input;
            const result = await this._proxy.$invokeTool({
                toolId,
                callId,
                parameters: processedInput,
                tokenBudget: options.tokenizationOptions?.tokenBudget,
                context: options.toolInvocationToken,
                chatRequestId: isProposedApiEnabled(extension, 'chatParticipantPrivate')
                    ? options.chatRequestId
                    : undefined,
                chatInteractionId: isProposedApiEnabled(extension, 'chatParticipantPrivate')
                    ? options.chatInteractionId
                    : undefined,
            }, token);
            return typeConvert.LanguageModelToolResult.to(revive(result));
        }
        finally {
            this._tokenCountFuncs.delete(callId);
        }
    }
    $onDidChangeTools(tools) {
        this._allTools.clear();
        for (const tool of tools) {
            this._allTools.set(tool.id, tool);
        }
    }
    getTools(extension) {
        return Array.from(this._allTools.values())
            .map((tool) => typeConvert.LanguageModelToolDescription.to(tool))
            .filter((tool) => {
            switch (tool.name) {
                case InternalEditToolId:
                case ExtensionEditToolId:
                case InternalFetchWebPageToolId:
                    return isProposedApiEnabled(extension, 'chatParticipantPrivate');
                default:
                    return true;
            }
        });
    }
    async $invokeTool(dto, token) {
        const item = this._registeredTools.get(dto.toolId);
        if (!item) {
            throw new Error(`Unknown tool ${dto.toolId}`);
        }
        const options = {
            input: dto.parameters,
            toolInvocationToken: dto.context,
        };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate')) {
            options.chatRequestId = dto.chatRequestId;
            options.chatInteractionId = dto.chatInteractionId;
            options.chatSessionId = dto.context?.sessionId;
            if (dto.toolSpecificData?.kind === 'terminal') {
                options.terminalCommand = dto.toolSpecificData.command;
            }
        }
        if (isProposedApiEnabled(item.extension, 'chatParticipantAdditions') && dto.modelId) {
            options.model = await this.getModel(dto.modelId, item.extension);
        }
        if (dto.tokenBudget !== undefined) {
            options.tokenizationOptions = {
                tokenBudget: dto.tokenBudget,
                countTokens: this._tokenCountFuncs.get(dto.callId) ||
                    ((value, token = CancellationToken.None) => this._proxy.$countTokensForInvocation(dto.callId, value, token)),
            };
        }
        const extensionResult = await raceCancellation(Promise.resolve(item.tool.invoke(options, token)), token);
        if (!extensionResult) {
            throw new CancellationError();
        }
        return typeConvert.LanguageModelToolResult.from(extensionResult, item.extension);
    }
    async getModel(modelId, extension) {
        let model;
        if (modelId) {
            model = await this._languageModels.getLanguageModelByIdentifier(extension, modelId);
        }
        if (!model) {
            model = await this._languageModels.getDefaultLanguageModel(extension);
            if (!model) {
                throw new Error('Language model unavailable');
            }
        }
        return model;
    }
    async $prepareToolInvocation(toolId, input, token) {
        const item = this._registeredTools.get(toolId);
        if (!item) {
            throw new Error(`Unknown tool ${toolId}`);
        }
        const options = { input };
        if (isProposedApiEnabled(item.extension, 'chatParticipantPrivate') &&
            item.tool.prepareInvocation2) {
            const result = await item.tool.prepareInvocation2(options, token);
            if (!result) {
                return undefined;
            }
            return {
                confirmationMessages: result.confirmationMessages
                    ? {
                        title: result.confirmationMessages.title,
                        message: typeof result.confirmationMessages.message === 'string'
                            ? result.confirmationMessages.message
                            : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                    }
                    : undefined,
                toolSpecificData: {
                    kind: 'terminal',
                    language: result.language,
                    command: result.command,
                },
            };
        }
        else if (item.tool.prepareInvocation) {
            const result = await item.tool.prepareInvocation(options, token);
            if (!result) {
                return undefined;
            }
            if (result.pastTenseMessage || result.presentation) {
                checkProposedApiEnabled(item.extension, 'chatParticipantPrivate');
            }
            return {
                confirmationMessages: result.confirmationMessages
                    ? {
                        title: result.confirmationMessages.title,
                        message: typeof result.confirmationMessages.message === 'string'
                            ? result.confirmationMessages.message
                            : typeConvert.MarkdownString.from(result.confirmationMessages.message),
                    }
                    : undefined,
                invocationMessage: typeConvert.MarkdownString.fromStrict(result.invocationMessage),
                pastTenseMessage: typeConvert.MarkdownString.fromStrict(result.pastTenseMessage),
                presentation: result.presentation,
            };
        }
        return undefined;
    }
    registerTool(extension, id, tool) {
        this._registeredTools.set(id, { extension, tool });
        this._proxy.$registerTool(id);
        return toDisposable(() => {
            this._registeredTools.delete(id);
            this._proxy.$unregisterTool(id);
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNsRSxPQUFPLEVBQWUsWUFBWSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUUzRCxPQUFPLEVBRU4sdUJBQXVCLEdBSXZCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixvQkFBb0IsR0FDcEIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBSU4sV0FBVyxHQUVYLE1BQU0sdUJBQXVCLENBQUE7QUFDOUIsT0FBTyxLQUFLLFdBQVcsTUFBTSw0QkFBNEIsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUNOLFlBQVksRUFDWixrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLG1CQUFtQixHQUNuQixNQUFNLGlEQUFpRCxDQUFBO0FBSXhELE1BQU0sT0FBTyx5QkFBeUI7SUFpQnJDLFlBQ0MsV0FBeUIsRUFDUixlQUFzQztRQUF0QyxvQkFBZSxHQUFmLGVBQWUsQ0FBdUI7UUFs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