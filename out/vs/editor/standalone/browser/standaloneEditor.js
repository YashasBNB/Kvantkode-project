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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZUVkaXRvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL2Jyb3dzZXIvc3RhbmRhbG9uZUVkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDNUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFM0UsT0FBTyxFQUFFLGFBQWEsRUFBb0IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNuRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNoRixPQUFPLEVBR04sZUFBZSxJQUFJLHFCQUFxQixHQUN4QyxNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFDTixpQkFBaUIsRUFDakIseUJBQXlCLEVBQ3pCLGFBQWEsR0FDYixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLFFBQVEsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBR3hFLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEtBQUssU0FBUyxNQUFNLDJCQUEyQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3JFLE9BQU8s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