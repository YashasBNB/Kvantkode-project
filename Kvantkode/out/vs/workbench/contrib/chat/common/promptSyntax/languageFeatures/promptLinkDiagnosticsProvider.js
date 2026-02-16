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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0TGlua0RpYWdub3N0aWNzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9sYW5ndWFnZUZlYXR1cmVzL3Byb21wdExpbmtEaWFnbm9zdGljc1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRWxFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFdkUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDbkYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRXJGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUN2RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQW1DLFVBQVUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxD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