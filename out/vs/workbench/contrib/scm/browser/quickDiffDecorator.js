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
var QuickDiffDecorator_1;
import * as nls from '../../../../nls.js';
import './media/dirtydiffDecorator.css';
import { Disposable, DisposableStore, DisposableMap, } from '../../../../base/common/lifecycle.js';
import { Event } from '../../../../base/common/event.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ModelDecorationOptions } from '../../../../editor/common/model/textModel.js';
import { themeColorFromId } from '../../../../platform/theme/common/themeService.js';
import { isCodeEditor } from '../../../../editor/browser/editorBrowser.js';
import { OverviewRulerLane, } from '../../../../editor/common/model.js';
import * as domStylesheetsJs from '../../../../base/browser/domStylesheets.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ChangeType, getChangeType, minimapGutterAddedBackground, minimapGutterDeletedBackground, minimapGutterModifiedBackground, overviewRulerAddedForeground, overviewRulerDeletedForeground, overviewRulerModifiedForeground, } from '../common/quickDiff.js';
import { IQuickDiffModelService } from './quickDiffModel.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { IUriIdentityService } from '../../../../platform/uriIdentity/common/uriIdentity.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { autorun, autorunWithStore, observableFromEvent, } from '../../../../base/common/observable.js';
export const quickDiffDecorationCount = new RawContextKey('quickDiffDecorationCount', 0);
let QuickDiffDecorator = QuickDiffDecorator_1 = class QuickDiffDecorator extends Disposable {
    static createDecoration(className, tooltip, options) {
        const decorationOptions = {
            description: 'dirty-diff-decoration',
            isWholeLine: options.isWholeLine,
        };
        if (options.gutter) {
            decorationOptions.linesDecorationsClassName = `dirty-diff-glyph ${className}`;
            decorationOptions.linesDecorationsTooltip = tooltip;
        }
        if (options.overview.active) {
            decorationOptions.overviewRuler = {
                color: themeColorFromId(options.overview.color),
                position: OverviewRulerLane.Left,
            };
        }
        if (options.minimap.active) {
            decorationOptions.minimap = {
                color: themeColorFromId(options.minimap.color),
                position: 2 /* MinimapPosition.Gutter */,
            };
        }
        return ModelDecorationOptions.createDynamic(decorationOptions);
    }
    constructor(codeEditor, quickDiffModelRef, configurationService) {
        super();
        this.codeEditor = codeEditor;
        this.quickDiffModelRef = quickDiffModelRef;
        this.configurationService = configurationService;
        const decorations = configurationService.getValue('scm.diffDecorations');
        const gutter = decorations === 'all' || decorations === 'gutter';
        const overview = decorations === 'all' || decorations === 'overview';
        const minimap = decorations === 'all' || decorations === 'minimap';
        const diffAdded = nls.localize('diffAdded', 'Added lines');
        this.addedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added', diffAdded, {
            gutter,
            overview: { active: overview, color: overviewRulerAddedForeground },
            minimap: { active: minimap, color: minimapGutterAddedBackground },
            isWholeLine: true,
        });
        this.addedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-added-pattern', diffAdded, {
            gutter,
            overview: { active: overview, color: overviewRulerAddedForeground },
            minimap: { active: minimap, color: minimapGutterAddedBackground },
            isWholeLine: true,
        });
        const diffModified = nls.localize('diffModified', 'Changed lines');
        this.modifiedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified', diffModified, {
            gutter,
            overview: { active: overview, color: overviewRulerModifiedForeground },
            minimap: { active: minimap, color: minimapGutterModifiedBackground },
            isWholeLine: true,
        });
        this.modifiedPatternOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-modified-pattern', diffModified, {
            gutter,
            overview: { active: overview, color: overviewRulerModifiedForeground },
            minimap: { active: minimap, color: minimapGutterModifiedBackground },
            isWholeLine: true,
        });
        this.deletedOptions = QuickDiffDecorator_1.createDecoration('dirty-diff-deleted', nls.localize('diffDeleted', 'Removed lines'), {
            gutter,
            overview: { active: overview, color: overviewRulerDeletedForeground },
            minimap: { active: minimap, color: minimapGutterDeletedBackground },
            isWholeLine: false,
        });
        this._register(configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('scm.diffDecorationsGutterPattern')) {
                this.onDidChange();
            }
        }));
        this._register(Event.runAndSubscribe(this.quickDiffModelRef.object.onDidChange, () => this.onDidChange()));
    }
    onDidChange() {
        if (!this.codeEditor.hasModel()) {
            return;
        }
        const visibleQuickDiffs = this.quickDiffModelRef.object.quickDiffs.filter((quickDiff) => quickDiff.visible);
        const pattern = this.configurationService.getValue('scm.diffDecorationsGutterPattern');
        const decorations = this.quickDiffModelRef.object.changes
            .filter((labeledChange) => visibleQuickDiffs.some((quickDiff) => quickDiff.label === labeledChange.label))
            .map((labeledChange) => {
            const change = labeledChange.change;
            const changeType = getChangeType(change);
            const startLineNumber = change.modifiedStartLineNumber;
            const endLineNumber = change.modifiedEndLineNumber || startLineNumber;
            switch (changeType) {
                case ChangeType.Add:
                    return {
                        range: {
                            startLineNumber: startLineNumber,
                            startColumn: 1,
                            endLineNumber: endLineNumber,
                            endColumn: 1,
                        },
                        options: pattern.added ? this.addedPatternOptions : this.addedOptions,
                    };
                case ChangeType.Delete:
                    return {
                        range: {
                            startLineNumber: startLineNumber,
                            startColumn: Number.MAX_VALUE,
                            endLineNumber: startLineNumber,
                            endColumn: Number.MAX_VALUE,
                        },
                        options: this.deletedOptions,
                    };
                case ChangeType.Modify:
                    return {
                        range: {
                            startLineNumber: startLineNumber,
                            startColumn: 1,
                            endLineNumber: endLineNumber,
                            endColumn: 1,
                        },
                        options: pattern.modified ? this.modifiedPatternOptions : this.modifiedOptions,
                    };
            }
        });
        if (!this.decorationsCollection) {
            this.decorationsCollection = this.codeEditor.createDecorationsCollection(decorations);
        }
        else {
            this.decorationsCollection.set(decorations);
        }
    }
    dispose() {
        if (this.decorationsCollection) {
            this.decorationsCollection.clear();
        }
        this.decorationsCollection = undefined;
        this.quickDiffModelRef.dispose();
        super.dispose();
    }
};
QuickDiffDecorator = QuickDiffDecorator_1 = __decorate([
    __param(2, IConfigurationService)
], QuickDiffDecorator);
let QuickDiffWorkbenchController = class QuickDiffWorkbenchController extends Disposable {
    constructor(editorService, configurationService, quickDiffModelService, uriIdentityService, contextKeyService) {
        super();
        this.editorService = editorService;
        this.configurationService = configurationService;
        this.quickDiffModelService = quickDiffModelService;
        this.uriIdentityService = uriIdentityService;
        this.enabled = false;
        // Resource URI -> Code Editor Id -> Decoration (Disposable)
        this.decorators = new ResourceMap();
        this.viewState = { width: 3, visibility: 'always' };
        this.transientDisposables = this._register(new DisposableStore());
        this.stylesheet = domStylesheetsJs.createStyleSheet(undefined, undefined, this._store);
        this.quickDiffDecorationCount = quickDiffDecorationCount.bindTo(contextKeyService);
        this.activeEditor = observableFromEvent(this, this.editorService.onDidActiveEditorChange, () => this.editorService.activeEditor);
        const onDidChangeConfiguration = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.diffDecorations'));
        this._register(onDidChangeConfiguration(this.onDidChangeConfiguration, this));
        this.onDidChangeConfiguration();
        const onDidChangeDiffWidthConfiguration = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.diffDecorationsGutterWidth'));
        this._register(onDidChangeDiffWidthConfiguration(this.onDidChangeDiffWidthConfiguration, this));
        this.onDidChangeDiffWidthConfiguration();
        const onDidChangeDiffVisibilityConfiguration = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('scm.diffDecorationsGutterVisibility'));
        this._register(onDidChangeDiffVisibilityConfiguration(this.onDidChangeDiffVisibilityConfiguration, this));
        this.onDidChangeDiffVisibilityConfiguration();
    }
    onDidChangeConfiguration() {
        const enabled = this.configurationService.getValue('scm.diffDecorations') !== 'none';
        if (enabled) {
            this.enable();
        }
        else {
            this.disable();
        }
    }
    onDidChangeDiffWidthConfiguration() {
        let width = this.configurationService.getValue('scm.diffDecorationsGutterWidth');
        if (isNaN(width) || width <= 0 || width > 5) {
            width = 3;
        }
        this.setViewState({ ...this.viewState, width });
    }
    onDidChangeDiffVisibilityConfiguration() {
        const visibility = this.configurationService.getValue('scm.diffDecorationsGutterVisibility');
        this.setViewState({ ...this.viewState, visibility });
    }
    setViewState(state) {
        this.viewState = state;
        this.stylesheet.textContent = `
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-modified {
				border-left-width:${state.width}px;
			}
			.monaco-editor .dirty-diff-added-pattern,
			.monaco-editor .dirty-diff-added-pattern:before,
			.monaco-editor .dirty-diff-modified-pattern,
			.monaco-editor .dirty-diff-modified-pattern:before {
				background-size: ${state.width}px ${state.width}px;
			}
			.monaco-editor .dirty-diff-added,
			.monaco-editor .dirty-diff-added-pattern,
			.monaco-editor .dirty-diff-modified,
			.monaco-editor .dirty-diff-modified-pattern,
			.monaco-editor .dirty-diff-deleted {
				opacity: ${state.visibility === 'always' ? 1 : 0};
			}
		`;
    }
    enable() {
        if (this.enabled) {
            this.disable();
        }
        this.transientDisposables.add(Event.any(this.editorService.onDidCloseEditor, this.editorService.onDidVisibleEditorsChange)(() => this.onEditorsChanged()));
        this.onEditorsChanged();
        this.onDidActiveEditorChange();
        this.enabled = true;
    }
    disable() {
        if (!this.enabled) {
            return;
        }
        this.transientDisposables.clear();
        this.quickDiffDecorationCount.set(0);
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            decoratorMap.dispose();
            this.decorators.delete(uri);
        }
        this.enabled = false;
    }
    onDidActiveEditorChange() {
        this.transientDisposables.add(autorunWithStore((reader, store) => {
            const activeEditor = this.activeEditor.read(reader);
            const activeTextEditorControl = this.editorService.activeTextEditorControl;
            if (!isCodeEditor(activeTextEditorControl) || !activeEditor?.resource) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(activeEditor.resource);
            if (!quickDiffModelRef) {
                this.quickDiffDecorationCount.set(0);
                return;
            }
            store.add(quickDiffModelRef);
            const visibleDecorationCount = observableFromEvent(this, quickDiffModelRef.object.onDidChange, () => {
                const visibleQuickDiffs = quickDiffModelRef.object.quickDiffs.filter((quickDiff) => quickDiff.visible);
                return quickDiffModelRef.object.changes.filter((labeledChange) => visibleQuickDiffs.some((quickDiff) => quickDiff.label === labeledChange.label)).length;
            });
            store.add(autorun((reader) => {
                const count = visibleDecorationCount.read(reader);
                this.quickDiffDecorationCount.set(count);
            }));
        }));
    }
    onEditorsChanged() {
        for (const editor of this.editorService.visibleTextEditorControls) {
            if (!isCodeEditor(editor)) {
                continue;
            }
            const textModel = editor.getModel();
            if (!textModel) {
                continue;
            }
            const editorId = editor.getId();
            if (this.decorators.get(textModel.uri)?.has(editorId)) {
                continue;
            }
            const quickDiffModelRef = this.quickDiffModelService.createQuickDiffModelReference(textModel.uri);
            if (!quickDiffModelRef) {
                continue;
            }
            if (!this.decorators.has(textModel.uri)) {
                this.decorators.set(textModel.uri, new DisposableMap());
            }
            this.decorators
                .get(textModel.uri)
                .set(editorId, new QuickDiffDecorator(editor, quickDiffModelRef, this.configurationService));
        }
        // Dispose decorators for editors that are no longer visible.
        for (const [uri, decoratorMap] of this.decorators.entries()) {
            for (const editorId of decoratorMap.keys()) {
                const codeEditor = this.editorService.visibleTextEditorControls.find((editor) => isCodeEditor(editor) &&
                    editor.getId() === editorId &&
                    this.uriIdentityService.extUri.isEqual(editor.getModel()?.uri, uri));
                if (!codeEditor) {
                    decoratorMap.deleteAndDispose(editorId);
                }
            }
            if (decoratorMap.size === 0) {
                decoratorMap.dispose();
                this.decorators.delete(uri);
            }
        }
    }
    dispose() {
        this.disable();
        super.dispose();
    }
};
QuickDiffWorkbenchController = __decorate([
    __param(0, IEditorService),
    __param(1, IConfigurationService),
    __param(2, IQuickDiffModelService),
    __param(3, IUriIdentityService),
    __param(4, IContextKeyService)
], QuickDiffWorkbenchController);
export { QuickDiffWorkbenchController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tEaWZmRGVjb3JhdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvc2NtL2Jyb3dzZXIvcXVpY2tEaWZmRGVjb3JhdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLE9BQU8sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUNOLFVBQVUsRUFDVixlQUFlLEVBQ2YsYUFBYSxHQUViLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3BGLE9BQU8sRUFBZSxZQUFZLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV2RixPQUFPLEVBQ04saUJBQWlCLEdBR2pCLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxLQUFLLGdCQUFnQixNQUFNLDRDQUE0QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYiw0QkFBNEIsRUFDNUIsOEJBQThCLEVBQzlCLCtCQUErQixFQUMvQiw0QkFBNEIsRUFDNUIsOEJBQThCLEVBQzlCLCtCQUErQixHQUMvQixNQUFNLHdCQUF3QixDQUFBO0FBQy9CLE9BQU8sRUFBa0Isc0JBQXNCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1B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