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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWlncmF0ZU9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL2NvbmZpZy9taWdyYXRlT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVloRyxNQUFNLE9BQU8sc0JBQXNCO2FBQ3BCLFVBQUssR0FBNkIsRUFBRSxDQUFBO0lBRWxELFlBQ2lCLEdBQVcsRUFDWCxPQUE0RTtRQUQ1RSxRQUFHLEdBQUgsR0FBRyxDQUFRO1FBQ1gsWUFBTyxHQUFQLE9BQU8sQ0FBcUU7SUFDMUYsQ0FBQztJQUVKLEtBQUssQ0FBQyxPQUFZO1FBQ2pCLE1BQU0sS0FBSyxHQUFHLHNCQUFzQixDQUFDLEtBQUssQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzdELE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBVyxFQUFFLEVBQUUsQ0FBQyxzQkFBc0IsQ0FBQyxLQUFLLENBQUMsT0FBTyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ3hFLE1BQU0sS0FBSyxHQUFHLENBQUMsR0FBVyxFQUFFLEtBQVUsRUFBRSxFQUFFLENBQUMsc0JBQXNCLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDN0YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFBO0lBQ2pDLENBQUM7SUFFTyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQVcsRUFBRSxHQUFXO1FBQzVDLElBQUksT0FBTyxNQUFNLEtBQUssV0FBVyxFQUFFLENBQUM7WUFDbkMsT0FBTyxTQUFTLENBQUE7UUFDakIsQ0FBQztRQUVELE1BQU0sYUFBYSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENB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