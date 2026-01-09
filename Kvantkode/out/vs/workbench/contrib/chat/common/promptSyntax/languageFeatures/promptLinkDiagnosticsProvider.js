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
