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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnVsa0ZpbGVFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvYnVsa0ZpbGVFZGl0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUNOLFlBQVksR0FJWixNQUFNLDRDQUE0QyxDQUFBO0FBRW5ELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFDTix1QkFBdUIsR0FPdkIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBR04sZ0JBQWdCLEdBR2hCLE1BQU0sa0RBQWtELENBQUE7QUFFekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR3BFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQU81RCxNQUFNLElBQUk7SUFBVjtRQUNVLFNBQUksR0FBRyxFQUFFLENBQUE7SUFPbkIsQ0FBQztJQU5BLEtBQUssQ0FBQyxPQUFPO1FBQ1osT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBQ0QsUUFBUTtRQUNQLE9BQU8sUUFBUSxDQUFBO0lBQ2hCLENBQUM7Q0FDRDtBQUVELE1BQU0sVUFBVTtJQUVmLFlBQ1UsTUFBVyxFQUNYLE1BQVcsRUFDWCxPQUFpQztRQUZqQyxXQUFNLEdBQU4sTUFBTSxDQUFLO1FBQ1gsV0FBTSxHQUFOLE1BQU0sQ0FBSztRQUNYLFlBQU8sR0FBUCxPQUFPLENBQTBCO1FB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