/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IReplaceService } from './replace.js';
import { ReplaceService, ReplacePreviewContentProvider } from './replaceService.js';
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
export function registerContributions() {
    registerSingleton(IReplaceService, ReplaceService, 1 /* InstantiationType.Delayed */);
    registerWorkbenchContribution2(ReplacePreviewContentProvider.ID, ReplacePreviewContentProvider, 1 /* WorkbenchPhase.BlockStartup */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC9icm93c2VyL3JlcGxhY2VDb250cmlidXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sY0FBYyxDQUFBO0FBQzlDLE9BQU8sRUFBRSxjQUFjLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNuRixPQUFPLEVBQWtCLDhCQUE4QixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFakcsTUFBTSxVQUFVLHFCQUFxQjtJQUNwQyxpQkFBaUIsQ0FBQyxlQUFlLEVBQUUsY0FBYyxvQ0FBNEIsQ0FBQTtJQUM3RSw4QkFBOEIsQ0FDN0IsNkJBQTZCLENBQUMsRUFBRSxFQUNoQyw2QkFBNkIsc0NBRTdCLENBQUE7QUFDRixDQUFDIn0=