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
import Severity from '../../../../base/common/severity.js';
import { getCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ILanguageStatusService, } from '../../../services/languageStatus/common/languageStatusService.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import * as nls from '../../../../nls.js';
import { FoldingController } from '../../../../editor/contrib/folding/browser/folding.js';
import { ColorDetector } from '../../../../editor/contrib/colorPicker/browser/colorDetector.js';
const openSettingsCommand = 'workbench.action.openSettings';
const configureSettingsLabel = nls.localize('status.button.configure', 'Configure');
/**
 * Uses that language status indicator to show information which language features have been limited for performance reasons.
 * Currently this is used for folding ranges and for color decorators.
 */
let LimitIndicatorContribution = class LimitIndicatorContribution extends Disposable {
    constructor(editorService, languageStatusService) {
        super();
        const accessors = [new ColorDecorationAccessor(), new FoldingRangeAccessor()];
        const statusEntries = accessors.map((indicator) => new LanguageStatusEntry(languageStatusService, indicator));
        statusEntries.forEach((entry) => this._register(entry));
        let control;
        const onActiveEditorChanged = () => {
            const activeControl = editorService.activeTextEditorControl;
            if (activeControl === control) {
                return;
            }
            control = activeControl;
            const editor = getCodeEditor(activeControl);
            statusEntries.forEach((statusEntry) => statusEntry.onActiveEditorChanged(editor));
        };
        this._register(editorService.onDidActiveEditorChange(onActiveEditorChanged));
        onActiveEditorChanged();
    }
};
LimitIndicatorContribution = __decorate([
    __param(0, IEditorService),
    __param(1, ILanguageStatusService)
], LimitIndicatorContribution);
export { LimitIndicatorContribution };
class ColorDecorationAccessor {
    constructor() {
        this.id = 'decoratorsLimitInfo';
        this.name = nls.localize('colorDecoratorsStatusItem.name', 'Color Decorator Status');
        this.label = nls.localize('status.limitedColorDecorators.short', 'Color decorators');
        this.source = nls.localize('colorDecoratorsStatusItem.source', 'Color Decorators');
        this.settingsId = 'editor.colorDecoratorsLimit';
    }
    getLimitReporter(editor) {
        return ColorDetector.get(editor)?.limitReporter;
    }
}
class FoldingRangeAccessor {
    constructor() {
        this.id = 'foldingLimitInfo';
        this.name = nls.localize('foldingRangesStatusItem.name', 'Folding Status');
        this.label = nls.localize('status.limitedFoldingRanges.short', 'Folding ranges');
        this.source = nls.localize('foldingRangesStatusItem.source', 'Folding');
        this.settingsId = 'editor.foldingMaximumRegions';
    }
    getLimitReporter(editor) {
        return FoldingController.get(editor)?.limitReporter;
    }
}
class LanguageStatusEntry {
    constructor(languageStatusService, accessor) {
        this.languageStatusService = languageStatusService;
        this.accessor = accessor;
    }
    onActiveEditorChanged(editor) {
        if (this._indicatorChangeListener) {
            this._indicatorChangeListener.dispose();
            this._indicatorChangeListener = undefined;
        }
        let info;
        if (editor) {
            info = this.accessor.getLimitReporter(editor);
        }
        this.updateStatusItem(info);
        if (info) {
            this._indicatorChangeListener = info.onDidChange((_) => {
                this.updateStatusItem(info);
            });
            return true;
        }
        return false;
    }
    updateStatusItem(info) {
        if (this._limitStatusItem) {
            this._limitStatusItem.dispose();
            this._limitStatusItem = undefined;
        }
        if (info && info.limited !== false) {
            const status = {
                id: this.accessor.id,
                selector: '*',
                name: this.accessor.name,
                severity: Severity.Warning,
                label: this.accessor.label,
                detail: nls.localize('status.limited.details', 'only {0} shown for performance reasons', info.limited),
                command: {
                    id: openSettingsCommand,
                    arguments: [this.accessor.settingsId],
                    title: configureSettingsLabel,
                },
                accessibilityInfo: undefined,
                source: this.accessor.source,
                busy: false,
            };
            this._limitStatusItem = this.languageStatusService.addStatus(status);
        }
    }
    dispose() {
        this._limitStatusItem?.dispose;
        this._limitStatusItem = undefined;
        this._indicatorChangeListener?.dispose;
        this._indicatorChangeListener = undefined;
    }
}
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LimitIndicatorContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGltaXRJbmRpY2F0b3IuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbGltaXRJbmRpY2F0b3IvYnJvd3Nlci9saW1pdEluZGljYXRvci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBZSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUN4RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUVOLHNCQUFzQixHQUN0QixNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMzRSxPQUFPLEVBQ04sVUFBVSxJQUFJLG1CQUFtQixHQUdqQyxNQUFNLGtDQUFrQyxDQUFBO0FBR3pDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFFekMsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDekYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRS9GLE1BQU0sbUJBQW1CLEdBQUcsK0JBQStCLENBQUE7QUFDM0QsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLFdBQVcsQ0FBQyxDQUFBO0FBRW5GOzs7R0FHRztBQUNJLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQTJCLFNBQVEsVUFBVTtJQUN6RCxZQUNpQixhQUE2QixFQUNyQixxQkFBNkM7UUFFckUsS0FBSyxFQUFFLENBQUE7UUFF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