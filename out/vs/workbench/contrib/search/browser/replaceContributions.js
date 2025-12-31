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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbGFjZUNvbnRyaWJ1dGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zZWFyY2gvYnJvd3Nlci9yZXBsYWNlQ29udHJpYnV0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGNBQWMsQ0FBQTtBQUM5QyxPQUFPLEVBQUUsY0FBYyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDbkYsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRWpHLE1BQU0sVUFBVSxxQkFBcUI7SUFDcEMsaUJBQWlCLENBQUMsZUFBZSxFQUFFLGNBQWMsb0NBQTRCLENBQUE7SUFDN0UsOEJBQThCLENBQzdCLDZCQUE2QixDQUFDLEVBQUUsRUFDaEMsNkJBQTZCLHNDQUU3QixDQUFBO0FBQ0YsQ0FBQyJ9