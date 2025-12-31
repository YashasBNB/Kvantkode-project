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
import { autorun, observableFromEvent } from '../../../../../base/common/observable.js';
import { AccessibilitySignal, IAccessibilitySignalService, } from '../../../../../platform/accessibilitySignal/browser/accessibilitySignalService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { IChatEditingService } from '../../common/chatEditingService.js';
let ChatEditingEditorAccessibility = class ChatEditingEditorAccessibility {
    static { this.ID = 'chat.edits.accessibilty'; }
    constructor(chatEditingService, editorService, accessibilityService) {
        this._store = new DisposableStore();
        const activeUri = observableFromEvent(this, editorService.onDidActiveEditorChange, () => editorService.activeEditorPane?.input.resource);
        this._store.add(autorun((r) => {
            const editor = activeUri.read(r);
            if (!editor) {
                return;
            }
            const entry = chatEditingService.editingSessionsObs
                .read(r)
                .find((session) => session.readEntry(editor, r));
            if (entry) {
                accessibilityService.playSignal(AccessibilitySignal.chatEditModifiedFile);
            }
        }));
    }
    dispose() {
        this._store.dispose();
    }
};
ChatEditingEditorAccessibility = __decorate([
    __param(0, IChatEditingService),
    __param(1, IEditorService),
    __param(2, IAccessibilitySignalService)
], ChatEditingEditorAccessibility);
export { ChatEditingEditorAccessibility };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRFZGl0aW5nL2NoYXRFZGl0aW5nRWRpdG9yQWNjZXNzaWJpbGl0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZGLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsMkJBQTJCLEdBQzNCLE1BQU0sbUZBQW1GLENBQUE7QUFFMUYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWpFLElBQU0sOEJBQThCLEdBQXBDLE1BQU0sOEJBQThCO2FBQzFCLE9BQUUsR0FBRyx5QkFBeUIsQUFBNUIsQ0FBNEI7SUFJOUMsWUFDc0Isa0JBQXVDLEVBQzVDLGFBQTZCLEVBQ2hCLG9CQUFpRDtRQUw5RCxXQUFNLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU85QyxNQUFNLFNBQVMsR0FBRyxtQkFBbUIsQ0FDcEMsSUFBSSxFQUNKLGFBQWEsQ0FBQyx1QkFBdUIsRUFDckMsR0FBRyxFQUFFLENBQUMsYUFBYSxDQUFDLGdCQUFnQixFQUFFLEtBQUssQ0FBQyxRQUFRLENBQ3BELENBQUE7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FDZCxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUNiLE1BQU0sTUFBTSxHQUFHLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDaEMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNiLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxLQUFLLEdBQUcsa0JBQWtCLENBQUMsa0JBQWtCO2lCQUNqRCxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNQLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNqRCxJQUFJLEtBQUssRUFBRSxDQUFDO2dCQUNYLG9CQUFvQixDQUFDLFVBQVUsQ0FBQyxtQkFBbUIsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzFFLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVELE9BQU87UUFDTixJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUM7O0FBbkNXLDhCQUE4QjtJQU14QyxXQUFBLG1CQUFtQixDQUFBO0lBQ25CLFdBQUEsY0FBYyxDQUFBO0lBQ2QsV0FBQSwyQkFBMkIsQ0FBQTtHQVJqQiw4QkFBOEIsQ0FvQzFDIn0=