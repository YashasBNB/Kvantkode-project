/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IEditorPaneService } from '../common/editorPaneService.js';
import { EditorPaneDescriptor } from '../../../browser/editor.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
export class EditorPaneService {
    constructor() {
        this.onWillInstantiateEditorPane = EditorPaneDescriptor.onWillInstantiateEditorPane;
    }
    didInstantiateEditorPane(typeId) {
        return EditorPaneDescriptor.didInstantiateEditorPane(typeId);
    }
}
registerSingleton(IEditorPaneService, EditorPaneService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yUGFuZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9lZGl0b3IvYnJvd3Nlci9lZGl0b3JQYW5lU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUNqRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFaEUsTUFBTSxPQUFPLGlCQUFpQjtJQUE5QjtRQUdVLGdDQUEyQixHQUFHLG9CQUFvQixDQUFDLDJCQUEyQixDQUFBO0lBS3hGLENBQUM7SUFIQSx3QkFBd0IsQ0FBQyxNQUFjO1FBQ3RDLE9BQU8sb0JBQW9CLENBQUMsd0JBQXdCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDN0QsQ0FBQztDQUNEO0FBRUQsaUJBQWlCLENBQUMsa0JBQWtCLEVBQUUsaUJBQWlCLG9DQUE0QixDQUFBIn0=