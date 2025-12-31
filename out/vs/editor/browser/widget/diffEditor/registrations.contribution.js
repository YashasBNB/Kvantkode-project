/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Codicon } from '../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { ModelDecorationOptions } from '../../../common/model/textModel.js';
import { localize } from '../../../../nls.js';
import { registerColor } from '../../../../platform/theme/common/colorRegistry.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
export const diffMoveBorder = registerColor('diffEditor.move.border', '#8b8b8b9c', localize('diffEditor.move.border', 'The border color for text that got moved in the diff editor.'));
export const diffMoveBorderActive = registerColor('diffEditor.moveActive.border', '#FFA500', localize('diffEditor.moveActive.border', 'The active border color for text that got moved in the diff editor.'));
export const diffEditorUnchangedRegionShadow = registerColor('diffEditor.unchangedRegionShadow', { dark: '#000000', light: '#737373BF', hcDark: '#000000', hcLight: '#737373BF' }, localize('diffEditor.unchangedRegionShadow', 'The color of the shadow around unchanged region widgets.'));
export const diffInsertIcon = registerIcon('diff-insert', Codicon.add, localize('diffInsertIcon', 'Line decoration for inserts in the diff editor.'));
export const diffRemoveIcon = registerIcon('diff-remove', Codicon.remove, localize('diffRemoveIcon', 'Line decoration for removals in the diff editor.'));
export const diffLineAddDecorationBackgroundWithIndicator = ModelDecorationOptions.register({
    className: 'line-insert',
    description: 'line-insert',
    isWholeLine: true,
    linesDecorationsClassName: 'insert-sign ' + ThemeIcon.asClassName(diffInsertIcon),
    marginClassName: 'gutter-insert',
});
export const diffLineDeleteDecorationBackgroundWithIndicator = ModelDecorationOptions.register({
    className: 'line-delete',
    description: 'line-delete',
    isWholeLine: true,
    linesDecorationsClassName: 'delete-sign ' + ThemeIcon.asClassName(diffRemoveIcon),
    marginClassName: 'gutter-delete',
});
export const diffLineAddDecorationBackground = ModelDecorationOptions.register({
    className: 'line-insert',
    description: 'line-insert',
    isWholeLine: true,
    marginClassName: 'gutter-insert',
});
export const diffLineDeleteDecorationBackground = ModelDecorationOptions.register({
    className: 'line-delete',
    description: 'line-delete',
    isWholeLine: true,
    marginClassName: 'gutter-delete',
});
export const diffAddDecoration = ModelDecorationOptions.register({
    className: 'char-insert',
    description: 'char-insert',
    shouldFillLineOnLineBreak: true,
});
export const diffWholeLineAddDecoration = ModelDecorationOptions.register({
    className: 'char-insert',
    description: 'char-insert',
    isWholeLine: true,
});
export const diffAddDecorationEmpty = ModelDecorationOptions.register({
    className: 'char-insert diff-range-empty',
    description: 'char-insert diff-range-empty',
});
export const diffDeleteDecoration = ModelDecorationOptions.register({
    className: 'char-delete',
    description: 'char-delete',
    shouldFillLineOnLineBreak: true,
});
export const diffWholeLineDeleteDecoration = ModelDecorationOptions.register({
    className: 'char-delete',
    description: 'char-delete',
    isWholeLine: true,
});
export const diffDeleteDecorationEmpty = ModelDecorationOptions.register({
    className: 'char-delete diff-range-empty',
    description: 'char-delete diff-range-empty',
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cmF0aW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvZGlmZkVkaXRvci9yZWdpc3RyYXRpb25zLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDbEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxhQUFhLENBQzFDLHdCQUF3QixFQUN4QixXQUFXLEVBQ1gsUUFBUSxDQUNQLHdCQUF3QixFQUN4Qiw4REFBOEQsQ0FDOUQsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sb0JBQW9CLEdBQUcsYUFBYSxDQUNoRCw4QkFBOEIsRUFDOUIsU0FBUyxFQUNULFFBQVEsQ0FDUCw4QkFBOEIsRUFDOUIscUVBQXFFLENBQ3JFLENBQ0QsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGFBQWEsQ0FDM0Qsa0NBQWtDLEVBQ2xDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUNoRixRQUFRLENBQ1Asa0NBQWtDLEVBQ2xDLDBEQUEwRCxDQUMxRCxDQUNE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