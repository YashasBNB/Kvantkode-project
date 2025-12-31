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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFBhcnNlclR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vY2hhdFBhcnNlclR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFnQixXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUV6RixPQUFPLEVBSU4scUJBQXFCLEdBQ3JCLE1BQU0saUJBQWlCLENBQUE7QUFDeEIsT0FBTyxFQUE2QixrQ0FBa0MsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBc0I5RixNQUFNLFVBQVUsYUFBYSxDQUFDLE9BQTJCO0lBQ3hELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxLQUFLO1NBQzNCLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztTQUN4QixJQUFJLENBQUMsRUFBRSxDQUFDO1NBQ1IsU0FBUyxFQUFFLENBQUE7SUFDYixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFBO0lBRWpELE9BQU8sRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUE7QUFDekIsQ0FBQztBQUVELE1BQU0sT0FBTyxtQkFBbUI7YUFDZixTQUFJLEdBQUcsTUFBTSxBQUFULENBQVM7SUFFN0IsWUFDVSxLQUFrQixFQUNsQixXQUFtQixFQUNuQixJQUFZO1FBRlosVUFBSyxHQUFMLEtBQUssQ0FBYTtRQUNsQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixTQUFJLEdBQUosSUFBSSxDQUFRO1FBSmIs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