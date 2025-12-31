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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoVGVzdENvbW1vbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NlYXJjaC90ZXN0L2Jyb3dzZXIvc2VhcmNoVGVzdENvbW1vbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrRUFBK0UsQ0FBQTtBQUN4SCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUU1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUMvRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDcEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFFaEcsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDN0csT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRXBGLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsaUJBQWlCLEdBQ2pCLE1BQU0sbURBQW1ELENBQUE7QUFHMUQsTUFBTSxVQUFVLDZCQUE2QixDQUFDLElBQWE7SUFDMUQsTUFBTSxRQUFRLEdBQUcsV0FBVyxFQUFFLENBQUE7SUFDOUIsSUFBSSxJQUFJLEVBQUUsQ0FBQztRQUNWLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQ3RDLENBQUM7U0FBTSxDQUFDO1FBQ1AsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLE9BQU8sR0FBRyxDQUFDLElBQUksQ0FBQyxHQUFHLFFBQVEsR0FBRyxDQUFDLENBQUE7UUFDaEMsQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUIsQ0FBQztJQUNGLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLFdBQVc7SUFDMUIsSUFBSSxTQUFTLEVBQUUsQ0FBQztRQUNmLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztTQUFNLENBQUM7UUFDUCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7QUFDRixDQUFDO0FBRUQsTUFBTSxVQUFVLGdCQUFnQixDQUMvQixvQkFBOEMsRUFDOUMsYUFBdUM7SUFFdkMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUMsQ0FBQTtJQUNoRSxNQUFNLE1BQU0sR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7SUFDN0MsTUFBTSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsRUFBRSxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO0lBQzdELG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUN4RCxNQUFNLFlBQVksR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDdEUsYUFBYSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzNCLE9BQU8sWUFBWSxDQUFBO0FBQ3BCLENBQUM7QUFFRCxNQUFNLFVBQVUseUJBQXlCLENBQ3hDLG9CQUE4QyxFQUM5QyxhQUF1QztJQUV2QyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsb0JBQW9CLEVBQUUsSUFBSSx1QkFBdUIsRUFBRSxDQUFDLENBQUE7SUFDOUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGtCQUFrQixFQUFFLElBQUkscUJBQXFCLEVBQUUsQ0FBQyxDQUFBO0lBQzFFLE1BQU0sRUFBRSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtJQUNsQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7SUFDakIsb0JBQW9CLENBQUMsSUFBSSxDQUFDLGNBQWMsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUM3QyxNQUFNLDJCQUEyQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FDdEUsMkJBQTJCLENBQzNCLENBQUE7SUFDRCxhQUFhLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtJQUMxQyxPQUFPLDJCQUEyQixDQUFBO0FBQ25DLENBQUM7QUFFRCxNQUFNLFVBQVUsaUJBQWlCLENBQ2hDLFlBQTJCLEVBQzNCLE1BQW9CLEVBQ3BCLGdCQUFnQixHQUFHLEVBQUU7SUFFckIsWUFBWSxDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUsZ0JBQWdCLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFDbEQsQ0FBQyJ9