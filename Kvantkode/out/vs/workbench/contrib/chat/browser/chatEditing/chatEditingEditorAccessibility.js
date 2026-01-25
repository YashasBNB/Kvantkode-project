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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdFZGl0b3JBY2Nlc3NpYmlsaXR5LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvY2hhdEVkaXRpbmcvY2hhdEVkaXRpbmdFZGl0b3JBY2Nlc3NpYmlsaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkYsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiwyQkFBMkIsR0FDM0IsTUFBTSxtRkFBbUYsQ0FBQTtBQUUxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFakUsSUFBTSw4QkFBOEIsR0FBcEMsTUFBTSw4QkFBOEI7YUFDMUIsT0FBRSxHQUFHLHlCQUF5QixBQUE1QixDQUE0QjtJQUk5QyxZQUNzQixrQkFBdUMsRUFDNUMsYUFBNkIsRUFDaEIsb0JBQWlEO1FBTDlELFdBQU0sR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBTzlDLE1BQU0sU0FBUyxHQUFHLG1CQUFtQixDQUNwQyxJQUFJLEVBQ0osYUFBYSxDQUFDLHVCQUF1QixFQUNyQyxHQUFHLEVBQUUsQ0FBQyxhQUFhLENBQUMsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLFFBQVEsQ0FDcEQsQ0FBQTtRQUVELElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUNkLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2IsTUFBTSxNQUFNLEdBQUcsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2IsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLEtBQUssR0FBRyxrQkFBa0IsQ0FBQyxrQkFBa0I7aUJBQ2pELElBQUksQ0FBQyxDQUFDLENBQUM7aUJBQ1AsSUFBSSxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ2pELElBQUksS0FBSyxFQUFFLENBQUM7Z0JBQ1gsb0JBQW9CLENBQUMsVUFBVSxDQUFDLG1CQUFtQixDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDMUUsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDdEIsQ0FBQzs7QUFuQ1csOEJBQThCO0lBTXhDLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxjQUFjLENBQUE7SUFDZCxXQUFBLDJCQUEyQixDQUFBO0dBUmpCLDhCQUE4QixDQW9DMUMifQ==