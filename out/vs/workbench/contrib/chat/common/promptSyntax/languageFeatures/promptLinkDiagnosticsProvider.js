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
import { IPromptsService } from '../service/types.js';
import { assert } from '../../../../../../base/common/assert.js';
import { NotPromptFile } from '../../promptFileReferenceErrors.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { ObjectCache } from '../../../../../../base/common/objectCache.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { PromptsConfig } from '../../../../../../platform/prompts/common/config.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { IEditorService } from '../../../../../services/editor/common/editorService.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { Extensions } from '../../../../../common/contributions.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { IMarkerService, MarkerSeverity, } from '../../../../../../platform/markers/common/markers.js';
/**
 * Unique ID of the markers provider class.
 */
const MARKERS_OWNER_ID = 'reusable-prompts-syntax';
/**
 * Prompt links diagnostics provider for a single text model.
 */
let PromptLinkDiagnosticsProvider = class PromptLinkDiagnosticsProvider extends ObservableDisposable {
    constructor(editor, markerService, promptsService) {
        super();
        this.editor = editor;
        this.markerService = markerService;
        this.promptsService = promptsService;
        this.parser = this.promptsService
            .getSyntaxParserFor(this.editor)
            .onUpdate(this.updateMarkers.bind(this))
            .onDispose(this.dispose.bind(this))
            .start();
        // initialize markers
        this.updateMarkers();
    }
    /**
     * Update diagnostic markers for the current editor.
     */
    async updateMarkers() {
        // ensure that parsing process is settled
        await this.parser.allSettled();
        // clean up all previously added markers
        this.markerService.remove(MARKERS_OWNER_ID, [this.editor.uri]);
        const markers = [];
        for (const link of this.parser.references) {
            const { topError, linkRange } = link;
            if (!topError || !linkRange) {
                continue;
            }
            const { originalError } = topError;
            // the `NotPromptFile` error is allowed because we allow users
            // to include non-prompt file links in the prompt files
            // note! this check also handles the `FolderReference` error
            if (originalError instanceof NotPromptFile) {
                continue;
            }
            markers.push(toMarker(link));
        }
        this.markerService.changeOne(MARKERS_OWNER_ID, this.editor.uri, markers);
    }
};
PromptLinkDiagnosticsProvider = __decorate([
    __param(1, IMarkerService),
    __param(2, IPromptsService)
], PromptLinkDiagnosticsProvider);
/**
 * Convert a prompt link with an issue to a marker data.
 *
 * @throws
 *  - if there is no link issue (e.g., `topError` undefined)
 *  - if there is no link range to highlight (e.g., `linkRange` undefined)
 *  - if the original error is of `NotPromptFile` type - we don't want to
 *    show diagnostic markers for non-prompt file links in the prompts
 */
const toMarker = (link) => {
    const { topError, linkRange } = link;
    // a sanity check because this function must be
    // used only if these link attributes are present
    assertDefined(topError, 'Top error must to be defined.');
    assertDefined(linkRange, 'Link range must to be defined.');
    const { originalError } = topError;
    assert(!(originalError instanceof NotPromptFile), 'Error must not be of "not prompt file" type.');
    // `error` severity for the link itself, `warning` for any of its children
    const severity = topError.errorSubject === 'root' ? MarkerSeverity.Error : MarkerSeverity.Warning;
    return {
        message: topError.localizedMessage,
        severity,
        ...linkRange,
    };
};
/**
 * The class that manages creation and disposal of {@link PromptLinkDiagnosticsProvider}
 * classes for each specific editor text model.
 */
let PromptLinkDiagnosticsInstanceManager = class PromptLinkDiagnosticsInstanceManager extends Disposable {
    constructor(editorService, initService, configService) {
        super();
        // cache of prompt marker providers
        this.providers = this._register(new ObjectCache((editor) => {
            const parser = initService.createInstance(PromptLinkDiagnosticsProvider, editor);
            // this is a sanity check and the contract of the object cache,
            // we must return a non-disposed object from this factory function
            parser.assertNotDisposed('Created prompt parser must not be disposed.');
            return parser;
        }));
        // if the feature is disabled, do not create any providers
        if (!PromptsConfig.enabled(configService)) {
            return;
        }
        // subscribe to changes of the active editor
        this._register(editorService.onDidActiveEditorChange(() => {
            const { activeTextEditorControl } = editorService;
            if (!activeTextEditorControl) {
                return;
            }
            this.handleNewEditor(activeTextEditorControl);
        }));
        // handle existing visible text editors
        editorService.visibleTextEditorControls.forEach(this.handleNewEditor.bind(this));
    }
    /**
     * Initialize a new {@link PromptLinkDiagnosticsProvider} for the given editor.
     */
    handleNewEditor(editor) {
        const model = editor.getModel();
        if (!model) {
            return this;
        }
        // we support only `text editors` for now so filter out `diff` ones
        if ('modified' in model || 'model' in model) {
            return this;
        }
        // enable this only for prompt file editors
        if (!isPromptFile(model.uri)) {
            return this;
        }
        // note! calling `get` also creates a provider if it does not exist;
        // 		and the provider is auto-removed when the model is disposed
        this.providers.get(model);
        return this;
    }
};
PromptLinkDiagnosticsInstanceManager = __decorate([
    __param(0, IEditorService),
    __param(1, IInstantiationService),
    __param(2, IConfigurationService)
], PromptLinkDiagnosticsInstanceManager);
export { PromptLinkDiagnosticsInstanceManager };
// register the provider as a workbench contribution
Registry.as(Extensions.Workbench).registerWorkbenchContribution(PromptLinkDiagnosticsInstanceManager, 4 /* LifecyclePhase.Eventually */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VGZWF0dXJlcy9wcm9tcHRMaW5rRGlhZ25vc3RpY3NQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXZFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUUxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakYsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDdkYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDNUYsT0FBTyxFQUFtQyxVQUFVLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBRU4sY0FB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