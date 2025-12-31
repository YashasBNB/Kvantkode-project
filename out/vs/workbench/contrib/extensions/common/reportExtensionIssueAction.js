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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwb3J0RXh0ZW5zaW9uSXNzdWVBY3Rpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2NvbW1vbi9yZXBvcnRFeHRlbnNpb25Jc3N1ZUFjdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFM0QsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFFN0QsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFBMkIsU0FBUSxNQUFNOzthQUM3QixRQUFHLEdBQUcsa0RBQWtELEFBQXJELENBQXFEO2FBQ3hELFdBQU0sR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLGNBQWMsQ0FBQyxBQUF2RCxDQUF1RDtJQUVyRiwwRkFBMEY7SUFDMUYsWUFDUyxTQUFnQyxFQUNDLFlBQW9DO1FBRTdFLEtBQUssQ0FDSiw0QkFBMEIsQ0FBQyxHQUFHLEVBQzlCLDRCQUEwQixDQUFDLE1BQU0sRUFDakMsK0JBQStCLENBQy9CLENBQUE7UUFQTyxjQUFTLEdBQVQsU0FBUyxDQUF1QjtRQUNDLGlCQUFZLEdBQVosWUFBWSxDQUF3QjtRQVE3RSxJQUFJLENBQUMsT0FBTyxHQUFHLFNBQVMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRVEsS0FBSyxDQUFDLEdBQUc7UUFDakIsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQztZQUNwQyxXQUFXLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsS0FBSztTQUM1QyxDQUFDLENBQUE7SUFDSCxDQUFDOztBQXRCVywwQkFBMEI7SUFPcEMsV0FBQSxzQkFBc0IsQ0FBQTtHQVBaLDBCQUEwQixDQXVCdEMifQ==