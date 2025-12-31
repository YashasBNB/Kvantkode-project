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
import { coalesce } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ChatRequestDynamicVariablePart, ChatRequestToolPart, } from '../common/chatParserTypes.js';
import { ChatAgentLocation, ChatConfiguration } from '../common/constants.js';
import { IChatWidgetService, showChatView, showEditsView } from './chat.js';
import { ChatDynamicVariableModel } from './contrib/chatDynamicVariables.js';
let ChatVariablesService = class ChatVariablesService {
    constructor(chatWidgetService, viewsService, configurationService) {
        this.chatWidgetService = chatWidgetService;
        this.viewsService = viewsService;
        this.configurationService = configurationService;
    }
    resolveVariables(prompt, attachedContextVariables) {
        let resolvedVariables = [];
        prompt.parts.forEach((part, i) => {
            if (part instanceof ChatRequestDynamicVariablePart || part instanceof ChatRequestToolPart) {
                resolvedVariables[i] = part.toVariableEntry();
            }
        });
        // Make array not sparse
        resolvedVariables = coalesce(resolvedVariables);
        // "reverse", high index first so that replacement is simple
        resolvedVariables.sort((a, b) => b.range.start - a.range.start);
        if (attachedContextVariables) {
            // attachments not in the prompt
            resolvedVariables.push(...attachedContextVariables);
        }
        return {
            variables: resolvedVariables,
        };
    }
    getDynamicVariables(sessionId) {
        // This is slightly wrong... the parser pulls dynamic references from the input widget, but there is no guarantee that message came from the input here.
        // Need to ...
        // - Parser takes list of dynamic references (annoying)
        // - Or the parser is known to implicitly act on the input widget, and we need to call it before calling the chat service (maybe incompatible with the future, but easy)
        const widget = this.chatWidgetService.getWidgetBySessionId(sessionId);
        if (!widget || !widget.viewModel || !widget.supportsFileReferences) {
            return [];
        }
        const model = widget.getContrib(ChatDynamicVariableModel.ID);
        if (!model) {
            return [];
        }
        return model.variables;
    }
    async attachContext(name, value, location) {
        if (location !== ChatAgentLocation.Panel && location !== ChatAgentLocation.EditingSession) {
            return;
        }
        const unifiedViewEnabled = !!this.configurationService.getValue(ChatConfiguration.UnifiedChatView);
        const widget = location === ChatAgentLocation.EditingSession && !unifiedViewEnabled
            ? await showEditsView(this.viewsService)
            : (this.chatWidgetService.lastFocusedWidget ?? (await showChatView(this.viewsService)));
        if (!widget || !widget.viewModel) {
            return;
        }
        const key = name.toLowerCase();
        if (key === 'file' && typeof value !== 'string') {
            const uri = URI.isUri(value) ? value : value.uri;
            const range = 'range' in value ? value.range : undefined;
            await widget.attachmentModel.addFile(uri, range);
            return;
        }
        if (key === 'folder' && URI.isUri(value)) {
            widget.attachmentModel.addFolder(value);
            return;
        }
    }
};
ChatVariablesService = __decorate([
    __param(0, IChatWidgetService),
    __param(1, IViewsService),
    __param(2, IConfigurationService)
], ChatVariablesService);
export { ChatVariablesService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0VmFyaWFibGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFcEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRTlFLE9BQU8sRUFDTiw4QkFBOEIsRUFDOUIsbUJBQW1CLEdBRW5CLE1BQU0sOEJBQThCLENBQUE7QUFFckMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDN0UsT0FBTyxFQUFFLGtCQUFrQixFQUFFLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxXQUFXLENBQUE7QUFDM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFckUsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFHaEMsWUFDc0MsaUJBQXFDLEVBQzFDLFlBQTJCLEVBQ25CLG9CQUEyQztRQUY5QyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQzFDLGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ25CLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7SUFDakYsQ0FBQztJQUVKLGdCQUFnQixDQUNmLE1BQTBCLEVBQzFCLHdCQUFpRTtRQUVqRSxJQUFJLGlCQUFpQixHQUFnQyxFQUFFLENBQUE7UUFFdkQsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FB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