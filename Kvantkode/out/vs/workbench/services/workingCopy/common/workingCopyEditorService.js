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
import { Emitter } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IEditorService } from '../../editor/common/editorService.js';
export const IWorkingCopyEditorService = createDecorator('workingCopyEditorService');
let WorkingCopyEditorService = class WorkingCopyEditorService extends Disposable {
    constructor(editorService) {
        super();
        this.editorService = editorService;
        this._onDidRegisterHandler = this._register(new Emitter());
        this.onDidRegisterHandler = this._onDidRegisterHandler.event;
        this.handlers = new Set();
    }
    registerHandler(handler) {
        // Add to registry and emit as event
        this.handlers.add(handler);
        this._onDidRegisterHandler.fire(handler);
        return toDisposable(() => this.handlers.delete(handler));
    }
    findEditor(workingCopy) {
        for (const editorIdentifier of this.editorService.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */)) {
            if (this.isOpen(workingCopy, editorIdentifier.editor)) {
                return editorIdentifier;
            }
        }
        return undefined;
    }
    isOpen(workingCopy, editor) {
        for (const handler of this.handlers) {
            if (handler.isOpen(workingCopy, editor)) {
                return true;
            }
        }
        return false;
    }
};
WorkingCopyEditorService = __decorate([
    __param(0, IEditorService)
], WorkingCopyEditorService);
export { WorkingCopyEditorService };
// Register Service
registerSingleton(IWorkingCopyEditorService, WorkingCopyEditorService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlFZGl0b3JTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvd29ya2luZ0NvcHkvY29tbW9uL3dvcmtpbmdDb3B5RWRpdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQzVGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUloRSxPQUFPLEVBQUUsVUFBVSxFQUFlLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVyRSxNQUFNLENBQUMsTUFBTSx5QkFBeUIsR0FBRyxlQUFlLENBQ3ZELDBCQUEwQixDQUMxQixDQUFBO0FBdUNNLElBQU0sd0JBQXdCLEdBQTlCLE1BQU0sd0JBQXlCLFNBQVEsVUFBVTtJQVF2RCxZQUE0QixhQUE4QztRQUN6RSxLQUFLLEVBQUUsQ0FBQTtRQURxQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZ0I7UUFMekQsMEJBQXFCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBNkIsQ0FBQyxDQUFBO1FBQ3hGLHlCQUFvQixHQUFHLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUE7UUFFL0MsYUFBUSxHQUFHLElBQUksR0FBRyxFQUE2QixDQUFBO0lBSWhFLENBQUM7SUFFRCxlQUFlLENBQUMsT0FBa0M7UUFDakQsb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQzFCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFeEMsT0FBTyxZQUFZLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsVUFBVSxDQUFDLFdBQXlCO1FBQ25DLEtBQUssTUFBTSxnQkFBZ0IsSUFBSSxJQUFJLENBQUMsYUFBYSxDQUFDLFVBQVUsMkNBRTNELEVBQUUsQ0FBQztZQUNILElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDdkQsT0FBTyxnQkFBZ0IsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQztRQUVELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxNQUFNLENBQUMsV0FBeUIsRUFBRSxNQUFtQjtRQUM1RCxLQUFLLE1BQU0sT0FBTyxJQUFJLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNyQyxJQUFJLE9BQU8sQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7Q0FDRCxDQUFBO0FBekNZLHdCQUF3QjtJQVF2QixXQUFBLGNBQWMsQ0FBQTtHQVJmLHdCQUF3QixDQXlDcEM7O0FBRUQsbUJBQW1CO0FBQ25CLGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHdCQUF3QixvQ0FBNEIsQ0FBQSJ9