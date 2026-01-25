/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { URI } from '../../../base/common/uri.js';
import { ApiCommand, ApiCommandArgument, ApiCommandResult, } from './extHostCommands.js';
export class ExtHostInteractive {
    constructor(mainContext, _extHostNotebooks, _textDocumentsAndEditors, _commands, _logService) {
        this._extHostNotebooks = _extHostNotebooks;
        this._textDocumentsAndEditors = _textDocumentsAndEditors;
        this._commands = _commands;
        const openApiCommand = new ApiCommand('interactive.open', '_interactive.open', 'Open interactive window and return notebook editor and input URI', [
            new ApiCommandArgument('showOptions', 'Show Options', (v) => true, (v) => v),
            new ApiCommandArgument('resource', 'Interactive resource Uri', (v) => true, (v) => v),
            new ApiCommandArgument('controllerId', 'Notebook controller Id', (v) => true, (v) => v),
            new ApiCommandArgument('title', 'Interactive editor title', (v) => true, (v) => v),
        ], new ApiCommandResult('Notebook and input URI', (v) => {
            _logService.debug('[ExtHostInteractive] open iw with notebook editor id', v.notebookEditorId);
            if (v.notebookEditorId !== undefined) {
                const editor = this._extHostNotebooks.getEditorById(v.notebookEditorId);
                _logService.debug('[ExtHostInteractive] notebook editor found', editor.id);
                return {
                    notebookUri: URI.revive(v.notebookUri),
                    inputUri: URI.revive(v.inputUri),
                    notebookEditor: editor.apiEditor,
                };
            }
            _logService.debug('[ExtHostInteractive] notebook editor not found, uris for the interactive document', v.notebookUri, v.inputUri);
            return { notebookUri: URI.revive(v.notebookUri), inputUri: URI.revive(v.inputUri) };
        }));
        this._commands.registerApiCommand(openApiCommand);
    }
    $willAddInteractiveDocument(uri, eol, languageId, notebookUri) {
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            addedDocuments: [
                {
                    EOL: eol,
                    lines: [''],
                    languageId: languageId,
                    uri: uri,
                    isDirty: false,
                    versionId: 1,
                    encoding: 'utf8',
                },
            ],
        });
    }
    $willRemoveInteractiveDocument(uri, notebookUri) {
        this._textDocumentsAndEditors.acceptDocumentsAndEditorsDelta({
            removedDocuments: [uri],
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEludGVyYWN0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0SW50ZXJhY3RpdmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQUdoRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FFaEIsTUFBTSxzQkFBc0IsQ0FBQTtBQUs3QixNQUFNLE9BQU8sa0JBQWtCO0lBQzlCLFlBQ0MsV0FBeUIsRUFDakIsaUJBQTRDLEVBQzVDLHdCQUFvRCxFQUNwRCxTQUEwQixFQUNsQyxXQUF3QjtRQUhoQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQTJCO1FBQzVDLDZCQUF3QixHQUF4Qix3QkFBd0IsQ0FBNEI7UUFDcEQsY0FBUyxHQUFULFNBQVMsQ0FBaUI7UUFHbEMsTUFBTSxjQUFjLEdBQUcsSUFBSSxVQUFVLENBQ3BDLGtCQUFrQixFQUNsQixtQkFBbUIsRUFDbkIsa0VBQWtFLEVBQ2xFO1lBQ0MsSUFBSSxrQkFBa0IsQ0FDckIsYUFBYSxFQUNiLGNBQWMsRUFDZCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUNYLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ1I7WUFDRCxJQUFJLGtCQUFrQixDQUNyQixVQUFVLEVBQ1YsMEJBQTBCLEVBQzFCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQ1gsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDUjtZQUNELElBQUksa0JBQWtCLENBQ3JCLGNBQWMsRUFDZCx3QkFBd0IsRUFDeEIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksRUFDWCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNSO1lBQ0QsSUFBSSxrQkFBa0IsQ0FDckIsT0FBTyxFQUNQLDBCQUEwQixFQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUNYLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ1I7U0FDRCxFQUNELElBQUksZ0JBQWdCLENBSW5CLHdCQUF3QixFQUN4QixDQUFDLENBQXFGLEVBQUUsRUFBRTtZQUN6RixXQUFXLENBQUMsS0FBSyxDQUNoQixzREFBc0QsRUFDdEQsQ0FBQyxDQUFDLGdCQUFnQixDQUNsQixDQUFBO1lBQ0QsSUFBSSxDQUFDLENBQUMsZ0JBQWdCLEtBQUssU0FBUyxFQUFFLENBQUM7Z0JBQ3RDLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQ3ZFLFdBQVcsQ0FBQyxLQUFLLENBQUMsNENBQTRDLEVBQUUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUMxRSxPQUFPO29CQUNOLFdBQVcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7b0JBQ3RDLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0JBQ2hDLGNBQWMsRUFBRSxNQUFNLENBQUMsU0FBUztpQkFDaEMsQ0FBQTtZQUNGLENBQUM7WUFDRCxXQUFXLENBQUMsS0FBSyxDQUNoQixtRkFBbUYsRUFDbkYsQ0FBQyxDQUFDLFdBQVcsRUFDYixDQUFDLENBQUMsUUFBUSxDQUNWLENBQUE7WUFDRCxPQUFPLEVBQUUsV0FBVyxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFBO1FBQ3BGLENBQUMsQ0FDRCxDQUNELENBQUE7UUFDRCxJQUFJLENBQUMsU0FBUyxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFBO0lBQ2xELENBQUM7SUFFRCwyQkFBMkIsQ0FDMUIsR0FBa0IsRUFDbEIsR0FBVyxFQUNYLFVBQWtCLEVBQ2xCLFdBQTBCO1FBRTFCLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQztZQUM1RCxjQUFjLEVBQUU7Z0JBQ2Y7b0JBQ0MsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDO29CQUNYLFVBQVUsRUFBRSxVQUFVO29CQUN0QixHQUFHLEVBQUUsR0FBRztvQkFDUixPQUFPLEVBQUUsS0FBSztvQkFDZCxTQUFTLEVBQUUsQ0FBQztvQkFDWixRQUFRLEVBQUUsTUFBTTtpQkFDaEI7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw4QkFBOEIsQ0FBQyxHQUFrQixFQUFFLFdBQTBCO1FBQzVFLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyw4QkFBOEIsQ0FBQztZQUM1RCxnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQztTQUN2QixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==