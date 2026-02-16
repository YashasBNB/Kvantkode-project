/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerMainProcessRemoteService, registerSharedProcessRemoteService, } from '../../ipc/electron-sandbox/services.js';
import { ISharedWebContentExtractorService, IWebContentExtractorService, } from '../common/webContentExtractor.js';
registerMainProcessRemoteService(IWebContentExtractorService, 'webContentExtractor');
registerSharedProcessRemoteService(ISharedWebContentExtractorService, 'sharedWebContentExtractor');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2ViQ29udGVudEV4dHJhY3RvclNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3dlYkNvbnRlbnRFeHRyYWN0b3IvZWxlY3Ryb24tc2FuZGJveC93ZWJDb250ZW50RXh0cmFjdG9yU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLGtDQUFrQyxHQUNsQyxNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFDTixpQ0FBaUMsRUFDakMsMkJBQTJCLEdBQzNCLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsZ0NBQWdDLENBQUMsMkJBQTJCLEVBQUUscUJBQXFCLENBQUMsQ0FBQTtBQUNwRixrQ0FBa0MsQ0FBQyxpQ0FBaUMsRUFBRSwyQkFBMkIsQ0FBQyxDQUFBIn0=