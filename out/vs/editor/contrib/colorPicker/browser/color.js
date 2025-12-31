/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { illegalArgument, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { IModelService } from '../../../common/services/model.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { DefaultDocumentColorProvider } from './defaultDocumentColorProvider.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
export async function getColors(colorProviderRegistry, model, token, defaultColorDecoratorsEnablement = 'auto') {
    return _findColorData(new ColorDataCollector(), colorProviderRegistry, model, token, defaultColorDecoratorsEnablement);
}
export function getColorPresentations(model, colorInfo, provider, token) {
    return Promise.resolve(provider.provideColorPresentations(model, colorInfo, token));
}
class ColorDataCollector {
    constructor() { }
    async compute(provider, model, token, colors) {
        const documentColors = await provider.provideDocumentColors(model, token);
        if (Array.isArray(documentColors)) {
            for (const colorInfo of documentColors) {
                colors.push({ colorInfo, provider });
            }
        }
        return Array.isArray(documentColors);
    }
}
export class ExtColorDataCollector {
    constructor() { }
    async compute(provider, model, token, colors) {
        const documentColors = await provider.provideDocumentColors(model, token);
        if (Array.isArray(documentColors)) {
            for (const colorInfo of documentColors) {
                colors.push({
                    range: colorInfo.range,
                    color: [
                        colorInfo.color.red,
                        colorInfo.color.green,
                        colorInfo.color.blue,
                        colorInfo.color.alpha,
                    ],
                });
            }
        }
        return Array.isArray(documentColors);
    }
}
export class ColorPresentationsCollector {
    constructor(colorInfo) {
        this.colorInfo = colorInfo;
    }
    async compute(provider, model, _token, colors) {
        const documentColors = await provider.provideColorPresentations(model, this.colorInfo, CancellationToken.None);
        if (Array.isArray(documentColors)) {
            colors.push(...documentColors);
        }
        return Array.isArray(documentColors);
    }
}
export async function _findColorData(collector, colorProviderRegistry, model, token, defaultColorDecoratorsEnablement) {
    let validDocumentColorProviderFound = false;
    let defaultProvider;
    const colorData = [];
    const documentColorProviders = colorProviderRegistry.ordered(model);
    for (let i = documentColorProviders.length - 1; i >= 0; i--) {
        const provider = documentColorProviders[i];
        if (defaultColorDecoratorsEnablement !== 'always' &&
            provider instanceof DefaultDocumentColorProvider) {
            defaultProvider = provider;
        }
        else {
            try {
                if (await collector.compute(provider, model, token, colorData)) {
                    validDocumentColorProviderFound = true;
                }
            }
            catch (e) {
                onUnexpectedExternalError(e);
            }
        }
    }
    if (validDocumentColorProviderFound) {
        return colorData;
    }
    if (defaultProvider && defaultColorDecoratorsEnablement !== 'never') {
        await collector.compute(defaultProvider, model, token, colorData);
        return colorData;
    }
    return [];
}
export function _setupColorCommand(accessor, resource) {
    const { colorProvider: colorProviderRegistry } = accessor.get(ILanguageFeaturesService);
    const model = accessor.get(IModelService).getModel(resource);
    if (!model) {
        throw illegalArgument();
    }
    const defaultColorDecoratorsEnablement = accessor
        .get(IConfigurationService)
        .getValue('editor.defaultColorDecorators', { resource });
    return { model, colorProviderRegistry, defaultColorDecoratorsEnablement };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2xvclBpY2tlci9icm93c2VyL2NvbG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxlQUFlLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQVM5RixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDakUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdkYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHbEcsTUFBTSxDQUFDLEtBQUssVUFBVSxTQUFTLENBQzlCLHFCQUFxRSxFQUNyRSxLQUFpQixFQUNqQixLQUF3QixFQUN4QixtQ0FBZ0UsTUFBTTtJQUV0RSxPQUFPLGNBQWMsQ0FDcEIsSUFBSSxrQkFBa0IsRUFBRSxFQUN4QixxQkFBcUIsRUFDckIsS0FBSyxFQUNMLEtBQUssRUFDTCxnQ0FBZ0MsQ0FDaEMsQ0FBQTtBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUscUJBQXFCLENBQ3BDLEtBQWlCLEVBQ2pCLFNBQTRCLEVBQzVCLFFBQStCLEVBQy9CLEtBQXdCO0lBRXhCLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMseUJBQXlCLENBQUMsS0FBSyxFQUFFLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0FBQ3BGLENBQUM7QUFxQkQsTUFBTSxrQkFBa0I7SUFDdkIsZ0JBQWUsQ0FBQztJQUNoQixLQUFLLENBQUMsT0FBTyxDQUNaLFFBQStCLEVBQy9CLEtBQWlCLEVBQ2pCLEtBQXdCLEVBQ3hCLE1BQW9CO1FBRXBCLE1BQU0sY0FBYyxHQUFHLE1BQU0sUUFBUSxDQUFDLHFCQUFxQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6RSxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxLQUFLLE1BQU0sU0FBUyxJQUFJLGNBQWMsRUFBRSxDQUFDO2dCQUN4QyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDckMsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLENBQUE7SUFDckMsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLHFCQUFxQjtJQUNqQyxnQkFBZSxDQUFDO0lBQ2hCLEtBQUssQ0FBQyxPQUFPLENBQ1osUUFBK0IsRUFDL0IsS0FBaUIsRUFDakIsS0FBd0IsRUFDeEIsTUFBdUI7UUFFdkIsTUFBTSxjQUFjLEdBQUcsTUFBTSxRQUFRLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ25DLEtBQUssTUFBTSxTQUFTLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1gsS0FBSyxFQUFFLFNBQVMsQ0FBQyxLQUFLO29CQUN0QixLQUFLLEVBQUU7d0JBQ04sU0FBUyxDQUFDLEtBQUssQ0FBQyxHQUFHO3dCQUNuQixTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUs7d0JBQ3JCLFNBQVMsQ0FBQyxLQUFLLENBQUMsSUFBSTt3QkFDcEIsU0FBUyxDQUFDLEtBQUssQ0FBQyxLQUFLO3FCQUNyQjtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sMkJBQTJCO0lBQ3ZDLFlBQW9CLFNBQTRCO1FBQTVCLGNBQVMsR0FBVCxTQUFTLENBQW1CO0lBQUcsQ0FBQztJQUNwRCxLQUFLLENBQUMsT0FBTyxDQUNaLFFBQStCLEVBQy9CLEtBQWlCLEVBQ2pCLE1BQXlCLEVBQ3pCLE1BQTRCO1FBRTVCLE1BQU0sY0FBYyxHQUFHLE1BQU0sUUFBUSxDQUFDLHlCQUF5QixDQUM5RCxLQUFLLEVBQ0wsSUFBSSxDQUFDLFNBQVMsRUFDZCxpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7UUFDRCxJQUFJLEtBQUssQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDLEVBQUUsQ0FBQztZQUNuQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsY0FBYyxDQUFDLENBQUE7UUFDL0IsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLENBQUMsS0FBSyxVQUFVLGNBQWMsQ0FDbkMsU0FBMkIsRUFDM0IscUJBQXFFLEVBQ3JFLEtBQWlCLEVBQ2pCLEtBQXdCLEVBQ3hCLGdDQUE2RDtJQUU3RCxJQUFJLCtCQUErQixHQUFHLEtBQUssQ0FBQTtJQUMzQyxJQUFJLGVBQXlELENBQUE7SUFDN0QsTUFBTSxTQUFTLEdBQVEsRUFBRSxDQUFBO0lBQ3pCLE1BQU0sc0JBQXNCLEdBQUcscUJBQXFCLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ25FLEtBQUssSUFBSSxDQUFDLEdBQUcsc0JBQXNCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7UUFDN0QsTUFBTSxRQUFRLEdBQUcsc0JBQXNCLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDMUMsSUFDQyxnQ0FBZ0MsS0FBSyxRQUFRO1lBQzdDLFFBQVEsWUFBWSw0QkFBNEIsRUFDL0MsQ0FBQztZQUNGLGVBQWUsR0FBRyxRQUFRLENBQUE7UUFDM0IsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUM7Z0JBQ0osSUFBSSxNQUFNLFNBQVMsQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDaEUsK0JBQStCLEdBQUcsSUFBSSxDQUFBO2dCQUN2QyxDQUFDO1lBQ0YsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1oseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDN0IsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBQ0QsSUFBSSwrQkFBK0IsRUFBRSxDQUFDO1FBQ3JDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxJQUFJLGVBQWUsSUFBSSxnQ0FBZ0MsS0FBSyxPQUFPLEVBQUUsQ0FBQztRQUNyRSxNQUFNLFNBQVMsQ0FBQyxPQUFPLENBQUMsZUFBZSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDakUsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sRUFBRSxDQUFBO0FBQ1YsQ0FBQztBQUVELE1BQU0sVUFBVSxrQkFBa0IsQ0FDakMsUUFBMEIsRUFDMUIsUUFBYTtJQU1iLE1BQU0sRUFBRSxhQUFhLEVBQUUscUJBQXFCLEVBQUUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDdkYsTUFBTSxLQUFLLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUE7SUFDNUQsSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO1FBQ1osTUFBTSxlQUFlLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBQ0QsTUFBTSxnQ0FBZ0MsR0FBRyxRQUFRO1NBQy9DLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQztTQUMxQixRQUFRLENBQThCLCtCQUErQixFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUN0RixPQUFPLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLGdDQUFnQyxFQUFFLENBQUE7QUFDMUUsQ0FBQyJ9