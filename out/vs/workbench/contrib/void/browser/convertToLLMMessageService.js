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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udmVydFRvTExNTWVzc2FnZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9jb252ZXJ0VG9MTE1NZXNzYWdlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVqRixPQUFPLEVBQ04sMEJBQTBCLEVBQzFCLDJCQUEyQixFQUMzQixvQkFBb0IsR0FDcEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQVV2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENB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