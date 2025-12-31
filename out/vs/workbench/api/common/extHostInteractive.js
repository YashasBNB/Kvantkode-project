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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdEludGVyYWN0aXZlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdEludGVyYWN0aXZlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFHaEUsT0FBTyxFQUNOLFVBQVUsRUFDVixrQkFBa0IsRUFDbEIsZ0JBQWdCLEdBRWhCLE1BQU0sc0JBQXNCLENBQUE7QUFLN0IsTUFBTSxPQUFPLGtCQUFrQjtJQUM5QixZQUNDLFdBQXlCLEVBQ2pCLGlCQUE0QyxFQUM1Qyx3QkFBb0QsRUFDcEQsU0FBMEIsRUFDbEMsV0FBd0I7UUFIaEIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUEyQjtRQUM1Qyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTRCO1FBQ3BELGNBQVMsR0FBVCxTQUFTLENBQWlCO1FBR2xDLE1BQU0sY0FBYyxHQUFHLElBQUksVUFBVSxDQUNwQyxrQkFBa0IsRUFDbEIsbUJBQW1CLEVBQ25CLGtFQUFrRSxFQUNsRTtZQUNDLElBQUksa0JBQWtCLENBQ3JCLGFBQWEsRUFDYixjQUFjLEVBQ2QsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksRUFDWCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNSO1lBQ0QsSUFBSSxrQkFBa0IsQ0FDckIsVUFBVSxFQUNWLDBCQUEwQixFQUMxQixDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUNYLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQ1I7WUFDRCxJQUFJLGtCQUFrQixDQUNyQixjQUFjLEVBQ2Qsd0JBQXdCLEVBQ3hCLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLEVBQ1gsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FDUjtZQUNELElBQUksa0JBQWtCLENBQ3JCLE9BQU8sRUFDUCwwQkFBMEIsRUFDMUIsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksRUFDWCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUNSO1NBQ0QsRUFDRCxJQUFJLGdCQUFnQixDQUluQix3QkFBd0IsRUFDeEIsQ0FBQyxDQUFxRixFQUFFLEVBQUU7WUFDekYsV0FBVyxDQUFDLEtBQUssQ0FDaEIsc0RBQXNELEVBQ3RELENBQUMsQ0FBQyxnQkFBZ0IsQ0FDbEIsQ0FBQTtZQUNELElBQUksQ0FBQyxDQUFDLGdCQUFnQixLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO2dCQUN2RSxXQUFXLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxFQUFFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDMUUsT0FBTztvQkFDTixXQUFXLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO29CQUN0QyxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO29CQUNoQyxjQUFjLEVBQUUsTUFBTSxDQUFDLFNBQVM7aUJBQ2hDLENBQUE7WUFDRixDQUFDO1lBQ0QsV0FBVyxDQUFDLEtBQUssQ0FDaEIsbUZBQW1GLEVBQ25GLENBQUMsQ0FBQyxXQUFXLEVBQ2IsQ0FBQyxDQUFDLFFBQVEsQ0FDVixDQUFBO1lBQ0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsRUFBRSxRQUFRLEVBQUUsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQTtRQUNwRixDQUFDLENBQ0QsQ0FDRCxDQUFBO1FBQ0QsSUFBSSxDQUFDLFNBQVMsQ0FBQyxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRUQsMkJBQTJCLENBQzFCLEdBQWtCLEVBQ2xCLEdBQVcsRUFDWCxVQUFrQixFQUNsQixXQUEwQjtRQUUxQixJQUFJLENBQUMsd0JBQXdCLENBQUMsOEJBQThCLENBQUM7WUFDNUQsY0FBYyxFQUFFO2dCQUNmO29CQUNDLEdBQUcsRUFBRSxHQUFHO29CQUNSLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDWCxVQUFVLEVBQUUsVUFBVTtvQkFDdEIsR0FBRyxFQUFFLEdBQUc7b0JBQ1IsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsU0FBUyxFQUFFLENBQUM7b0JBQ1osUUFBUSxFQUFFLE1BQU07aUJBQ2hCO2FBQ0Q7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsOEJBQThCLENBQUMsR0FBa0IsRUFBRSxXQUEwQjtRQUM1RSxJQUFJLENBQUMsd0JBQXdCLENBQUMsOEJBQThCLENBQUM7WUFDNUQsZ0JBQWdCLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDdkIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEIn0=