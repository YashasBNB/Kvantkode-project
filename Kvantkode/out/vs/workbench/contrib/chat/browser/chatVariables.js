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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZhcmlhYmxlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRWYXJpYWJsZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFOUUsT0FBTyxFQUNOLDhCQUE4QixFQUM5QixtQkFBbUIsR0FFbkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLFdBQVcsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVyRSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFvQjtJQUdoQyxZQUNzQyxpQkFBcUMsRUFDMUMsWUFBMkIsRUFDbkIsb0JBQTJDO1FBRjlDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDMUMsaUJBQVksR0FBWixZQUFZLENBQWU7UUFDbkIseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtJQUNqRixDQUFDO0lBRUosZ0JBQWdCLENBQ2YsTUFBMEIsRUFDMUIsd0JBQWlFO1FBRWpFLElBQUksaUJBQWlCLEdBQWdDLEVBQUUsQ0FBQTtRQUV2RCxNQUFNLENBQUMs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