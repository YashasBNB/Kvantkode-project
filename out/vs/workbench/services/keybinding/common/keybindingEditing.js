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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ0VkaXRpbmcuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9jb21tb24va2V5YmluZGluZ0VkaXRpbmcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEtBQUssSUFBSSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3ZELE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRWpFLE9BQU8sRUFBRSxVQUFVLEVBQWMsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFDL0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUV2RSxPQUFPLEVBQ04saUJBQWlCLEdBRWpCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFHNUYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRXpGLE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGVBQWUsQ0FDdkQsMEJBQTBCLENBQzFCLENBQUE7QUFzQk0sSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBSXhELFlBQ3FDLHdCQUEyQyxFQUM1QyxlQUFpQyxFQUNyQyxXQUF5QixFQUNkLHNCQUErQztRQUV6RixLQUFLLEVBQUUsQ0FBQTtRQUw2Qiw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQW1CO1FBQzVDLG9CQUFlLEdBQWYsZUFBZSxDQUFrQjtRQUNyQyxnQkFBVyxHQUFYLFdBQVcsQ0FBYztRQUNkLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBeUI7UUFHekYsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBUSxDQUFBO0lBQy9CLENBQUM7SUFFRCxhQUFhLENBQ1osY0FBc0MsRUFDdEMsR0FBVyxFQUNYLElBQXdCO1FBRXhCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUEsQ0FBQyw2Q0FBNkM7SUFDcEksQ0FBQztJQUVELGNBQWMsQ0FDYixjQUFzQyxFQUN0QyxHQUFXLEVBQ1gsSUFBd0I7UUFFeEIsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQSxDQUFDLDZDQUE2QztJQUNySSxDQUFDO0lBRUQsZUFBZSxDQUFDLGNBQXNDO1FBQ3JELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUEsQ0FBQyw2Q0FBNkM7SUFDcEgsQ0FBQztJQUVELGdCQUFnQixDQUFDLGNBQXNDO1FBQ3RELE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUEsQ0FBQyw2Q0FBNkM7SUFDckgsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FDN0IsY0FBc0MsRUFDdEMsR0FBVyxFQUNYLElBQXdCLEVBQ3hCLEdBQVk7UUFFWixNQUFNLFNBQVMsR0FBRyxNQUFNLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1FBQ2pELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFBO1FBQzlDLElBQUksR0FBRyxFQUFFLENBQUM7WUFDVCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDNUQsQ0FBQzthQUFNLENBQUM7WUFDUCxNQUFNLHFCQUFxQixHQUE4QixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1lBQ3JGLE1BQU0sd0JBQXdCLEdBQUcsSUFBSSxDQUFDLDRCQUE0QixDQUNqRSxjQUFjLEVBQ2QscUJBQXFCLENBQ3JCLENBQUE7WUFDRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixDQUFDLENBQUE7WUFDakYsSUFBSSxjQUFjLENBQUMsU0FBUyxJQUFJLGNBQWMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO2dCQUNuRSxJQUFJLENBQUMsdUJBQXVCLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ3BELENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDO1lBQ0osTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDbEIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGtCQUFrQixDQUFDLGNBQXNDO1FBQ3RFLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDakQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDOUMsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDOUIsSUFBSSxDQUFDLHVCQUF1QixDQUFDLGNBQWMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNwRCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDakQsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDekIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sS0FBSyxDQUFDLGlCQUFpQixDQUFDLGNBQXNDO1FBQ3JFLE1BQU0sU0FBUyxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUE7UUFDakQsTUFBTSxLQUFLLEdBQUcsU0FBUyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUE7UUFDOUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUMvQixJQUFJLENBQUMsb0JBQW9CLENBQUMsY0FBYyxFQUFFLEtBQUssQ0FBQyxDQUFBO1lBQ2hELElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDOUQsQ0FBQztRQUNELElBQUksQ0FBQztZQUNKLE9BQU8sTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDekIsQ0FBQztnQkFBUyxDQUFDO1lBQ1YsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ3BCLENBQUM7SUFDRixDQUFDO0lBRU8sSUFBSTtRQUNYLE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ2pHLENBQUM7SUFFTyxnQkFBZ0IsQ0FDdkIsY0FBc0MsRUFDdEMsTUFBYyxFQUNkLElBQXdCLEVBQ3hCLEtBQWlCLEVBQ2pCLHdCQUFnQztRQUVoQyxNQUFNLEVBQUUsT0FBTyxFQUFFLFlBQVksRUFBRSxHQUFHLEtBQUssQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDMUIsSUFBSSx3QkFBd0IsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO1lBQ3JDLHFDQUFxQztZQUNyQyxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsRUFBRSxNQUFNLEVBQUU7Z0JBQ3hFLE9BQU87Z0JBQ1AsWUFBWTtnQkFDWixHQUFHO2FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNMLEtBQUssQ0FDTCxDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLHdCQUF3QixFQUFFLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRTtnQkFDckYsT0FBTztnQkFDUCxZQUFZO2dCQUNaLEdBQUc7YUFDSCxDQUFDLENBQUE7WUFDRixJQUFJLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDekMsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1Asc0NBQXNDO1lBQ3RDLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsV0FBVyxDQUNWLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUNKLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLGNBQWMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUMxRCxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQzlCLENBQUMsQ0FBQyxDQUFDLEVBQ0osS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLG9CQUFvQixDQUFDLGNBQXNDLEVBQUUsS0FBaUI7UUFDckYsTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDcEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzFCLE1BQU0scUJBQXFCLEdBQThCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSx3QkFBd0IsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQ2pFLGNBQWMsRUFDZCxxQkFBcUIsQ0FDckIsQ0FBQTtRQUNELElBQUksd0JBQXdCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNyQyxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyx3QkFBd0IsQ0FBQyxFQUFFLFNBQVMsRUFBRTtnQkFDcEUsT0FBTztnQkFDUCxZQUFZO2dCQUNaLEdBQUc7YUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQ0wsS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLHVCQUF1QixDQUFDLGNBQXNDLEVBQUUsS0FBaUI7UUFDeEYsTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDcEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzFCLE1BQU0sR0FBRyxHQUFHLGNBQWMsQ0FBQyxrQkFBa0I7WUFDNUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxrQkFBa0IsQ0FBQyxvQkFBb0IsRUFBRTtZQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ1AsSUFBSSxHQUFHLEVBQUUsQ0FBQztZQUNULE1BQU0sS0FBSyxHQUE0QixJQUFJLENBQUMsUUFBUSxDQUNuRCxHQUFHLEVBQ0gsY0FBYyxDQUFDLE9BQU8sRUFDdEIsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUNqRSxJQUFJLENBQ0osQ0FBQTtZQUNELE1BQU0scUJBQXFCLEdBQThCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7WUFDckYsSUFBSSxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDO2dCQUNqRSxJQUFJLENBQUMsa0JBQWtCLENBQ3RCLFdBQVcsQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDN0UsS0FBSyxDQUNMLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFTyxpQ0FBaUMsQ0FDeEMsY0FBc0MsRUFDdEMsS0FBaUI7UUFFakIsTUFBTSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDcEQsTUFBTSxHQUFHLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQzFCLE1BQU0scUJBQXFCLEdBQThCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLHlDQUF5QyxDQUM3RCxjQUFjLEVBQ2QscUJBQXFCLENBQ3JCLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWCxLQUFLLE1BQU0sS0FBSyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzdCLElBQUksQ0FBQyxrQkFBa0IsQ0FDdEIsV0FBVyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLFNBQVMsRUFBRSxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFDcEYsS0FBSyxDQUNMLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLDRCQUE0QixDQUNuQyxjQUFzQyxFQUN0QyxxQkFBZ0Q7UUFFaEQsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ25FLE1BQU0sVUFBVSxHQUFHLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQy9DLElBQUksVUFBVSxDQUFDLE9BQU8sS0FBSyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUM7Z0JBQ25ELElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSxDQUFDO29CQUM5QyxPQUFPLEtBQUssQ0FBQTtnQkFDYixDQUFDO2dCQUNELElBQUksVUFBVSxDQUFDLElBQUksSUFBSSxjQUFjLENBQUMsSUFBSSxFQUFFLENBQUM7b0JBQzVDLE1BQU0sY0FBYyxHQUFHLGNBQWMsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFBO29CQUNsRSxJQUFJLGNBQWMsSUFBSSxjQUFjLENBQUMsU0FBUyxFQUFFLEtBQUssY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsRUFBRSxDQUFDO3dCQUN0RixPQUFPLEtBQUssQ0FBQTtvQkFDYixDQUFDO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sQ0FBQyxDQUFDLENBQUE7SUFDVixDQUFDO0lBRU8seUNBQXlDLENBQ2hELGNBQXNDLEVBQ3RDLHFCQUFnRDtRQUVoRCxNQUFNLE9BQU8sR0FBYSxFQUFFLENBQUE7UUFDNUIsS0FBSyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUUsS0FBSyxHQUFHLHFCQUFxQixDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ25FLElBQUkscUJBQXFCLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxLQUFLLElBQUksY0FBYyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7Z0JBQzNFLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUM7UUFDRCxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFTyxRQUFRLENBQ2YsR0FBVyxFQUNYLE9BQXNCLEVBQ3RCLElBQXdCLEVBQ3hCLE1BQWU7UUFFZixNQUFNLE1BQU0sR0FBUSxFQUFFLEdBQUcsRUFBRSxDQUFBO1FBQzNCLElBQUksT0FBTyxFQUFFLENBQUM7WUFDYixNQUFNLENBQUMsU0FBUyxDQUFDLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUE7UUFDckQsQ0FBQztRQUNELElBQUksSUFBSSxFQUFFLENBQUM7WUFDVixNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFBO1FBQ3RCLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFTyxPQUFPLENBQUMsQ0FBMEIsRUFBRSxDQUEwQjtRQUNyRSxJQUFJLENBQUMsQ0FBQyxPQUFPLEtBQUssQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQzdCLE9BQU8sS0FBSyxDQUFBO1FBQ2IsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDckIsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEQsTUFBTSxLQUFLLEdBQUcsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDaEQsSUFBSSxDQUFDLEtBQUssSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM1QyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLEtBQUssSUFBSSxLQUFLLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxLQUFLLENBQUE7UUFDYixDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxJQUFVLEVBQUUsS0FBaUI7UUFDdkQsTUFBTSxhQUFhLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdEQsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNsRSxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FDdEIsYUFBYSxDQUFDLFVBQVUsRUFDeEIsYUFBYSxDQUFDLE1BQU0sRUFDcEIsV0FBVyxDQUFDLFVBQVUsRUFDdEIsV0FBVyxDQUFDLE1BQU0sQ0FDbEIsQ0FBQTtRQUNELE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxhQUFhLEdBQUcsV0FBVztZQUNoQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUM1QyxDQUFDLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxhQUFhLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3BELEtBQUssQ0FBQyxrQkFBa0IsQ0FDdkI7WUFDQyxJQUFJLFNBQVMsQ0FDWixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsTUFBTSxFQUNwQixhQUFhLENBQUMsVUFBVSxFQUN4QixhQUFhLENBQUMsTUFBTSxDQUNwQjtTQUNELEVBQ0QsQ0FBQyxhQUFhLENBQUMsRUFDZixHQUFHLEVBQUUsQ0FBQyxFQUFFLENBQ1IsQ0FBQTtJQUNGLENBQUM7SUFFTyxLQUFLLENBQUMscUJBQXFCO1FBQ2xDLE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQzNDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxjQUFjLENBQUMsbUJBQW1CLENBQzlELENBQUE7UUFDRCxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDYixNQUFNLElBQUksQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUMvQixJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixFQUM5RCxJQUFJLENBQUMsZUFBZSxFQUFFLEVBQ3RCLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUNwQixDQUFBO1FBQ0YsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLHdCQUF3QixDQUFDLG9CQUFvQixDQUN4RCxJQUFJLENBQUMsc0JBQXNCLENBQUMsY0FBYyxDQUFDLG1CQUFtQixDQUM5RCxDQUFBO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxrQkFBa0I7UUFDL0Isb0RBQW9EO1FBQ3BELElBQ0MsSUFBSSxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLHNCQUFzQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUMzRixDQUFDO1lBQ0YsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLDBIQUEwSCxDQUMxSCxDQUNELENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxTQUFTLEdBQUcsTUFBTSxJQUFJLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUNwRCxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQTtRQUM5QyxNQUFNLEdBQUcsR0FBRyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDMUIsSUFBSSxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztZQUN0QixNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQ2hDLElBQUksTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDL0IsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO2dCQUNuQixNQUFNLElBQUksS0FBSyxDQUNkLFFBQVEsQ0FDUCxhQUFhLEVBQ2IsNkhBQTZILENBQzdILENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFDRCxJQUFJLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7b0JBQ25DLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtvQkFDbkIsTUFBTSxJQUFJLEtBQUssQ0FDZCxRQUFRLENBQ1AsMkJBQTJCLEVBQzNCLHFKQUFxSixDQUNySixDQUNELENBQUE7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxNQUFNLE9BQU8sR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFBO2dCQUMxQixJQUFJLENBQUMsa0JBQWtCLENBQ3RCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsTUFBTSxFQUFFLEVBQ3BFLEtBQUssQ0FDTCxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFBO1lBQ3RDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLE1BQU0sRUFBRSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0UsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFTyxLQUFLLENBQUMsS0FBaUI7UUFJOUIsTUFBTSxXQUFXLEdBQXNCLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxXQUFXLEVBQUU7WUFDeEQsa0JBQWtCLEVBQUUsSUFBSTtZQUN4QixpQkFBaUIsRUFBRSxJQUFJO1NBQ3ZCLENBQUMsQ0FBQTtRQUNGLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUVPLGVBQWU7UUFDdEIsT0FBTyxDQUNOLEtBQUs7WUFDTCxRQUFRLENBQ1Asd0JBQXdCLEVBQ3hCLCtEQUErRCxDQUMvRDtZQUNELFFBQVEsQ0FDUixDQUFBO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFyWVkseUJBQXlCO0lBS25DLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxnQkFBZ0IsQ0FBQTtJQUNoQixXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsdUJBQXVCLENBQUE7R0FSYix5QkFBeUIsQ0FxWXJDOztBQUVELGlCQUFpQixDQUFDLHlCQUF5QixFQUFFLHlCQUF5QixvQ0FBNEIsQ0FBQSJ9