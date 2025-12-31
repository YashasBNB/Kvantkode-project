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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdElucHV0RWRpdG9ySG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY29udHJpYi9jaGF0SW5wdXRFZGl0b3JIb3Zlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRWxFLE9BQU8sRUFHTix3QkFBd0IsRUFNeEIsa0JBQWtCLEdBQ2xCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUMvQyxPQUFPLEVBQUUsY0FBYyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDL0UsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUVyQyxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5QjtJQUdyQyxZQUNrQixNQUFtQixFQUNiLG9CQUE0RCxFQUMvRCxpQkFBc0QsRUFDekQsY0FBZ0Q7UUFIaEQsV0FBTSxHQUFOLE1BQU0sQ0FBYTtRQUNJLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDOUMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtRQUN4QyxtQkFBYyxHQUFkLGNBQWMsQ0FBaUI7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