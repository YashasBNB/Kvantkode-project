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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHJvcGRvd25BY3Rpb25WaWV3SXRlbVdpdGhLZXliaW5kaW5nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vYWN0aW9ucy9icm93c2VyL2Ryb3Bkb3duQWN0aW9uVmlld0l0ZW1XaXRoS2V5YmluZGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQ04sMEJBQTBCLEdBRTFCLE1BQU0sNkRBQTZELENBQUE7QUFFcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUVuRSxJQUFNLHdDQUF3QyxHQUE5QyxNQUFNLHdDQUF5QyxTQUFRLDBCQUEwQjtJQUN2RixZQUNDLE1BQWUsRUFDZixxQkFBMkQsRUFDM0QsbUJBQXlDLEVBQ3pDLFVBQThDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQzVCLGlCQUFxQyxFQUNyQyxpQkFBcUM7UUFFMUUsS0FBSyxDQUFDLE1BQU0sRUFBRSxxQkFBcUIsRUFBRSxtQkFBbUIsRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUg3QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3JDLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7SUFHM0UsQ0FBQztJQUVrQixVQUFVO1FBQzVCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQ2QsSUFBSSxDQUFDLGlCQUFpQixDQUN0QixDQUFBO1FBQ0QsTUFBTSxlQUFlLEdBQUcsVUFBVSxJQUFJLFVBQVUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUUzRCxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQTtRQUN4RCxPQUFPLGVBQWU7WUFDckIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsZUFBZSxDQUFDO1lBQ25FLENBQUMsQ0FBQyxPQUFPLENBQUE7SUFDWCxDQUFDO0NBQ0QsQ0FBQTtBQXhCWSx3Q0FBd0M7SUFNbEQsV0FBQSxrQkFBa0IsQ0FBQTtJQUNsQixXQUFBLGtCQUFrQixDQUFBO0dBUFIsd0NBQXdDLENBd0JwRCJ9