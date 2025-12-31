/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NativeWorkingCopyHistoryService } from '../common/workingCopyHistoryService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWorkingCopyHistoryService } from '../common/workingCopyHistory.js';
// Register Service
registerSingleton(IWorkingCopyHistoryService, NativeWorkingCopyHistoryService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2luZ0NvcHlIaXN0b3J5U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy93b3JraW5nQ29weS9lbGVjdHJvbi1zYW5kYm94L3dvcmtpbmdDb3B5SGlzdG9yeVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTVFLG1CQUFtQjtBQUNuQixpQkFBaUIsQ0FDaEIsMEJBQTBCLEVBQzFCLCtCQUErQixvQ0FFL0IsQ0FBQSJ9