/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class EditorSettingMigration {
    static { this.items = []; }
    constructor(key, migrate) {
        this.key = key;
        this.migrate = migrate;
    }
    apply(options) {
        const value = EditorSettingMigration._read(options, this.key);
        const read = (key) => EditorSettingMigration._read(options, key);
        const write = (key, value) => EditorSettingMigration._write(options, key, value);
        this.migrate(value, read, write);
    }
    static _read(source, key) {
        if (typeof source === 'undefined') {
            return undefined;
        }
        const firstDotIndex = key.indexOf('.');
        if (firstDotIndex >= 0) {
            const firstSegment = key.substring(0, firstDotIndex);
            return this._read(source[firstSegment], key.substring(firstDotIndex + 1));
        }
        return source[key];
    }
    static _write(target, key, value) {
        const firstDotIndex = key.indexOf('.');
        if (firstDotIndex >= 0) {
            const firstSegment = key.substring(0, firstDotIndex);
            target[firstSegment] = target[firstSegment] || {};
            this._write(target[firstSegment], key.substring(firstDotIndex + 1), value);
            return;
        }
        target[key] = value;
    }
}
function registerEditorSettingMigration(key, migrate) {
    EditorSettingMigration.items.push(new EditorSettingMigration(key, migrate));
}
function registerSimpleEditorSettingMigration(key, values) {
    registerEditorSettingMigration(key, (value, read, write) => {
        if (typeof value !== 'undefined') {
            for (const [oldValue, newValue] of values) {
                if (value === oldValue) {
                    write(key, newValue);
                    return;
                }
            }
        }
    });
}
/**
 * Compatibility with old options
 */
export function migrateOptions(options) {
    EditorSettingMigration.items.forEach((migration) => migration.apply(options));
}
registerSimpleEditorSettingMigration('wordWrap', [
    [true, 'on'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('lineNumbers', [
    [true, 'on'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('cursorBlinking', [['visible', 'solid']]);
registerSimpleEditorSettingMigration('renderWhitespace', [
    [true, 'boundary'],
    [false, 'none'],
]);
registerSimpleEditorSettingMigration('renderLineHighlight', [
    [true, 'line'],
    [false, 'none'],
]);
registerSimpleEditorSettingMigration('acceptSuggestionOnEnter', [
    [true, 'on'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('tabCompletion', [
    [false, 'off'],
    [true, 'onlySnippets'],
]);
registerSimpleEditorSettingMigration('hover', [
    [true, { enabled: true }],
    [false, { enabled: false }],
]);
registerSimpleEditorSettingMigration('parameterHints', [
    [true, { enabled: true }],
    [false, { enabled: false }],
]);
registerSimpleEditorSettingMigration('autoIndent', [
    [false, 'advanced'],
    [true, 'full'],
]);
registerSimpleEditorSettingMigration('matchBrackets', [
    [true, 'always'],
    [false, 'never'],
]);
registerSimpleEditorSettingMigration('renderFinalNewline', [
    [true, 'on'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('cursorSmoothCaretAnimation', [
    [true, 'on'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('occurrencesHighlight', [
    [true, 'singleFile'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('wordBasedSuggestions', [
    [true, 'matchingDocuments'],
    [false, 'off'],
]);
registerSimpleEditorSettingMigration('defaultColorDecorators', [
    [true, 'auto'],
    [false, 'never'],
]);
registerEditorSettingMigration('autoClosingBrackets', (value, read, write) => {
    if (value === false) {
        write('autoClosingBrackets', 'never');
        if (typeof read('autoClosingQuotes') === 'undefined') {
            write('autoClosingQuotes', 'never');
        }
        if (typeof read('autoSurround') === 'undefined') {
            write('autoSurround', 'never');
        }
    }
});
registerEditorSettingMigration('renderIndentGuides', (value, read, write) => {
    if (typeof value !== 'undefined') {
        write('renderIndentGuides', undefined);
        if (typeof read('guides.indentation') === 'undefined') {
            write('guides.indentation', !!value);
        }
    }
});
registerEditorSettingMigration('highlightActiveIndentGuide', (value, read, write) => {
    if (typeof value !== 'undefined') {
        write('highlightActiveIndentGuide', undefined);
        if (typeof read('guides.highlightActiveIndentation') === 'undefined') {
            write('guides.highlightActiveIndentation', !!value);
        }
    }
});
const suggestFilteredTypesMapping = {
    method: 'showMethods',
    function: 'showFunctions',
    constructor: 'showConstructors',
    deprecated: 'showDeprecated',
    field: 'showFields',
    variable: 'showVariables',
    class: 'showClasses',
    struct: 'showStructs',
    interface: 'showInterfaces',
    module: 'showModules',
    property: 'showProperties',
    event: 'showEvents',
    operator: 'showOperators',
    unit: 'showUnits',
    value: 'showValues',
    constant: 'showConstants',
    enum: 'showEnums',
    enumMember: 'showEnumMembers',
    keyword: 'showKeywords',
    text: 'showWords',
    color: 'showColors',
    file: 'showFiles',
    reference: 'showReferences',
    folder: 'showFolders',
    typeParameter: 'showTypeParameters',
    snippet: 'showSnippets',
};
registerEditorSettingMigration('suggest.filteredTypes', (value, read, write) => {
    if (value && typeof value === 'object') {
        for (const entry of Object.entries(suggestFilteredTypesMapping)) {
            const v = value[entry[0]];
            if (v === false) {
                if (typeof read(`suggest.${entry[1]}`) === 'undefined') {
                    write(`suggest.${entry[1]}`, false);
                }
            }
        }
        write('suggest.filteredTypes', undefined);
    }
});
registerEditorSettingMigration('quickSuggestions', (input, read, write) => {
    if (typeof input === 'boolean') {
        const value = input ? 'on' : 'off';
        const newValue = { comments: value, strings: value, other: value };
        write('quickSuggestions', newValue);
    }
});
// Sticky Scroll
registerEditorSettingMigration('experimental.stickyScroll.enabled', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('experimental.stickyScroll.enabled', undefined);
        if (typeof read('stickyScroll.enabled') === 'undefined') {
            write('stickyScroll.enabled', value);
        }
    }
});
registerEditorSettingMigration('experimental.stickyScroll.maxLineCount', (value, read, write) => {
    if (typeof value === 'number') {
        write('experimental.stickyScroll.maxLineCount', undefined);
        if (typeof read('stickyScroll.maxLineCount') === 'undefined') {
            write('stickyScroll.maxLineCount', value);
        }
    }
});
// Code Actions on Save
registerEditorSettingMigration('codeActionsOnSave', (value, read, write) => {
    if (value && typeof value === 'object') {
        let toBeModified = false;
        const newValue = {};
        for (const entry of Object.entries(value)) {
            if (typeof entry[1] === 'boolean') {
                toBeModified = true;
                newValue[entry[0]] = entry[1] ? 'explicit' : 'never';
            }
            else {
                newValue[entry[0]] = entry[1];
            }
        }
        if (toBeModified) {
            write(`codeActionsOnSave`, newValue);
        }
    }
});
// Migrate Quick Fix Settings
registerEditorSettingMigration('codeActionWidget.includeNearbyQuickfixes', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('codeActionWidget.includeNearbyQuickfixes', undefined);
        if (typeof read('codeActionWidget.includeNearbyQuickFixes') === 'undefined') {
            write('codeActionWidget.includeNearbyQuickFixes', value);
        }
    }
});
// Migrate the lightbulb settings
registerEditorSettingMigration('lightbulb.enabled', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('lightbulb.enabled', value ? undefined : 'off');
    }
});
// NES Code Shifting
registerEditorSettingMigration('inlineSuggest.edits.codeShifting', (value, read, write) => {
    if (typeof value === 'boolean') {
        write('inlineSuggest.edits.codeShifting', undefined);
        write('inlineSuggest.edits.allowCodeShifting', value ? 'always' : 'never');
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0ZU9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci9jb25maWcvbWlncmF0ZU9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFZaEcsTUFBTSxPQUFPLHNCQUFzQjthQUNwQixVQUFLLEdBQTZCLEVBQUUsQ0FBQTtJQUVsRCxZQUNpQixHQUFXLEVBQ1gsT0FBNEU7UUFENUUsUUFBRyxHQUFILEdBQUcsQ0FBUTtRQUNYLFlBQU8sR0FBUCxPQUFPLENBQXFFO0lBQzFGLENBQUM7SUFFSixLQUFLLENBQUMsT0FBWTtRQUNqQixNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUM3RCxNQUFNLElBQUksR0FBRyxDQUFDLEdBQVcsRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsS0FBSyxDQUFDLE9BQU8sRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUN4RSxNQUFNLEtBQUssR0FBRyxDQUFDLEdBQVcsRUFBRSxLQUFVLEVBQUUsRUFBRSxDQUFDLHNCQUFzQixDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQzdGLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNqQyxDQUFDO0lBRU8sTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFXLEVBQUUsR0FBVztRQUM1QyxJQUFJLE9BQU8sTUFBTSxLQUFLLFdBQVcsRUFBRSxDQUFDO1lBQ25DLE9BQU8sU0FBUyxDQUFBO1FBQ2pCLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3RDLElBQUksYUFBYSxJQUFJ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