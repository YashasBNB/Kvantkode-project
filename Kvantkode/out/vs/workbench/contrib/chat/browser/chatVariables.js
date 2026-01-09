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
