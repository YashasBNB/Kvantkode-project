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
var ReportExtensionIssueAction_1;
import * as nls from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { IWorkbenchIssueService } from '../../issue/common/issue.js';
let ReportExtensionIssueAction = class ReportExtensionIssueAction extends Action {
    static { ReportExtensionIssueAction_1 = this; }
    static { this._id = 'workbench.extensions.action.reportExtensionIssue'; }
    static { this._label = nls.localize('reportExtensionIssue', 'Report Issue'); }
    // TODO: Consider passing in IExtensionStatus or IExtensionHostProfile for additional data
    constructor(extension, issueService) {
        super(ReportExtensionIssueAction_1._id, ReportExtensionIssueAction_1._label, 'extension-action report-issue');
        this.extension = extension;
        this.issueService = issueService;
        this.enabled = extension.isBuiltin || (!!extension.repository && !!extension.repository.url);
    }
    async run() {
        await this.issueService.openReporter({
            extensionId: this.extension.identifier.value,
        });
    }
};
ReportExtensionIssueAction = ReportExtensionIssueAction_1 = __decorate([
    __param(1, IWorkbenchIssueService)
], ReportExtensionIssueAction);
export { ReportExtensionIssueAction };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0RXh0ZW5zaW9uSXNzdWVBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL3JlcG9ydEV4dGVuc2lvbklzc3VlQWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUU3RCxJQUFNLDBCQUEwQixHQUFoQyxNQUFNLDBCQUEyQixTQUFRLE1BQU07O2FBQzdCLFFBQUcsR0FBRyxrREFBa0QsQUFBckQsQ0FBcUQ7YUFDeEQsV0FBTSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsY0FBYyxDQUFDLEFBQXZELENBQXVEO0lBRXJGLDBGQUEwRjtJQUMxRixZQUNTLFNBQWdDLEVBQ0MsWUFBb0M7UUFFN0UsS0FBSyxDQUNKLDRCQUEwQixDQUFDLEdBQUcsRUFDOUIsNEJBQTBCLENBQUMsTUFBTSxFQUNqQywrQkFBK0IsQ0FDL0IsQ0FBQTtRQVBPLGNBQVMsR0FBVCxTQUFTLENBQXVCO1FBQ0MsaUJBQVksR0FBWixZQUFZLENBQXdCO1FBUTdFLElBQUksQ0FBQyxPQUFPLEdBQUcsU0FBUyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxJQUFJLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFUSxLQUFLLENBQUMsR0FBRztRQUNqQixNQUFNLElBQUksQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQ3BDLFdBQVcsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxLQUFLO1NBQzVDLENBQUMsQ0FBQTtJQUNILENBQUM7O0FBdEJXLDBCQUEwQjtJQU9wQyxXQUFBLHNCQUFzQixDQUFBO0dBUFosMEJBQTBCLENBdUJ0QyJ9