/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { ITextMateTokenizationService } from '../../../services/textMate/browser/textMateTokenizationFeature.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { ILoggerService } from '../../../../platform/log/common/log.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IFileService } from '../../../../platform/files/common/files.js';
class StartDebugTextMate extends Action2 {
    static { this.resource = URI.parse(`inmemory:///tm-log.txt`); }
    constructor() {
        super({
            id: 'editor.action.startDebugTextMate',
            title: nls.localize2('startDebugTextMate', 'Start TextMate Syntax Grammar Logging'),
            category: Categories.Developer,
            f1: true,
        });
    }
    _getOrCreateModel(modelService) {
        const model = modelService.getModel(StartDebugTextMate.resource);
        if (model) {
            return model;
        }
        return modelService.createModel('', null, StartDebugTextMate.resource);
    }
    _append(model, str) {
        const lineCount = model.getLineCount();
        model.applyEdits([
            {
                range: new Range(lineCount, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */, lineCount, 1073741824 /* Constants.MAX_SAFE_SMALL_INTEGER */),
                text: str,
            },
        ]);
    }
    async run(accessor) {
        const textMateService = accessor.get(ITextMateTokenizationService);
        const modelService = accessor.get(IModelService);
        const editorService = accessor.get(IEditorService);
        const codeEditorService = accessor.get(ICodeEditorService);
        const hostService = accessor.get(IHostService);
        const environmentService = accessor.get(INativeWorkbenchEnvironmentService);
        const loggerService = accessor.get(ILoggerService);
        const fileService = accessor.get(IFileService);
        const pathInTemp = joinPath(environmentService.tmpDir, `vcode-tm-log-${generateUuid()}.txt`);
        await fileService.createFile(pathInTemp);
        const logger = loggerService.createLogger(pathInTemp, { name: 'debug textmate' });
        const model = this._getOrCreateModel(modelService);
        const append = (str) => {
            this._append(model, str + '\n');
            scrollEditor();
            logger.info(str);
            logger.flush();
        };
        await hostService.openWindow([{ fileUri: pathInTemp }], { forceNewWindow: true });
        const textEditorPane = await editorService.openEditor({
            resource: model.uri,
            options: { pinned: true },
        });
        if (!textEditorPane) {
            return;
        }
        const scrollEditor = () => {
            const editors = codeEditorService.listCodeEditors();
            for (const editor of editors) {
                if (editor.hasModel()) {
                    if (editor.getModel().uri.toString() === StartDebugTextMate.resource.toString()) {
                        editor.revealLine(editor.getModel().getLineCount());
                    }
                }
            }
        };
        append(`// Open the file you want to test to the side and watch here`);
        append(`// Output mirrored at ${pathInTemp}`);
        textMateService.startDebugMode((str) => {
            this._append(model, str + '\n');
            scrollEditor();
            logger.info(str);
            logger.flush();
        }, () => { });
    }
}
registerAction2(StartDebugTextMate);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnREZWJ1Z1RleHRNYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb2RlRWRpdG9yL2VsZWN0cm9uLXNhbmRib3gvc3RhcnREZWJ1Z1RleHRNYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDekYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ2hILE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUc3RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDekgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHekUsTUFBTSxr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