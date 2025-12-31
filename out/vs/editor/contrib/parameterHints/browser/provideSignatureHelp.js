/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { assertType } from '../../../../base/common/types.js';
import { URI } from '../../../../base/common/uri.js';
import { Position } from '../../../common/core/position.js';
import * as languages from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
export const Context = {
    Visible: new RawContextKey('parameterHintsVisible', false),
    MultipleSignatures: new RawContextKey('parameterHintsMultipleSignatures', false),
};
export async function provideSignatureHelp(registry, model, position, context, token) {
    const supports = registry.ordered(model);
    for (const support of supports) {
        try {
            const result = await support.provideSignatureHelp(model, position, token, context);
            if (result) {
                return result;
            }
        }
        catch (err) {
            onUnexpectedExternalError(err);
        }
    }
    return undefined;
}
CommandsRegistry.registerCommand('_executeSignatureHelpProvider', async (accessor, ...args) => {
    const [uri, position, triggerCharacter] = args;
    assertType(URI.isUri(uri));
    assertType(Position.isIPosition(position));
    assertType(typeof triggerCharacter === 'string' || !triggerCharacter);
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const ref = await accessor.get(ITextModelService).createModelReference(uri);
    try {
        const result = await provideSignatureHelp(languageFeaturesService.signatureHelpProvider, ref.object.textEditorModel, Position.lift(position), {
            triggerKind: languages.SignatureHelpTriggerKind.Invoke,
            isRetrigger: false,
            triggerCharacter,
        }, CancellationToken.None);
        if (!result) {
            return undefined;
        }
        setTimeout(() => result.dispose(), 0);
        return result.value;
    }
    finally {
        ref.dispose();
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvdmlkZVNpZ25hdHVyZUhlbHAuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9wYXJhbWV0ZXJIaW50cy9icm93c2VyL3Byb3ZpZGVTaWduYXR1cmVIZWxwLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFhLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXRFLE9BQU8sS0FBSyxTQUFTLE1BQU0sOEJBQThCLENBQUE7QUFFekQsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDdkYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDL0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbkYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBGLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRztJQUN0QixPQUFPLEVBQUUsSUFBSSxhQUFhLENBQVUsdUJBQXVCLEVBQUUsS0FBSyxDQUFDO0lBQ25FLGtCQUFrQixFQUFFLElBQUksYUFBYSxDQUFVLGtDQUFrQyxFQUFFLEtBQUssQ0FBQztDQUN6RixDQUFBO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxvQkFBb0IsQ0FDekMsUUFBa0UsRUFDbEUsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsT0FBdUMsRUFDdkMsS0FBd0I7SUFFeEIsTUFBTSxRQUFRLEdBQUcsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUV4QyxLQUFLLE1BQU0sT0FBTyxJQUFJLFFBQVEsRUFBRSxDQUFDO1FBQ2hDLElBQUksQ0FBQztZQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLG9CQUFvQixDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLE9BQU8sQ0FBQyxDQUFBO1lBQ2xGLElBQUksTUFBTSxFQUFFLENBQUM7Z0JBQ1osT0FBTyxNQUFNLENBQUE7WUFDZCxDQUFDO1FBQ0YsQ0FBQztRQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7WUFDZCx5QkFBeUIsQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUMvQixDQUFDO0lBQ0YsQ0FBQztJQUNELE9BQU8sU0FBUyxDQUFBO0FBQ2pCLENBQUM7QUFFRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLCtCQUErQixFQUMvQixLQUFLLEVBQUUsUUFBUSxFQUFFLEdBQUcsSUFBK0IsRUFBRSxFQUFFO0lBQ3RELE1BQU0sQ0FBQyxHQUFHLEVBQUUsUUFBUSxFQUFFLGdCQUFnQixDQUFDLEdBQUcsSUFBSSxDQUFBO0lBQzlDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDMUIsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUMxQyxVQUFVLENBQUMsT0FBTyxnQkFBZ0IsS0FBSyxRQUFRLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO0lBRXJFLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBRXRFLE1BQU0sR0FBRyxHQUFHLE1BQU0sUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxDQUFBO0lBQzNFLElBQUksQ0FBQztRQUNKLE1BQU0sTUFBTSxHQUFHLE1BQU0sb0JBQW9CLENBQ3hDLHVCQUF1QixDQUFDLHFCQUFxQixFQUM3QyxHQUFHLENBQUMsTUFBTSxDQUFDLGVBQWUsRUFDMUIsUUFBUSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsRUFDdkI7WUFDQyxXQUFXLEVBQUUsU0FBUyxDQUFDLHdCQUF3QixDQUFDLE1BQU07WUFDdEQsV0FBVyxFQUFFLEtBQUs7WUFDbEIsZ0JBQWdCO1NBQ2hCLEVBQ0QsaUJBQWlCLENBQUMsSUFBSSxDQUN0QixDQUFBO1FBRUQsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2IsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDckMsT0FBTyxNQUFNLENBQUMsS0FBSyxDQUFBO0lBQ3BCLENBQUM7WUFBUyxDQUFDO1FBQ1YsR0FBRyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2QsQ0FBQztBQUNGLENBQUMsQ0FDRCxDQUFBIn0=