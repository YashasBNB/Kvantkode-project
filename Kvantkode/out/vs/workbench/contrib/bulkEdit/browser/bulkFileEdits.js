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
var RenameOperation_1;
import { IFileService, } from '../../../../platform/files/common/files.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkingCopyFileService, } from '../../../services/workingCopy/common/workingCopyFileService.js';
import { IUndoRedoService, } from '../../../../platform/undoRedo/common/undoRedo.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ITextFileService } from '../../../services/textfile/common/textfiles.js';
import { Schemas } from '../../../../base/common/network.js';
class Noop {
    constructor() {
        this.uris = [];
    }
    async perform() {
        return this;
    }
    toString() {
        return '(noop)';
    }
}
class RenameEdit {
    constructor(newUri, oldUri, options) {
        this.newUri = newUri;
        this.oldUri = oldUri;
        this.options = options;
        this.type = 'rename';
    }
}
let RenameOperation = RenameOperation_1 = class RenameOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
    }
    get uris() {
        return this._edits.flatMap((edit) => [edit.newUri, edit.oldUri]);
    }
    async perform(token) {
        const moves = [];
        const undoes = [];
        for (const edit of this._edits) {
            // check: not overwriting, but ignoring, and the target file exists
            const skip = edit.options.overwrite === undefined &&
                edit.options.ignoreIfExists &&
                (await this._fileService.exists(edit.newUri));
            if (!skip) {
                moves.push({
                    file: { source: edit.oldUri, target: edit.newUri },
                    overwrite: edit.options.overwrite,
                });
                // reverse edit
                undoes.push(new RenameEdit(edit.oldUri, edit.newUri, edit.options));
            }
        }
        if (moves.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.move(moves, token, this._undoRedoInfo);
        return new RenameOperation_1(undoes, { isUndoing: true }, this._workingCopyFileService, this._fileService);
    }
    toString() {
        return `(rename ${this._edits.map((edit) => `${edit.oldUri} to ${edit.newUri}`).join(', ')})`;
    }
};
RenameOperation = RenameOperation_1 = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService)
], RenameOperation);
class CopyEdit {
    constructor(newUri, oldUri, options) {
        this.newUri = newUri;
        this.oldUri = oldUri;
        this.options = options;
        this.type = 'copy';
    }
}
let CopyOperation = class CopyOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService, _instaService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
        this._instaService = _instaService;
    }
    get uris() {
        return this._edits.flatMap((edit) => [edit.newUri, edit.oldUri]);
    }
    async perform(token) {
        // (1) create copy operations, remove noops
        const copies = [];
        for (const edit of this._edits) {
            //check: not overwriting, but ignoring, and the target file exists
            const skip = edit.options.overwrite === undefined &&
                edit.options.ignoreIfExists &&
                (await this._fileService.exists(edit.newUri));
            if (!skip) {
                copies.push({
                    file: { source: edit.oldUri, target: edit.newUri },
                    overwrite: edit.options.overwrite,
                });
            }
        }
        if (copies.length === 0) {
            return new Noop();
        }
        // (2) perform the actual copy and use the return stats to build undo edits
        const stats = await this._workingCopyFileService.copy(copies, token, this._undoRedoInfo);
        const undoes = [];
        for (let i = 0; i < stats.length; i++) {
            const stat = stats[i];
            const edit = this._edits[i];
            undoes.push(new DeleteEdit(stat.resource, {
                recursive: true,
                folder: this._edits[i].options.folder || stat.isDirectory,
                ...edit.options,
            }, false));
        }
        return this._instaService.createInstance(DeleteOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(copy ${this._edits.map((edit) => `${edit.oldUri} to ${edit.newUri}`).join(', ')})`;
    }
};
CopyOperation = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService),
    __param(4, IInstantiationService)
], CopyOperation);
class CreateEdit {
    constructor(newUri, options, contents) {
        this.newUri = newUri;
        this.options = options;
        this.contents = contents;
        this.type = 'create';
    }
}
let CreateOperation = class CreateOperation {
    constructor(_edits, _undoRedoInfo, _fileService, _workingCopyFileService, _instaService, _textFileService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._fileService = _fileService;
        this._workingCopyFileService = _workingCopyFileService;
        this._instaService = _instaService;
        this._textFileService = _textFileService;
    }
    get uris() {
        return this._edits.map((edit) => edit.newUri);
    }
    async perform(token) {
        const folderCreates = [];
        const fileCreates = [];
        const undoes = [];
        for (const edit of this._edits) {
            if (edit.newUri.scheme === Schemas.untitled) {
                continue; // ignore, will be handled by a later edit
            }
            if (edit.options.overwrite === undefined &&
                edit.options.ignoreIfExists &&
                (await this._fileService.exists(edit.newUri))) {
                continue; // not overwriting, but ignoring, and the target file exists
            }
            if (edit.options.folder) {
                folderCreates.push({ resource: edit.newUri });
            }
            else {
                // If the contents are part of the edit they include the encoding, thus use them. Otherwise get the encoding for a new empty file.
                const encodedReadable = typeof edit.contents !== 'undefined'
                    ? edit.contents
                    : await this._textFileService.getEncodedReadable(edit.newUri);
                fileCreates.push({
                    resource: edit.newUri,
                    contents: encodedReadable,
                    overwrite: edit.options.overwrite,
                });
            }
            undoes.push(new DeleteEdit(edit.newUri, edit.options, !edit.options.folder && !edit.contents));
        }
        if (folderCreates.length === 0 && fileCreates.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.createFolder(folderCreates, token, this._undoRedoInfo);
        await this._workingCopyFileService.create(fileCreates, token, this._undoRedoInfo);
        return this._instaService.createInstance(DeleteOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(create ${this._edits.map((edit) => (edit.options.folder ? `folder ${edit.newUri}` : `file ${edit.newUri} with ${edit.contents?.byteLength || 0} bytes`)).join(', ')})`;
    }
};
CreateOperation = __decorate([
    __param(2, IFileService),
    __param(3, IWorkingCopyFileService),
    __param(4, IInstantiationService),
    __param(5, ITextFileService)
], CreateOperation);
class DeleteEdit {
    constructor(oldUri, options, undoesCreate) {
        this.oldUri = oldUri;
        this.options = options;
        this.undoesCreate = undoesCreate;
        this.type = 'delete';
    }
}
let DeleteOperation = class DeleteOperation {
    constructor(_edits, _undoRedoInfo, _workingCopyFileService, _fileService, _configurationService, _instaService, _logService) {
        this._edits = _edits;
        this._undoRedoInfo = _undoRedoInfo;
        this._workingCopyFileService = _workingCopyFileService;
        this._fileService = _fileService;
        this._configurationService = _configurationService;
        this._instaService = _instaService;
        this._logService = _logService;
    }
    get uris() {
        return this._edits.map((edit) => edit.oldUri);
    }
    async perform(token) {
        // delete file
        const deletes = [];
        const undoes = [];
        for (const edit of this._edits) {
            let fileStat;
            try {
                fileStat = await this._fileService.resolve(edit.oldUri, { resolveMetadata: true });
            }
            catch (err) {
                if (!edit.options.ignoreIfNotExists) {
                    throw new Error(`${edit.oldUri} does not exist and can not be deleted`);
                }
                continue;
            }
            deletes.push({
                resource: edit.oldUri,
                recursive: edit.options.recursive,
                useTrash: !edit.options.skipTrashBin &&
                    this._fileService.hasCapability(edit.oldUri, 4096 /* FileSystemProviderCapabilities.Trash */) &&
                    this._configurationService.getValue('files.enableTrash'),
            });
            // read file contents for undo operation. when a file is too large it won't be restored
            let fileContent;
            let fileContentExceedsMaxSize = false;
            if (!edit.undoesCreate && !edit.options.folder) {
                fileContentExceedsMaxSize =
                    typeof edit.options.maxSize === 'number' && fileStat.size > edit.options.maxSize;
                if (!fileContentExceedsMaxSize) {
                    try {
                        fileContent = await this._fileService.readFile(edit.oldUri);
                    }
                    catch (err) {
                        this._logService.error(err);
                    }
                }
            }
            if (!fileContentExceedsMaxSize) {
                undoes.push(new CreateEdit(edit.oldUri, edit.options, fileContent?.value));
            }
        }
        if (deletes.length === 0) {
            return new Noop();
        }
        await this._workingCopyFileService.delete(deletes, token, this._undoRedoInfo);
        if (undoes.length === 0) {
            return new Noop();
        }
        return this._instaService.createInstance(CreateOperation, undoes, { isUndoing: true });
    }
    toString() {
        return `(delete ${this._edits.map((edit) => edit.oldUri).join(', ')})`;
    }
};
DeleteOperation = __decorate([
    __param(2, IWorkingCopyFileService),
    __param(3, IFileService),
    __param(4, IConfigurationService),
    __param(5, IInstantiationService),
    __param(6, ILogService)
], DeleteOperation);
class FileUndoRedoElement {
    constructor(label, code, operations, confirmBeforeUndo) {
        this.label = label;
        this.code = code;
        this.operations = operations;
        this.confirmBeforeUndo = confirmBeforeUndo;
        this.type = 1 /* UndoRedoElementType.Workspace */;
        this.resources = operations.flatMap((op) => op.uris);
    }
    async undo() {
        await this._reverse();
    }
    async redo() {
        await this._reverse();
    }
    async _reverse() {
        for (let i = 0; i < this.operations.length; i++) {
            const op = this.operations[i];
            const undo = await op.perform(CancellationToken.None);
            this.operations[i] = undo;
        }
    }
    toString() {
        return this.operations.map((op) => String(op)).join(', ');
    }
}
let BulkFileEdits = class BulkFileEdits {
    constructor(_label, _code, _undoRedoGroup, _undoRedoSource, _confirmBeforeUndo, _progress, _token, _edits, _instaService, _undoRedoService) {
        this._label = _label;
        this._code = _code;
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._confirmBeforeUndo = _confirmBeforeUndo;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._instaService = _instaService;
        this._undoRedoService = _undoRedoService;
    }
    async apply() {
        const undoOperations = [];
        const undoRedoInfo = { undoRedoGroupId: this._undoRedoGroup.id };
        const edits = [];
        for (const edit of this._edits) {
            if (edit.newResource && edit.oldResource && !edit.options?.copy) {
                edits.push(new RenameEdit(edit.newResource, edit.oldResource, edit.options ?? {}));
            }
            else if (edit.newResource && edit.oldResource && edit.options?.copy) {
                edits.push(new CopyEdit(edit.newResource, edit.oldResource, edit.options ?? {}));
            }
            else if (!edit.newResource && edit.oldResource) {
                edits.push(new DeleteEdit(edit.oldResource, edit.options ?? {}, false));
            }
            else if (edit.newResource && !edit.oldResource) {
                edits.push(new CreateEdit(edit.newResource, edit.options ?? {}, await edit.options.contents));
            }
        }
        if (edits.length === 0) {
            return [];
        }
        const groups = [];
        groups[0] = [edits[0]];
        for (let i = 1; i < edits.length; i++) {
            const edit = edits[i];
            const lastGroup = groups.at(-1);
            if (lastGroup?.[0].type === edit.type) {
                lastGroup.push(edit);
            }
            else {
                groups.push([edit]);
            }
        }
        for (const group of groups) {
            if (this._token.isCancellationRequested) {
                break;
            }
            let op;
            switch (group[0].type) {
                case 'rename':
                    op = this._instaService.createInstance(RenameOperation, group, undoRedoInfo);
                    break;
                case 'copy':
                    op = this._instaService.createInstance(CopyOperation, group, undoRedoInfo);
                    break;
                case 'delete':
                    op = this._instaService.createInstance(DeleteOperation, group, undoRedoInfo);
                    break;
                case 'create':
                    op = this._instaService.createInstance(CreateOperation, group, undoRedoInfo);
                    break;
            }
            if (op) {
                const undoOp = await op.perform(this._token);
                undoOperations.push(undoOp);
            }
            this._progress.report(undefined);
        }
        const undoRedoElement = new FileUndoRedoElement(this._label, this._code, undoOperations, this._confirmBeforeUndo);
        this._undoRedoService.pushElement(undoRedoElement, this._undoRedoGroup, this._undoRedoSource);
        return undoRedoElement.resources;
    }
};
BulkFileEdits = __decorate([
    __param(8, IInstantiationService),
    __param(9, IUndoRedoService)
], BulkFileEdits);
export { BulkFileEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0ZpbGVFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9idWxrRmlsZUVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQ04sWUFBWSxHQUlaLE1BQU0sNENBQTRDLENBQUE7QUFFbkQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLHVCQUF1QixHQU92QixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8sRUFHTixnQkFBZ0IsR0FHaEIsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHcEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBTzVELE1BQU0sSUFBSTtJQUFWO1FBQ1UsU0FBSSxHQUFHLEVBQUUsQ0FBQTtJQU9uQixDQUFDO0lBTkEsS0FBSyxDQUFDLE9BQU87UUFDWixPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFDRCxRQUFRO1FBQ1AsT0FBTyxRQUFRLENBQUE7SUFDaEIsQ0FBQztDQUNEO0FBRUQsTUFBTSxVQUFVO0lBRWYsWUFDVSxNQUFXLEVBQ1gsTUFBVyxFQUNYLE9BQWlDO1FBRmpDLFdBQU0sR0FBTixNQUFNLENBQUs7UUFDWCxXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQ1gs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