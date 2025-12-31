/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './placeholderText.css';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { ghostTextForeground } from '../../../common/core/editorColorRegistry.js';
import { localize } from '../../../../nls.js';
import { registerColor } from '../../../../platform/theme/common/colorUtils.js';
import { PlaceholderTextContribution } from './placeholderTextContribution.js';
import { wrapInReloadableClass1 } from '../../../../platform/observable/common/wrapInReloadableClass.js';
registerEditorContribution(PlaceholderTextContribution.ID, wrapInReloadableClass1(() => PlaceholderTextContribution), 0 /* EditorContributionInstantiation.Eager */);
registerColor('editor.placeholder.foreground', ghostTextForeground, localize('placeholderForeground', 'Foreground color of the placeholder text in the editor.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGxhY2Vob2xkZXJUZXh0LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BsYWNlaG9sZGVyVGV4dC9icm93c2VyL3BsYWNlaG9sZGVyVGV4dC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDakYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUV4RywwQkFBMEIsQ0FDekIsMkJBQTJCLENBQUMsRUFBRSxFQUM5QixzQkFBc0IsQ0FBQyxHQUFHLEVBQUUsQ0FBQywyQkFBMkIsQ0FBQyxnREFFekQsQ0FBQTtBQUVELGFBQWEsQ0FDWiwrQkFBK0IsRUFDL0IsbUJBQW1CLEVBQ25CLFFBQVEsQ0FBQyx1QkFBdUIsRUFBRSx5REFBeUQsQ0FBQyxDQUM1RixDQUFBIn0=