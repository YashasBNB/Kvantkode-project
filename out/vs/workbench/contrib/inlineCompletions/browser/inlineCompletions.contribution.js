/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
import { wrapInHotClass1 } from '../../../../platform/observable/common/wrapInHotClass.js';
import { InlineCompletionLanguageStatusBarContribution } from './inlineCompletionLanguageStatusBarContribution.js';
registerEditorContribution(InlineCompletionLanguageStatusBarContribution.Id, wrapInHotClass1(InlineCompletionLanguageStatusBarContribution.hot), 3 /* EditorContributionInstantiation.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5saW5lQ29tcGxldGlvbnMuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaW5saW5lQ29tcGxldGlvbnMvYnJvd3Nlci9pbmxpbmVDb21wbGV0aW9ucy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsNkNBQTZDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVsSCwwQkFBMEIsQ0FDekIsNkNBQTZDLENBQUMsRUFBRSxFQUNoRCxlQUFlLENBQUMsNkNBQTZDLENBQUMsR0FBRyxDQUFDLHFEQUVsRSxDQUFBIn0=