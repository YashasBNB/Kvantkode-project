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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { autorunWithStore, observableFromEvent } from '../../../../base/common/observable.js';
import { registerDiffEditorContribution } from '../../../../editor/browser/editorExtensions.js';
import { EmbeddedDiffEditorWidget } from '../../../../editor/browser/widget/diffEditor/embeddedDiffEditorWidget.js';
import { ITextResourceConfigurationService } from '../../../../editor/common/services/textResourceConfiguration.js';
import { localize } from '../../../../nls.js';
import { AccessibleViewRegistry } from '../../../../platform/accessibility/browser/accessibleViewRegistry.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { FloatingEditorClickWidget } from '../../../browser/codeeditor.js';
import { Extensions } from '../../../common/configuration.js';
import { DiffEditorAccessibilityHelp } from './diffEditorAccessibilityHelp.js';
let DiffEditorHelperContribution = class DiffEditorHelperContribution extends Disposable {
    static { this.ID = 'editor.contrib.diffEditorHelper'; }
    constructor(_diffEditor, _instantiationService, _textResourceConfigurationService, _notificationService) {
        super();
        this._diffEditor = _diffEditor;
        this._instantiationService = _instantiationService;
        this._textResourceConfigurationService = _textResourceConfigurationService;
        this._notificationService = _notificationService;
        const isEmbeddedDiffEditor = this._diffEditor instanceof EmbeddedDiffEditorWidget;
        if (!isEmbeddedDiffEditor) {
            const computationResult = observableFromEvent(this, (e) => this._diffEditor.onDidUpdateDiff(e), () => 
            /** @description diffEditor.diffComputationResult */ this._diffEditor.getDiffComputationResult());
            const onlyWhiteSpaceChange = computationResult.map((r) => r && !r.identical && r.changes2.length === 0);
            this._register(autorunWithStore((reader, store) => {
                /** @description update state */
                if (onlyWhiteSpaceChange.read(reader)) {
                    const helperWidget = store.add(this._instantiationService.createInstance(FloatingEditorClickWidget, this._diffEditor.getModifiedEditor(), localize('hintWhitespace', 'Show Whitespace Differences'), null));
                    store.add(helperWidget.onClick(() => {
                        this._textResourceConfigurationService.updateValue(this._diffEditor.getModel().modified.uri, 'diffEditor.ignoreTrimWhitespace', false);
                    }));
                    helperWidget.render();
                }
            }));
            this._register(this._diffEditor.onDidUpdateDiff(() => {
                const diffComputationResult = this._diffEditor.getDiffComputationResult();
                if (diffComputationResult && diffComputationResult.quitEarly) {
                    this._notificationService.prompt(Severity.Warning, localize('hintTimeout', 'The diff algorithm was stopped early (after {0} ms.)', this._diffEditor.maxComputationTime), [
                        {
                            label: localize('removeTimeout', 'Remove Limit'),
                            run: () => {
                                this._textResourceConfigurationService.updateValue(this._diffEditor.getModel().modified.uri, 'diffEditor.maxComputationTime', 0);
                            },
                        },
                    ], {});
                }
            }));
        }
    }
};
DiffEditorHelperContribution = __decorate([
    __param(1, IInstantiationService),
    __param(2, ITextResourceConfigurationService),
    __param(3, INotificationService)
], DiffEditorHelperContribution);
registerDiffEditorContribution(DiffEditorHelperContribution.ID, DiffEditorHelperContribution);
Registry.as(Extensions.ConfigurationMigration).registerConfigurationMigrations([
    {
        key: 'diffEditor.experimental.collapseUnchangedRegions',
        migrateFn: (value, accessor) => {
            return [
                ['diffEditor.hideUnchangedRegions.enabled', { value }],
                ['diffEditor.experimental.collapseUnchangedRegions', { value: undefined }],
            ];
        },
    },
]);
AccessibleViewRegistry.register(new DiffEditorAccessibilityHelp());
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2RpZmZFZGl0b3JIZWxwZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRTdGLE9BQU8sRUFBRSw4QkFBOEIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBFQUEwRSxDQUFBO0FBRW5ILE9BQU8sRUFBRSxpQ0FBaUMsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQ25ILE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUM3RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFtQyxNQUFNLGtDQUFrQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTlFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTthQUM3QixPQUFFLEdBQUcsaUNBQWlDLEFBQXBDLENBQW9DO0lBRTdELFlBQ2tCLFdBQXdCLEVBQ0QscUJBQTRDLEVBRW5FLGlDQUFvRSxFQUM5QyxvQkFBMEM7UUFFakYsS0FBSyxFQUFFLENBQUE7UUFOVSxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNELDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFFbkUsc0NBQWlDLEdBQWpDLGlDQUFpQyxDQUFtQztRQUM5Qyx5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXNCO1FBSWpGLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxDQUFDLFdBQVcsWUFBWSx3QkFBd0IsQ0FBQTtRQUVqRixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMzQixNQUFNLGlCQUFpQixHQUFHLG1CQUFtQixDQUM1QyxJQUFJLEVBQ0osQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUMxQyxHQUFHLEVBQUU7WUFDSixvREFBb0QsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLENBQ2pHLENBQUE7WUFDRCxNQUFNLG9CQUFvQixHQUFHLGlCQUFpQixDQUFDLEdBQUcsQ0FDakQsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUNuRCxDQUFBO1lBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixnQkFBZ0IsQ0FBQyxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRTtnQkFDbEMsZ0NBQWdDO2dCQUNoQyxJQUFJLG9CQUFvQixDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO29CQUN2QyxNQUFNLFlBQVksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUM3QixJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN4Qyx5QkFBeUIsRUFDekIsSUFBSSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxFQUNwQyxRQUFRLENBQUMsZ0JBQWdCLEVBQUUsNkJBQTZCLENBQUMsRUFDekQsSUFBSSxDQUNKLENBQ0QsQ0FBQTtvQkFDRCxLQUFLLENBQUMsR0FBRyxDQUNSLFlBQVksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO3dCQUN6QixJQUFJLENBQUMsaUNBQWlDLENBQUMsV0FBVyxDQUNqRCxJQUFJLENBQUMsV0FBVyxDQUFDLFFBQVEsRUFBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLEVBQ3pDLGlDQUFpQyxFQUNqQyxLQUFLLENBQ0wsQ0FBQTtvQkFDRixDQUFDLENBQUMsQ0FDRixDQUFBO29CQUNELFlBQVksQ0FBQyxNQUFNLEVBQUUsQ0FBQTtnQkFDdEIsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7WUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtnQkFDckMsTUFBTSxxQkFBcUIsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLHdCQUF3QixFQUFFLENBQUE7Z0JBRXpFLElBQUkscUJBQXFCLElBQUkscUJBQXFCLENBQUMsU0FBUyxFQUFFLENBQUM7b0JBQzlELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQy9CLFFBQVEsQ0FBQyxPQUFPLEVBQ2hCLFFBQVEsQ0FDUCxhQUFhLEVBQ2Isc0RBQXNELEVBQ3RELElBQUksQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQ25DLEVBQ0Q7d0JBQ0M7NEJBQ0MsS0FBSyxFQUFFLFFBQVEsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDOzRCQUNoRCxHQUFHLEVBQUUsR0FBRyxFQUFFO2dDQUNULElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxXQUFXLENBQ2pELElBQUksQ0FBQyxXQUFXLENBQUMsUUFBUSxFQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsRUFDekMsK0JBQStCLEVBQy9CLENBQUMsQ0FDRCxDQUFBOzRCQUNGLENBQUM7eUJBQ0Q7cUJBQ0QsRUFDRCxFQUFFLENBQ0YsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDOztBQWpGSSw0QkFBNEI7SUFLL0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGlDQUFpQyxDQUFBO0lBRWpDLFdBQUEsb0JBQW9CLENBQUE7R0FSakIsNEJBQTRCLENBa0ZqQztBQUVELDhCQUE4QixDQUFDLDRCQUE0QixDQUFDLEVBQUUsRUFBRSw0QkFBNEIsQ0FBQyxDQUFBO0FBRTdGLFFBQVEsQ0FBQyxFQUFFLENBQ1YsVUFBVSxDQUFDLHNCQUFzQixDQUNqQyxDQUFDLCtCQUErQixDQUFDO0lBQ2pDO1FBQ0MsR0FBRyxFQUFFLGtEQUFrRDtRQUN2RCxTQUFTLEVBQUUsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDOUIsT0FBTztnQkFDTixDQUFDLHlDQUF5QyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUM7Z0JBQ3RELENBQUMsa0RBQWtELEVBQUUsRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLENBQUM7YUFDMUUsQ0FBQTtRQUNGLENBQUM7S0FDRDtDQUNELENBQUMsQ0FBQTtBQUNGLHNCQUFzQixDQUFDLFFBQVEsQ0FBQyxJQUFJLDJCQUEyQixFQUFFLENBQUMsQ0FBQSJ9