/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IDiagnosticsService } from '../common/diagnostics.js';
import { registerSharedProcessRemoteService } from '../../ipc/electron-sandbox/services.js';
registerSharedProcessRemoteService(IDiagnosticsService, 'diagnostics');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3NTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFnbm9zdGljcy9lbGVjdHJvbi1zYW5kYm94L2RpYWdub3N0aWNzU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUUzRixrQ0FBa0MsQ0FBQyxtQkFBbUIsRUFBRSxhQUFhLENBQUMsQ0FBQSJ9