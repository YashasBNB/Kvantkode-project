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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2VyUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJpYi9tYXJrZXIvbWFya2VyUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUVOLDhCQUE4QixHQUM5QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFFTixVQUFVLEVBQ1Ysd0JBQXdCLEdBQ3hCLE1BQU0sK0VBQStFLENBQUE7QUFDdEYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzNELE9BQU8sRUFDTixjQUFjLEVBQ2QsY0FBYyxHQUNkLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3BGLE9BQU8sRUFJTix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDdEUsT0FBTyxFQUNOLHFCQUFxQixFQUNyQix1QkFBdUIsR0FDdkIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFcEUsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBa0I7YUFDUCxPQUFFLEdBQUcsc0NBQXNDLEFBQXpDLENBQXlDO0lBSTNELFlBQ2tDLGNBQThCLEVBQ3JDLGdCQUEwQyxFQUM1QixjQUFxQztRQUY1QyxtQkFBYyxHQUFkLGNBQWMsQ0FBZ0I7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