/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { registerSingleton, } from '../../../platform/instantiation/common/extensions.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostExtensionService } from '../common/extHostExtensionService.js';
import { ExtHostLogService } from '../common/extHostLogService.js';
import { ExtensionStoragePaths, IExtensionStoragePaths } from '../common/extHostStoragePaths.js';
import { ExtHostTelemetry, IExtHostTelemetry } from '../common/extHostTelemetry.js';
import { ExtHostExtensionService } from './extHostExtensionService.js';
// #########################################################################
// ###                                                                   ###
// ### !!! PLEASE ADD COMMON IMPORTS INTO extHost.common.services.ts !!! ###
// ###                                                                   ###
// #########################################################################
registerSingleton(ILogService, new SyncDescriptor(ExtHostLogService, [true], true));
registerSingleton(IExtHostExtensionService, ExtHostExtensionService, 0 /* InstantiationType.Eager */);
registerSingleton(IExtensionStoragePaths, ExtensionStoragePaths, 0 /* InstantiationType.Eager */);
registerSingleton(IExtHostTelemetry, new SyncDescriptor(ExtHostTelemetry, [true], true));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdC53b3JrZXIuc2VydmljZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvd29ya2VyL2V4dEhvc3Qud29ya2VyLnNlcnZpY2VzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxzQkFBc0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ25GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRXRFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFDNUUsNEVBQTRFO0FBQzVFLDRFQUE0RTtBQUM1RSw0RUFBNEU7QUFFNUUsaUJBQWlCLENBQUMsV0FBVyxFQUFFLElBQUksY0FBYyxDQUFDLGlCQUFpQixFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtBQUNuRixpQkFBaUIsQ0FBQyx3QkFBd0IsRUFBRSx1QkFBdUIsa0NBQTBCLENBQUE7QUFDN0YsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUscUJBQXFCLGtDQUEwQixDQUFBO0FBQ3pGLGlCQUFpQixDQUFDLGlCQUFpQixFQUFFLElBQUksY0FBYyxDQUFDLGdCQUFnQixFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQSJ9