/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { LanguageStatusContribution, ResetAction } from './languageStatus.js';
registerWorkbenchContribution2(LanguageStatusContribution.Id, LanguageStatusContribution, 3 /* WorkbenchPhase.AfterRestored */);
registerAction2(ResetAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTdGF0dXMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGFuZ3VhZ2VTdGF0dXMvYnJvd3Nlci9sYW5ndWFnZVN0YXR1cy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLDhCQUE4QixFQUFrQixNQUFNLGtDQUFrQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNoRixPQUFPLEVBQUUsMEJBQTBCLEVBQUUsV0FBVyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFN0UsOEJBQThCLENBQzdCLDBCQUEwQixDQUFDLEVBQUUsRUFDN0IsMEJBQTBCLHVDQUUxQixDQUFBO0FBQ0QsZUFBZSxDQUFDLFdBQVcsQ0FBQyxDQUFBIn0=