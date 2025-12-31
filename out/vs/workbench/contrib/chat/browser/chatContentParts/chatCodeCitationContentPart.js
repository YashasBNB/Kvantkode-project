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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdENvZGVDaXRhdGlvbkNvbnRlbnRQYXJ0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRDb250ZW50UGFydHMvY2hhdENvZGVDaXRhdGlvbkNvbnRlbnRQYXJ0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFHekYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFbkUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBTzdFLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQTRCLFNBQVEsVUFBVTtJQUcxRCxZQUNDLFNBQTZCLEVBQzdCLE9BQXNDLEVBQ0wsYUFBNkIsRUFDMUIsZ0JBQW1DO1FBRXZFLEtBQUssRUFBRSxDQUFBO1FBSDBCLGtCQUFhLEdBQWIsYUFBYSxDQUFnQjtRQUMxQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1CO1FBSXZFLE1BQU0sS0FBSyxHQUFHLHVCQUF1QixDQUFDLFNBQVMsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUMxRCxNQUFNLFFBQVEsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLGtDQUFrQyxFQUFFO1lBQzFELEdBQUcsQ0FBQyxDQUFDLENBQUMscUNBQXFDLENBQUM7WUFDNUMsR0FBRyxDQUFDLENBQUMsQ0FBQyw2Q0FBNkMsQ0FBQztTQUNwRCxDQUFDLENBQUE7UUFDRixRQUFRLENBQUMsS0FBSyxDQUFDLFdBQVcsR0FBRyxLQUFLLEdBQUcsS0FBSyxDQUFBO1FBQzFDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQzVCLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEVBQUU7WUFDM0IsZ0JBQWdCLEVBQUUsU0FBUztZQUMzQixZQUFZLEVBQUUsU0FBUztZQUN2QixnQkFBZ0IsRUFBRSxTQUFTO1lBQzNCLHFCQUFxQixFQUFFLFNBQVM7WUFDaEMseUJBQXlCLEVBQUUsU0FBUztZQUNwQyx5QkFBeUIsRUFBRSxTQUFTO1lBQ3BDLDhCQUE4QixFQUFFLFNBQVM7WUFDekMsZUFBZSxFQUFFLFNBQVM7U0FDMUIsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDdEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN0QixNQUFNLFlBQVksR0FDakIsc0JBQXNCO2dCQUN0QixTQUFTLENBQUMsU0FBUztxQkFDakIsR0FBRyxDQUNILENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxlQUFlLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsZUFBZSxDQUFDLENBQUMsT0FBTyxjQUFjLENBQ3RGO3FCQUNBLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNiLElBQUksQ0FBQyxhQUFhLENBQUMsVUFBVSxDQUFDO2dCQUM3QixRQUFRLEVBQUUsU0FBUztnQkFDbkIsUUFBUSxFQUFFLFlBQVk7Z0JBQ3RCLFVBQVUsRUFBRSxVQUFVO2FBQ3RCLENBQUMsQ0FBQTtZQUNGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxVQUFVLENBQy9CLHlCQUF5QixDQUN6QixDQUFBO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNELElBQUksQ0FBQyxPQUFPLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQTtJQUM3QixDQUFDO0lBRUQsY0FBYyxDQUNiLEtBQTJCLEVBQzNCLGdCQUF3QyxFQUN4QyxPQUFxQjtRQUVyQixPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssZUFBZSxDQUFBO0lBQ3RDLENBQUM7Q0FDRCxDQUFBO0FBNURZLDJCQUEyQjtJQU1yQyxXQUFBLGNBQWMsQ0FBQTtJQUNkLFdBQUEsaUJBQWlCLENBQUE7R0FQUCwyQkFBMkIsQ0E0RHZDIn0=