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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9ja0xhYmVsU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9sYWJlbC90ZXN0L2NvbW1vbi9tb2NrTGFiZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQWF4RSxNQUFNLE9BQU8sZ0JBQWdCO0lBQTdCO1FBaUNDLDBCQUFxQixHQUFpQyxJQUFJLE9BQU8sRUFBeUIsQ0FBQyxLQUFLLENBQUE7SUFDakcsQ0FBQztJQS9CQSx1QkFBdUIsQ0FBQyxTQUFpQztRQUN4RCxNQUFNLElBQUksS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUNELFdBQVcsQ0FDVixRQUFhLEVBQ2IsT0FBNEU7UUFFNUUsT0FBTyxTQUFTLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ2xDLENBQUM7SUFDRCxtQkFBbUIsQ0FBQyxRQUFhO1FBQ2hDLE9BQU8sUUFBUSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBQ0QsaUJBQWlCLENBQ2hCLFNBQWtELEVBQ2xELE9BQWdDO1FBRWhDLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztJQUNELFlBQVksQ0FBQyxNQUFjLEVBQUUsU0FBa0I7UUFDOUMsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBQ00sY0FBYztRQUNwQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFDRCxZQUFZLENBQUMsTUFBYyxFQUFFLFNBQWtCO1FBQzlDLE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztJQUNELGlCQUFpQixDQUFDLFNBQWlDO1FBQ2xELE9BQU8sVUFBVSxDQUFDLElBQUksQ0FBQTtJQUN2QixDQUFDO0NBRUQifQ==