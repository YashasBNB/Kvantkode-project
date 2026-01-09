/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { revive } from '../../../../base/common/marshalling.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { reviveSerializedAgent, } from './chatAgents.js';
import { IDiagnosticVariableEntryFilterData } from './chatModel.js';
export function getPromptText(request) {
    const message = request.parts
        .map((r) => r.promptText)
        .join('')
        .trimStart();
    const diff = request.text.length - message.length;
    return { message, diff };
}
export class ChatRequestTextPart {
    static { this.Kind = 'text'; }
    constructor(range, editorRange, text) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.kind = ChatRequestTextPart.Kind;
    }
    get promptText() {
        return this.text;
    }
}
// warning, these also show up in a regex in the parser
export const chatVariableLeader = '#';
export const chatAgentLeader = '@';
export const chatSubcommandLeader = '/';
/**
 * An invocation of a static variable that can be resolved by the variable service
 * @deprecated, but kept for backwards compatibility with old persisted chat requests
 */
class ChatRequestVariablePart {
    static { this.Kind = 'var'; }
    constructor(range, editorRange, variableName, variableArg, variableId) {
        this.range = range;
        this.editorRange = editorRange;
        this.variableName = variableName;
        this.variableArg = variableArg;
        this.variableId = variableId;
        this.kind = ChatRequestVariablePart.Kind;
    }
    get text() {
        const argPart = this.variableArg ? `:${this.variableArg}` : '';
        return `${chatVariableLeader}${this.variableName}${argPart}`;
    }
    get promptText() {
        return this.text;
    }
}
/**
 * An invocation of a tool
 */
export class ChatRequestToolPart {
    static { this.Kind = 'tool'; }
    constructor(range, editorRange, toolName, toolId, displayName, icon) {
        this.range = range;
        this.editorRange = editorRange;
        this.toolName = toolName;
        this.toolId = toolId;
        this.displayName = displayName;
        this.icon = icon;
        this.kind = ChatRequestToolPart.Kind;
    }
    get text() {
        return `${chatVariableLeader}${this.toolName}`;
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        return {
            id: this.toolId,
            name: this.toolName,
            range: this.range,
            value: undefined,
            isTool: true,
            icon: ThemeIcon.isThemeIcon(this.icon) ? this.icon : undefined,
            fullName: this.displayName,
        };
    }
}
/**
 * An invocation of an agent that can be resolved by the agent service
 */
export class ChatRequestAgentPart {
    static { this.Kind = 'agent'; }
    constructor(range, editorRange, agent) {
        this.range = range;
        this.editorRange = editorRange;
        this.agent = agent;
        this.kind = ChatRequestAgentPart.Kind;
    }
    get text() {
        return `${chatAgentLeader}${this.agent.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of an agent's subcommand
 */
export class ChatRequestAgentSubcommandPart {
    static { this.Kind = 'subcommand'; }
    constructor(range, editorRange, command) {
        this.range = range;
        this.editorRange = editorRange;
        this.command = command;
        this.kind = ChatRequestAgentSubcommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.command.name}`;
    }
    get promptText() {
        return '';
    }
}
/**
 * An invocation of a standalone slash command
 */
export class ChatRequestSlashCommandPart {
    static { this.Kind = 'slash'; }
    constructor(range, editorRange, slashCommand) {
        this.range = range;
        this.editorRange = editorRange;
        this.slashCommand = slashCommand;
        this.kind = ChatRequestSlashCommandPart.Kind;
    }
    get text() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
    get promptText() {
        return `${chatSubcommandLeader}${this.slashCommand.command}`;
    }
}
/**
 * An invocation of a dynamic reference like '#file:'
 */
export class ChatRequestDynamicVariablePart {
    static { this.Kind = 'dynamic'; }
    constructor(range, editorRange, text, id, modelDescription, data, fullName, icon, isFile, isDirectory) {
        this.range = range;
        this.editorRange = editorRange;
        this.text = text;
        this.id = id;
        this.modelDescription = modelDescription;
        this.data = data;
        this.fullName = fullName;
        this.icon = icon;
        this.isFile = isFile;
        this.isDirectory = isDirectory;
        this.kind = ChatRequestDynamicVariablePart.Kind;
    }
    get referenceText() {
        return this.text.replace(chatVariableLeader, '');
    }
    get promptText() {
        return this.text;
    }
    toVariableEntry() {
        if (this.id === 'vscode.problems') {
            return IDiagnosticVariableEntryFilterData.toEntry(this.data.filter);
        }
        return {
            id: this.id,
            name: this.referenceText,
            range: this.range,
            value: this.data,
            fullName: this.fullName,
            icon: this.icon,
            isFile: this.isFile,
            isDirectory: this.isDirectory,
        };
    }
}
export function reviveParsedChatRequest(serialized) {
    return {
        text: serialized.text,
        parts: serialized.parts.map((part) => {
            if (part.kind === ChatRequestTextPart.Kind) {
                return new ChatRequestTextPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text);
            }
            else if (part.kind === ChatRequestVariablePart.Kind) {
                return new ChatRequestVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.variableName, part.variableArg, part.variableId || '');
            }
            else if (part.kind === ChatRequestToolPart.Kind) {
                return new ChatRequestToolPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.toolName, part.toolId, part.displayName, part.icon);
            }
            else if (part.kind === ChatRequestAgentPart.Kind) {
                let agent = part.agent;
                agent = reviveSerializedAgent(agent);
                return new ChatRequestAgentPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, agent);
            }
            else if (part.kind === ChatRequestAgentSubcommandPart.Kind) {
                return new ChatRequestAgentSubcommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.command);
            }
            else if (part.kind === ChatRequestSlashCommandPart.Kind) {
                return new ChatRequestSlashCommandPart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.slashCommand);
            }
            else if (part.kind === ChatRequestDynamicVariablePart.Kind) {
                return new ChatRequestDynamicVariablePart(new OffsetRange(part.range.start, part.range.endExclusive), part.editorRange, part.text, part.id, part.modelDescription, revive(part.data), part.fullName, part.icon, part.isFile, part.isDirectory);
            }
            else {
                throw new Error(`Unknown chat request part: ${part.kind}`);
            }
        }),
    };
}
export function extractAgentAndCommand(parsed) {
    const agentPart = parsed.parts.find((r) => r instanceof ChatRequestAgentPart);
    const commandPart = parsed.parts.find((r) => r instanceof ChatRequestAgentSubcommandPart);
    return { agentPart, commandPart };
}
export function formatChatQuestion(chatAgentService, location, prompt, participant = null, command = null) {
    let question = '';
    if (participant && participant !== chatAgentService.getDefaultAgent(location)?.id) {
        const agent = chatAgentService.getAgent(participant);
        if (!agent) {
            // Refers to agent that doesn't exist
            return undefined;
        }
        question += `${chatAgentLeader}${agent.name} `;
        if (command) {
            question += `${chatSubcommandLeader}${command} `;
        }
    }
    return question + prompt;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0UGFyc2VyVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQWdCLFdBQVcsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXpGLE9BQU8sRUFJTixxQkFBcUIsR0FDckIsTUFBTSxpQkFBaUIsQ0FBQTtBQUN4QixPQUFPLEVBQTZCLGtDQUFrQyxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFzQjlGLE1BQU0sVUFBVSxhQUFhLENBQUMsT0FBMkI7SUFDeEQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLEtBQUs7U0FDM0IsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO1NBQ3hCLElBQUksQ0FBQyxFQUFFLENBQUM7U0FDUixTQUFTLEVBQUUsQ0FBQTtJQUNiLE1BQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLE9BQU8sQ0FBQyxNQUFNLENBQUE7SUFFakQsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQTtBQUN6QixDQUFDO0FBRUQsTUFBTSxPQUFPLG1CQUFtQjthQUNmLFNBQUksR0FBRyxNQUFNLEFBQVQsQ0FBUztJQUU3QixZQUNVLEtBQWtCLEVBQ2xCLFdBQW1CLEVBQ25CLElBQVk7UUFGWixVQUFLLEdBQUwsS0FBSyxDQUFhO1FBQ2xCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFNB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