/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { MessageController } from '../../message/browser/messageController.js';
import * as nls from '../../../../nls.js';
export class ReadOnlyMessageController extends Disposable {
    static { this.ID = 'editor.contrib.readOnlyMessageController'; }
    constructor(editor) {
        super();
        this.editor = editor;
        this._register(this.editor.onDidAttemptReadOnlyEdit(() => this._onDidAttemptReadOnlyEdit()));
    }
    _onDidAttemptReadOnlyEdit() {
        const messageController = MessageController.get(this.editor);
        if (messageController && this.editor.hasModel()) {
            let message = this.editor.getOptions().get(97 /* EditorOption.readOnlyMessage */);
            if (!message) {
                if (this.editor.isSimpleWidget) {
                    message = new MarkdownString(nls.localize('editor.simple.readonly', 'Cannot edit in read-only input'));
                }
                else {
                    message = new MarkdownString(nls.localize('editor.readonly', 'Cannot edit in read-only editor'));
                }
            }
            messageController.showMessage(message, this.editor.getPosition());
        }
    }
}
registerEditorContribution(ReadOnlyMessageController.ID, ReadOnlyMessageController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvcmVhZE9ubHlNZXNzYWdlL2Jyb3dzZXIvY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUVOLDBCQUEwQixHQUMxQixNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsTUFBTSxPQUFPLHlCQUEwQixTQUFRLFVBQVU7YUFDakMsT0FBRSxHQUFHLDBDQUEwQyxDQUFBO0lBRXRFLFlBQTZCLE1BQW1CO1FBQy9DLEtBQUssRUFBRSxDQUFBO1FBRHFCLFdBQU0sR0FBTixNQUFNLENBQWE7UUFFL0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLHdCQUF3QixDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRU8seUJBQXlCO1FBQ2hDLE1BQU0saUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM1RCxJQUFJLGlCQUFpQixJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUNqRCxJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsRUFBRSxDQUFDLEdBQUcsdUNBQThCLENBQUE7WUFDeEUsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLElBQUksSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLEVBQUUsQ0FBQztvQkFDaEMsT0FBTyxHQUFHLElBQUksY0FBYyxDQUMzQixHQUFHLENBQUMsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGdDQUFnQyxDQUFDLENBQ3hFLENBQUE7Z0JBQ0YsQ0FBQztxQkFBTSxDQUFDO29CQUNQLE9BQU8sR0FBRyxJQUFJLGNBQWMsQ0FDM0IsR0FBRyxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxpQ0FBaUMsQ0FBQyxDQUNsRSxDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsaUJBQWlCLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7UUFDbEUsQ0FBQztJQUNGLENBQUM7O0FBR0YsMEJBQTBCLENBQ3pCLHlCQUF5QixDQUFDLEVBQUUsRUFDNUIseUJBQXlCLGlFQUV6QixDQUFBIn0=