/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as dom from '../../../../../base/browser/dom.js';
import { renderIcon } from '../../../../../base/browser/ui/iconLabel/iconLabels.js';
import { Codicon } from '../../../../../base/common/codicons.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ChatErrorLevel } from '../../common/chatService.js';
const $ = dom.$;
export class ChatWarningContentPart extends Disposable {
    constructor(kind, content, renderer) {
        super();
        this.domNode = $('.chat-notification-widget');
        let icon;
        let iconClass;
        switch (kind) {
            case ChatErrorLevel.Warning:
                icon = Codicon.warning;
                iconClass = '.chat-warning-codicon';
                break;
            case ChatErrorLevel.Error:
                icon = Codicon.error;
                iconClass = '.chat-error-codicon';
                break;
            case ChatErrorLevel.Info:
                icon = Codicon.info;
                iconClass = '.chat-info-codicon';
                break;
        }
        this.domNode.appendChild($(iconClass, undefined, renderIcon(icon)));
        const markdownContent = this._register(renderer.render(content));
        this.domNode.appendChild(markdownContent.element);
    }
    hasSameContent(other) {
        // No other change allowed for this content type
        return other.kind === 'warning';
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFdhcm5pbmdDb250ZW50UGFydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0Q29udGVudFBhcnRzL2NoYXRXYXJuaW5nQ29udGVudFBhcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUlwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFNUQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVmLE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxVQUFVO0lBR3JELFlBQVksSUFBb0IsRUFBRSxPQUF3QixFQUFFLFFBQTBCO1FBQ3JGLEtBQUssRUFBRSxDQUFBO1FBRVAsSUFBSSxDQUFDLE9BQU8sR0FBRyxDQUFDLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUM3QyxJQUFJLElBQUksQ0FBQTtRQUNSLElBQUksU0FBUyxDQUFBO1FBQ2IsUUFBUSxJQUFJLEVBQUUsQ0FBQztZQUNkLEtBQUssY0FBYyxDQUFDLE9BQU87Z0JBQzFCLElBQUksR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFBO2dCQUN0QixTQUFTLEdBQUcsdUJBQXVCLENBQUE7Z0JBQ25DLE1BQUs7WUFDTixLQUFLLGNBQWMsQ0FBQyxLQUFLO2dCQUN4QixJQUFJLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQTtnQkFDcEIsU0FBUyxHQUFHLHFCQUFxQixDQUFBO2dCQUNqQyxNQUFLO1lBQ04sS0FBSyxjQUFjLENBQUMsSUFBSTtnQkFDdkIsSUFBSSxHQUFHLE9BQU8sQ0FBQyxJQUFJLENBQUE7Z0JBQ25CLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQTtnQkFDaEMsTUFBSztRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsRUFBRSxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ2hFLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsY0FBYyxDQUFDLEtBQTZDO1FBQzNELGdEQUFnRDtRQUNoRCxPQUFPLEtBQUssQ0FBQyxJQUFJLEtBQUssU0FBUyxDQUFBO0lBQ2hDLENBQUM7Q0FDRCJ9