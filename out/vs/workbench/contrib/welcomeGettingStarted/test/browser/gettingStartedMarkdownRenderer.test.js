/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { FileAccess } from '../../../../../base/common/network.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { LanguageService } from '../../../../../editor/common/services/languageService.js';
import { TestNotificationService } from '../../../../../platform/notification/test/common/testNotificationService.js';
import { GettingStartedDetailsRenderer } from '../../browser/gettingStartedDetailsRenderer.js';
import { convertInternalMediaPathToFileURI } from '../../browser/gettingStartedService.js';
import { TestFileService } from '../../../../test/browser/workbenchTestServices.js';
import { TestExtensionService } from '../../../../test/common/workbenchTestServices.js';
suite('Getting Started Markdown Renderer', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('renders theme picker markdown with images', async () => {
        const fileService = new TestFileService();
        const languageService = new LanguageService();
        const renderer = new GettingStartedDetailsRenderer(fileService, new TestNotificationService(), new TestExtensionService(), languageService);
        const mdPath = convertInternalMediaPathToFileURI('theme_picker').with({
            query: JSON.stringify({
                moduleId: 'vs/workbench/contrib/welcomeGettingStarted/common/media/theme_picker',
            }),
        });
        const mdBase = FileAccess.asFileUri('vs/workbench/contrib/welcomeGettingStarted/common/media/');
        const rendered = await renderer.renderMarkdown(mdPath, mdBase);
        const imageSrcs = [...rendered.matchAll(/img src="[^"]*"/g)].map((match) => match[0]);
        for (const src of imageSrcs) {
            const targetSrcFormat = /^img src=".*\/vs\/workbench\/contrib\/welcomeGettingStarted\/common\/media\/.*.png"$/;
            assert(targetSrcFormat.test(src), `${src} didnt match regex`);
        }
        languageService.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRNYXJrZG93blJlbmRlcmVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvdGVzdC9icm93c2VyL2dldHRpbmdTdGFydGVkTWFya2Rvd25SZW5kZXJlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDZFQUE2RSxDQUFBO0FBQ3JILE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUV2RixLQUFLLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO0lBQy9DLHVDQUF1QyxFQUFFLENBQUE7SUFFekMsSUFBSSxDQUFDLDJDQUEyQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzVELE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxlQUFlLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLFFBQVEsR0FBRyxJQUFJLDZCQUE2QixDQUNqRCxXQUFXLEVBQ1gsSUFBSSx1QkFBdUIsRUFBRSxFQUM3QixJQUFJLG9CQUFvQixFQUFFLEVBQzFCLGVBQWUsQ0FDZixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsaUNBQWlDLENBQUMsY0FBYyxDQUFDLENBQUMsSUFBSSxDQUFDO1lBQ3JFLEtBQUssRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNyQixRQUFRLEVBQUUsc0VBQXNFO2FBQ2hGLENBQUM7U0FDRixDQUFDLENBQUE7UUFDRixNQUFNLE1BQU0sR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLDBEQUEwRCxDQUFDLENBQUE7UUFDL0YsTUFBTSxRQUFRLEdBQUcsTUFBTSxRQUFRLENBQUMsY0FBYyxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtRQUM5RCxNQUFNLFNBQVMsR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNyRixLQUFLLE1BQU0sR0FBRyxJQUFJLFNBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sZUFBZSxHQUNwQixzRkFBc0YsQ0FBQTtZQUN2RixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxHQUFHLEdBQUcsb0JBQW9CLENBQUMsQ0FBQTtRQUM5RCxDQUFDO1FBQ0QsZUFBZSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==