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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvckhlbHBlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9kaWZmRWRpdG9ySGVscGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU3RixPQUFPLEVBQUUsOEJBQThCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwwRUFBMEUsQ0FBQTtBQUVuSCxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUNuSCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFDN0csT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBbUMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUM5RixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUU5RSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7YUFDN0IsT0FBRSxHQUFHLGlDQUFpQyxBQUFwQyxD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