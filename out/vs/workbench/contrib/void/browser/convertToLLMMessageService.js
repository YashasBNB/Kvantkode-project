var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable } from '../../../../base/common/lifecycle.js';
import { deepClone } from '../../../../base/common/objects.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { getIsReasoningEnabledState, getReservedOutputTokenSpace, getModelCapabilities, } from '../common/modelCapabilities.js';
import { reParsedToolXMLString, chat_systemMessage } from '../common/prompt/prompts.js';
import { IVoidSettingsService } from '../common/voidSettingsService.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { ITerminalToolService } from './terminalToolService.js';
import { IVoidModelService } from '../common/voidModelService.js';
import { URI } from '../../../../base/common/uri.js';
import { IMCPService } from '../common/mcpService.js';
export const EMPTY_MESSAGE = '(empty message)';
const CHARS_PER_TOKEN = 4; // assume abysmal chars per token
const TRIM_TO_LEN = 120;
// convert messages as if about to send to openai
/*
reference - https://platform.openai.com/docs/guides/function-calling#function-calling-steps
openai MESSAGE (role=assistant):
"tool_calls":[{
    "type": "function",
    "id": "call_12345xyz",
    "function": {
    "name": "get_weather",
    "arguments": "{\"latitude\":48.8566,\"longitude\":2.3522}"
}]

openai RESPONSE (role=user):
{   "role": "tool",
    "tool_call_id": tool_call.id,
    "content": str(result)    }

also see
openai on prompting - https://platform.openai.com/docs/guides/reasoning#advice-on-prompting
openai on developer system message - https://cdn.openai.com/spec/model-spec-2024-05-08.html#follow-the-chain-of-command
*/
const prepareMessages_openai_tools = (messages) => {
    const newMessages = [];
    for (let i = 0; i < messages.length; i += 1) {
        const currMsg = messages[i];
        if (currMsg.role !== 'tool') {
            newMessages.push(currMsg);
            continue;
        }
        // edit previous assistant message to have called the tool
        const prevMsg = 0 <= i - 1 && i - 1 <= newMessages.length ? newMessages[i - 1] : undefined;
        if (prevMsg?.role === 'assistant') {
            prevMsg.tool_calls = [
                {
                    type: 'function',
                    id: currMsg.id,
                    function: {
                        name: currMsg.name,
                        arguments: JSON.stringify(currMsg.rawParams),
                    },
                },
            ];
        }
        // add the tool
        newMessages.push({
            role: 'tool',
            tool_call_id: currMsg.id,
            content: currMsg.content,
        });
    }
    return newMessages;
};
const prepareMessages_anthropic_tools = (messages, supportsAnthropicReasoning) => {
    const newMessages = messages;
    for (let i = 0; i < messages.length; i += 1) {
        const currMsg = messages[i];
        // add anthropic reasoning
        if (currMsg.role === 'assistant') {
            if (currMsg.anthropicReasoning && supportsAnthropicReasoning) {
                const content = currMsg.content;
                newMessages[i] = {
                    role: 'assistant',
                    content: content
                        ? [...currMsg.anthropicReasoning, { type: 'text', text: content }]
                        : currMsg.anthropicReasoning,
                };
            }
            else {
                newMessages[i] = {
                    role: 'assistant',
                    content: currMsg.content,
                    // strip away anthropicReasoning
                };
            }
            continue;
        }
        if (currMsg.role === 'user') {
            newMessages[i] = {
                role: 'user',
                content: currMsg.content,
            };
            continue;
        }
        if (currMsg.role === 'tool') {
            // add anthropic tools
            const prevMsg = 0 <= i - 1 && i - 1 <= newMessages.length ? newMessages[i - 1] : undefined;
            // make it so the assistant called the tool
            if (prevMsg?.role === 'assistant') {
                if (typeof prevMsg.content === 'string')
                    prevMsg.content = [{ type: 'text', text: prevMsg.content }];
                prevMsg.content.push({
                    type: 'tool_use',
                    id: currMsg.id,
                    name: currMsg.name,
                    input: currMsg.rawParams,
                });
            }
            // turn each tool into a user message with tool results at the end
            newMessages[i] = {
                role: 'user',
                content: [{ type: 'tool_result', tool_use_id: currMsg.id, content: currMsg.content }],
            };
            continue;
        }
    }
    // we just removed the tools
    return newMessages;
};
const prepareMessages_XML_tools = (messages, supportsAnthropicReasoning) => {
    const llmChatMessages = [];
    for (let i = 0; i < messages.length; i += 1) {
        const c = messages[i];
        const next = 0 <= i + 1 && i + 1 <= messages.length - 1 ? messages[i + 1] : null;
        if (c.role === 'assistant') {
            // if called a tool (message after it), re-add its XML to the message
            // alternatively, could just hold onto the original output, but this way requires less piping raw strings everywhere
            let content = c.content;
            if (next?.role === 'tool') {
                content = `${content}\n\n${reParsedToolXMLString(next.name, next.rawParams)}`;
            }
            // anthropic reasoning
            if (c.anthropicReasoning && supportsAnthropicReasoning) {
                content = content
                    ? [...c.anthropicReasoning, { type: 'text', text: content }]
                    : c.anthropicReasoning;
            }
            llmChatMessages.push({
                role: 'assistant',
                content,
            });
        }
        // add user or tool to the previous user message
        else if (c.role === 'user' || c.role === 'tool') {
            if (c.role === 'tool')
                c.content = `<${c.name}_result>\n${c.content}\n</${c.name}_result>`;
            if (llmChatMessages.length === 0 ||
                llmChatMessages[llmChatMessages.length - 1].role !== 'user')
                llmChatMessages.push({
                    role: 'user',
                    content: c.content,
                });
            else
                llmChatMessages[llmChatMessages.length - 1].content += '\n\n' + c.content;
        }
    }
    return llmChatMessages;
};
// --- CHAT ---
const prepareOpenAIOrAnthropicMessages = ({ messages: messages_, systemMessage, aiInstructions, supportsSystemMessage, specialToolFormat, supportsAnthropicReasoning, contextWindow, reservedOutputTokenSpace, }) => {
    reservedOutputTokenSpace = Math.max((contextWindow * 1) / 2, // reserve at least 1/4 of the token window length
    reservedOutputTokenSpace ?? 4_096);
    let messages = deepClone(messages_);
    // ================ system message ================
    // A COMPLETE HACK: last message is system message for context purposes
    const sysMsgParts = [];
    if (aiInstructions)
        sysMsgParts.push(`GUIDELINES (from the user's .voidrules file):\n${aiInstructions}`);
    if (systemMessage)
        sysMsgParts.push(systemMessage);
    const combinedSystemMessage = sysMsgParts.join('\n\n');
    messages.unshift({ role: 'system', content: combinedSystemMessage });
    // ================ trim ================
    messages = messages.map((m) => ({
        ...m,
        content: m.role !== 'tool' ? m.content.trim() : m.content,
    }));
    // ================ fit into context ================
    // the higher the weight, the higher the desire to truncate - TRIM HIGHEST WEIGHT MESSAGES
    const alreadyTrimmedIdxes = new Set();
    const weight = (message, messages, idx) => {
        const base = message.content.length;
        let multiplier;
        multiplier = 1 + (messages.length - 1 - idx) / messages.length; // slow rampdown from 2 to 1 as index increases
        if (message.role === 'user') {
            multiplier *= 1;
        }
        else if (message.role === 'system') {
            multiplier *= 0.01; // very low weight
        }
        else {
            multiplier *= 10; // llm tokens are far less valuable than user tokens
        }
        // any already modified message should not be trimmed again
        if (alreadyTrimmedIdxes.has(idx)) {
            multiplier = 0;
        }
        // 1st and last messages should be very low weight
        if (idx <= 1 || idx >= messages.length - 1 - 3) {
            multiplier *= 0.05;
        }
        return base * multiplier;
    };
    const _findLargestByWeight = (messages_) => {
        let largestIndex = -1;
        let largestWeight = -Infinity;
        for (let i = 0; i < messages.length; i += 1) {
            const m = messages[i];
            const w = weight(m, messages_, i);
            if (w > largestWeight) {
                largestWeight = w;
                largestIndex = i;
            }
        }
        return largestIndex;
    };
    let totalLen = 0;
    for (const m of messages) {
        totalLen += m.content.length;
    }
    const charsNeedToTrim = totalLen -
        Math.max((contextWindow - reservedOutputTokenSpace) * CHARS_PER_TOKEN, // can be 0, in which case charsNeedToTrim=everything, bad
        5_000);
    // <----------------------------------------->
    // 0                      |    |             |
    //                        |    contextWindow |
    //                     contextWindow - maxOut|putTokens
    //                                          totalLen
    let remainingCharsToTrim = charsNeedToTrim;
    let i = 0;
    while (remainingCharsToTrim > 0) {
        i += 1;
        if (i > 100)
            break;
        const trimIdx = _findLargestByWeight(messages);
        const m = messages[trimIdx];
        // if can finish here, do
        const numCharsWillTrim = m.content.length - TRIM_TO_LEN;
        if (numCharsWillTrim > remainingCharsToTrim) {
            // trim remainingCharsToTrim + '...'.length chars
            m.content =
                m.content.slice(0, m.content.length - remainingCharsToTrim - '...'.length).trim() + '...';
            break;
        }
        remainingCharsToTrim -= numCharsWillTrim;
        m.content = m.content.substring(0, TRIM_TO_LEN - '...'.length) + '...';
        alreadyTrimmedIdxes.add(trimIdx);
    }
    // ================ system message hack ================
    const newSysMsg = messages.shift().content;
    // ================ tools and anthropicReasoning ================
    // SYSTEM MESSAGE HACK: we shifted (removed) the system message role, so now SimpleLLMMessage[] is valid
    let llmChatMessages = [];
    if (!specialToolFormat) {
        // XML tool behavior
        llmChatMessages = prepareMessages_XML_tools(messages, supportsAnthropicReasoning);
    }
    else if (specialToolFormat === 'anthropic-style') {
        llmChatMessages = prepareMessages_anthropic_tools(messages, supportsAnthropicReasoning);
    }
    else if (specialToolFormat === 'openai-style') {
        llmChatMessages = prepareMessages_openai_tools(messages);
    }
    const llmMessages = llmChatMessages;
    // ================ system message add as first llmMessage ================
    let separateSystemMessageStr = undefined;
    // if supports system message
    if (supportsSystemMessage) {
        if (supportsSystemMessage === 'separated')
            separateSystemMessageStr = newSysMsg;
        else if (supportsSystemMessage === 'system-role')
            llmMessages.unshift({ role: 'system', content: newSysMsg }); // add new first message
        else if (supportsSystemMessage === 'developer-role')
            llmMessages.unshift({ role: 'developer', content: newSysMsg }); // add new first message
    }
    // if does not support system message
    else {
        const newFirstMessage = {
            role: 'user',
            content: `<SYSTEM_MESSAGE>\n${newSysMsg}\n</SYSTEM_MESSAGE>\n${llmMessages[0].content}`,
        };
        llmMessages.splice(0, 1); // delete first message
        llmMessages.unshift(newFirstMessage); // add new first message
    }
    // ================ no empty message ================
    for (let i = 0; i < llmMessages.length; i += 1) {
        const currMsg = llmMessages[i];
        const nextMsg = llmMessages[i + 1];
        if (currMsg.role === 'tool')
            continue;
        // if content is a string, replace string with empty msg
        if (typeof currMsg.content === 'string') {
            currMsg.content = currMsg.content || EMPTY_MESSAGE;
        }
        else {
            // allowed to be empty if has a tool in it or following it
            if (currMsg.content.find((c) => c.type === 'tool_result' || c.type === 'tool_use')) {
                currMsg.content = currMsg.content.filter((c) => !(c.type === 'text' && !c.text));
                continue;
            }
            if (nextMsg?.role === 'tool')
                continue;
            // replace any empty text entries with empty msg, and make sure there's at least 1 entry
            for (const c of currMsg.content) {
                if (c.type === 'text')
                    c.text = c.text || EMPTY_MESSAGE;
            }
            if (currMsg.content.length === 0)
                currMsg.content = [{ type: 'text', text: EMPTY_MESSAGE }];
        }
    }
    return {
        messages: llmMessages,
        separateSystemMessage: separateSystemMessageStr,
    };
};
const prepareGeminiMessages = (messages) => {
    let latestToolName = undefined;
    const messages2 = messages
        .map((m) => {
        if (m.role === 'assistant') {
            if (typeof m.content === 'string') {
                return { role: 'model', parts: [{ text: m.content }] };
            }
            else {
                const parts = m.content
                    .map((c) => {
                    if (c.type === 'text') {
                        return { text: c.text };
                    }
                    else if (c.type === 'tool_use') {
                        latestToolName = c.name;
                        return { functionCall: { id: c.id, name: c.name, args: c.input } };
                    }
                    else
                        return null;
                })
                    .filter((m) => !!m);
                return { role: 'model', parts };
            }
        }
        else if (m.role === 'user') {
            if (typeof m.content === 'string') {
                return { role: 'user', parts: [{ text: m.content }] };
            }
            else {
                const parts = m.content
                    .map((c) => {
                    if (c.type === 'text') {
                        return { text: c.text };
                    }
                    else if (c.type === 'tool_result') {
                        if (!latestToolName)
                            return null;
                        return {
                            functionResponse: {
                                id: c.tool_use_id,
                                name: latestToolName,
                                response: { output: c.content },
                            },
                        };
                    }
                    else
                        return null;
                })
                    .filter((m) => !!m);
                return { role: 'user', parts };
            }
        }
        else
            return null;
    })
        .filter((m) => !!m);
    return messages2;
};
const prepareMessages = (params) => {
    const specialFormat = params.specialToolFormat; // this is just for ts stupidness
    // if need to convert to gemini style of messaes, do that (treat as anthropic style, then convert to gemini style)
    if (params.providerName === 'gemini' || specialFormat === 'gemini-style') {
        const res = prepareOpenAIOrAnthropicMessages({
            ...params,
            specialToolFormat: specialFormat === 'gemini-style' ? 'anthropic-style' : undefined,
        });
        const messages = res.messages;
        const messages2 = prepareGeminiMessages(messages);
        return { messages: messages2, separateSystemMessage: res.separateSystemMessage };
    }
    return prepareOpenAIOrAnthropicMessages({ ...params, specialToolFormat: specialFormat });
};
export const IConvertToLLMMessageService = createDecorator('ConvertToLLMMessageService');
let ConvertToLLMMessageService = class ConvertToLLMMessageService extends Disposable {
    constructor(modelService, workspaceContextService, editorService, directoryStrService, terminalToolService, voidSettingsService, voidModelService, mcpService) {
        super();
        this.modelService = modelService;
        this.workspaceContextService = workspaceContextService;
        this.editorService = editorService;
        this.directoryStrService = directoryStrService;
        this.terminalToolService = terminalToolService;
        this.voidSettingsService = voidSettingsService;
        this.voidModelService = voidModelService;
        this.mcpService = mcpService;
        // system message
        this._generateChatMessagesSystemMessage = async (chatMode, specialToolFormat) => {
            const workspaceFolders = this.workspaceContextService
                .getWorkspace()
                .folders.map((f) => f.uri.fsPath);
            const openedURIs = this.modelService
                .getModels()
                .filter((m) => m.isAttachedToEditor())
                .map((m) => m.uri.fsPath) || [];
            const activeURI = this.editorService.activeEditor?.resource?.fsPath;
            const directoryStr = await this.directoryStrService.getAllDirectoriesStr({
                cutOffMessage: chatMode === 'agent' || chatMode === 'gather'
                    ? `...Directories string cut off, use tools to read more...`
                    : `...Directories string cut off, ask user for more if necessary...`,
            });
            const includeXMLToolDefinitions = !specialToolFormat;
            const mcpTools = this.mcpService.getMCPTools();
            const persistentTerminalIDs = this.terminalToolService.listPersistentTerminalIds();
            const systemMessage = chat_systemMessage({
                workspaceFolders,
                openedURIs,
                directoryStr,
                activeURI,
                persistentTerminalIDs,
                chatMode,
                mcpTools,
                includeXMLToolDefinitions,
            });
            return systemMessage;
        };
        this.prepareLLMSimpleMessages = ({ simpleMessages, systemMessage, modelSelection, featureName, }) => {
            if (modelSelection === null)
                return { messages: [], separateSystemMessage: undefined };
            const { overridesOfModel } = this.voidSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const modelSelectionOptions = this.voidSettingsService.state.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined AI instructions
            const aiInstructions = this._getCombinedAIInstructions();
            const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel);
            const reservedOutputTokenSpace = getReservedOutputTokenSpace(providerName, modelName, {
                isReasoningEnabled,
                overridesOfModel,
            });
            const { messages, separateSystemMessage } = prepareMessages({
                messages: simpleMessages,
                systemMessage,
                aiInstructions,
                supportsSystemMessage,
                specialToolFormat,
                supportsAnthropicReasoning: providerName === 'anthropic',
                contextWindow,
                reservedOutputTokenSpace,
                providerName,
            });
            return { messages, separateSystemMessage };
        };
        this.prepareLLMChatMessages = async ({ chatMessages, chatMode, modelSelection, }) => {
            if (modelSelection === null)
                return { messages: [], separateSystemMessage: undefined };
            const { overridesOfModel } = this.voidSettingsService.state;
            const { providerName, modelName } = modelSelection;
            const { specialToolFormat, contextWindow, supportsSystemMessage } = getModelCapabilities(providerName, modelName, overridesOfModel);
            const { disableSystemMessage } = this.voidSettingsService.state.globalSettings;
            const fullSystemMessage = await this._generateChatMessagesSystemMessage(chatMode, specialToolFormat);
            const systemMessage = disableSystemMessage ? '' : fullSystemMessage;
            const modelSelectionOptions = this.voidSettingsService.state.optionsOfModelSelection['Chat'][modelSelection.providerName]?.[modelSelection.modelName];
            // Get combined AI instructions
            const aiInstructions = this._getCombinedAIInstructions();
            const isReasoningEnabled = getIsReasoningEnabledState('Chat', providerName, modelName, modelSelectionOptions, overridesOfModel);
            const reservedOutputTokenSpace = getReservedOutputTokenSpace(providerName, modelName, {
                isReasoningEnabled,
                overridesOfModel,
            });
            const llmMessages = this._chatMessagesToSimpleMessages(chatMessages);
            const { messages, separateSystemMessage } = prepareMessages({
                messages: llmMessages,
                systemMessage,
                aiInstructions,
                supportsSystemMessage,
                specialToolFormat,
                supportsAnthropicReasoning: providerName === 'anthropic',
                contextWindow,
                reservedOutputTokenSpace,
                providerName,
            });
            return { messages, separateSystemMessage };
        };
        // --- FIM ---
        this.prepareFIMMessage = ({ messages }) => {
            // Get combined AI instructions with the provided aiInstructions as the base
            const combinedInstructions = this._getCombinedAIInstructions();
            let prefix = `\
${!combinedInstructions
                ? ''
                : `\
// Instructions:
// Do not output an explanation. Try to avoid outputting comments. Only output the middle code.
${combinedInstructions
                    .split('\n')
                    .map((line) => `//${line}`)
                    .join('\n')}`}

${messages.prefix}`;
            const suffix = messages.suffix;
            const stopTokens = messages.stopTokens;
            return { prefix, suffix, stopTokens };
        };
    }
    // Read .voidrules files from workspace folders
    _getVoidRulesFileContents() {
        try {
            const workspaceFolders = this.workspaceContextService.getWorkspace().folders;
            let voidRules = '';
            for (const folder of workspaceFolders) {
                const uri = URI.joinPath(folder.uri, '.voidrules');
                const { model } = this.voidModelService.getModel(uri);
                if (!model)
                    continue;
                voidRules += model.getValue(1 /* EndOfLinePreference.LF */) + '\n\n';
            }
            return voidRules.trim();
        }
        catch (e) {
            return '';
        }
    }
    // Get combined AI instructions from settings and .voidrules files
    _getCombinedAIInstructions() {
        const globalAIInstructions = this.voidSettingsService.state.globalSettings.aiInstructions;
        const voidRulesFileContent = this._getVoidRulesFileContents();
        const ans = [];
        if (globalAIInstructions)
            ans.push(globalAIInstructions);
        if (voidRulesFileContent)
            ans.push(voidRulesFileContent);
        return ans.join('\n\n');
    }
    // --- LLM Chat messages ---
    _chatMessagesToSimpleMessages(chatMessages) {
        const simpleLLMMessages = [];
        for (const m of chatMessages) {
            if (m.role === 'checkpoint')
                continue;
            if (m.role === 'interrupted_streaming_tool')
                continue;
            if (m.role === 'assistant') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.displayContent,
                    anthropicReasoning: m.anthropicReasoning,
                });
            }
            else if (m.role === 'tool') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.content,
                    name: m.name,
                    id: m.id,
                    rawParams: m.rawParams,
                });
            }
            else if (m.role === 'user') {
                simpleLLMMessages.push({
                    role: m.role,
                    content: m.content,
                });
            }
        }
        return simpleLLMMessages;
    }
};
ConvertToLLMMessageService = __decorate([
    __param(0, IModelService),
    __param(1, IWorkspaceContextService),
    __param(2, IEditorService),
    __param(3, IDirectoryStrService),
    __param(4, ITerminalToolService),
    __param(5, IVoidSettingsService),
    __param(6, IVoidModelService),
    __param(7, IMCPService)
], ConvertToLLMMessageService);
registerSingleton(IConvertToLLMMessageService, ConvertToLLMMessageService, 0 /* InstantiationType.Eager */);
/*
Gemini has this, but they're openai-compat so we don't need to implement this
gemini request:
{   "role": "assistant",
    "content": null,
    "function_call": {
        "name": "get_weather",
        "arguments": {
            "latitude": 48.8566,
            "longitude": 2.3522
        }
    }
}

gemini response:
{   "role": "assistant",
    "function_response": {
        "name": "get_weather",
            "response": {
            "temperature": "15°C",
                "condition": "Cloudy"
        }
    }
}
*/
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7O0FBQUEsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUNOLGlCQUFpQixHQUVqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFakYsT0FBTyxFQUNOLDBCQUEwQixFQUMxQiwyQkFBMkIsRUFDM0Isb0JBQW9CLEdBQ3BCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLGtCQUFrQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFVdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDakUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBR3BELE9BQU8sRUFBRSxXQUFX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