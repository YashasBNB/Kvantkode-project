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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFZpZXdzV2VsY29tZUhhbmRsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvdmlld3NXZWxjb21lL2NoYXRWaWV3c1dlbGNvbWVIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN4RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRTlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sS0FBSyxrQkFBa0IsTUFBTSw4REFBOEQsQ0FBQTtBQWNsRyxNQUFNLDhCQUE4QixHQUFHLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLHNCQUFzQixDQUVqRztJQUNELGNBQWMsRUFBRSxrQkFBa0I7SUFDbEMsVUFBVSxFQUFFO1FBQ1gsV0FBVyxFQUFFLFFBQVEsQ0FDcEIsK0NBQStDLEVBQy9DLDhDQUE4QyxDQUM5QztRQUNELElBQUksRUFBRSxPQUFPO1FBQ2IsS0FBSyxFQUFFO1lBQ04sb0JBQW9CLEVBQUUsS0FBSztZQUMzQixJQUFJLEVBQUUsUUFBUTtZQUNkLFVBQVUsRUFBRTtnQkFDWCxJQUFJLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsV0FBVyxFQUFFLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSxtQ0FBbUMsQ0FBQztpQkFDbkY7Z0JBQ0QsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxRQUFRO29CQUNkLFdBQVcsRUFBRSxRQUFRLENBQUMsd0JBQXdCLEVBQUUsbUNBQW1DLENBQUM7aUJBQ3BGO2dCQUNELE9BQU8sRUFBRTtvQkFDUixJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUNwQiwwQkFBMEIsRUFDMUIsMEZBQTBGLENBQzFGO2lCQUNEO2dCQUNELElBQUksRUFBRTtvQkFDTCxJQUFJLEVBQUUsUUFBUTtvQkFDZCxXQUFXLEVBQUUsUUFBUSxDQUNwQix1QkFBdUIsRUFDdkIsOENBQThDLENBQzlDO2lCQUNEO2FBQ0Q7U0FDRDtRQUNELFFBQVEsRUFBRSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sQ0FBQztLQUMvQztDQUNELENBQUMsQ0FBQTtBQUVLLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO2FBQ25CLE9BQUUsR0FBRywyQ0FBMkMsQUFBOUMsQ0FBOEM7SUFFaEUsWUFBMEMsVUFBdUI7UUFBdkIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNoRSw4QkFBOEIsQ0FBQyxVQUFVLENBQUMsQ0FBQyxVQUFVLEVBQUUsS0FBSyxFQUFFLEVBQUU7WUFDL0QsS0FBSyxNQUFNLFNBQVMsSUFBSSxLQUFLLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQ3JDLEtBQUssTUFBTSxrQkFBa0IsSUFBSSxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7b0JBQ2xELHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxXQUFXLEVBQUUsd0JBQXdCLENBQUMsQ0FBQTtvQkFFeEUsTUFBTSxJQUFJLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsQ0FBQTtvQkFDaEUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO3dCQUNYLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUNwQiwwRUFBMEUsa0JBQWtCLENBQUMsSUFBSSxFQUFFLENBQ25HLENBQUE7d0JBQ0QsU0FBUTtvQkFDVCxDQUFDO29CQUVELE1BQU0sVUFBVSxHQUFnQzt3QkFDL0MsR0FBRyxrQkFBa0I7d0JBQ3JCLElBQUk7d0JBQ0osSUFBSSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsSUFBSSxDQUFDO3dCQUNuRCxPQUFPLEVBQUUsSUFBSSxjQUFjLENBQUMsa0JBQWtCLENBQUMsT0FBTyxFQUFFLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxDQUFDLEVBQUUsaUNBQWlDO3FCQUMvRyxDQUFBO29CQUNELFFBQVEsQ0FBQyxFQUFFLGtHQUVWLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFBO2dCQUN2QixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQzs7QUE3QlcsdUJBQXVCO0lBR3RCLFdBQUEsV0FBVyxDQUFBO0dBSFosdUJBQXVCLENBOEJuQyJ9