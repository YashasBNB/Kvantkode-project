/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { LanguageStatusContribution, ResetAction } from './languageStatus.js';
registerWorkbenchContribution2(LanguageStatusContribution.Id, LanguageStatusContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(ResetAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdGF0dXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sYW5ndWFnZVN0YXR1cy9icm93c2VyL2xhbmd1YWdlU3RhdHVzLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsOEJBQThCLEVBQWtCLE1BQU0sa0NBQWtDLENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxXQUFXLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU3RSw4QkFBOEIsQ0FDN0IsMEJBQTBCLENBQUMsRUFBRSxFQUM3QiwwQkFBMEIsdUNBRTFCLENBQUE7QUFDRCxlQUFlLENBQUMsV0FBVyxDQUFDLENBQUEifQ==