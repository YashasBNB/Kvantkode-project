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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVnaXN0cmF0aW9ucy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3dpZGdldC9kaWZmRWRpdG9yL3JlZ2lzdHJhdGlvbnMuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FDMUMsd0JBQXdCLEVBQ3hCLFdBQVcsRUFDWCxRQUFRLENBQ1Asd0JBQXdCLEVBQ3hCLDhEQUE4RCxDQUM5RCxDQUNELENBQUE7QUFFRCxNQUFNLENBQUMsTUFBTSxvQkFBb0IsR0FBRyxhQUFhLENBQ2hELDhCQUE4QixFQUM5QixTQUFTLEVBQ1QsUUFBUSxDQUNQLDhCQUE4QixFQUM5QixxRUFBcUUsQ0FDckUsQ0FDRCxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sK0JBQStCLEdBQUcsYUFBYSxDQUMzRCxrQ0FBa0MsRUFDbEMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQ2hGLFFBQVEsQ0FDUCxrQ0FBa0MsRUFDbEMsMERBQTBELENBQzFE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