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
import { DropdownMenuActionViewItem, } from '../../../base/browser/ui/dropdown/dropdownActionViewItem.js';
import * as nls from '../../../nls.js';
import { IContextKeyService } from '../../contextkey/common/contextkey.js';
import { IKeybindingService } from '../../keybinding/common/keybinding.js';
let DropdownMenuActionViewItemWithKeybinding = class DropdownMenuActionViewItemWithKeybinding extends DropdownMenuActionViewItem {
    constructor(action, menuActionsOrProvider, contextMenuProvider, options = Object.create(null), keybindingService, contextKeyService) {
        super(action, menuActionsOrProvider, contextMenuProvider, options);
        this.keybindingService = keybindingService;
        this.contextKeyService = contextKeyService;
    }
    getTooltip() {
        const keybinding = this.keybindingService.lookupKeybinding(this.action.id, this.contextKeyService);
        const keybindingLabel = keybinding && keybinding.getLabel();
        const tooltip = this.action.tooltip ?? this.action.label;
        return keybindingLabel
            ? nls.localize('titleAndKb', '{0} ({1})', tooltip, keybindingLabel)
            : tooltip;
    }
};
DropdownMenuActionViewItemWithKeybinding = __decorate([
    __param(4, IKeybindingService),
    __param(5, IContextKeyService)
], DropdownMenuActionViewItemWithKeybinding);
export { DropdownMenuActionViewItemWithKeybinding };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25BY3Rpb25WaWV3SXRlbVdpdGhLZXliaW5kaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9hY3Rpb25zL2Jyb3dzZXIvZHJvcGRvd25BY3Rpb25WaWV3SXRlbVdpdGhLZXliaW5kaW5nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFDTiwwQkFBMEIsR0FFMUIsTUFBTSw2REFBNkQsQ0FBQTtBQUVwRSxPQUFPLEtBQUssR0FBRyxNQUFNLGlCQUFpQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRW5FLElBQU0sd0NBQXdDLEdBQTlDLE1BQU0sd0NBQXlDLFNBQVEsMEJBQTBCO0lBQ3ZGLFlBQ0MsTUFBZSxFQUNmLHFCQUEyRCxFQUMzRCxtQkFBeUMsRUFDekMsVUFBOEMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFDNUIsaUJBQXFDLEVBQ3JDLGlCQUFxQztRQUUxRSxLQUFLLENBQUMsTUFBTSxFQUFFLHFCQUFxQixFQUFFLG1CQUFtQixFQUFFLE9BQU8sQ0FBQyxDQUFBO1FBSDdCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFDckMsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFvQjtJQUczRSxDQUFDO0lBRWtCLFVBQVU7UUFDNUIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUN6RCxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFDZCxJQUFJLENBQUMsaUJBQWlCLENBQ3RCLENBQUE7UUFDRCxNQUFNLGVBQWUsR0FBRyxVQUFVLElBQUksVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBRTNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ3hELE9BQU8sZUFBZTtZQUNyQixDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxZQUFZLEVBQUUsV0FBVyxFQUFFLE9BQU8sRUFBRSxlQUFlLENBQUM7WUFDbkUsQ0FBQyxDQUFDLE9BQU8sQ0FBQTtJQUNYLENBQUM7Q0FDRCxDQUFBO0FBeEJZLHdDQUF3QztJQU1sRCxXQUFBLGtCQUFrQixDQUFBO0lBQ2xCLFdBQUEsa0JBQWtCLENBQUE7R0FQUix3Q0FBd0MsQ0F3QnBEIn0=