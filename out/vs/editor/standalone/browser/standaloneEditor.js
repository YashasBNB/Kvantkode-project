/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { mainWindow } from '../../../base/browser/window.js';
import { Disposable, DisposableStore } from '../../../base/common/lifecycle.js';
import { splitLines } from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import './standalone-tokens.css';
import { FontMeasurements } from '../../browser/config/fontMeasurements.js';
import { EditorCommand } from '../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../browser/services/codeEditorService.js';
import { createWebWorker as actualCreateWebWorker, } from './standaloneWebWorker.js';
import { ApplyUpdateResult, ConfigurationChangedEvent, EditorOptions, } from '../../common/config/editorOptions.js';
import { EditorZoom } from '../../common/config/editorZoom.js';
import { BareFontInfo, FontInfo } from '../../common/config/fontInfo.js';
import { EditorType } from '../../common/editorCommon.js';
import * as languages from '../../common/languages.js';
import { ILanguageService } from '../../common/languages/language.js';
import { PLAINTEXT_LANGUAGE_ID } from '../../common/languages/modesRegistry.js';
import { NullState, nullTokenize } from '../../common/languages/nullTokenize.js';
import { FindMatch, TextModelResolvedOptions } from '../../common/model.js';
import { IModelService } from '../../common/services/model.js';
import * as standaloneEnums from '../../common/standalone/standaloneEnums.js';
import { Colorizer } from './colorizer.js';
import { StandaloneDiffEditor2, StandaloneEditor, createTextModel, } from './standaloneCodeEditor.js';
import { StandaloneKeybindingService, StandaloneServices, } from './standaloneServices.js';
import { IStandaloneThemeService } from '../common/standaloneTheme.js';
import { MenuId, MenuRegistry } from '../../../platform/actions/common/actions.js';
import { CommandsRegistry } from '../../../platform/commands/common/commands.js';
import { ContextKeyExpr } from '../../../platform/contextkey/common/contextkey.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { IMarkerService } from '../../../platform/markers/common/markers.js';
import { IOpenerService } from '../../../platform/opener/common/opener.js';
import { MultiDiffEditorWidget } from '../../browser/widget/multiDiffEditor/multiDiffEditorWidget.js';
/**
 * Create a new editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function create(domElement, options, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return instantiationService.createInstance(StandaloneEditor, domElement, options);
}
/**
 * Emitted when an editor is created.
 * Creating a diff editor might cause this listener to be invoked with the two editors.
 * @event
 */
export function onDidCreateEditor(listener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.onCodeEditorAdd((editor) => {
        listener(editor);
    });
}
/**
 * Emitted when an diff editor is created.
 * @event
 */
export function onDidCreateDiffEditor(listener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.onDiffEditorAdd((editor) => {
        listener(editor);
    });
}
/**
 * Get all the created editors.
 */
export function getEditors() {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.listCodeEditors();
}
/**
 * Get all the created diff editors.
 */
export function getDiffEditors() {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.listDiffEditors();
}
/**
 * Create a new diff editor under `domElement`.
 * `domElement` should be empty (not contain other dom nodes).
 * The editor will read the size of `domElement`.
 */
export function createDiffEditor(domElement, options, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return instantiationService.createInstance(StandaloneDiffEditor2, domElement, options);
}
export function createMultiFileDiffEditor(domElement, override) {
    const instantiationService = StandaloneServices.initialize(override || {});
    return new MultiDiffEditorWidget(domElement, {}, instantiationService);
}
/**
 * Add a command.
 */
export function addCommand(descriptor) {
    if (typeof descriptor.id !== 'string' || typeof descriptor.run !== 'function') {
        throw new Error('Invalid command descriptor, `id` and `run` are required properties!');
    }
    return CommandsRegistry.registerCommand(descriptor.id, descriptor.run);
}
/**
 * Add an action to all editors.
 */
export function addEditorAction(descriptor) {
    if (typeof descriptor.id !== 'string' ||
        typeof descriptor.label !== 'string' ||
        typeof descriptor.run !== 'function') {
        throw new Error('Invalid action descriptor, `id`, `label` and `run` are required properties!');
    }
    const precondition = ContextKeyExpr.deserialize(descriptor.precondition);
    const run = (accessor, ...args) => {
        return EditorCommand.runEditorCommand(accessor, args, precondition, (accessor, editor, args) => Promise.resolve(descriptor.run(editor, ...args)));
    };
    const toDispose = new DisposableStore();
    // Register the command
    toDispose.add(CommandsRegistry.registerCommand(descriptor.id, run));
    // Register the context menu item
    if (descriptor.contextMenuGroupId) {
        const menuItem = {
            command: {
                id: descriptor.id,
                title: descriptor.label,
            },
            when: precondition,
            group: descriptor.contextMenuGroupId,
            order: descriptor.contextMenuOrder || 0,
        };
        toDispose.add(MenuRegistry.appendMenuItem(MenuId.EditorContext, menuItem));
    }
    // Register the keybindings
    if (Array.isArray(descriptor.keybindings)) {
        const keybindingService = StandaloneServices.get(IKeybindingService);
        if (!(keybindingService instanceof StandaloneKeybindingService)) {
            console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
        }
        else {
            const keybindingsWhen = ContextKeyExpr.and(precondition, ContextKeyExpr.deserialize(descriptor.keybindingContext));
            toDispose.add(keybindingService.addDynamicKeybindings(descriptor.keybindings.map((keybinding) => {
                return {
                    keybinding,
                    command: descriptor.id,
                    when: keybindingsWhen,
                };
            })));
        }
    }
    return toDispose;
}
/**
 * Add a keybinding rule.
 */
export function addKeybindingRule(rule) {
    return addKeybindingRules([rule]);
}
/**
 * Add keybinding rules.
 */
export function addKeybindingRules(rules) {
    const keybindingService = StandaloneServices.get(IKeybindingService);
    if (!(keybindingService instanceof StandaloneKeybindingService)) {
        console.warn('Cannot add keybinding because the editor is configured with an unrecognized KeybindingService');
        return Disposable.None;
    }
    return keybindingService.addDynamicKeybindings(rules.map((rule) => {
        return {
            keybinding: rule.keybinding,
            command: rule.command,
            commandArgs: rule.commandArgs,
            when: ContextKeyExpr.deserialize(rule.when),
        };
    }));
}
/**
 * Create a new editor model.
 * You can specify the language that should be set for this model or let the language be inferred from the `uri`.
 */
export function createModel(value, language, uri) {
    const languageService = StandaloneServices.get(ILanguageService);
    const languageId = languageService.getLanguageIdByMimeType(language) || language;
    return createTextModel(StandaloneServices.get(IModelService), languageService, value, languageId, uri);
}
/**
 * Change the language for a model.
 */
export function setModelLanguage(model, mimeTypeOrLanguageId) {
    const languageService = StandaloneServices.get(ILanguageService);
    const languageId = languageService.getLanguageIdByMimeType(mimeTypeOrLanguageId) ||
        mimeTypeOrLanguageId ||
        PLAINTEXT_LANGUAGE_ID;
    model.setLanguage(languageService.createById(languageId));
}
/**
 * Set the markers for a model.
 */
export function setModelMarkers(model, owner, markers) {
    if (model) {
        const markerService = StandaloneServices.get(IMarkerService);
        markerService.changeOne(owner, model.uri, markers);
    }
}
/**
 * Remove all markers of an owner.
 */
export function removeAllMarkers(owner) {
    const markerService = StandaloneServices.get(IMarkerService);
    markerService.changeAll(owner, []);
}
/**
 * Get markers for owner and/or resource
 *
 * @returns list of markers
 */
export function getModelMarkers(filter) {
    const markerService = StandaloneServices.get(IMarkerService);
    return markerService.read(filter);
}
/**
 * Emitted when markers change for a model.
 * @event
 */
export function onDidChangeMarkers(listener) {
    const markerService = StandaloneServices.get(IMarkerService);
    return markerService.onMarkerChanged(listener);
}
/**
 * Get the model that has `uri` if it exists.
 */
export function getModel(uri) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.getModel(uri);
}
/**
 * Get all the created models.
 */
export function getModels() {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.getModels();
}
/**
 * Emitted when a model is created.
 * @event
 */
export function onDidCreateModel(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelAdded(listener);
}
/**
 * Emitted right before a model is disposed.
 * @event
 */
export function onWillDisposeModel(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelRemoved(listener);
}
/**
 * Emitted when a different language is set to a model.
 * @event
 */
export function onDidChangeModelLanguage(listener) {
    const modelService = StandaloneServices.get(IModelService);
    return modelService.onModelLanguageChanged((e) => {
        listener({
            model: e.model,
            oldLanguage: e.oldLanguageId,
        });
    });
}
/**
 * Create a new web worker that has model syncing capabilities built in.
 * Specify an AMD module to load that will `create` an object that will be proxied.
 */
export function createWebWorker(opts) {
    return actualCreateWebWorker(StandaloneServices.get(IModelService), opts);
}
/**
 * Colorize the contents of `domNode` using attribute `data-lang`.
 */
export function colorizeElement(domNode, options) {
    const languageService = StandaloneServices.get(ILanguageService);
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    return Colorizer.colorizeElement(themeService, languageService, domNode, options).then(() => {
        themeService.registerEditorContainer(domNode);
    });
}
/**
 * Colorize `text` using language `languageId`.
 */
export function colorize(text, languageId, options) {
    const languageService = StandaloneServices.get(ILanguageService);
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    themeService.registerEditorContainer(mainWindow.document.body);
    return Colorizer.colorize(languageService, text, languageId, options);
}
/**
 * Colorize a line in a model.
 */
export function colorizeModelLine(model, lineNumber, tabSize = 4) {
    const themeService = StandaloneServices.get(IStandaloneThemeService);
    themeService.registerEditorContainer(mainWindow.document.body);
    return Colorizer.colorizeModelLine(model, lineNumber, tabSize);
}
/**
 * @internal
 */
function getSafeTokenizationSupport(language) {
    const tokenizationSupport = languages.TokenizationRegistry.get(language);
    if (tokenizationSupport) {
        return tokenizationSupport;
    }
    return {
        getInitialState: () => NullState,
        tokenize: (line, hasEOL, state) => nullTokenize(language, state),
    };
}
/**
 * Tokenize `text` using language `languageId`
 */
export function tokenize(text, languageId) {
    // Needed in order to get the mode registered for subsequent look-ups
    languages.TokenizationRegistry.getOrCreate(languageId);
    const tokenizationSupport = getSafeTokenizationSupport(languageId);
    const lines = splitLines(text);
    const result = [];
    let state = tokenizationSupport.getInitialState();
    for (let i = 0, len = lines.length; i < len; i++) {
        const line = lines[i];
        const tokenizationResult = tokenizationSupport.tokenize(line, true, state);
        result[i] = tokenizationResult.tokens;
        state = tokenizationResult.endState;
    }
    return result;
}
/**
 * Define a new theme or update an existing theme.
 */
export function defineTheme(themeName, themeData) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    standaloneThemeService.defineTheme(themeName, themeData);
}
/**
 * Switches to a theme.
 */
export function setTheme(themeName) {
    const standaloneThemeService = StandaloneServices.get(IStandaloneThemeService);
    standaloneThemeService.setTheme(themeName);
}
/**
 * Clears all cached font measurements and triggers re-measurement.
 */
export function remeasureFonts() {
    FontMeasurements.clearAllFontInfos();
}
/**
 * Register a command.
 */
export function registerCommand(id, handler) {
    return CommandsRegistry.registerCommand({ id, handler });
}
/**
 * Registers a handler that is called when a link is opened in any editor. The handler callback should return `true` if the link was handled and `false` otherwise.
 * The handler that was registered last will be called first when a link is opened.
 *
 * Returns a disposable that can unregister the opener again.
 */
export function registerLinkOpener(opener) {
    const openerService = StandaloneServices.get(IOpenerService);
    return openerService.registerOpener({
        async open(resource) {
            if (typeof resource === 'string') {
                resource = URI.parse(resource);
            }
            return opener.open(resource);
        },
    });
}
/**
 * Registers a handler that is called when a resource other than the current model should be opened in the editor (e.g. "go to definition").
 * The handler callback should return `true` if the request was handled and `false` otherwise.
 *
 * Returns a disposable that can unregister the opener again.
 *
 * If no handler is registered the default behavior is to do nothing for models other than the currently attached one.
 */
export function registerEditorOpener(opener) {
    const codeEditorService = StandaloneServices.get(ICodeEditorService);
    return codeEditorService.registerCodeEditorOpenHandler(async (input, source, sideBySide) => {
        if (!source) {
            return null;
        }
        const selection = input.options?.selection;
        let selectionOrPosition;
        if (selection &&
            typeof selection.endLineNumber === 'number' &&
            typeof selection.endColumn === 'number') {
            selectionOrPosition = selection;
        }
        else if (selection) {
            selectionOrPosition = {
                lineNumber: selection.startLineNumber,
                column: selection.startColumn,
            };
        }
        if (await opener.openCodeEditor(source, input.resource, selectionOrPosition)) {
            return source; // return source editor to indicate that this handler has successfully handled the opening
        }
        return null; // fallback to other registered handlers
    });
}
/**
 * @internal
 */
export function createMonacoEditorAPI() {
    return {
        // methods
        create: create,
        getEditors: getEditors,
        getDiffEditors: getDiffEditors,
        onDidCreateEditor: onDidCreateEditor,
        onDidCreateDiffEditor: onDidCreateDiffEditor,
        createDiffEditor: createDiffEditor,
        addCommand: addCommand,
        addEditorAction: addEditorAction,
        addKeybindingRule: addKeybindingRule,
        addKeybindingRules: addKeybindingRules,
        createModel: createModel,
        setModelLanguage: setModelLanguage,
        setModelMarkers: setModelMarkers,
        getModelMarkers: getModelMarkers,
        removeAllMarkers: removeAllMarkers,
        onDidChangeMarkers: onDidChangeMarkers,
        getModels: getModels,
        getModel: getModel,
        onDidCreateModel: onDidCreateModel,
        onWillDisposeModel: onWillDisposeModel,
        onDidChangeModelLanguage: onDidChangeModelLanguage,
        createWebWorker: createWebWorker,
        colorizeElement: colorizeElement,
        colorize: colorize,
        colorizeModelLine: colorizeModelLine,
        tokenize: tokenize,
        defineTheme: defineTheme,
        setTheme: setTheme,
        remeasureFonts: remeasureFonts,
        registerCommand: registerCommand,
        registerLinkOpener: registerLinkOpener,
        registerEditorOpener: registerEditorOpener,
        // enums
        AccessibilitySupport: standaloneEnums.AccessibilitySupport,
        ContentWidgetPositionPreference: standaloneEnums.ContentWidgetPositionPreference,
        CursorChangeReason: standaloneEnums.CursorChangeReason,
        DefaultEndOfLine: standaloneEnums.DefaultEndOfLine,
        EditorAutoIndentStrategy: standaloneEnums.EditorAutoIndentStrategy,
        EditorOption: standaloneEnums.EditorOption,
        EndOfLinePreference: standaloneEnums.EndOfLinePreference,
        EndOfLineSequence: standaloneEnums.EndOfLineSequence,
        MinimapPosition: standaloneEnums.MinimapPosition,
        MinimapSectionHeaderStyle: standaloneEnums.MinimapSectionHeaderStyle,
        MouseTargetType: standaloneEnums.MouseTargetType,
        OverlayWidgetPositionPreference: standaloneEnums.OverlayWidgetPositionPreference,
        OverviewRulerLane: standaloneEnums.OverviewRulerLane,
        GlyphMarginLane: standaloneEnums.GlyphMarginLane,
        RenderLineNumbersType: standaloneEnums.RenderLineNumbersType,
        RenderMinimap: standaloneEnums.RenderMinimap,
        ScrollbarVisibility: standaloneEnums.ScrollbarVisibility,
        ScrollType: standaloneEnums.ScrollType,
        TextEditorCursorBlinkingStyle: standaloneEnums.TextEditorCursorBlinkingStyle,
        TextEditorCursorStyle: standaloneEnums.TextEditorCursorStyle,
        TrackedRangeStickiness: standaloneEnums.TrackedRangeStickiness,
        WrappingIndent: standaloneEnums.WrappingIndent,
        InjectedTextCursorStops: standaloneEnums.InjectedTextCursorStops,
        PositionAffinity: standaloneEnums.PositionAffinity,
        ShowLightbulbIconMode: standaloneEnums.ShowLightbulbIconMode,
        // classes
        ConfigurationChangedEvent: ConfigurationChangedEvent,
        BareFontInfo: BareFontInfo,
        FontInfo: FontInfo,
        TextModelResolvedOptions: TextModelResolvedOptions,
        FindMatch: FindMatch,
        ApplyUpdateResult: ApplyUpdateResult,
        EditorZoom: EditorZoom,
        createMultiFileDiffEditor: createMultiFileDiffEditor,
        // vars
        EditorType: EditorType,
        EditorOptions: EditorOptions,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci9zdGFuZGFsb25lRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDakQsT0FBTyx5QkFBeUIsQ0FBQTtBQUNoQyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsYUFBYSxFQUFvQixNQUFNLG1DQUFtQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ2hGLE9BQU8sRUFHTixlQUFlLElBQUkscUJBQXFCLEdBQ3hDLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUNOLGlCQUFpQixFQUNqQix5QkFBeUIsRUFDekIsYUFBYSxHQUNiLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxZQUFZLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFHeEUsT0FBTyxFQUFFLFVBQVUsRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RFLE9BQU8sS0FBSyxTQUFTLE1BQU0sMkJBQTJCLENBQUE7QUFDdEQsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUs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