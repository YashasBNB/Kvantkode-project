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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JQaWNrZXJDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yUGlja2VyQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ25GLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBQzFCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFekUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUUsT0FBTyxFQUNOLGNBQWMsRUFDZCxrQkFBa0IsRUFDbEIsMkJBQTJCLEVBQzNCLHFCQUFxQixHQUVyQixNQUFNLFlBQVksQ0FBQTtBQUNuQixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDbEQsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDakcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDL0YsT0FBTyxFQUNOLHlCQUF5QixFQUN6QixvQ0FBb0MsRUFDcEMsZ0NBQWdD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