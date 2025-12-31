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
import './media/editorHoverWrapper.css';
import * as dom from '../../../../../base/browser/dom.js';
import { HoverAction } from '../../../../../base/browser/ui/hover/hoverWidget.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
const $ = dom.$;
const h = dom.h;
/**
 * This borrows some of HoverWidget so that a chat editor hover can be rendered in the same way as a workbench hover.
 * Maybe it can be reusable in a generic way.
 */
let ChatEditorHoverWrapper = class ChatEditorHoverWrapper {
    constructor(hoverContentElement, actions, keybindingService) {
        this.keybindingService = keybindingService;
        const hoverElement = h('.chat-editor-hover-wrapper@root', [
            h('.chat-editor-hover-wrapper-content@content'),
        ]);
        this.domNode = hoverElement.root;
        hoverElement.content.appendChild(hoverContentElement);
        if (actions && actions.length > 0) {
            const statusBarElement = $('.hover-row.status-bar');
            const actionsElement = $('.actions');
            actions.forEach((action) => {
                const keybinding = this.keybindingService.lookupKeybinding(action.commandId);
                const keybindingLabel = keybinding ? keybinding.getLabel() : null;
                HoverAction.render(actionsElement, {
                    label: action.label,
                    commandId: action.commandId,
                    run: (e) => {
                        action.run(e);
                    },
                    iconClass: action.iconClass,
                }, keybindingLabel);
            });
            statusBarElement.appendChild(actionsElement);
            this.domNode.appendChild(statusBarElement);
        }
    }
};
ChatEditorHoverWrapper = __decorate([
    __param(2, IKeybindingService)
], ChatEditorHoverWrapper);
export { ChatEditorHoverWrapper };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySG92ZXJXcmFwcGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NvbnRyaWIvZWRpdG9ySG92ZXJXcmFwcGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFNUYsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUNmLE1BQU0sQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUE7QUFFZjs7O0dBR0c7QUFDSSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUFzQjtJQUdsQyxZQUNDLG1CQUFnQyxFQUNoQyxPQUFtQyxFQUNFLGlCQUFxQztRQUFyQyxzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRTFFLE1BQU0sWUFBWSxHQUFHLENBQUMsQ0FBQyxpQ0FBaUMsRUFBRTtZQUN6RCxDQUFDLENBQUMsNENBQTRDLENBQUM7U0FDL0MsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsSUFBSSxDQUFBO1FBQ2hDLFlBQVksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFFckQsSUFBSSxPQUFPLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1lBQ25ELE1BQU0sY0FBYyxHQUFHLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQTtZQUNwQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUU7Z0JBQzFCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7Z0JBQzVFLE1BQU0sZUFBZSxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUE7Z0JBQ2pFLFdBQVcsQ0FBQyxNQUFNLENBQ2pCLGNBQWMsRUFDZDtvQkFDQyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7b0JBQ25CLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztvQkFDM0IsR0FBRyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7d0JBQ1YsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtvQkFDZCxDQUFDO29CQUNELFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztpQkFDM0IsRUFDRCxlQUFlLENBQ2YsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1lBQ0YsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1lBQzVDLElBQUksQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7Q0FDRCxDQUFBO0FBckNZLHNCQUFzQjtJQU1oQyxXQUFBLGtCQUFrQixDQUFBO0dBTlIsc0JBQXNCLENBcUNsQyJ9