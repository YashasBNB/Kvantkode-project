/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export var OutlineSortOrder;
(function (OutlineSortOrder) {
    OutlineSortOrder[OutlineSortOrder["ByPosition"] = 0] = "ByPosition";
    OutlineSortOrder[OutlineSortOrder["ByName"] = 1] = "ByName";
    OutlineSortOrder[OutlineSortOrder["ByKind"] = 2] = "ByKind";
})(OutlineSortOrder || (OutlineSortOrder = {}));
export var IOutlinePane;
(function (IOutlinePane) {
    IOutlinePane.Id = 'outline';
})(IOutlinePane || (IOutlinePane = {}));
// --- context keys
export const ctxFollowsCursor = new RawContextKey('outlineFollowsCursor', false);
export const ctxFilterOnType = new RawContextKey('outlineFiltersOnType', false);
export const ctxSortMode = new RawContextKey('outlineSortMode', 0 /* OutlineSortOrder.ByPosition */);
export const ctxAllCollapsed = new RawContextKey('outlineAllCollapsed', false);
export const ctxFocused = new RawContextKey('outlineFocused', true);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0bGluZS9icm93c2VyL291dGxpbmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3BGLE1BQU0sQ0FBTixJQUFrQixnQkFJakI7QUFKRCxXQUFrQixnQkFBZ0I7SUFDakMsbUVBQVUsQ0FBQTtJQUNWLDJEQUFNLENBQUE7SUFDTiwyREFBTSxDQUFBO0FBQ1AsQ0FBQyxFQUppQixnQkFBZ0IsS0FBaEIsZ0JBQWdCLFFBSWpDO0FBUUQsTUFBTSxLQUFXLFlBQVksQ0FFNUI7QUFGRCxXQUFpQixZQUFZO0lBQ2YsZUFBRSxHQUFHLFNBQVMsQ0FBQTtBQUM1QixDQUFDLEVBRmdCLFlBQVksS0FBWixZQUFZLFFBRTVCO0FBUUQsbUJBQW1CO0FBRW5CLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLElBQUksYUFBYSxDQUFVLHNCQUFzQixFQUFFLEtBQUssQ0FBQyxDQUFBO0FBQ3pGLE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBVSxzQkFBc0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN4RixNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxhQUFhLENBQzNDLGlCQUFpQixzQ0FFakIsQ0FBQTtBQUNELE1BQU0sQ0FBQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGFBQWEsQ0FBVSxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN2RixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxhQUFhLENBQVUsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUEifQ==