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
import { MarkdownString } from '../../../../../base/common/htmlContent.js';
import { ThemeIcon } from '../../../../../base/common/themables.js';
import { localize } from '../../../../../nls.js';
import { ContextKeyExpr } from '../../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { checkProposedApiEnabled } from '../../../../services/extensions/common/extensions.js';
import * as extensionsRegistry from '../../../../services/extensions/common/extensionsRegistry.js';
const chatViewsWelcomeExtensionPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint({
    extensionPoint: 'chatViewsWelcome',
    jsonSchema: {
        description: localize('vscode.extension.contributes.chatViewsWelcome', 'Contributes a welcome message to a chat view'),
        type: 'array',
        items: {
            additionalProperties: false,
            type: 'object',
            properties: {
                icon: {
                    type: 'string',
                    description: localize('chatViewsWelcome.icon', 'The icon for the welcome message.'),
                },
                title: {
                    type: 'string',
                    description: localize('chatViewsWelcome.title', 'The title of the welcome message.'),
                },
                content: {
                    type: 'string',
                    description: localize('chatViewsWelcome.content', 'The content of the welcome message. The first command link will be rendered as a button.'),
                },
                when: {
                    type: 'string',
                    description: localize('chatViewsWelcome.when', 'Condition when the welcome message is shown.'),
                },
            },
        },
        required: ['icon', 'title', 'contents', 'when'],
    },
});
let ChatViewsWelcomeHandler = class ChatViewsWelcomeHandler {
    static { this.ID = 'workbench.contrib.chatViewsWelcomeHandler'; }
    constructor(logService) {
        this.logService = logService;
        chatViewsWelcomeExtensionPoint.setHandler((extensions, delta) => {
            for (const extension of delta.added) {
                for (const providerDescriptor of extension.value) {
                    checkProposedApiEnabled(extension.description, 'chatParticipantPrivate');
                    const when = ContextKeyExpr.deserialize(providerDescriptor.when);
                    if (!when) {
                        this.logService.error(`Could not deserialize 'when' clause for chatViewsWelcome contribution: ${providerDescriptor.when}`);
                        continue;
                    }
                    const descriptor = {
                        ...providerDescriptor,
                        when,
                        icon: ThemeIcon.fromString(providerDescriptor.icon),
                        content: new MarkdownString(providerDescriptor.content, { isTrusted: true }), // private API with command links
                    };
                    Registry.as("workbench.registry.chat.viewsWelcome" /* ChatViewsWelcomeExtensions.ChatViewsWelcomeRegistry */).register(descriptor);
                }
            }
        });
    }
};
ChatViewsWelcomeHandler = __decorate([
    __param(0, ILogService)
], ChatViewsWelcomeHandler);
export { ChatViewsWelcomeHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZUhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci92aWV3c1dlbGNvbWUvY2hhdFZpZXdzV2VsY29tZUhhbmRsZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFOUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxLQUFLLGtCQUFrQixNQUFNLDhEQUE4RCxDQUFBO0FBY2xHLE1BQU0sOEJBQThCLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsc0JBQXNCLENBRWpHO0lBQ0QsY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyxVQUFVLEVBQUU7UUFDWCxXQUFXLEVBQUUsUUFBUSxDQUNwQiwrQ0FBK0MsRUFDL0MsOENBQThDLENBQzlDO1FBQ0QsSUFBSSxFQUFFLE9BQU87UUFDYixLQUFLLEVBQUU7WUFDTixvQkFBb0IsRUFBRSxLQUFLO1lBQzNCLElBQUksRUFBRSxRQUFRO1lBQ2QsVUFBVSxFQUFFO2dCQUNYLElBQUksRUFBRTtvQkFDTCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUFDLHVCQUF1QixFQUFFLG1DQUFtQyxDQUFDO2lCQUNuRjtnQkFDRCxLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx3QkFBd0IsRUFBRSxtQ0FBbUMsQ0FBQztpQkFDcEY7Z0JBQ0QsT0FBTyxFQUFFO29CQUNSLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLDBCQUEwQixFQUMxQiwwRkFBMEYsQ0FDMUY7aUJBQ0Q7Z0JBQ0QsSUFBSSxFQUFFO29CQUNMLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQ3BCLHVCQUF1QixFQUN2Qiw4Q0FBOEMsQ0FDOUM7aUJBQ0Q7YUFDRDtTQUNEO1FBQ0QsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxDQUFDO0tBQy9DO0NBQ0QsQ0FBQyxDQUFBO0FBRUssSUFBTSx1QkFBdUIsR0FBN0IsTUFBTSx1QkFBdUI7YUFDbkIsT0FBRSxHQUFHLDJDQUEyQyxBQUE5QyxDQUE4QztJQUVoRSxZQUEwQyxVQUF1QjtRQUF2QixlQUFVLEdBQVYsVUFBVSxDQUFhO1FBQ2hFLDhCQUE4QixDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsRUFBRSxLQUFLLEVBQUUsRUFBRTtZQUMvRCxLQUFLLE1BQU0sU0FBUyxJQUFJLEtBQUssQ0FBQyxLQUFLLEVBQUUsQ0FBQztnQkFDckMsS0FBSyxNQUFNLGtCQUFrQixJQUFJLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDbEQsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFdBQVcsRUFBRSx3QkFBd0IsQ0FBQyxDQUFBO29CQUV4RSxNQUFNLElBQUksR0FBRyxjQUFjLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNoRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQ1gsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQ3BCLDBFQUEwRSxrQkFBa0IsQ0FBQyxJQUFJLEVBQUUsQ0FDbkcsQ0FBQTt3QkFDRCxTQUFRO29CQUNULENBQUM7b0JBRUQsTUFBTSxVQUFVLEdBQWdDO3dCQUMvQyxHQUFHLGtCQUFrQjt3QkFDckIsSUFBSTt3QkFDSixJQUFJLEVBQUUsU0FBUyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUM7d0JBQ25ELE9BQU8sRUFBRSxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLEVBQUUsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFBRSxpQ0FBaUM7cUJBQy9HLENBQUE7b0JBQ0QsUUFBUSxDQUFDLEVBQUUsa0dBRVYsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUE7Z0JBQ3ZCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQTdCVyx1QkFBdUI7SUFHdEIsV0FBQSxXQUFXLENBQUE7R0FIWix1QkFBdUIsQ0E4Qm5DIn0=