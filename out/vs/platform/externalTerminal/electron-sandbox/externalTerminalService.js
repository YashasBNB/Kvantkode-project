/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { registerMainProcessRemoteService } from '../../ipc/electron-sandbox/services.js';
export const IExternalTerminalService = createDecorator('externalTerminal');
registerMainProcessRemoteService(IExternalTerminalService, 'externalTerminal');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlcm5hbFRlcm1pbmFsL2VsZWN0cm9uLXNhbmRib3gvZXh0ZXJuYWxUZXJtaW5hbFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxnQ0FBZ0MsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLHdCQUF3QixHQUNwQyxlQUFlLENBQTJCLGtCQUFrQixDQUFDLENBQUE7QUFNOUQsZ0NBQWdDLENBQUMsd0JBQXdCLEVBQUUsa0JBQWtCLENBQUMsQ0FBQSJ9