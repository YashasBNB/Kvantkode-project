/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { basename, normalize } from '../../../../../base/common/path.js';
export class MockLabelService {
    constructor() {
        this.onDidChangeFormatters = new Emitter().event;
    }
    registerCachedFormatter(formatter) {
        throw new Error('Method not implemented.');
    }
    getUriLabel(resource, options) {
        return normalize(resource.fsPath);
    }
    getUriBasenameLabel(resource) {
        return basename(resource.fsPath);
    }
    getWorkspaceLabel(workspace, options) {
        return '';
    }
    getHostLabel(scheme, authority) {
        return '';
    }
    getHostTooltip() {
        return '';
    }
    getSeparator(scheme, authority) {
        return '/';
    }
    registerFormatter(formatter) {
        return Disposable.None;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2xhYmVsL3Rlc3QvY29tbW9uL21vY2tMYWJlbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBYXhFLE1BQU0sT0FBTyxnQkFBZ0I7SUFBN0I7UUFpQ0MsMEJBQXFCLEdBQWlDLElBQUksT0FBTyxFQUF5QixDQUFDLEtBQUssQ0FBQTtJQUNqRyxDQUFDO0lBL0JBLHVCQUF1QixDQUFDLFNBQWlDO1FBQ3hELE1BQU0sSUFBSSxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBQ0QsV0FBVyxDQUNWLFFBQWEsRUFDYixPQUE0RTtRQUU1RSxPQUFPLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDbEMsQ0FBQztJQUNELG1CQUFtQixDQUFDLFFBQWE7UUFDaEMsT0FBTyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFDRCxpQkFBaUIsQ0FDaEIsU0FBa0QsRUFDbEQsT0FBZ0M7UUFFaEMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ0QsWUFBWSxDQUFDLE1BQWMsRUFBRSxTQUFrQjtRQUM5QyxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDTSxjQUFjO1FBQ3BCLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBa0I7UUFDOUMsT0FBTyxHQUFHLENBQUE7SUFDWCxDQUFDO0lBQ0QsaUJBQWlCLENBQUMsU0FBaUM7UUFDbEQsT0FBTyxVQUFVLENBQUMsSUFBSSxDQUFBO0lBQ3ZCLENBQUM7Q0FFRCJ9