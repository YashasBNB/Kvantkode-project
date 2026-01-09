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
import { OffsetRange } from '../../../../editor/common/core/offsetRange.js';
import { Position } from '../../../../editor/common/core/position.js';
import { Range } from '../../../../editor/common/core/range.js';
import { IChatAgentService } from './chatAgents.js';
import { ChatRequestAgentPart, ChatRequestAgentSubcommandPart, ChatRequestDynamicVariablePart, ChatRequestSlashCommandPart, ChatRequestTextPart, ChatRequestToolPart, chatAgentLeader, chatSubcommandLeader, chatVariableLeader, } from './chatParserTypes.js';
import { IChatSlashCommandService } from './chatSlashCommands.js';
import { IChatVariablesService } from './chatVariables.js';
import { ChatAgentLocation, ChatMode } from './constants.js';
import { ILanguageModelToolsService } from './languageModelToolsService.js';
const agentReg = /^@([\w_\-\.]+)(?=(\s|$|\b))/i; // An @-agent
const variableReg = /^#([\w_\-]+)(:\d+)?(?=(\s|$|\b))/i; // A #-variable with an optional numeric : arg (@response:2)
const slashReg = /\/([\w_\-]+)(?=(\s|$|\b))/i; // A / command
let ChatRequestParser = class ChatRequestParser {
    constructor(agentService, variableService, slashCommandService, toolsService) {
        this.agentService = agentService;
        this.variableService = variableService;
        this.slashCommandService = slashCommandService;
        this.toolsService = toolsService;
    }
    parseChatRequest(sessionId, message, location = ChatAgentLocation.Panel, context) {
        const parts = [];
        const references = this.variableService.getDynamicVariables(sessionId); // must access this list before any async calls
        let lineNumber = 1;
        let column = 1;
        for (let i = 0; i < message.length; i++) {
            const previousChar = message.charAt(i - 1);
            const char = message.charAt(i);
            let newPart;
            if (previousChar.match(/\s/) || i === 0) {
                if (char === chatVariableLeader) {
                    newPart = this.tryToParseVariable(message.slice(i), i, new Position(lineNumber, column), parts);
                }
                else if (char === chatAgentLeader) {
                    newPart = this.tryToParseAgent(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                else if (char === chatSubcommandLeader) {
                    newPart = this.tryToParseSlashCommand(message.slice(i), message, i, new Position(lineNumber, column), parts, location, context);
                }
                if (!newPart) {
                    newPart = this.tryToParseDynamicVariable(message.slice(i), i, new Position(lineNumber, column), references);
                }
            }
            if (newPart) {
                if (i !== 0) {
                    // Insert a part for all the text we passed over, then insert the new parsed part
                    const previousPart = parts.at(-1);
                    const previousPartEnd = previousPart?.range.endExclusive ?? 0;
                    const previousPartEditorRangeEndLine = previousPart?.editorRange.endLineNumber ?? 1;
                    const previousPartEditorRangeEndCol = previousPart?.editorRange.endColumn ?? 1;
                    parts.push(new ChatRequestTextPart(new OffsetRange(previousPartEnd, i), new Range(previousPartEditorRangeEndLine, previousPartEditorRangeEndCol, lineNumber, column), message.slice(previousPartEnd, i)));
                }
                parts.push(newPart);
            }
            if (char === '\n') {
                lineNumber++;
                column = 1;
            }
            else {
                column++;
            }
        }
        const lastPart = parts.at(-1);
        const lastPartEnd = lastPart?.range.endExclusive ?? 0;
        if (lastPartEnd < message.length) {
            parts.push(new ChatRequestTextPart(new OffsetRange(lastPartEnd, message.length), new Range(lastPart?.editorRange.endLineNumber ?? 1, lastPart?.editorRange.endColumn ?? 1, lineNumber, column), message.slice(lastPartEnd, message.length)));
        }
        return {
            parts,
            text: message,
        };
    }
    tryToParseAgent(message, fullMessage, offset, position, parts, location, context) {
        const nextAgentMatch = message.match(agentReg);
        if (!nextAgentMatch || (context?.mode !== undefined && context.mode !== ChatMode.Ask)) {
            return;
        }
        const [full, name] = nextAgentMatch;
        const agentRange = new OffsetRange(offset, offset + full.length);
        const agentEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        let agents = this.agentService.getAgentsByName(name);
        if (!agents.length) {
            const fqAgent = this.agentService.getAgentByFullyQualifiedId(name);
            if (fqAgent) {
                agents = [fqAgent];
            }
        }
        // If there is more than one agent with this name, and the user picked it from the suggest widget, then the selected agent should be in the
        // context and we use that one.
        const agent = agents.length > 1 && context?.selectedAgent
            ? context.selectedAgent
            : agents.find((a) => a.locations.includes(location));
        if (!agent) {
            return;
        }
        if (parts.some((p) => p instanceof ChatRequestAgentPart)) {
            // Only one agent allowed
            return;
        }
        // The agent must come first
        if (parts.some((p) => (p instanceof ChatRequestTextPart && p.text.trim() !== '') ||
            !(p instanceof ChatRequestAgentPart))) {
            return;
        }
        const previousPart = parts.at(-1);
        const previousPartEnd = previousPart?.range.endExclusive ?? 0;
        const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
        if (textSincePreviousPart.trim() !== '') {
            return;
        }
        return new ChatRequestAgentPart(agentRange, agentEditorRange, agent);
    }
    tryToParseVariable(message, offset, position, parts) {
        const nextVariableMatch = message.match(variableReg);
        if (!nextVariableMatch) {
            return;
        }
        const [full, name] = nextVariableMatch;
        const varRange = new OffsetRange(offset, offset + full.length);
        const varEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const tool = this.toolsService.getToolByName(name);
        if (tool && tool.canBeReferencedInPrompt) {
            return new ChatRequestToolPart(varRange, varEditorRange, name, tool.id, tool.displayName, tool.icon);
        }
        return;
    }
    tryToParseSlashCommand(remainingMessage, fullMessage, offset, position, parts, location, context) {
        const nextSlashMatch = remainingMessage.match(slashReg);
        if (!nextSlashMatch) {
            return;
        }
        if (parts.some((p) => p instanceof ChatRequestSlashCommandPart)) {
            // Only one slash command allowed
            return;
        }
        const [full, command] = nextSlashMatch;
        const slashRange = new OffsetRange(offset, offset + full.length);
        const slashEditorRange = new Range(position.lineNumber, position.column, position.lineNumber, position.column + full.length);
        const usedAgent = parts.find((p) => p instanceof ChatRequestAgentPart);
        if (usedAgent) {
            // The slash command must come immediately after the agent
            if (parts.some((p) => (p instanceof ChatRequestTextPart && p.text.trim() !== '') ||
                (!(p instanceof ChatRequestAgentPart) && !(p instanceof ChatRequestTextPart)))) {
                return;
            }
            const previousPart = parts.at(-1);
            const previousPartEnd = previousPart?.range.endExclusive ?? 0;
            const textSincePreviousPart = fullMessage.slice(previousPartEnd, offset);
            if (textSincePreviousPart.trim() !== '') {
                return;
            }
            const subCommand = usedAgent.agent.slashCommands.find((c) => c.name === command);
            if (subCommand) {
                // Valid agent subcommand
                return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
            }
        }
        else {
            const slashCommands = this.slashCommandService.getCommands(location, context?.mode ?? ChatMode.Ask);
            const slashCommand = slashCommands.find((c) => c.command === command);
            if (slashCommand) {
                // Valid standalone slash command
                return new ChatRequestSlashCommandPart(slashRange, slashEditorRange, slashCommand);
            }
            else {
                // check for with default agent for this location
                const defaultAgent = this.agentService.getDefaultAgent(location, context?.mode);
                const subCommand = defaultAgent?.slashCommands.find((c) => c.name === command);
                if (subCommand) {
                    // Valid default agent subcommand
                    return new ChatRequestAgentSubcommandPart(slashRange, slashEditorRange, subCommand);
                }
            }
        }
        return;
    }
    tryToParseDynamicVariable(message, offset, position, references) {
        const refAtThisPosition = references.find((r) => r.range.startLineNumber === position.lineNumber && r.range.startColumn === position.column);
        if (refAtThisPosition) {
            const length = refAtThisPosition.range.endColumn - refAtThisPosition.range.startColumn;
            const text = message.substring(0, length);
            const range = new OffsetRange(offset, offset + length);
            return new ChatRequestDynamicVariablePart(range, refAtThisPosition.range, text, refAtThisPosition.id, refAtThisPosition.modelDescription, refAtThisPosition.data, refAtThisPosition.fullName, refAtThisPosition.icon, refAtThisPosition.isFile, refAtThisPosition.isDirectory);
        }
        return;
    }
};
ChatRequestParser = __decorate([
    __param(0, IChatAgentService),
    __param(1, IChatVariablesService),
    __param(2, IChatSlashCommandService),
    __param(3, ILanguageModelToolsService)
], ChatRequestParser);
export { ChatRequestParser };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRSZXF1ZXN0UGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUMzRSxPQUFPLEVBQWEsUUFBUSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBa0IsaUJBQWlCLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUNuRSxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLDhCQUE4QixFQUM5Qiw4QkFBOEIsRUFDOUIsMkJBQTJCLEVBQzNCLG1CQUFtQixFQUNuQixtQkFBbUIsRUFHbkIsZUFBZSxFQUNmLG9CQUFvQixFQUNwQixrQkFBa0IsR0FDbEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUM3QixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQW9CLE1BQU0sb0JBQW9CLENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLFFBQVEsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBQzVELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRTNFLE1BQU0sUUFBUSxHQUFHLDhCQUE4QixDQUFBLENBQUMsYUFBYTtBQUM3RCxNQUFNLFdBQVcsR0FBRyxtQ0FBbUMsQ0FBQSxDQUFDLDREQUE0RDtBQUNwSCxNQUFNLFFBQVEsR0FBRyw0QkFBNEIsQ0FBQSxDQUFDLGNBQWM7QUFRckQsSUFBTSxpQkFB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