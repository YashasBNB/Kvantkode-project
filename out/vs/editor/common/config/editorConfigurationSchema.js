/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { diffEditorDefaultOptions } from './diffEditor.js';
import { editorOptionsRegistry } from './editorOptions.js';
import { EDITOR_MODEL_DEFAULTS } from '../core/textModelDefaults.js';
import * as nls from '../../../nls.js';
import { Extensions, } from '../../../platform/configuration/common/configurationRegistry.js';
import { Registry } from '../../../platform/registry/common/platform.js';
export const editorConfigurationBaseNode = Object.freeze({
    id: 'editor',
    order: 5,
    type: 'object',
    title: nls.localize('editorConfigurationTitle', 'Editor'),
    scope: 6 /* ConfigurationScope.LANGUAGE_OVERRIDABLE */,
});
const editorConfiguration = {
    ...editorConfigurationBaseNode,
    properties: {
        'editor.tabSize': {
            type: 'number',
            default: EDITOR_MODEL_DEFAULTS.tabSize,
            minimum: 1,
            maximum: 16,
            markdownDescription: nls.localize('tabSize', 'The number of spaces a tab is equal to. This setting is overridden based on the file contents when {0} is on.', '`#editor.detectIndentation#`'),
        },
        'editor.indentSize': {
            anyOf: [
                {
                    type: 'string',
                    enum: ['tabSize'],
                },
                {
                    type: 'number',
                    minimum: 1,
                },
            ],
            default: 'tabSize',
            markdownDescription: nls.localize('indentSize', 'The number of spaces used for indentation or `"tabSize"` to use the value from `#editor.tabSize#`. This setting is overridden based on the file contents when `#editor.detectIndentation#` is on.'),
        },
        'editor.insertSpaces': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.insertSpaces,
            markdownDescription: nls.localize('insertSpaces', 'Insert spaces when pressing `Tab`. This setting is overridden based on the file contents when {0} is on.', '`#editor.detectIndentation#`'),
        },
        'editor.detectIndentation': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.detectIndentation,
            markdownDescription: nls.localize('detectIndentation', 'Controls whether {0} and {1} will be automatically detected when a file is opened based on the file contents.', '`#editor.tabSize#`', '`#editor.insertSpaces#`'),
        },
        'editor.trimAutoWhitespace': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
            description: nls.localize('trimAutoWhitespace', 'Remove trailing auto inserted whitespace.'),
        },
        'editor.largeFileOptimizations': {
            type: 'boolean',
            default: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
            description: nls.localize('largeFileOptimizations', 'Special handling for large files to disable certain memory intensive features.'),
        },
        'editor.wordBasedSuggestions': {
            enum: ['off', 'currentDocument', 'matchingDocuments', 'allDocuments'],
            default: 'matchingDocuments',
            enumDescriptions: [
                nls.localize('wordBasedSuggestions.off', 'Turn off Word Based Suggestions.'),
                nls.localize('wordBasedSuggestions.currentDocument', 'Only suggest words from the active document.'),
                nls.localize('wordBasedSuggestions.matchingDocuments', 'Suggest words from all open documents of the same language.'),
                nls.localize('wordBasedSuggestions.allDocuments', 'Suggest words from all open documents.'),
            ],
            description: nls.localize('wordBasedSuggestions', 'Controls whether completions should be computed based on words in the document and from which documents they are computed.'),
        },
        'editor.semanticHighlighting.enabled': {
            enum: [true, false, 'configuredByTheme'],
            enumDescriptions: [
                nls.localize('semanticHighlighting.true', 'Semantic highlighting enabled for all color themes.'),
                nls.localize('semanticHighlighting.false', 'Semantic highlighting disabled for all color themes.'),
                nls.localize('semanticHighlighting.configuredByTheme', "Semantic highlighting is configured by the current color theme's `semanticHighlighting` setting."),
            ],
            default: 'configuredByTheme',
            description: nls.localize('semanticHighlighting.enabled', 'Controls whether the semanticHighlighting is shown for the languages that support it.'),
        },
        'editor.stablePeek': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('stablePeek', 'Keep peek editors open even when double-clicking their content or when hitting `Escape`.'),
        },
        'editor.maxTokenizationLineLength': {
            type: 'integer',
            default: 20_000,
            description: nls.localize('maxTokenizationLineLength', 'Lines above this length will not be tokenized for performance reasons'),
        },
        'editor.experimental.asyncTokenization': {
            type: 'boolean',
            default: true,
            description: nls.localize('editor.experimental.asyncTokenization', 'Controls whether the tokenization should happen asynchronously on a web worker.'),
            tags: ['experimental'],
        },
        'editor.experimental.asyncTokenizationLogging': {
            type: 'boolean',
            default: false,
            description: nls.localize('editor.experimental.asyncTokenizationLogging', 'Controls whether async tokenization should be logged. For debugging only.'),
        },
        'editor.experimental.asyncTokenizationVerification': {
            type: 'boolean',
            default: false,
            description: nls.localize('editor.experimental.asyncTokenizationVerification', 'Controls whether async tokenization should be verified against legacy background tokenization. Might slow down tokenization. For debugging only.'),
            tags: ['experimental'],
        },
        'editor.experimental.treeSitterTelemetry': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.treeSitterTelemetry', 'Controls whether tree sitter parsing should be turned on and telemetry collected. Setting `editor.experimental.preferTreeSitter` for specific languages will take precedence.'),
            tags: ['experimental', 'onExP'],
        },
        'editor.experimental.preferTreeSitter.css': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.css', 'Controls whether tree sitter parsing should be turned on for css. This will take precedence over `editor.experimental.treeSitterTelemetry` for css.'),
            tags: ['experimental', 'onExP'],
        },
        'editor.experimental.preferTreeSitter.typescript': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.typescript', 'Controls whether tree sitter parsing should be turned on for typescript. This will take precedence over `editor.experimental.treeSitterTelemetry` for typescript.'),
            tags: ['experimental', 'onExP'],
        },
        'editor.experimental.preferTreeSitter.ini': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.ini', 'Controls whether tree sitter parsing should be turned on for ini. This will take precedence over `editor.experimental.treeSitterTelemetry` for ini.'),
            tags: ['experimental', 'onExP'],
        },
        'editor.experimental.preferTreeSitter.regex': {
            type: 'boolean',
            default: false,
            markdownDescription: nls.localize('editor.experimental.preferTreeSitter.regex', 'Controls whether tree sitter parsing should be turned on for regex. This will take precedence over `editor.experimental.treeSitterTelemetry` for regex.'),
            tags: ['experimental', 'onExP'],
        },
        'editor.language.brackets': {
            type: ['array', 'null'],
            default: null, // We want to distinguish the empty array from not configured.
            description: nls.localize('schema.brackets', 'Defines the bracket symbols that increase or decrease the indentation.'),
            items: {
                type: 'array',
                items: [
                    {
                        type: 'string',
                        description: nls.localize('schema.openBracket', 'The opening bracket character or string sequence.'),
                    },
                    {
                        type: 'string',
                        description: nls.localize('schema.closeBracket', 'The closing bracket character or string sequence.'),
                    },
                ],
            },
        },
        'editor.language.colorizedBracketPairs': {
            type: ['array', 'null'],
            default: null, // We want to distinguish the empty array from not configured.
            description: nls.localize('schema.colorizedBracketPairs', 'Defines the bracket pairs that are colorized by their nesting level if bracket pair colorization is enabled.'),
            items: {
                type: 'array',
                items: [
                    {
                        type: 'string',
                        description: nls.localize('schema.openBracket', 'The opening bracket character or string sequence.'),
                    },
                    {
                        type: 'string',
                        description: nls.localize('schema.closeBracket', 'The closing bracket character or string sequence.'),
                    },
                ],
            },
        },
        'diffEditor.maxComputationTime': {
            type: 'number',
            default: diffEditorDefaultOptions.maxComputationTime,
            description: nls.localize('maxComputationTime', 'Timeout in milliseconds after which diff computation is cancelled. Use 0 for no timeout.'),
        },
        'diffEditor.maxFileSize': {
            type: 'number',
            default: diffEditorDefaultOptions.maxFileSize,
            description: nls.localize('maxFileSize', 'Maximum file size in MB for which to compute diffs. Use 0 for no limit.'),
        },
        'diffEditor.renderSideBySide': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderSideBySide,
            description: nls.localize('sideBySide', 'Controls whether the diff editor shows the diff side by side or inline.'),
        },
        'diffEditor.renderSideBySideInlineBreakpoint': {
            type: 'number',
            default: diffEditorDefaultOptions.renderSideBySideInlineBreakpoint,
            description: nls.localize('renderSideBySideInlineBreakpoint', 'If the diff editor width is smaller than this value, the inline view is used.'),
        },
        'diffEditor.useInlineViewWhenSpaceIsLimited': {
            type: 'boolean',
            default: diffEditorDefaultOptions.useInlineViewWhenSpaceIsLimited,
            description: nls.localize('useInlineViewWhenSpaceIsLimited', 'If enabled and the editor width is too small, the inline view is used.'),
        },
        'diffEditor.renderMarginRevertIcon': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderMarginRevertIcon,
            description: nls.localize('renderMarginRevertIcon', 'When enabled, the diff editor shows arrows in its glyph margin to revert changes.'),
        },
        'diffEditor.renderGutterMenu': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderGutterMenu,
            description: nls.localize('renderGutterMenu', 'When enabled, the diff editor shows a special gutter for revert and stage actions.'),
        },
        'diffEditor.ignoreTrimWhitespace': {
            type: 'boolean',
            default: diffEditorDefaultOptions.ignoreTrimWhitespace,
            description: nls.localize('ignoreTrimWhitespace', 'When enabled, the diff editor ignores changes in leading or trailing whitespace.'),
        },
        'diffEditor.renderIndicators': {
            type: 'boolean',
            default: diffEditorDefaultOptions.renderIndicators,
            description: nls.localize('renderIndicators', 'Controls whether the diff editor shows +/- indicators for added/removed changes.'),
        },
        'diffEditor.codeLens': {
            type: 'boolean',
            default: diffEditorDefaultOptions.diffCodeLens,
            description: nls.localize('codeLens', 'Controls whether the editor shows CodeLens.'),
        },
        'diffEditor.wordWrap': {
            type: 'string',
            enum: ['off', 'on', 'inherit'],
            default: diffEditorDefaultOptions.diffWordWrap,
            markdownEnumDescriptions: [
                nls.localize('wordWrap.off', 'Lines will never wrap.'),
                nls.localize('wordWrap.on', 'Lines will wrap at the viewport width.'),
                nls.localize('wordWrap.inherit', 'Lines will wrap according to the {0} setting.', '`#editor.wordWrap#`'),
            ],
        },
        'diffEditor.diffAlgorithm': {
            type: 'string',
            enum: ['legacy', 'advanced'],
            default: diffEditorDefaultOptions.diffAlgorithm,
            markdownEnumDescriptions: [
                nls.localize('diffAlgorithm.legacy', 'Uses the legacy diffing algorithm.'),
                nls.localize('diffAlgorithm.advanced', 'Uses the advanced diffing algorithm.'),
            ],
        },
        'diffEditor.hideUnchangedRegions.enabled': {
            type: 'boolean',
            default: diffEditorDefaultOptions.hideUnchangedRegions.enabled,
            markdownDescription: nls.localize('hideUnchangedRegions.enabled', 'Controls whether the diff editor shows unchanged regions.'),
        },
        'diffEditor.hideUnchangedRegions.revealLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.revealLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.revealLineCount', 'Controls how many lines are used for unchanged regions.'),
            minimum: 1,
        },
        'diffEditor.hideUnchangedRegions.minimumLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.minimumLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.minimumLineCount', 'Controls how many lines are used as a minimum for unchanged regions.'),
            minimum: 1,
        },
        'diffEditor.hideUnchangedRegions.contextLineCount': {
            type: 'integer',
            default: diffEditorDefaultOptions.hideUnchangedRegions.contextLineCount,
            markdownDescription: nls.localize('hideUnchangedRegions.contextLineCount', 'Controls how many lines are used as context when comparing unchanged regions.'),
            minimum: 1,
        },
        'diffEditor.experimental.showMoves': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.showMoves,
            markdownDescription: nls.localize('showMoves', 'Controls whether the diff editor should show detected code moves.'),
        },
        'diffEditor.experimental.showEmptyDecorations': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.showEmptyDecorations,
            description: nls.localize('showEmptyDecorations', 'Controls whether the diff editor shows empty decorations to see where characters got inserted or deleted.'),
        },
        'diffEditor.experimental.useTrueInlineView': {
            type: 'boolean',
            default: diffEditorDefaultOptions.experimental.useTrueInlineView,
            description: nls.localize('useTrueInlineView', 'If enabled and the editor uses the inline view, word changes are rendered inline.'),
        },
    },
};
function isConfigurationPropertySchema(x) {
    return typeof x.type !== 'undefined' || typeof x.anyOf !== 'undefined';
}
// Add properties from the Editor Option Registry
for (const editorOption of editorOptionsRegistry) {
    const schema = editorOption.schema;
    if (typeof schema !== 'undefined') {
        if (isConfigurationPropertySchema(schema)) {
            // This is a single schema contribution
            editorConfiguration.properties[`editor.${editorOption.name}`] = schema;
        }
        else {
            for (const key in schema) {
                if (Object.hasOwnProperty.call(schema, key)) {
                    editorConfiguration.properties[key] = schema[key];
                }
            }
        }
    }
}
let cachedEditorConfigurationKeys = null;
function getEditorConfigurationKeys() {
    if (cachedEditorConfigurationKeys === null) {
        cachedEditorConfigurationKeys = Object.create(null);
        Object.keys(editorConfiguration.properties).forEach((prop) => {
            cachedEditorConfigurationKeys[prop] = true;
        });
    }
    return cachedEditorConfigurationKeys;
}
export function isEditorConfigurationKey(key) {
    const editorConfigurationKeys = getEditorConfigurationKeys();
    return editorConfigurationKeys[`editor.${key}`] || false;
}
export function isDiffEditorConfigurationKey(key) {
    const editorConfigurationKeys = getEditorConfigurationKeys();
    return editorConfigurationKeys[`diffEditor.${key}`] || false;
}
const configurationRegistry = Registry.as(Extensions.Configuration);
configurationRegistry.registerConfiguration(editorConfiguration);
export async function registerEditorFontConfigurations(getFontSnippets) {
    const editorKeysWithFont = ['editor.fontFamily'];
    const fontSnippets = await getFontSnippets();
    for (const key of editorKeysWithFont) {
        if (editorConfiguration.properties && editorConfiguration.properties[key]) {
            editorConfiguration.properties[key].defaultSnippets = fontSnippets;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yQ29uZmlndXJhdGlvblNjaGVtYS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vY29uZmlnL2VkaXRvckNvbmZpZ3VyYXRpb25TY2hlbWEudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDMUQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDcEUsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQkFBaUIsQ0FBQTtBQUN0QyxPQUFPLEVBRU4sVUFBVSxHQUlWLE1BQU0saUVBQWlFLENBQUE7QUFDeEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBRXhFLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQXFCO0lBQzVFLEVBQUUsRUFBRSxRQUFRO0lBQ1osS0FBSyxFQUFFLENBQUM7SUFDUixJQUFJLEVBQUUsUUFBUTtJQUNkLEtBQUssRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFFBQVEsQ0FBQztJQUN6RCxLQUFLLGlEQUF5QztDQUM5QyxDQUFDLENBQUE7QUFFRixNQUFNLG1CQUFtQixHQUF1QjtJQUMvQyxHQUFHLDJCQUEyQjtJQUM5QixVQUFVLEVBQUU7UUFDWCxnQkFBZ0IsRUFBRTtZQUNqQixJQUFJLEVBQUUsUUFBUTtZQUNkLE9BQU8sRUFBRSxxQkFBcUIsQ0FBQyxPQUFPO1lBQ3RDLE9BQU8sRUFBRSxDQUFDO1lBQ1YsT0FBTyxFQUFFLEVBQUU7WUFDWCxtQkFBbUIsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUNoQyxTQUFTLEVBQ1QsK0dB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