/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { registerWorkbenchContribution2, } from '../../../../../common/contributions.js';
import { MarkerList, IMarkerNavigationService, } from '../../../../../../editor/contrib/gotoError/browser/markerNavigationService.js';
import { CellUri } from '../../../common/notebookCommon.js';
import { IMarkerService, MarkerSeverity, } from '../../../../../../platform/markers/common/markers.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { NotebookOverviewRulerLane, } from '../../notebookBrowser.js';
import { registerNotebookContribution } from '../../notebookEditorExtensions.js';
import { throttle } from '../../../../../../base/common/decorators.js';
import { editorErrorForeground, editorWarningForeground, } from '../../../../../../platform/theme/common/colorRegistry.js';
import { isEqual } from '../../../../../../base/common/resources.js';
let MarkerListProvider = class MarkerListProvider {
    static { this.ID = 'workbench.contrib.markerListProvider'; }
    constructor(_markerService, markerNavigation, _configService) {
        this._markerService = _markerService;
        this._configService = _configService;
        this._dispoables = markerNavigation.registerProvider(this);
    }
    dispose() {
        this._dispoables.dispose();
    }
    getMarkerList(resource) {
        if (!resource) {
            return undefined;
        }
        const data = CellUri.parse(resource);
        if (!data) {
            return undefined;
        }
        return new MarkerList((uri) => {
            const otherData = CellUri.parse(uri);
            return otherData?.notebook.toString() === data.notebook.toString();
        }, this._markerService, this._configService);
    }
};
MarkerListProvider = __decorate([
    __param(0, IMarkerService),
    __param(1, IMarkerNavigationService),
    __param(2, IConfigurationService)
], MarkerListProvider);
let NotebookMarkerDecorationContribution = class NotebookMarkerDecorationContribution extends Disposable {
    static { this.id = 'workbench.notebook.markerDecoration'; }
    constructor(_notebookEditor, _markerService) {
        super();
        this._notebookEditor = _notebookEditor;
        this._markerService = _markerService;
        this._markersOverviewRulerDecorations = [];
        this._update();
        this._register(this._notebookEditor.onDidChangeModel(() => this._update()));
        this._register(this._markerService.onMarkerChanged((e) => {
            if (e.some((uri) => this._notebookEditor.getCellsInRange().some((cell) => isEqual(cell.uri, uri)))) {
                this._update();
            }
        }));
    }
    _update() {
        if (!this._notebookEditor.hasModel()) {
            return;
        }
        const cellDecorations = [];
        this._notebookEditor.getCellsInRange().forEach((cell) => {
            const marker = this._markerService.read({
                resource: cell.uri,
                severities: MarkerSeverity.Error | MarkerSeverity.Warning,
            });
            marker.forEach((m) => {
                const color = m.severity === MarkerSeverity.Error ? editorErrorForeground : editorWarningForeground;
                const range = {
                    startLineNumber: m.startLineNumber,
                    startColumn: m.startColumn,
                    endLineNumber: m.endLineNumber,
                    endColumn: m.endColumn,
                };
                cellDecorations.push({
                    handle: cell.handle,
                    options: {
                        overviewRuler: {
                            color: color,
                            modelRanges: [range],
                            includeOutput: false,
                            position: NotebookOverviewRulerLane.Right,
                        },
                    },
                });
            });
        });
        this._markersOverviewRulerDecorations = this._notebookEditor.deltaCellDecorations(this._markersOverviewRulerDecorations, cellDecorations);
    }
};
__decorate([
    throttle(100)
], NotebookMarkerDecorationContribution.prototype, "_update", null);
NotebookMarkerDecorationContribution = __decorate([
    __param(1, IMarkerService)
], NotebookMarkerDecorationContribution);
registerWorkbenchContribution2(MarkerListProvider.ID, MarkerListProvider, 2 /* WorkbenchPhase.BlockRestore */);
registerNotebookContribution(NotebookMarkerDecorationContribution.id, NotebookMarkerDecorationContribution);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbWFya2VyL21hcmtlclByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFFTiw4QkFBOEIsR0FDOUIsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMvQyxPQUFPLEVBRU4sVUFBVSxFQUNWLHdCQUF3QixHQUN4QixNQUFNLCtFQUErRSxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMzRCxPQUFPLEVBQ04sY0FBYyxFQUNkLGNBQWMsR0FDZCxNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNwRixPQUFPLEVBSU4seUJBQXlCLEdBQ3pCLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3RFLE9BQU8sRUFDTixxQkFBcUIsRUFDckIsdUJBQXVCLEdBQ3ZCLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXBFLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQWtCO2FBQ1AsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUF5QztJQUkzRCxZQUNrQyxjQUE4QixFQUNyQyxnQkFBMEMsRUFDNUIsY0FBcUM7UUFGNUMsbUJBQWMsR0FBZCxjQUFjLENBQWdCO1FBRXZC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