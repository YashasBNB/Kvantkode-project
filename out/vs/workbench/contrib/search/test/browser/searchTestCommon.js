/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ModelService } from '../../../../../editor/common/services/modelService.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { MockContextKeyService } from '../../../../../platform/keybinding/test/common/mockKeybindingService.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../platform/theme/test/common/testThemeService.js';
import { NotebookEditorWidgetService } from '../../../notebook/browser/services/notebookEditorServiceImpl.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { TestEditorGroupsService, TestEditorService, } from '../../../../test/browser/workbenchTestServices.js';
export function createFileUriFromPathFromRoot(path) {
    const rootName = getRootName();
    if (path) {
        return URI.file(`${rootName}${path}`);
    }
    else {
        if (isWindows) {
            return URI.file(`${rootName}/`);
        }
        else {
            return URI.file(rootName);
        }
    }
}
export function getRootName() {
    if (isWindows) {
        return 'c:';
    }
    else {
        return '';
    }
}
export function stubModelService(instantiationService, addDisposable) {
    instantiationService.stub(IThemeService, new TestThemeService());
    const config = new TestConfigurationService();
    config.setUserConfiguration('search', { searchOnType: true });
    instantiationService.stub(IConfigurationService, config);
    const modelService = instantiationService.createInstance(ModelService);
    addDisposable(modelService);
    return modelService;
}
export function stubNotebookEditorService(instantiationService, addDisposable) {
    instantiationService.stub(IEditorGroupsService, new TestEditorGroupsService());
    instantiationService.stub(IContextKeyService, new MockContextKeyService());
    const es = new TestEditorService();
    addDisposable(es);
    instantiationService.stub(IEditorService, es);
    const notebookEditorWidgetService = instantiationService.createInstance(NotebookEditorWidgetService);
    addDisposable(notebookEditorWidgetService);
    return notebookEditorWidgetService;
}
export function addToSearchResult(searchResult, allRaw, searchInstanceID = '') {
    searchResult.add(allRaw, searchInstanceID, false);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVGVzdENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2VhcmNoL3Rlc3QvYnJvd3Nlci9zZWFyY2hUZXN0Q29tbW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFFdkQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlFQUF5RSxDQUFBO0FBQy9HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFFcEYsT0FBTyxFQUNOLHVCQUF1QixFQUN2QixpQkFBaUIsR0FDakIsTUFBTSxtREFBbUQsQ0FBQTtBQUcxRCxNQUFNLFVBQVUsNkJBQTZCLENBQUMsSUFBYTtJQUMxRCxNQUFNLFFBQVEsR0FBRyxXQUFXLEVBQUUsQ0FBQTtJQUM5QixJQUFJLElBQUksRUFBRSxDQUFDO1FBQ1YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLElBQUksRUFBRSxDQUFDLENBQUE7SUFDdEMsQ0FBQztTQUFNLENBQUM7UUFDUCxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQ2YsT0FBTyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsUUFBUSxHQUFHLENBQUMsQ0FBQTtRQUNoQyxDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUMxQixDQUFDO0lBQ0YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsV0FBVztJQUMxQixJQUFJLFNBQVMsRUFBRSxDQUFDO1FBQ2YsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO1NBQU0sQ0FBQztRQUNQLE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztBQUNGLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLG9CQUE4QyxFQUM5QyxhQUF1QztJQUV2QyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFFLElBQUksZ0JBQWdCLEVBQUUsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sTUFBTSxHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtJQUM3QyxNQUFNLENBQUMsb0JBQW9CLENBQUMsUUFBUSxFQUFFLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUE7SUFDN0Qsb0JBQW9CLENBQUMsSUFBSSxDQUFDLHFCQUFxQixFQUFFLE1BQU0sQ0FBQyxDQUFBO0lBQ3hELE1BQU0sWUFBWSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUN0RSxhQUFhLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDM0IsT0FBTyxZQUFZLENBQUE7QUFDcEIsQ0FBQztBQUVELE1BQU0sVUFBVSx5QkFBeUIsQ0FDeEMsb0JBQThDLEVBQzlDLGFBQXVDO0lBRXZDLG9CQUFvQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxJQUFJLHVCQUF1QixFQUFFLENBQUMsQ0FBQTtJQUM5RSxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsSUFBSSxxQkFBcUIsRUFBRSxDQUFDLENBQUE7SUFDMUUsTUFBTSxFQUFFLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFBO0lBQ2xDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtJQUNqQixvQkFBb0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQzdDLE1BQU0sMkJBQTJCLEdBQUcsb0JBQW9CLENBQUMsY0FBYyxDQUN0RSwyQkFBMkIsQ0FDM0IsQ0FBQTtJQUNELGFBQWEsQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO0lBQzFDLE9BQU8sMkJBQTJCLENBQUE7QUFDbkMsQ0FBQztBQUVELE1BQU0sVUFBVSxpQkFBaUIsQ0FDaEMsWUFBMkIsRUFDM0IsTUFBb0IsRUFDcEIsZ0JBQWdCLEdBQUcsRUFBRTtJQUVyQixZQUFZLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxnQkFBZ0IsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUNsRCxDQUFDIn0=