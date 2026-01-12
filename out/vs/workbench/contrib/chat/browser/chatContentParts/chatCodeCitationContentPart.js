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
import * as dom from '../../../../../base/browser/dom.js';
import { Button } from '../../../../../base/browser/ui/button/button.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize } from '../../../../../nls.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { getCodeCitationsMessage } from '../../common/chatModel.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
let ChatCodeCitationContentPart = class ChatCodeCitationContentPart extends Disposable {
    constructor(citations, context, editorService, telemetryService) {
        super();
        this.editorService = editorService;
        this.telemetryService = telemetryService;
        const label = getCodeCitationsMessage(citations.citations);
        const elements = dom.h('.chat-code-citation-message@root', [
            dom.h('span.chat-code-citation-label@label'),
            dom.h('.chat-code-citation-button-container@button'),
        ]);
        elements.label.textContent = label + ' - ';
        const button = this._register(new Button(elements.button, {
            buttonBackground: undefined,
            buttonBorder: undefined,
            buttonForeground: undefined,
            buttonHoverBackground: undefined,
            buttonSecondaryBackground: undefined,
            buttonSecondaryForeground: undefined,
            buttonSecondaryHoverBackground: undefined,
            buttonSeparator: undefined,
        }));
        button.label = localize('viewMatches', 'View matches');
        this._register(button.onDidClick(() => {
            const citationText = `# Code Citations\n\n` +
                citations.citations
                    .map((c) => `## License: ${c.license}\n${c.value.toString()}\n\n\`\`\`\n${c.snippet}\n\`\`\`\n\n`)
                    .join('\n');
            this.editorService.openEditor({
                resource: undefined,
                contents: citationText,
                languageId: 'markdown',
            });
            this.telemetryService.publicLog2('openedChatCodeCitations');
        }));
        this.domNode = elements.root;
    }
    hasSameContent(other, followingContent, element) {
        return other.kind === 'codeCitations';
    }
};
ChatCodeCitationContentPart = __decorate([
    __param(2, IEditorService),
    __param(3, ITelemetryService)
], ChatCodeCitationContentPart);
export { ChatCodeCitationContentPart };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvZGVDaXRhdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdENvbnRlbnRQYXJ0cy9jaGF0Q29kZUNpdGF0aW9uQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDeEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUd6RixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFPN0UsSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFBNEIsU0FBUSxVQUFVO0lBRzFELFlBQ0MsU0FBNkIsRUFDN0IsT0FBc0MsRUFDTCxhQUE2QixFQUMxQixnQkFBbUM7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFIMEIsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBQzFCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFJdkUsTUFBTSxLQUFLLEdBQUcsdUJBQXVCLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUMsa0NBQWtDLEVBQUU7WUFDMUQsR0FBRyxDQUFDLENBQUMsQ0FBQyxxQ0FBcUMsQ0FBQztZQUM1QyxHQUFHLENBQUMsQ0FBQyxDQUFDLDZDQUE2QyxDQUFDO1NBQ3BELENBQUMsQ0FBQTtRQUNGLFFBQVEsQ0FBQyxLQUFLLENBQUMsV0FBVyxHQUFHLEtBQUssR0FBRyxLQUFLLENBQUE7UUFDMUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDNUIsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRTtZQUMzQixnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLGdCQUFnQixFQUFFLFNBQVM7WUFDM0IscUJBQXFCLEVBQUUsU0FBUztZQUNoQyx5QkFBeUIsRUFBRSxTQUFTO1lBQ3BDLHlCQUF5QixFQUFFLFNBQVM7WUFDcEMsOEJBQThCLEVBQUUsU0FBUztZQUN6QyxlQUFlLEVBQUUsU0FBUztTQUMxQixDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsUUFBUSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUN0RCxJQUFJLENBQUMsU0FBUyxDQUNiLE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3RCLE1BQU0sWUFBWSxHQUNqQixzQkFBc0I7Z0JBQ3RCLFNBQVMsQ0FBQyxTQUFTO3FCQUNqQixHQUFHLENBQ0gsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLGVBQWUsQ0FBQyxDQUFDLE9BQU8sS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxlQUFlLENBQUMsQ0FBQyxPQUFPLGNBQWMsQ0FDdEY7cUJBQ0EsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxVQUFVLENBQUM7Z0JBQzdCLFFBQVEsRUFBRSxTQUFTO2dCQUNuQixRQUFRLEVBQUUsWUFBWTtnQkFDdEIsVUFBVSxFQUFFLFVBQVU7YUFDdEIsQ0FBQyxDQUFBO1lBQ0YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FDL0IseUJBQXlCLENBQ3pCLENBQUE7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0QsSUFBSSxDQUFDLE9BQU8sR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFBO0lBQzdCLENBQUM7SUFFRCxjQUFjLENBQ2IsS0FBMkIsRUFDM0IsZ0JBQXdDLEVBQ3hDLE9BQXFCO1FBRXJCLE9BQU8sS0FBSyxDQUFDLElBQUksS0FBSyxlQUFlLENBQUE7SUFDdEMsQ0FBQztDQUNELENBQUE7QUE1RFksMkJBQTJCO0lBTXJDLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSxpQkFBaUIsQ0FBQTtHQVBQLDJCQUEyQixDQTREdkMifQ==