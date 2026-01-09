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
import { localize } from '../../../../nls.js';
import { Queue } from '../../../../base/common/async.js';
import * as json from '../../../../base/common/json.js';
import * as objects from '../../../../base/common/objects.js';
import { setProperty } from '../../../../base/common/jsonEdit.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditOperation } from '../../../../editor/common/core/editOperation.js';
import { Range } from '../../../../editor/common/core/range.js';
import { Selection } from '../../../../editor/common/core/selection.js';
import { ITextModelService, } from '../../../../editor/common/services/resolverService.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { ITextFileService } from '../../textfile/common/textfiles.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { IUserDataProfileService } from '../../userDataProfile/common/userDataProfile.js';
export const IKeybindingEditingService = createDecorator('keybindingEditingService');
let KeybindingsEditingService = class KeybindingsEditingService extends Disposable {
    constructor(textModelResolverService, textFileService, fileService, userDataProfileService) {
        super();
        this.textModelResolverService = textModelResolverService;
        this.textFileService = textFileService;
        this.fileService = fileService;
        this.userDataProfileService = userDataProfileService;
        this.queue = new Queue();
    }
    addKeybinding(keybindingItem, key, when) {
        return this.queue.queue(() => this.doEditKeybinding(keybindingItem, key, when, true)); // queue up writes to prevent race conditions
    }
    editKeybinding(keybindingItem, key, when) {
        return this.queue.queue(() => this.doEditKeybinding(keybindingItem, key, when, false)); // queue up writes to prevent race conditions
    }
    resetKeybinding(keybindingItem) {
        return this.queue.queue(() => this.doResetKeybinding(keybindingItem)); // queue up writes to prevent race conditions
    }
    removeKeybinding(keybindingItem) {
        return this.queue.queue(() => this.doRemoveKeybinding(keybindingItem)); // queue up writes to prevent race conditions
    }
    async doEditKeybinding(keybindingItem, key, when, add) {
        const reference = await this.resolveAndValidate();
        const model = reference.object.textEditorModel;
        if (add) {
            this.updateKeybinding(keybindingItem, key, when, model, -1);
        }
        else {
            const userKeybindingEntries = json.parse(model.getValue());
            const userKeybindingEntryIndex = this.findUserKeybindingEntryIndex(keybindingItem, userKeybindingEntries);
            this.updateKeybinding(keybindingItem, key, when, model, userKeybindingEntryIndex);
            if (keybindingItem.isDefault && keybindingItem.resolvedKeybinding) {
                this.removeDefaultKeybinding(keybindingItem, model);
            }
        }
        try {
            await this.save();
        }
        finally {
            reference.dispose();
        }
    }
    async doRemoveKeybinding(keybindingItem) {
        const reference = await this.resolveAndValidate();
        const model = reference.object.textEditorModel;
        if (keybindingItem.isDefault) {
            this.removeDefaultKeybinding(keybindingItem, model);
        }
        else {
            this.removeUserKeybinding(keybindingItem, model);
        }
        try {
            return await this.save();
        }
        finally {
            reference.dispose();
        }
    }
    async doResetKeybinding(keybindingItem) {
        const reference = await this.resolveAndValidate();
        const model = reference.object.textEditorModel;
        if (!keybindingItem.isDefault) {
            this.removeUserKeybinding(keybindingItem, model);
            this.removeUnassignedDefaultKeybinding(keybindingItem, model);
        }
        try {
            return await this.save();
        }
        finally {
            reference.dispose();
        }
    }
    save() {
        return this.textFileService.save(this.userDataProfileService.currentProfile.keybindingsResource);
    }
    updateKeybinding(keybindingItem, newKey, when, model, userKeybindingEntryIndex) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        if (userKeybindingEntryIndex !== -1) {
            // Update the keybinding with new key
            this.applyEditsToBuffer(setProperty(model.getValue(), [userKeybindingEntryIndex, 'key'], newKey, {
                tabSize,
                insertSpaces,
                eol,
            })[0], model);
            const edits = setProperty(model.getValue(), [userKeybindingEntryIndex, 'when'], when, {
                tabSize,
                insertSpaces,
                eol,
            });
            if (edits.length > 0) {
                this.applyEditsToBuffer(edits[0], model);
            }
        }
        else {
            // Add the new keybinding with new key
            this.applyEditsToBuffer(setProperty(model.getValue(), [-1], this.asObject(newKey, keybindingItem.command, when, false), { tabSize, insertSpaces, eol })[0], model);
        }
    }
    removeUserKeybinding(keybindingItem, model) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        const userKeybindingEntries = json.parse(model.getValue());
        const userKeybindingEntryIndex = this.findUserKeybindingEntryIndex(keybindingItem, userKeybindingEntries);
        if (userKeybindingEntryIndex !== -1) {
            this.applyEditsToBuffer(setProperty(model.getValue(), [userKeybindingEntryIndex], undefined, {
                tabSize,
                insertSpaces,
                eol,
            })[0], model);
        }
    }
    removeDefaultKeybinding(keybindingItem, model) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        const key = keybindingItem.resolvedKeybinding
            ? keybindingItem.resolvedKeybinding.getUserSettingsLabel()
            : null;
        if (key) {
            const entry = this.asObject(key, keybindingItem.command, keybindingItem.when ? keybindingItem.when.serialize() : undefined, true);
            const userKeybindingEntries = json.parse(model.getValue());
            if (userKeybindingEntries.every((e) => !this.areSame(e, entry))) {
                this.applyEditsToBuffer(setProperty(model.getValue(), [-1], entry, { tabSize, insertSpaces, eol })[0], model);
            }
        }
    }
    removeUnassignedDefaultKeybinding(keybindingItem, model) {
        const { tabSize, insertSpaces } = model.getOptions();
        const eol = model.getEOL();
        const userKeybindingEntries = json.parse(model.getValue());
        const indices = this.findUnassignedDefaultKeybindingEntryIndex(keybindingItem, userKeybindingEntries).reverse();
        for (const index of indices) {
            this.applyEditsToBuffer(setProperty(model.getValue(), [index], undefined, { tabSize, insertSpaces, eol })[0], model);
        }
    }
    findUserKeybindingEntryIndex(keybindingItem, userKeybindingEntries) {
        for (let index = 0; index < userKeybindingEntries.length; index++) {
            const keybinding = userKeybindingEntries[index];
            if (keybinding.command === keybindingItem.command) {
                if (!keybinding.when && !keybindingItem.when) {
                    return index;
                }
                if (keybinding.when && keybindingItem.when) {
                    const contextKeyExpr = ContextKeyExpr.deserialize(keybinding.when);
                    if (contextKeyExpr && contextKeyExpr.serialize() === keybindingItem.when.serialize()) {
                        return index;
                    }
                }
            }
        }
        return -1;
    }
    findUnassignedDefaultKeybindingEntryIndex(keybindingItem, userKeybindingEntries) {
        const indices = [];
        for (let index = 0; index < userKeybindingEntries.length; index++) {
            if (userKeybindingEntries[index].command === `-${keybindingItem.command}`) {
                indices.push(index);
            }
        }
        return indices;
    }
    asObject(key, command, when, negate) {
        const object = { key };
        if (command) {
            object['command'] = negate ? `-${command}` : command;
        }
        if (when) {
            object['when'] = when;
        }
        return object;
    }
    areSame(a, b) {
        if (a.command !== b.command) {
            return false;
        }
        if (a.key !== b.key) {
            return false;
        }
        const whenA = ContextKeyExpr.deserialize(a.when);
        const whenB = ContextKeyExpr.deserialize(b.when);
        if ((whenA && !whenB) || (!whenA && whenB)) {
            return false;
        }
        if (whenA && whenB && !whenA.equals(whenB)) {
            return false;
        }
        if (!objects.equals(a.args, b.args)) {
            return false;
        }
        return true;
    }
    applyEditsToBuffer(edit, model) {
        const startPosition = model.getPositionAt(edit.offset);
        const endPosition = model.getPositionAt(edit.offset + edit.length);
        const range = new Range(startPosition.lineNumber, startPosition.column, endPosition.lineNumber, endPosition.column);
        const currentText = model.getValueInRange(range);
        const editOperation = currentText
            ? EditOperation.replace(range, edit.content)
            : EditOperation.insert(startPosition, edit.content);
        model.pushEditOperations([
            new Selection(startPosition.lineNumber, startPosition.column, startPosition.lineNumber, startPosition.column),
        ], [editOperation], () => []);
    }
    async resolveModelReference() {
        const exists = await this.fileService.exists(this.userDataProfileService.currentProfile.keybindingsResource);
        if (!exists) {
            await this.textFileService.write(this.userDataProfileService.currentProfile.keybindingsResource, this.getEmptyContent(), { encoding: 'utf8' });
        }
        return this.textModelResolverService.createModelReference(this.userDataProfileService.currentProfile.keybindingsResource);
    }
    async resolveAndValidate() {
        // Target cannot be dirty if not writing into buffer
        if (this.textFileService.isDirty(this.userDataProfileService.currentProfile.keybindingsResource)) {
            throw new Error(localize('errorKeybindingsFileDirty', 'Unable to write because the keybindings configuration file has unsaved changes. Please save it first and then try again.'));
        }
        const reference = await this.resolveModelReference();
        const model = reference.object.textEditorModel;
        const EOL = model.getEOL();
        if (model.getValue()) {
            const parsed = this.parse(model);
            if (parsed.parseErrors.length) {
                reference.dispose();
                throw new Error(localize('parseErrors', 'Unable to write to the keybindings configuration file. Please open it to correct errors/warnings in the file and try again.'));
            }
            if (parsed.result) {
                if (!Array.isArray(parsed.result)) {
                    reference.dispose();
                    throw new Error(localize('errorInvalidConfiguration', 'Unable to write to the keybindings configuration file. It has an object which is not of type Array. Please open the file to clean up and try again.'));
                }
            }
            else {
                const content = EOL + '[]';
                this.applyEditsToBuffer({ content, length: content.length, offset: model.getValue().length }, model);
            }
        }
        else {
            const content = this.getEmptyContent();
            this.applyEditsToBuffer({ content, length: content.length, offset: 0 }, model);
        }
        return reference;
    }
    parse(model) {
        const parseErrors = [];
        const result = json.parse(model.getValue(), parseErrors, {
            allowTrailingComma: true,
            allowEmptyContent: true,
        });
        return { result, parseErrors };
    }
    getEmptyContent() {
        return ('// ' +
            localize('emptyKeybindingsHeader', 'Place your key bindings in this file to override the defaults') +
            '\n[\n]');
    }
};
KeybindingsEditingService = __decorate([
    __param(0, ITextModelService),
    __param(1, ITextFileService),
    __param(2, IFileService),
    __param(3, IUserDataProfileService)
], KeybindingsEditingService);
export { KeybindingsEditingService };
registerSingleton(IKeybindingEditingService, KeybindingsEditingService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0VkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2NvbW1vbi9rZXliaW5kaW5nRWRpdGluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sS0FBSyxJQUFJLE1BQU0saUNBQWlDLENBQUE7QUFDdkQsT0FBTyxLQUFLLE9BQU8sTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFakUsT0FBTyxFQUFFLFVBQVUsRUFBYyxNQUFNLHNDQUFzQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXZFLE9BQU8sRUFDTixpQkFBaUIsR0FFakIsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUc1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FB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