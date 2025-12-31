/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerMainProcessRemoteService, registerSharedProcessRemoteService, } from '../../ipc/electron-sandbox/services.js';
import { ISharedWebContentExtractorService, IWebContentExtractorService, } from '../common/webContentExtractor.js';
registerMainProcessRemoteService(IWebContentExtractorService, 'webContentExtractor');
registerSharedProcessRemoteService(ISharedWebContentExtractorService, 'sharedWebContentExtractor');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS93ZWJDb250ZW50RXh0cmFjdG9yL2VsZWN0cm9uLXNhbmRib3gvd2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyxrQ0FBa0MsR0FDbEMsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBQ04saUNBQWlDLEVBQ2pDLDJCQUEyQixHQUMzQixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLGdDQUFnQyxDQUFDLDJCQUEyQixFQUFFLHFCQUFxQixDQUFDLENBQUE7QUFDcEYsa0NBQWtDLENBQUMsaUNBQWlDLEVBQUUsMkJBQTJCLENBQUMsQ0FBQSJ9