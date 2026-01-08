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
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { HoverParticipantRegistry, RenderedHoverParts, } from '../../../../../editor/contrib/hover/browser/hoverTypes.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IInstantiationService } from '../../../../../platform/instantiation/common/instantiation.js';
import { IChatWidgetService } from '../chat.js';
import { ChatAgentHover, getChatAgentHoverOptions } from '../chatAgentHover.js';
import { ChatEditorHoverWrapper } from './editorHoverWrapper.js';
import { extractAgentAndCommand } from '../../common/chatParserTypes.js';
import * as nls from '../../../../../nls.js';
let ChatAgentHoverParticipant = class ChatAgentHoverParticipant {
    constructor(editor, instantiationService, chatWidgetService, commandService) {
        this.editor = editor;
        this.instantiationService = instantiationService;
        this.chatWidgetService = chatWidgetService;
        this.commandService = commandService;
        this.hoverOrdinal = 1;
    }
    computeSync(anchor, _lineDecorations) {
        if (!this.editor.hasModel()) {
            return [];
        }
        const widget = this.chatWidgetService.getWidgetByInputUri(this.editor.getModel().uri);
        if (!widget) {
            return [];
        }
        const { agentPart } = extractAgentAndCommand(widget.parsedInput);
        if (!agentPart) {
            return [];
        }
        if (Range.containsPosition(agentPart.editorRange, anchor.range.getStartPosition())) {
            return [new ChatAgentHoverPart(this, Range.lift(agentPart.editorRange), agentPart.agent)];
        }
        return [];
    }
    renderHoverParts(context, hoverParts) {
        if (!hoverParts.length) {
            return new RenderedHoverParts([]);
        }
        const disposables = new DisposableStore();
        const hover = disposables.add(this.instantiationService.createInstance(ChatAgentHover));
        disposables.add(hover.onDidChangeContents(() => context.onContentsChanged()));
        const hoverPart = hoverParts[0];
        const agent = hoverPart.agent;
        hover.setAgent(agent.id);
        const actions = getChatAgentHoverOptions(() => agent, this.commandService).actions;
        const wrapper = this.instantiationService.createInstance(ChatEditorHoverWrapper, hover.domNode, actions);
        const wrapperNode = wrapper.domNode;
        context.fragment.appendChild(wrapperNode);
        const renderedHoverPart = {
            hoverPart,
            hoverElement: wrapperNode,
            dispose() {
                disposables.dispose();
            },
        };
        return new RenderedHoverParts([renderedHoverPart]);
    }
    getAccessibleContent(hoverPart) {
        return nls.localize('hoverAccessibilityChatAgent', 'There is a chat agent hover part here.');
    }
};
ChatAgentHoverParticipant = __decorate([
    __param(1, IInstantiationService),
    __param(2, IChatWidgetService),
    __param(3, ICommandService)
], ChatAgentHoverParticipant);
export { ChatAgentHoverParticipant };
export class ChatAgentHoverPart {
    constructor(owner, range, agent) {
        this.owner = owner;
        this.range = range;
        this.agent = agent;
    }
    isValidForHoverAnchor(anchor) {
        return (anchor.type === 1 /* HoverAnchorType.Range */ &&
            this.range.startColumn <= anchor.range.startColumn &&
            this.range.endColumn >= anchor.range.endColumn);
    }
}
HoverParticipantRegistry.register(ChatAgentHoverParticipant);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0RWRpdG9ySG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jb250cmliL2NoYXRJbnB1dEVkaXRvckhvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFbEUsT0FBTyxFQUdOLHdCQUF3QixFQU14QixrQkFBa0IsR0FDbEIsTUFBTSwyREFBMkQsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQy9DLE9BQU8sRUFBRSxjQUFjLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxzQkFBc0IsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVoRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBRXJDLElBQU0seUJBQXlCLEdBQS9CLE1BQU0seUJBQXlCO0lBR3JDLFlBQ2tCLE1BQW1CLEVBQ2Isb0JBQTRELEVBQy9ELGlCQUFzRCxFQUN6RCxjQUFnRDtRQUhoRCxXQUFNLEdBQU4sTUFBTSxDQUFhO1FBQ0kseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUM5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3hDLG1CQUFjLEdBQWQsY0FBYyxD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