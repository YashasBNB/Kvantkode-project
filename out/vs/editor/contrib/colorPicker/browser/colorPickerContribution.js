/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument } from '../../../../base/common/errors.js';
import { URI } from '../../../../base/common/uri.js';
import { registerAction2 } from '../../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { registerEditorAction, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { HoverParticipantRegistry } from '../../hover/browser/hoverTypes.js';
import { _findColorData, _setupColorCommand, ColorPresentationsCollector, ExtColorDataCollector, } from './color.js';
import { ColorDetector } from './colorDetector.js';
import { DefaultDocumentColorProviderFeature } from './defaultDocumentColorProvider.js';
import { HoverColorPickerContribution } from './hoverColorPicker/hoverColorPickerContribution.js';
import { HoverColorPickerParticipant } from './hoverColorPicker/hoverColorPickerParticipant.js';
import { HideStandaloneColorPicker, InsertColorWithStandaloneColorPicker, ShowOrFocusStandaloneColorPicker, } from './standaloneColorPicker/standaloneColorPickerActions.js';
import { StandaloneColorPickerController } from './standaloneColorPicker/standaloneColorPickerController.js';
import { Range } from '../../../common/core/range.js';
registerEditorAction(HideStandaloneColorPicker);
registerEditorAction(InsertColorWithStandaloneColorPicker);
registerAction2(ShowOrFocusStandaloneColorPicker);
registerEditorContribution(HoverColorPickerContribution.ID, HoverColorPickerContribution, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorContribution(StandaloneColorPickerController.ID, StandaloneColorPickerController, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorContribution(ColorDetector.ID, ColorDetector, 1 /* EditorContributionInstantiation.AfterFirstRender */);
registerEditorFeature(DefaultDocumentColorProviderFeature);
HoverParticipantRegistry.register(HoverColorPickerParticipant);
CommandsRegistry.registerCommand('_executeDocumentColorProvider', function (accessor, ...args) {
    const [resource] = args;
    if (!(resource instanceof URI)) {
        throw illegalArgument();
    }
    const { model, colorProviderRegistry, defaultColorDecoratorsEnablement } = _setupColorCommand(accessor, resource);
    return _findColorData(new ExtColorDataCollector(), colorProviderRegistry, model, CancellationToken.None, defaultColorDecoratorsEnablement);
});
CommandsRegistry.registerCommand('_executeColorPresentationProvider', function (accessor, ...args) {
    const [color, context] = args;
    const { uri, range } = context;
    if (!(uri instanceof URI) ||
        !Array.isArray(color) ||
        color.length !== 4 ||
        !Range.isIRange(range)) {
        throw illegalArgument();
    }
    const { model, colorProviderRegistry, defaultColorDecoratorsEnablement } = _setupColorCommand(accessor, uri);
    const [red, green, blue, alpha] = color;
    return _findColorData(new ColorPresentationsCollector({ range: range, color: { red, green, blue, alpha } }), colorProviderRegistry, model, CancellationToken.None, defaultColorDecoratorsEnablement);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3JQaWNrZXJDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDaEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUVOLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FDMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RSxPQUFPLEVBQ04sY0FBYyxFQUNkLGtCQUFrQixFQUNsQiwyQkFBMkIsRUFDM0IscUJBQXFCLEdBRXJCLE1BQU0sWUFBWSxDQUFBO0FBQ25CLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMvRixPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLG9DQUFvQyxFQUNwQyxn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