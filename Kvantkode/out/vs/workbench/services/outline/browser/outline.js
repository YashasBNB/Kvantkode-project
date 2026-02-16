/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IOutlineService = createDecorator('IOutlineService');
export var OutlineTarget;
(function (OutlineTarget) {
    OutlineTarget[OutlineTarget["OutlinePane"] = 1] = "OutlinePane";
    OutlineTarget[OutlineTarget["Breadcrumbs"] = 2] = "Breadcrumbs";
    OutlineTarget[OutlineTarget["QuickPick"] = 4] = "QuickPick";
})(OutlineTarget || (OutlineTarget = {}));
export var OutlineConfigKeys;
(function (OutlineConfigKeys) {
    OutlineConfigKeys["icons"] = "outline.icons";
    OutlineConfigKeys["collapseItems"] = "outline.collapseItems";
    OutlineConfigKeys["problemsEnabled"] = "outline.problems.enabled";
    OutlineConfigKeys["problemsColors"] = "outline.problems.colors";
    OutlineConfigKeys["problemsBadges"] = "outline.problems.badges";
})(OutlineConfigKeys || (OutlineConfigKeys = {}));
export var OutlineConfigCollapseItemsValues;
(function (OutlineConfigCollapseItemsValues) {
    OutlineConfigCollapseItemsValues["Collapsed"] = "alwaysCollapse";
    OutlineConfigCollapseItemsValues["Expanded"] = "alwaysExpand";
})(OutlineConfigCollapseItemsValues || (OutlineConfigCollapseItemsValues = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0bGluZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL291dGxpbmUvYnJvd3Nlci9vdXRsaW5lLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUk1RixNQUFNLENBQUMsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFrQixpQkFBaUIsQ0FBQyxDQUFBO0FBRWxGLE1BQU0sQ0FBTixJQUFrQixhQUlqQjtBQUpELFdBQWtCLGFBQWE7SUFDOUIsK0RBQWUsQ0FBQTtJQUNmLCtEQUFlLENBQUE7SUFDZiwyREFBYSxDQUFBO0FBQ2QsQ0FBQyxFQUppQixhQUFhLEtBQWIsYUFBYSxRQUk5QjtBQWdGRCxNQUFNLENBQU4sSUFBa0IsaUJBTWpCO0FBTkQsV0FBa0IsaUJBQWlCO0lBQ2xDLDRDQUF5QixDQUFBO0lBQ3pCLDREQUF5QyxDQUFBO0lBQ3pDLGlFQUE4QyxDQUFBO0lBQzlDLCtEQUE0QyxDQUFBO0lBQzVDLCtEQUE0QyxDQUFBO0FBQzdDLENBQUMsRUFOaUIsaUJBQWlCLEtBQWpCLGlCQUFpQixRQU1sQztBQUVELE1BQU0sQ0FBTixJQUFrQixnQ0FHakI7QUFIRCxXQUFrQixnQ0FBZ0M7SUFDakQsZ0VBQTRCLENBQUE7SUFDNUIsNkRBQXlCLENBQUE7QUFDMUIsQ0FBQyxFQUhpQixnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBR2pEIn0=