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
import { Sequencer } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { toErrorMessage } from '../../../../base/common/errorMessage.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { revive } from '../../../../base/common/marshalling.js';
import { joinPath } from '../../../../base/common/resources.js';
import { localize } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService, toFileOperationResult, } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
import { ChatModel, normalizeSerializableChatData, } from './chatModel.js';
const maxPersistedSessions = 25;
const ChatIndexStorageKey = 'chat.ChatSessionStore.index';
// const ChatTransferIndexStorageKey = 'ChatSessionStore.transferIndex';
let ChatSessionStore = class ChatSessionStore extends Disposable {
    constructor(fileService, environmentService, logService, workspaceContextService, telemetryService, storageService, lifecycleService, userDataProfilesService) {
        super();
        this.fileService = fileService;
        this.environmentService = environmentService;
        this.logService = logService;
        this.workspaceContextService = workspaceContextService;
        this.telemetryService = telemetryService;
        this.storageService = storageService;
        this.lifecycleService = lifecycleService;
        this.userDataProfilesService = userDataProfilesService;
        // private readonly transferredSessionStorageRoot: URI;
        this.storeQueue = new Sequencer();
        this.shuttingDown = false;
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        const workspaceId = this.workspaceContextService.getWorkspace().id;
        this.storageRoot = isEmptyWindow
            ? joinPath(this.userDataProfilesService.defaultProfile.globalStorageHome, 'emptyWindowChatSessions')
            : joinPath(this.environmentService.workspaceStorageHome, workspaceId, 'chatSessions');
        this.previousEmptyWindowStorageRoot = isEmptyWindow
            ? joinPath(this.environmentService.workspaceStorageHome, 'no-workspace', 'chatSessions')
            : undefined;
        // TODO tmpdir
        // this.transferredSessionStorageRoot = joinPath(this.environmentService.workspaceStorageHome, 'transferredChatSessions');
        this._register(this.lifecycleService.onWillShutdown((e) => {
            this.shuttingDown = true;
            if (!this.storeTask) {
                return;
            }
            e.join(this.storeTask, {
                id: 'join.chatSessionStore',
                label: localize('join.chatSessionStore', 'Saving chat history'),
            });
        }));
    }
    async storeSessions(sessions) {
        if (this.shuttingDown) {
            // Don't start this task if we missed the chance to block shutdown
            return;
        }
        try {
            this.storeTask = this.storeQueue.queue(async () => {
                try {
                    await Promise.all(sessions.map((session) => this.writeSession(session)));
                    await this.trimEntries();
                    await this.flushIndex();
                }
                catch (e) {
                    this.reportError('storeSessions', 'Error storing chat sessions', e);
                }
            });
            await this.storeTask;
        }
        finally {
            this.storeTask = undefined;
        }
    }
    // async storeTransferSession(transferData: IChatTransfer, session: ISerializableChatData): Promise<void> {
    // 	try {
    // 		const content = JSON.stringify(session, undefined, 2);
    // 		await this.fileService.writeFile(this.transferredSessionStorageRoot, VSBuffer.fromString(content));
    // 	} catch (e) {
    // 		this.reportError('sessionWrite', 'Error writing chat session', e);
    // 		return;
    // 	}
    // 	const index = this.getTransferredSessionIndex();
    // 	index[transferData.toWorkspace.toString()] = transferData;
    // 	try {
    // 		this.storageService.store(ChatTransferIndexStorageKey, index, StorageScope.PROFILE, StorageTarget.MACHINE);
    // 	} catch (e) {
    // 		this.reportError('storeTransferSession', 'Error storing chat transfer session', e);
    // 	}
    // }
    // private getTransferredSessionIndex(): IChatTransferIndex {
    // 	try {
    // 		const data: IChatTransferIndex = this.storageService.getObject(ChatTransferIndexStorageKey, StorageScope.PROFILE, {});
    // 		return data;
    // 	} catch (e) {
    // 		this.reportError('getTransferredSessionIndex', 'Error reading chat transfer index', e);
    // 		return {};
    // 	}
    // }
    async writeSession(session) {
        try {
            const index = this.internalGetIndex();
            const storageLocation = this.getStorageLocation(session.sessionId);
            const content = JSON.stringify(session, undefined, 2);
            await this.fileService.writeFile(storageLocation, VSBuffer.fromString(content));
            // Write succeeded, update index
            index.entries[session.sessionId] = getSessionMetadata(session);
        }
        catch (e) {
            this.reportError('sessionWrite', 'Error writing chat session', e);
        }
    }
    async flushIndex() {
        const index = this.internalGetIndex();
        try {
            this.storageService.store(ChatIndexStorageKey, index, this.getIndexStorageScope(), 1 /* StorageTarget.MACHINE */);
        }
        catch (e) {
            // Only if JSON.stringify fails, AFAIK
            this.reportError('indexWrite', 'Error writing index', e);
        }
    }
    getIndexStorageScope() {
        const workspace = this.workspaceContextService.getWorkspace();
        const isEmptyWindow = !workspace.configuration && workspace.folders.length === 0;
        return isEmptyWindow ? -1 /* StorageScope.APPLICATION */ : 1 /* StorageScope.WORKSPACE */;
    }
    async trimEntries() {
        const index = this.internalGetIndex();
        const entries = Object.entries(index.entries)
            .sort((a, b) => b[1].lastMessageDate - a[1].lastMessageDate)
            .map(([id]) => id);
        if (entries.length > maxPersistedSessions) {
            const entriesToDelete = entries.slice(maxPersistedSessions);
            for (const entry of entriesToDelete) {
                delete index.entries[entry];
            }
            this.logService.trace(`ChatSessionStore: Trimmed ${entriesToDelete.length} old chat sessions from index`);
        }
    }
    async internalDeleteSession(sessionId) {
        const index = this.internalGetIndex();
        if (!index.entries[sessionId]) {
            return;
        }
        const storageLocation = this.getStorageLocation(sessionId);
        try {
            await this.fileService.del(storageLocation);
        }
        catch (e) {
            if (toFileOperationResult(e) !== 1 /* FileOperationResult.FILE_NOT_FOUND */) {
                this.reportError('sessionDelete', 'Error deleting chat session', e);
            }
        }
        finally {
            delete index.entries[sessionId];
        }
    }
    hasSessions() {
        return Object.keys(this.internalGetIndex().entries).length > 0;
    }
    isSessionEmpty(sessionId) {
        const index = this.internalGetIndex();
        return index.entries[sessionId]?.isEmpty ?? true;
    }
    async deleteSession(sessionId) {
        await this.storeQueue.queue(async () => {
            await this.internalDeleteSession(sessionId);
            await this.flushIndex();
        });
    }
    async clearAllSessions() {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            const entries = Object.keys(index.entries);
            this.logService.info(`ChatSessionStore: Clearing ${entries.length} chat sessions`);
            await Promise.all(entries.map((entry) => this.internalDeleteSession(entry)));
            await this.flushIndex();
        });
    }
    async setSessionTitle(sessionId, title) {
        await this.storeQueue.queue(async () => {
            const index = this.internalGetIndex();
            if (index.entries[sessionId]) {
                index.entries[sessionId].title = title;
            }
        });
    }
    reportError(reasonForTelemetry, message, error) {
        this.logService.error(`ChatSessionStore: ` + message, toErrorMessage(error));
        const fileOperationReason = error && toFileOperationResult(error);
        this.telemetryService.publicLog2('chatSessionStoreError', {
            reason: reasonForTelemetry,
            fileOperationReason: fileOperationReason ?? -1,
        });
    }
    internalGetIndex() {
        if (this.indexCache) {
            return this.indexCache;
        }
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        if (!data) {
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
        try {
            const index = JSON.parse(data);
            if (isChatSessionIndex(index)) {
                // Success
                this.indexCache = index;
            }
            else {
                this.reportError('invalidIndexFormat', `Invalid index format: ${data}`);
                this.indexCache = { version: 1, entries: {} };
            }
            return this.indexCache;
        }
        catch (e) {
            // Only if JSON.parse fails
            this.reportError('invalidIndexJSON', `Index corrupt: ${data}`, e);
            this.indexCache = { version: 1, entries: {} };
            return this.indexCache;
        }
    }
    async getIndex() {
        return this.storeQueue.queue(async () => {
            return this.internalGetIndex().entries;
        });
    }
    logIndex() {
        const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
        this.logService.info('ChatSessionStore index: ', data);
    }
    async migrateDataIfNeeded(getInitialData) {
        await this.storeQueue.queue(async () => {
            const data = this.storageService.get(ChatIndexStorageKey, this.getIndexStorageScope(), undefined);
            const needsMigrationFromStorageService = !data;
            if (needsMigrationFromStorageService) {
                const initialData = getInitialData();
                if (initialData) {
                    await this.migrate(initialData);
                }
            }
        });
    }
    async migrate(initialData) {
        const numSessions = Object.keys(initialData).length;
        this.logService.info(`ChatSessionStore: Migrating ${numSessions} chat sessions from storage service to file system`);
        await Promise.all(Object.values(initialData).map(async (session) => {
            await this.writeSession(session);
        }));
        await this.flushIndex();
    }
    async readSession(sessionId) {
        return await this.storeQueue.queue(async () => {
            let rawData;
            const storageLocation = this.getStorageLocation(sessionId);
            try {
                rawData = (await this.fileService.readFile(storageLocation)).value.toString();
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId}`, e);
                if (toFileOperationResult(e) === 1 /* FileOperationResult.FILE_NOT_FOUND */ &&
                    this.previousEmptyWindowStorageRoot) {
                    rawData = await this.readSessionFromPreviousLocation(sessionId);
                }
                if (!rawData) {
                    return undefined;
                }
            }
            try {
                // TODO Copied from ChatService.ts, cleanup
                const session = revive(JSON.parse(rawData)); // Revive serialized URIs in session data
                // Revive serialized markdown strings in response data
                for (const request of session.requests) {
                    if (Array.isArray(request.response)) {
                        request.response = request.response.map((response) => {
                            if (typeof response === 'string') {
                                return new MarkdownString(response);
                            }
                            return response;
                        });
                    }
                    else if (typeof request.response === 'string') {
                        request.response = [new MarkdownString(request.response)];
                    }
                }
                return normalizeSerializableChatData(session);
            }
            catch (err) {
                this.reportError('malformedSession', `Malformed session data in ${storageLocation.fsPath}: [${rawData.substring(0, 20)}${rawData.length > 20 ? '...' : ''}]`, err);
                return undefined;
            }
        });
    }
    async readSessionFromPreviousLocation(sessionId) {
        let rawData;
        if (this.previousEmptyWindowStorageRoot) {
            const storageLocation2 = joinPath(this.previousEmptyWindowStorageRoot, `${sessionId}.json`);
            try {
                rawData = (await this.fileService.readFile(storageLocation2)).value.toString();
                this.logService.info(`ChatSessionStore: Read chat session ${sessionId} from previous location`);
            }
            catch (e) {
                this.reportError('sessionReadFile', `Error reading chat session file ${sessionId} from previous location`, e);
                return undefined;
            }
        }
        return rawData;
    }
    getStorageLocation(chatSessionId) {
        return joinPath(this.storageRoot, `${chatSessionId}.json`);
    }
    getChatStorageFolder() {
        return this.storageRoot;
    }
};
ChatSessionStore = __decorate([
    __param(0, IFileService),
    __param(1, IEnvironmentService),
    __param(2, ILogService),
    __param(3, IWorkspaceContextService),
    __param(4, ITelemetryService),
    __param(5, IStorageService),
    __param(6, ILifecycleService),
    __param(7, IUserDataProfilesService)
], ChatSessionStore);
export { ChatSessionStore };
function isChatSessionEntryMetadata(obj) {
    return (!!obj &&
        typeof obj === 'object' &&
        typeof obj.sessionId === 'string' &&
        typeof obj.title === 'string' &&
        typeof obj.lastMessageDate === 'number');
}
// TODO if we update the index version:
// Don't throw away index when moving backwards in VS Code version. Try to recover it. But this scenario is hard.
function isChatSessionIndex(data) {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    const index = data;
    if (index.version !== 1) {
        return false;
    }
    if (typeof index.entries !== 'object' || index.entries === null) {
        return false;
    }
    for (const key in index.entries) {
        if (!isChatSessionEntryMetadata(index.entries[key])) {
            return false;
        }
    }
    return true;
}
function getSessionMetadata(session) {
    const title = session instanceof ChatModel
        ? session.title || localize('newChat', 'New Chat')
        : (session.customTitle ?? ChatModel.getDefaultTitle(session.requests));
    return {
        sessionId: session.sessionId,
        title,
        lastMessageDate: session.lastMessageDate,
        isImported: session.isImported,
        initialLocation: session.initialLocation,
        isEmpty: session instanceof ChatModel
            ? session.getRequests().length === 0
            : session.requests.length === 0,
    };
}
// type IChatTransferDto = Dto<IChatTransfer>;
/**
 * Map of destination workspace URI to chat transfer data
 */
// type IChatTransferIndex = Record<string, IChatTransferDto>;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdFNlc3Npb25TdG9yZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL2NoYXRTZXNzaW9uU3RvcmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9ELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUM1RixPQUFPLEVBRU4sWUFBWSxFQUNaLHFCQUFxQixHQUNyQixNQUFNLDRDQUE0QyxDQUFBO0FBQ25ELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGlC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