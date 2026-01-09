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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2t2YW50a29kZS9icm93c2VyL2NvbnZlcnRUb0xMTU1lc3NhZ2VTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDNUYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRWpGLE9BQU8sRUFDTiwwQkFBMEIsRUFDMUIsMkJBQTJCLEVBQzNCLG9CQUFvQixHQUNwQixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBVXZGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FB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