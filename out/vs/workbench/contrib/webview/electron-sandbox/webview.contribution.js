/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IWebviewService } from '../browser/webview.js';
import * as webviewCommands from './webviewCommands.js';
import { ElectronWebviewService } from './webviewService.js';
registerSingleton(IWebviewService, ElectronWebviewService, 1 /* InstantiationType.Delayed */);
registerAction2(webviewCommands.OpenWebviewDeveloperToolsAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlldy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2VsZWN0cm9uLXNhbmRib3gvd2Vidmlldy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDdkQsT0FBTyxLQUFLLGVBQWUsTUFBTSxzQkFBc0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1RCxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsc0JBQXNCLG9DQUE0QixDQUFBO0FBRXJGLGVBQWUsQ0FBQyxlQUFlLENBQUMsK0JBQStCLENBQUMsQ0FBQSJ9