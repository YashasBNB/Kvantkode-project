/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const variablePageSize = 100;
export var ProxyKernelState;
(function (ProxyKernelState) {
    ProxyKernelState[ProxyKernelState["Disconnected"] = 1] = "Disconnected";
    ProxyKernelState[ProxyKernelState["Connected"] = 2] = "Connected";
    ProxyKernelState[ProxyKernelState["Initializing"] = 3] = "Initializing";
})(ProxyKernelState || (ProxyKernelState = {}));
export const INotebookKernelService = createDecorator('INotebookKernelService');
export const INotebookKernelHistoryService = createDecorator('INotebookKernelHistoryService');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tLZXJuZWxTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9jb21tb24vbm90ZWJvb2tLZXJuZWxTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBVWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQW1DNUYsTUFBTSxDQUFDLE1BQU0sZ0JBQWdCLEdBQUcsR0FBRyxDQUFBO0FBZ0NuQyxNQUFNLENBQU4sSUFBa0IsZ0JBSWpCO0FBSkQsV0FBa0IsZ0JBQWdCO0lBQ2pDLHVFQUFnQixDQUFBO0lBQ2hCLGlFQUFhLENBQUE7SUFDYix1RUFBZ0IsQ0FBQTtBQUNqQixDQUFDLEVBSmlCLGdCQUFnQixLQUFoQixnQkFBZ0IsUUFJakM7QUFrQ0QsTUFBTSxDQUFDLE1BQU0sc0JBQXNCLEdBQ2xDLGVBQWUsQ0FBeUIsd0JBQXdCLENBQUMsQ0FBQTtBQThEbEUsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUMzRCwrQkFBK0IsQ0FDL0IsQ0FBQSJ9