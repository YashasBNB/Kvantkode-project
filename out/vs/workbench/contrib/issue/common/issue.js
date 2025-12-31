/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export var IssueType;
(function (IssueType) {
    IssueType[IssueType["Bug"] = 0] = "Bug";
    IssueType[IssueType["PerformanceIssue"] = 1] = "PerformanceIssue";
    IssueType[IssueType["FeatureRequest"] = 2] = "FeatureRequest";
})(IssueType || (IssueType = {}));
export var IssueSource;
(function (IssueSource) {
    IssueSource["VSCode"] = "vscode";
    IssueSource["Extension"] = "extension";
    IssueSource["Marketplace"] = "marketplace";
})(IssueSource || (IssueSource = {}));
export const IIssueFormService = createDecorator('issueFormService');
export const IWorkbenchIssueService = createDecorator('workbenchIssueService');
export const IWorkbenchProcessService = createDecorator('workbenchProcessService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9jb21tb24vaXNzdWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFJaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBYTVGLE1BQU0sQ0FBTixJQUFrQixTQUlqQjtBQUpELFdBQWtCLFNBQVM7SUFDMUIsdUNBQUcsQ0FBQTtJQUNILGlFQUFnQixDQUFBO0lBQ2hCLDZEQUFjLENBQUE7QUFDZixDQUFDLEVBSmlCLFNBQVMsS0FBVCxTQUFTLFFBSTFCO0FBRUQsTUFBTSxDQUFOLElBQVksV0FJWDtBQUpELFdBQVksV0FBVztJQUN0QixnQ0FBaUIsQ0FBQTtJQUNqQixzQ0FBdUIsQ0FBQTtJQUN2QiwwQ0FBMkIsQ0FBQTtBQUM1QixDQUFDLEVBSlcsV0FBVyxLQUFYLFdBQVcsUUFJdEI7QUFvRkQsTUFBTSxDQUFDLE1BQU0saUJBQWlCLEdBQUcsZUFBZSxDQUFvQixrQkFBa0IsQ0FBQyxDQUFBO0FBY3ZGLE1BQU0sQ0FBQyxNQUFNLHNCQUFzQixHQUNsQyxlQUFlLENBQXlCLHVCQUF1QixDQUFDLENBQUE7QUFPakUsTUFBTSxDQUFDLE1BQU0sd0JBQXdCLEdBQ3BDLGVBQWUsQ0FBMkIseUJBQXlCLENBQUMsQ0FBQSJ9