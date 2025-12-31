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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdExhbmd1YWdlTW9kZWxUb29scy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3RMYW5ndWFnZU1vZGVsVG9vbHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbEUsT0FBTyxFQUFlLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsT0FBTyxFQUVOLHVCQUF1QixHQUl2QixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsb0JBQW9CLEdBQ3BCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUlOLFdBQVcsR0FFWCxNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sS0FBSyxXQUFXLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUNOLDBCQUEwQixHQUUxQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFDTixZQUFZLEVBQ1osa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0QixtQkFBbUIsR0FDbkIsTUFBTSxpREFBaUQsQ0FBQTtBQUl4RCxNQUFNLE9BQU8seUJBQXlCO0lBaUJyQyxZQUNDLFdBQXlCLEVBQ1IsZUFBc0M7UUFBdEMsb0JBQWUsR0FBZixlQUFlLENBQXVCO1FBbEJ4RCxxREFBcUQ7UUFDcEMscUJBQWdC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