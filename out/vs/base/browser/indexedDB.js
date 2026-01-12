/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { toErrorMessage } from '../common/errorMessage.js';
import { ErrorNoTelemetry, getErrorMessage } from '../common/errors.js';
import { mark } from '../common/performance.js';
class MissingStoresError extends Error {
    constructor(db) {
        super('Missing stores');
        this.db = db;
    }
}
export class DBClosedError extends Error {
    constructor(dbName) {
        super(`IndexedDB database '${dbName}' is closed.`);
        this.code = 'DBClosed';
    }
}
export class IndexedDB {
    static async create(name, version, stores) {
        const database = await IndexedDB.openDatabase(name, version, stores);
        return new IndexedDB(database, name);
    }
    static async openDatabase(name, version, stores) {
        mark(`code/willOpenDatabase/${name}`);
        try {
            return await IndexedDB.doOpenDatabase(name, version, stores);
        }
        catch (err) {
            if (err instanceof MissingStoresError) {
                console.info(`Attempting to recreate the IndexedDB once.`, name);
                try {
                    // Try to delete the db
                    await IndexedDB.deleteDatabase(err.db);
                }
                catch (error) {
                    console.error(`Error while deleting the IndexedDB`, getErrorMessage(error));
                    throw error;
                }
                return await IndexedDB.doOpenDatabase(name, version, stores);
            }
            throw err;
        }
        finally {
            mark(`code/didOpenDatabase/${name}`);
        }
    }
    static doOpenDatabase(name, version, stores) {
        return new Promise((c, e) => {
            const request = indexedDB.open(name, version);
            request.onerror = () => e(request.error);
            request.onsuccess = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        console.error(`Error while opening IndexedDB. Could not find '${store}'' object store`);
                        e(new MissingStoresError(db));
                        return;
                    }
                }
                c(db);
            };
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const store of stores) {
                    if (!db.objectStoreNames.contains(store)) {
                        db.createObjectStore(store);
                    }
                }
            };
        });
    }
    static deleteDatabase(database) {
        return new Promise((c, e) => {
            // Close any opened connections
            database.close();
            // Delete the db
            const deleteRequest = indexedDB.deleteDatabase(database.name);
            deleteRequest.onerror = (err) => e(deleteRequest.error);
            deleteRequest.onsuccess = () => c();
        });
    }
    constructor(database, name) {
        this.name = name;
        this.database = null;
        this.pendingTransactions = [];
        this.database = database;
    }
    hasPendingTransactions() {
        return this.pendingTransactions.length > 0;
    }
    close() {
        if (this.pendingTransactions.length) {
            this.pendingTransactions
                .splice(0, this.pendingTransactions.length)
                .forEach((transaction) => transaction.abort());
        }
        this.database?.close();
        this.database = null;
    }
    async runInTransaction(store, transactionMode, dbRequestFn) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, transactionMode);
        this.pendingTransactions.push(transaction);
        return new Promise((c, e) => {
            transaction.oncomplete = () => {
                if (Array.isArray(request)) {
                    c(request.map((r) => r.result));
                }
                else {
                    c(request.result);
                }
            };
            transaction.onerror = () => e(transaction.error
                ? ErrorNoTelemetry.fromError(transaction.error)
                : new ErrorNoTelemetry('unknown error'));
            transaction.onabort = () => e(transaction.error
                ? ErrorNoTelemetry.fromError(transaction.error)
                : new ErrorNoTelemetry('unknown error'));
            const request = dbRequestFn(transaction.objectStore(store));
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
    async getKeyValues(store, isValid) {
        if (!this.database) {
            throw new DBClosedError(this.name);
        }
        const transaction = this.database.transaction(store, 'readonly');
        this.pendingTransactions.push(transaction);
        return new Promise((resolve) => {
            const items = new Map();
            const objectStore = transaction.objectStore(store);
            // Open a IndexedDB Cursor to iterate over key/values
            const cursor = objectStore.openCursor();
            if (!cursor) {
                return resolve(items); // this means the `ItemTable` was empty
            }
            // Iterate over rows of `ItemTable` until the end
            cursor.onsuccess = () => {
                if (cursor.result) {
                    // Keep cursor key/value in our map
                    if (isValid(cursor.result.value)) {
                        items.set(cursor.result.key.toString(), cursor.result.value);
                    }
                    // Advance cursor to next row
                    cursor.result.continue();
                }
                else {
                    resolve(items); // reached end of table
                }
            };
            // Error handlers
            const onError = (error) => {
                console.error(`IndexedDB getKeyValues(): ${toErrorMessage(error, true)}`);
                resolve(items);
            };
            cursor.onerror = () => onError(cursor.error);
            transaction.onerror = () => onError(transaction.error);
        }).finally(() => this.pendingTransactions.splice(this.pendingTransactions.indexOf(transaction), 1));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXhlZERCLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvaW5kZXhlZERCLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsZUFBZSxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDdkUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRS9DLE1BQU0sa0JBQW1CLFNBQVEsS0FBSztJQUNyQyxZQUFxQixFQUFlO1FBQ25DLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFBO1FBREgsT0FBRSxHQUFGLEVBQUUsQ0FBYTtJQUVwQyxDQUFDO0NBQ0Q7QUFFRCxNQUFNLE9BQU8sYUFBYyxTQUFRLEtBQUs7SUFFdkMsWUFBWSxNQUFjO1FBQ3pCLEtBQUssQ0FBQyx1QkFBdUIsTUFBTSxjQUFjLENBQUMsQ0FBQTtRQUYxQyxTQUFJLEdBQUcsVUFBVSxDQUFBO0lBRzFCLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTyxTQUFTO0lBQ3JCLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUNsQixJQUFZLEVBQ1osT0FBMkIsRUFDM0IsTUFBZ0I7UUFFaEIsTUFBTSxRQUFRLEdBQUcsTUFBTSxTQUFTLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7UUFDcEUsT0FBTyxJQUFJLFNBQVMsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLE1BQU0sQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUNoQyxJQUFZLEVBQ1osT0FBMkIsRUFDM0IsTUFBZ0I7UUFFaEIsSUFBSSxDQUFDLHlCQUF5QixJQUFJLEVBQUUsQ0FB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