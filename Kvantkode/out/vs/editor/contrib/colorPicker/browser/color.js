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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvY29sb3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGVBQWUsRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBUzlGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUV2RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxNQUFNLENBQUMsS0FBSyxVQUFVLFNBQVMsQ0FDOUIscUJBQXFFLEVBQ3JFLEtBQWlCLEVBQ2pCLEtBQXdCLEVBQ3hCLG1DQUFnRSxNQUFNO0lBRXRFLE9BQU8sY0FBYyxDQUNwQixJQUFJLGtCQUFrQixFQUFFLEVBQ3hCLHFCQUFxQixFQUNyQixLQUFLLEVBQ0wsS0FBSyxFQUNMLGdDQUFnQyxDQUNoQyxDQUFBO0FBQ0YsQ0FBQztBQUVELE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsS0FBaUIsRUFDakIsU0FBNEIsRUFDNUIsUUFBK0IsRUFDL0IsS0FBd0I7SUFFeEIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUE7QUFDcEYsQ0FBQztBQXFCRCxNQUFNLGtCQUFrQjtJQUN2QixnQkFBZSxDQUFDO0lBQ2hCLEtBQUssQ0FBQyxPQUFPLENBQ1osUUFBK0IsRUFDL0IsS0FBaUIsRUFDakIsS0FBd0IsRUFDeEIsTUFBb0I7UUFFcEIsTUFBTSxjQUFjLEdBQUcsTUFBTSxRQUFRLENBQUMscUJBQXFCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ3pFLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ25DLEtBQUssTUFBTSxTQUFTLElBQUksY0FBYyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxTQUFTLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtZQUNyQyxDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8scUJBQXFCO0lBQ2pDLGdCQUFlLENBQUM7SUFDaEIsS0FBSyxDQUFDLE9BQU8sQ0FDWixRQUErQixFQUMvQixLQUFpQixFQUNqQixLQUF3QixFQUN4QixNQUF1QjtRQUV2QixNQUFNLGNBQWMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDekUsSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxFQUFFLENBQUM7WUFDbkMsS0FBSyxNQUFNLFNBQVMsSUFBSSxjQUFjLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxDQUFDLElBQUksQ0FBQztvQkFDWCxLQUFLLEVBQUUsU0FBUyxDQUFDLEtBQUs7b0JBQ3RCLEtBQUssRUFBRTt3QkFDTixTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUc7d0JBQ25CLFNBQVMsQ0FBQyxLQUFLLENBQUMsS0FBSzt3QkFDckIsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJO3dCQUNwQixTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUs7cUJBQ3JCO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywyQkFBMkI7SUFDdkMsWUFBb0IsU0FBNEI7UUFBNUIsY0FBUyxHQUFULFNBQVMsQ0FBbUI7SUFBRyxDQUFDO0lBQ3BELEtBQUssQ0FBQyxPQUFPLENBQ1osUUFBK0IsRUFDL0IsS0FBaUIsRUFDakIsTUFBeUIsRUFDekIsTUFBNEI7UUFFNUIsTUFBTSxjQUFjLEdBQUcsTUFBTSxRQUFRLENBQUMseUJBQXlCLENBQzlELEtBQUssRUFDTCxJQUFJLENBQUMsU0FBUyxFQUNkLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtRQUNELElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO1lBQ25DLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxjQUFjLENBQUMsQ0FBQTtRQUMvQixDQUFDO1FBQ0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7Q0FDRDtBQUVELE1BQU0sQ0FBQyxLQUFLLFVBQVUsY0FBYyxDQUNuQyxTQUEyQixFQUMzQixxQkFBcUUsRUFDckUsS0FBaUIsRUFDakIsS0FBd0IsRUFDeEIsZ0NBQTZEO0lBRTdELElBQUksK0JBQStCLEdBQUcsS0FBSyxDQUFBO0lBQzNDLElBQUksZUFBeUQsQ0FBQTtJQUM3RCxNQUFNLFNBQVMsR0FBUSxFQUFFLENBQUE7SUFDekIsTUFBTSxzQkFBc0IsR0FBRyxxQkFBcUIsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDbkUsS0FBSyxJQUFJLENBQUMsR0FBRyxzQkFBc0IsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3RCxNQUFNLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMxQyxJQUNDLGdDQUFnQyxLQUFLLFFBQVE7WUFDN0MsUUFBUSxZQUFZLDRCQUE0QixFQUMvQyxDQUFDO1lBQ0YsZUFBZSxHQUFHLFFBQVEsQ0FBQTtRQUMzQixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQztnQkFDSixJQUFJLE1BQU0sU0FBUyxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUNoRSwrQkFBK0IsR0FBRyxJQUFJLENBQUE7Z0JBQ3ZDLENBQUM7WUFDRixDQUFDO1lBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztnQkFDWix5QkFBeUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUM3QixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFDRCxJQUFJLCtCQUErQixFQUFFLENBQUM7UUFDckMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELElBQUksZUFBZSxJQUFJLGdDQUFnQyxLQUFLLE9BQU8sRUFBRSxDQUFDO1FBQ3JFLE1BQU0sU0FBUyxDQUFDLE9BQU8sQ0FBQyxlQUFlLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNqRSxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBQ0QsT0FBTyxFQUFFLENBQUE7QUFDVixDQUFDO0FBRUQsTUFBTSxVQUFVLGtCQUFrQixDQUNqQyxRQUEwQixFQUMxQixRQUFhO0lBTWIsTUFBTSxFQUFFLGFBQWEsRUFBRSxxQkFBcUIsRUFBRSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN2RixNQUFNLEtBQUssR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQTtJQUM1RCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7UUFDWixNQUFNLGVBQWUsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFDRCxNQUFNLGdDQUFnQyxHQUFHLFFBQVE7U0FDL0MsR0FBRyxDQUFDLHFCQUFxQixDQUFDO1NBQzFCLFFBQVEsQ0FBOEIsK0JBQStCLEVBQUUsRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBQ3RGLE9BQU8sRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsZ0NBQWdDLEVBQUUsQ0FBQTtBQUMxRSxDQUFDIn0=