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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnREZWJ1Z1RleHRNYXRlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9lbGVjdHJvbi1zYW5kYm94L3N0YXJ0RGVidWdUZXh0TWF0ZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN6RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNoSCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFHN0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR3pFLE1BQU0sa0JBQW1C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