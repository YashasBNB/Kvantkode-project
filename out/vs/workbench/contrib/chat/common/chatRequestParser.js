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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFJlcXVlc3RQYXJzZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9jaGF0UmVxdWVzdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDM0UsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQWtCLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDbkUsT0FBTyxFQUNOLG9CQUFvQixFQUNwQiw4QkFBOEIsRUFDOUIsOEJBQThCLEVBQzlCLDJCQUEyQixFQUMzQixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBR25CLGVBQWUsRUFDZixvQkFBb0IsRUFDcEIsa0JBQWtCLEdBQ2xCLE1BQU0sc0JBQXNCLENBQUE7QUFDN0IsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFvQixNQUFNLG9CQUFvQixDQUFBO0FBQzVFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxRQUFRLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUUzRSxNQUFNLFFBQVEsR0FBRyw4QkFBOEIsQ0FBQSxDQUFDLGFBQWE7QUFDN0QsTUFBTSxXQUFXLEdBQUcsbUNBQW1DLENBQUEsQ0FBQyw0REFBNEQ7QUFDcEgsTUFBTSxRQUFRLEdBQUcsNEJBQTRCLENBQUEsQ0FBQyxjQUFjO0FBUXJELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWlCO0lBQzdCLFlBQ3FDLFlBQStCLEVBQzNCLGVBQXNDLEVBQ25DLG1CQUE2QyxFQUMzQyxZQUF3QztRQUhqRCxpQkFBWSxHQUFaLFlBQVksQ0FBbUI7UUFDM0Isb0JBQWUsR0FBZixlQUFlLENBQXVCO1FBQ25DLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBMEI7UUFDM0MsaUJBQVksR0FBWixZQUFZLENBQTRCO0lBQ25GLENBQUM7SUFFSixnQkFBZ0IsQ0FDZixTQUFpQixFQUNqQixPQUFlLEVBQ2YsV0FBOEIsaUJBQWlCLENBQUMsS0FBSyxFQUNyRCxPQUE0QjtRQUU1QixNQUFNLEtBQUssR0FBNkIsRUFBRSxDQUFBO1FBQzFDLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxlQUFlLENBQUMsbUJBQW1CLENBQUMsU0FBUyxDQUFDLENBQUEsQ0FBQywrQ0FBK0M7UUFFdEgsSUFBSSxVQUFVLEdBQUcsQ0FBQyxDQUFBO1FBQ2xCLElBQUksTUFBTSxHQUFHLENBQUMsQ0FBQTtRQUNkLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDekMsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDMUMsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM5QixJQUFJLE9BQTJDLENBQUE7WUFDL0MsSUFBSSxZQUFZLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsSUFBSSxJQUFJLEtBQUssa0JBQWtCLEVBQUUsQ0FBQztvQkFDakMsT0FBTyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FDaEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFDaEIsQ0FBQyxFQUNELElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFDaEMsS0FBSyxDQUNMLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxJQUFJLElBQUksS0FBSyxlQUFlLEVBQUUsQ0FBQztvQkFDckMsT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLENBQzdCLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQ2hCLE9BQU8sRUFDUCxDQUFDLEVBQ0QsSUFBSSxRQUFRLENBQUMsVUFBVSxFQUFFLE1BQU0sQ0FBQyxFQUNoQyxLQUFLLEVBQ0wsUUFBUSxFQUNSLE9BQU8sQ0FDUCxDQUFBO2dCQUNGLENBQUM7cUJBQU0sSUFBSSxJQUFJLEtBQUssb0JBQW9CLEVBQUUsQ0FBQztvQkFDMUMsT0FBTyxHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FDcEMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFDaEIsT0FBTyxFQUNQLENBQUMsRUFDRCxJQUFJLFFBQVEsQ0FBQyxVQUFVLEVBQUUsTUFBTSxDQUFDLEVBQ2hDLEtBQUssRUFDTCxRQUFRLEVBQ1IsT0FBTyxDQUNQLENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7b0JBQ2QsT0FBTyxHQUFHLElBQUksQ0FBQyx5QkFBeUIsQ0FDdkMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFDaEIsQ0FBQyxFQUNELElBQUksUUFBUSxDQUFDLFVBQVUsRUFBRSxNQUFNLENBQUMsRUFDaEMsVUFBVSxDQUNWLENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFFRCxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUNiLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO29CQUNiLGlGQUFpRjtvQkFDakYsTUFBTSxZQUFZLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO29CQUNqQyxNQUFNLGVBQWUsR0FBRyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7b0JBQzdELE1BQU0sOEJBQThCLEdBQUcsWUFBWSxFQUFFLFdBQVcsQ0FBQyxhQUFhLElBQUksQ0FBQyxDQUFBO29CQUNuRixNQUFNLDZCQUE2QixHQUFHLFlBQVksRUFBRSxXQUFXLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQTtvQkFDOUUsS0FBSyxDQUFDLElBQUksQ0FDVCxJQUFJLG1CQUFtQixDQUN0QixJQUFJLFdBQVcsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUFDLEVBQ25DLElBQUksS0FBSyxDQUNSLDhCQUE4QixFQUM5Qiw2QkFBNkIsRUFDN0IsVUFBVSxFQUNWLE1BQU0sQ0FDTixFQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQyxDQUNqQyxDQUNELENBQUE7Z0JBQ0YsQ0FBQztnQkFFRCxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1lBQ3BCLENBQUM7WUFFRCxJQUFJLElBQUksS0FBSyxJQUFJLEVBQUUsQ0FBQztnQkFDbkIsVUFBVSxFQUFFLENBQUE7Z0JBQ1osTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNYLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLEVBQUUsQ0FBQTtZQUNULENBQUM7UUFDRixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQUcsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sV0FBVyxHQUFHLFFBQVEsRUFBRSxLQUFLLENBQUMsWUFBWSxJQUFJLENBQUMsQ0FBQTtRQUNyRCxJQUFJLFdBQVcsR0FBRyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEMsS0FBSyxDQUFDLElBQUksQ0FDVCxJQUFJLG1CQUFtQixDQUN0QixJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUM1QyxJQUFJLEtBQUssQ0FDUixRQUFRLEVBQUUsV0FBVyxDQUFDLGFBQWEsSUFBSSxDQUFDLEVBQ3hDLFFBQVEsRUFBRSxXQUFXLENBQUMsU0FBUyxJQUFJLENBQUMsRUFDcEMsVUFBVSxFQUNWLE1BQU0sQ0FDTixFQUNELE9BQU8sQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FDMUMsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU87WUFDTixLQUFLO1lBQ0wsSUFBSSxFQUFFLE9BQU87U0FDYixDQUFBO0lBQ0YsQ0FBQztJQUVPLGVBQWUsQ0FDdEIsT0FBZSxFQUNmLFdBQW1CLEVBQ25CLE1BQWMsRUFDZCxRQUFtQixFQUNuQixLQUFvQyxFQUNwQyxRQUEyQixFQUMzQixPQUF1QztRQUV2QyxNQUFNLGNBQWMsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlDLElBQUksQ0FBQyxjQUFjLElBQUksQ0FBQyxPQUFPLEVBQUUsSUFBSSxLQUFLLFNBQVMsSUFBSSxPQUFPLENBQUMsSUFBSSxLQUFLLFFBQVEsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3ZGLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUE7UUFDbkMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEtBQUssQ0FDakMsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sRUFDZixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQzdCLENBQUE7UUFFRCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsMEJBQTBCLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDbEUsSUFBSSxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQTtZQUNuQixDQUFDO1FBQ0YsQ0FBQztRQUVELDJJQUEySTtRQUMzSSwrQkFBK0I7UUFDL0IsTUFBTSxLQUFLLEdBQ1YsTUFBTSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksT0FBTyxFQUFFLGFBQWE7WUFDMUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhO1lBQ3ZCLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFBO1FBQ3RELElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsRUFBRSxDQUFDO1lBQzFELHlCQUF5QjtZQUN6QixPQUFNO1FBQ1AsQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUNDLEtBQUssQ0FBQyxJQUFJLENBQ1QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLENBQUMsQ0FBQyxZQUFZLG1CQUFtQixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO1lBQzFELENBQUMsQ0FBQyxDQUFDLFlBQVksb0JBQW9CLENBQUMsQ0FDckMsRUFDQSxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakMsTUFBTSxlQUFlLEdBQUcsWUFBWSxFQUFFLEtBQUssQ0FBQyxZQUFZLElBQUksQ0FBQyxDQUFBO1FBQzdELE1BQU0scUJBQXFCLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDeEUsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUN6QyxPQUFNO1FBQ1AsQ0FBQztRQUVELE9BQU8sSUFBSSxvQkFBb0IsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDckUsQ0FBQztJQUVPLGtCQUFrQixDQUN6QixPQUFlLEVBQ2YsTUFBYyxFQUNkLFFBQW1CLEVBQ25CLEtBQTRDO1FBRTVDLE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNwRCxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEdBQUcsaUJBQWlCLENBQUE7UUFDdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDOUQsTUFBTSxjQUFjLEdBQUcsSUFBSSxLQUFLLENBQy9CLFFBQVEsQ0FBQyxVQUFVLEVBQ25CLFFBQVEsQ0FBQyxNQUFNLEVBQ2YsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUM3QixDQUFBO1FBRUQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDbEQsSUFBSSxJQUFJLElBQUksSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFDMUMsT0FBTyxJQUFJLG1CQUFtQixDQUM3QixRQUFRLEVBQ1IsY0FBYyxFQUNkLElBQUksRUFDSixJQUFJLENBQUMsRUFBRSxFQUNQLElBQUksQ0FBQyxXQUFXLEVBQ2hCLElBQUksQ0FBQyxJQUFJLENBQ1QsQ0FBQTtRQUNGLENBQUM7UUFFRCxPQUFNO0lBQ1AsQ0FBQztJQUVPLHNCQUFzQixDQUM3QixnQkFBd0IsRUFDeEIsV0FBbUIsRUFDbkIsTUFBYyxFQUNkLFFBQW1CLEVBQ25CLEtBQTRDLEVBQzVDLFFBQTJCLEVBQzNCLE9BQTRCO1FBRTVCLE1BQU0sY0FBYyxHQUFHLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2RCxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDckIsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsWUFBWSwyQkFBMkIsQ0FBQyxFQUFFLENBQUM7WUFDakUsaUNBQWlDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBRUQsTUFBTSxDQUFDLElBQUksRUFBRSxPQUFPLENBQUMsR0FBRyxjQUFjLENBQUE7UUFDdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxXQUFXLENBQUMsTUFBTSxFQUFFLE1BQU0sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEUsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEtBQUssQ0FDakMsUUFBUSxDQUFDLFVBQVUsRUFDbkIsUUFBUSxDQUFDLE1BQU0sRUFDZixRQUFRLENBQUMsVUFBVSxFQUNuQixRQUFRLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQzdCLENBQUE7UUFFRCxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUMzQixDQUFDLENBQUMsRUFBNkIsRUFBRSxDQUFDLENBQUMsWUFBWSxvQkFBb0IsQ0FDbkUsQ0FBQTtRQUNELElBQUksU0FBUyxFQUFFLENBQUM7WUFDZiwwREFBMEQ7WUFDMUQsSUFDQyxLQUFLLENBQUMsSUFBSSxDQUNULENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxDQUFDLENBQUMsWUFBWSxtQkFBbUIsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsQ0FBQztnQkFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLG9CQUFvQixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxtQkFBbUIsQ0FBQyxDQUFDLENBQzlFLEVBQ0EsQ0FBQztnQkFDRixPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sWUFBWSxHQUFHLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqQyxNQUFNLGVBQWUsR0FBRyxZQUFZLEVBQUUsS0FBSyxDQUFDLFlBQVksSUFBSSxDQUFDLENBQUE7WUFDN0QsTUFBTSxxQkFBcUIsR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLGVBQWUsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN4RSxJQUFJLHFCQUFxQixDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUN6QyxPQUFNO1lBQ1AsQ0FBQztZQUVELE1BQU0sVUFBVSxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksS0FBSyxPQUFPLENBQUMsQ0FBQTtZQUNoRixJQUFJLFVBQVUsRUFBRSxDQUFDO2dCQUNoQix5QkFBeUI7Z0JBQ3pCLE9BQU8sSUFBSSw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUE7WUFDcEYsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLG1CQUFtQixDQUFDLFdBQVcsQ0FDekQsUUFBUSxFQUNSLE9BQU8sRUFBRSxJQUFJLElBQUksUUFBUSxDQUFDLEdBQUcsQ0FDN0IsQ0FBQTtZQUNELE1BQU0sWUFBWSxHQUFHLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLEtBQUssT0FBTyxDQUFDLENBQUE7WUFDckUsSUFBSSxZQUFZLEVBQUUsQ0FBQztnQkFDbEIsaUNBQWlDO2dCQUNqQyxPQUFPLElBQUksMkJBQTJCLENBQUMsVUFBVSxFQUFFLGdCQUFnQixFQUFFLFlBQVksQ0FBQyxDQUFBO1lBQ25GLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxpREFBaUQ7Z0JBQ2pELE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQy9FLE1BQU0sVUFBVSxHQUFHLFlBQVksRUFBRSxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE9BQU8sQ0FBQyxDQUFBO2dCQUM5RSxJQUFJLFVBQVUsRUFBRSxDQUFDO29CQUNoQixpQ0FBaUM7b0JBQ2pDLE9BQU8sSUFBSSw4QkFBOEIsQ0FBQyxVQUFVLEVBQUUsZ0JBQWdCLEVBQUUsVUFBVSxDQUFDLENBQUE7Z0JBQ3BGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU07SUFDUCxDQUFDO0lBRU8seUJBQXlCLENBQ2hDLE9BQWUsRUFDZixNQUFjLEVBQ2QsUUFBbUIsRUFDbkIsVUFBMkM7UUFFM0MsTUFBTSxpQkFBaUIsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUN4QyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQ0wsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEtBQUssUUFBUSxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsS0FBSyxRQUFRLENBQUMsTUFBTSxDQUMzRixDQUFBO1FBQ0QsSUFBSSxpQkFBaUIsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sTUFBTSxHQUFHLGlCQUFpQixDQUFDLEtBQUssQ0FBQyxTQUFTLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQTtZQUN0RixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQTtZQUN6QyxNQUFNLEtBQUssR0FBRyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsTUFBTSxHQUFHLE1BQU0sQ0FBQyxDQUFBO1lBQ3RELE9BQU8sSUFBSSw4QkFBOEIsQ0FDeEMsS0FBSyxFQUNMLGlCQUFpQixDQUFDLEtBQUssRUFDdkIsSUFBSSxFQUNKLGlCQUFpQixDQUFDLEVBQUUsRUFDcEIsaUJBQWlCLENBQUMsZ0JBQWdCLEVBQ2xDLGlCQUFpQixDQUFDLElBQUksRUFDdEIsaUJBQWlCLENBQUMsUUFBUSxFQUMxQixpQkFBaUIsQ0FBQyxJQUFJLEVBQ3RCLGlCQUFpQixDQUFDLE1BQU0sRUFDeEIsaUJBQWlCLENBQUMsV0FBVyxDQUM3QixDQUFBO1FBQ0YsQ0FBQztRQUVELE9BQU07SUFDUCxDQUFDO0NBQ0QsQ0FBQTtBQXhVWSxpQkFBaUI7SUFFM0IsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSwwQkFBMEIsQ0FBQTtHQUxoQixpQkFBaUIsQ0F3VTdCIn0=