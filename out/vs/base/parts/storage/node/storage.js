/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { timeout } from '../../../common/async.js';
import { Event } from '../../../common/event.js';
import { mapToString, setToString } from '../../../common/map.js';
import { basename } from '../../../common/path.js';
import { Promises } from '../../../node/pfs.js';
export class SQLiteStorageDatabase {
    static { this.IN_MEMORY_PATH = ':memory:'; }
    get onDidChangeItemsExternal() {
        return Event.None;
    } // since we are the only client, there can be no external changes
    static { this.BUSY_OPEN_TIMEOUT = 2000; } // timeout in ms to retry when opening DB fails with SQLITE_BUSY
    static { this.MAX_HOST_PARAMETERS = 256; } // maximum number of parameters within a statement
    constructor(path, options = Object.create(null)) {
        this.path = path;
        this.name = basename(this.path);
        this.logger = new SQLiteStorageDatabaseLogger(options.logging);
        this.whenConnected = this.connect(this.path);
    }
    async getItems() {
        const connection = await this.whenConnected;
        const items = new Map();
        const rows = await this.all(connection, 'SELECT * FROM ItemTable');
        rows.forEach((row) => items.set(row.key, row.value));
        if (this.logger.isTracing) {
            this.logger.trace(`[storage ${this.name}] getItems(): ${items.size} rows`);
        }
        return items;
    }
    async updateItems(request) {
        const connection = await this.whenConnected;
        return this.doUpdateItems(connection, request);
    }
    doUpdateItems(connection, request) {
        if (this.logger.isTracing) {
            this.logger.trace(`[storage ${this.name}] updateItems(): insert(${request.insert ? mapToString(request.insert) : '0'}), delete(${request.delete ? setToString(request.delete) : '0'})`);
        }
        return this.transaction(connection, () => {
            const toInsert = request.insert;
            const toDelete = request.delete;
            // INSERT
            if (toInsert && toInsert.size > 0) {
                const keysValuesChunks = [];
                keysValuesChunks.push([]); // seed with initial empty chunk
                // Split key/values into chunks of SQLiteStorageDatabase.MAX_HOST_PARAMETERS
                // so that we can efficiently run the INSERT with as many HOST parameters as possible
                let currentChunkIndex = 0;
                toInsert.forEach((value, key) => {
                    let keyValueChunk = keysValuesChunks[currentChunkIndex];
                    if (keyValueChunk.length > SQLiteStorageDatabase.MAX_HOST_PARAMETERS) {
                        currentChunkIndex++;
                        keyValueChunk = [];
                        keysValuesChunks.push(keyValueChunk);
                    }
                    keyValueChunk.push(key, value);
                });
                keysValuesChunks.forEach((keysValuesChunk) => {
                    this.prepare(connection, `INSERT INTO ItemTable VALUES ${new Array(keysValuesChunk.length / 2).fill('(?,?)').join(',')}`, (stmt) => stmt.run(keysValuesChunk), () => {
                        const keys = [];
                        let length = 0;
                        toInsert.forEach((value, key) => {
                            keys.push(key);
                            length += value.length;
                        });
                        return `Keys: ${keys.join(', ')} Length: ${length}`;
                    });
                });
            }
            // DELETE
            if (toDelete && toDelete.size) {
                const keysChunks = [];
                keysChunks.push([]); // seed with initial empty chunk
                // Split keys into chunks of SQLiteStorageDatabase.MAX_HOST_PARAMETERS
                // so that we can efficiently run the DELETE with as many HOST parameters
                // as possible
                let currentChunkIndex = 0;
                toDelete.forEach((key) => {
                    let keyChunk = keysChunks[currentChunkIndex];
                    if (keyChunk.length > SQLiteStorageDatabase.MAX_HOST_PARAMETERS) {
                        currentChunkIndex++;
                        keyChunk = [];
                        keysChunks.push(keyChunk);
                    }
                    keyChunk.push(key);
                });
                keysChunks.forEach((keysChunk) => {
                    this.prepare(connection, `DELETE FROM ItemTable WHERE key IN (${new Array(keysChunk.length).fill('?').join(',')})`, (stmt) => stmt.run(keysChunk), () => {
                        const keys = [];
                        toDelete.forEach((key) => {
                            keys.push(key);
                        });
                        return `Keys: ${keys.join(', ')}`;
                    });
                });
            }
        });
    }
    async optimize() {
        this.logger.trace(`[storage ${this.name}] vacuum()`);
        const connection = await this.whenConnected;
        return this.exec(connection, 'VACUUM');
    }
    async close(recovery) {
        this.logger.trace(`[storage ${this.name}] close()`);
        const connection = await this.whenConnected;
        return this.doClose(connection, recovery);
    }
    doClose(connection, recovery) {
        return new Promise((resolve, reject) => {
            connection.db.close((closeError) => {
                if (closeError) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] close(): ${closeError}`);
                }
                // Return early if this storage was created only in-memory
                // e.g. when running tests we do not need to backup.
                if (this.path === SQLiteStorageDatabase.IN_MEMORY_PATH) {
                    return resolve();
                }
                // If the DB closed successfully and we are not running in-memory
                // and the DB did not get errors during runtime, make a backup
                // of the DB so that we can use it as fallback in case the actual
                // DB becomes corrupt in the future.
                if (!connection.isErroneous && !connection.isInMemory) {
                    return this.backup().then(resolve, (error) => {
                        this.logger.error(`[storage ${this.name}] backup(): ${error}`);
                        return resolve(); // ignore failing backup
                    });
                }
                // Recovery: if we detected errors while using the DB or we are using
                // an inmemory DB (as a fallback to not being able to open the DB initially)
                // and we have a recovery function provided, we recreate the DB with this
                // data to recover all known data without loss if possible.
                if (typeof recovery === 'function') {
                    // Delete the existing DB. If the path does not exist or fails to
                    // be deleted, we do not try to recover anymore because we assume
                    // that the path is no longer writeable for us.
                    return fs.promises
                        .unlink(this.path)
                        .then(() => {
                        // Re-open the DB fresh
                        return this.doConnect(this.path).then((recoveryConnection) => {
                            const closeRecoveryConnection = () => {
                                return this.doClose(recoveryConnection, undefined /* do not attempt to recover again */);
                            };
                            // Store items
                            return this.doUpdateItems(recoveryConnection, { insert: recovery() }).then(() => closeRecoveryConnection(), (error) => {
                                // In case of an error updating items, still ensure to close the connection
                                // to prevent SQLITE_BUSY errors when the connection is reestablished
                                closeRecoveryConnection();
                                return Promise.reject(error);
                            });
                        });
                    })
                        .then(resolve, reject);
                }
                // Finally without recovery we just reject
                return reject(closeError || new Error('Database has errors or is in-memory without recovery option'));
            });
        });
    }
    backup() {
        const backupPath = this.toBackupPath(this.path);
        return Promises.copy(this.path, backupPath, { preserveSymlinks: false });
    }
    toBackupPath(path) {
        return `${path}.backup`;
    }
    async checkIntegrity(full) {
        this.logger.trace(`[storage ${this.name}] checkIntegrity(full: ${full})`);
        const connection = await this.whenConnected;
        const row = await this.get(connection, full ? 'PRAGMA integrity_check' : 'PRAGMA quick_check');
        const integrity = full ? row['integrity_check'] : row['quick_check'];
        if (connection.isErroneous) {
            return `${integrity} (last error: ${connection.lastError})`;
        }
        if (connection.isInMemory) {
            return `${integrity} (in-memory!)`;
        }
        return integrity;
    }
    async connect(path, retryOnBusy = true) {
        this.logger.trace(`[storage ${this.name}] open(${path}, retryOnBusy: ${retryOnBusy})`);
        try {
            return await this.doConnect(path);
        }
        catch (error) {
            this.logger.error(`[storage ${this.name}] open(): Unable to open DB due to ${error}`);
            // SQLITE_BUSY should only arise if another process is locking the same DB we want
            // to open at that time. This typically never happens because a DB connection is
            // limited per window. However, in the event of a window reload, it may be possible
            // that the previous connection was not properly closed while the new connection is
            // already established.
            //
            // In this case we simply wait for some time and retry once to establish the connection.
            //
            if (error.code === 'SQLITE_BUSY' && retryOnBusy) {
                await timeout(SQLiteStorageDatabase.BUSY_OPEN_TIMEOUT);
                return this.connect(path, false /* not another retry */);
            }
            // Otherwise, best we can do is to recover from a backup if that exists, as such we
            // move the DB to a different filename and try to load from backup. If that fails,
            // a new empty DB is being created automatically.
            //
            // The final fallback is to use an in-memory DB which should only happen if the target
            // folder is really not writeable for us.
            //
            try {
                await fs.promises.unlink(path);
                try {
                    await Promises.rename(this.toBackupPath(path), path, false /* no retry */);
                }
                catch (error) {
                    // ignore
                }
                return await this.doConnect(path);
            }
            catch (error) {
                this.logger.error(`[storage ${this.name}] open(): Unable to use backup due to ${error}`);
                // In case of any error to open the DB, use an in-memory
                // DB so that we always have a valid DB to talk to.
                return this.doConnect(SQLiteStorageDatabase.IN_MEMORY_PATH);
            }
        }
    }
    handleSQLiteError(connection, msg) {
        connection.isErroneous = true;
        connection.lastError = msg;
        this.logger.error(msg);
    }
    doConnect(path) {
        return new Promise((resolve, reject) => {
            import('@vscode/sqlite3').then((sqlite3) => {
                const ctor = this.logger.isTracing
                    ? sqlite3.default.verbose().Database
                    : sqlite3.default.Database;
                const connection = {
                    db: new ctor(path, (error) => {
                        if (error) {
                            return connection.db &&
                                error.code !==
                                    'SQLITE_CANTOPEN' /* https://github.com/TryGhost/node-sqlite3/issues/1617 */
                                ? connection.db.close(() => reject(error))
                                : reject(error);
                        }
                        // The following exec() statement serves two purposes:
                        // - create the DB if it does not exist yet
                        // - validate that the DB is not corrupt (the open() call does not throw otherwise)
                        return this.exec(connection, [
                            'PRAGMA user_version = 1;',
                            'CREATE TABLE IF NOT EXISTS ItemTable (key TEXT UNIQUE ON CONFLICT REPLACE, value BLOB)',
                        ].join('')).then(() => {
                            return resolve(connection);
                        }, (error) => {
                            return connection.db.close(() => reject(error));
                        });
                    }),
                    isInMemory: path === SQLiteStorageDatabase.IN_MEMORY_PATH,
                };
                // Errors
                connection.db.on('error', (error) => this.handleSQLiteError(connection, `[storage ${this.name}] Error (event): ${error}`));
                // Tracing
                if (this.logger.isTracing) {
                    connection.db.on('trace', (sql) => this.logger.trace(`[storage ${this.name}] Trace (event): ${sql}`));
                }
            }, reject);
        });
    }
    exec(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.exec(sql, (error) => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] exec(): ${error}`);
                    return reject(error);
                }
                return resolve();
            });
        });
    }
    get(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.get(sql, (error, row) => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] get(): ${error}`);
                    return reject(error);
                }
                return resolve(row);
            });
        });
    }
    all(connection, sql) {
        return new Promise((resolve, reject) => {
            connection.db.all(sql, (error, rows) => {
                if (error) {
                    this.handleSQLiteError(connection, `[storage ${this.name}] all(): ${error}`);
                    return reject(error);
                }
                return resolve(rows);
            });
        });
    }
    transaction(connection, transactions) {
        return new Promise((resolve, reject) => {
            connection.db.serialize(() => {
                connection.db.run('BEGIN TRANSACTION');
                transactions();
                connection.db.run('END TRANSACTION', (error) => {
                    if (error) {
                        this.handleSQLiteError(connection, `[storage ${this.name}] transaction(): ${error}`);
                        return reject(error);
                    }
                    return resolve();
                });
            });
        });
    }
    prepare(connection, sql, runCallback, errorDetails) {
        const stmt = connection.db.prepare(sql);
        const statementErrorListener = (error) => {
            this.handleSQLiteError(connection, `[storage ${this.name}] prepare(): ${error} (${sql}). Details: ${errorDetails()}`);
        };
        stmt.on('error', statementErrorListener);
        runCallback(stmt);
        stmt.finalize((error) => {
            if (error) {
                statementErrorListener(error);
            }
            stmt.removeListener('error', statementErrorListener);
        });
    }
}
class SQLiteStorageDatabaseLogger {
    // to reduce lots of output, require an environment variable to enable tracing
    // this helps when running with --verbose normally where the storage tracing
    // might hide useful output to look at
    static { this.VSCODE_TRACE_STORAGE = 'VSCODE_TRACE_STORAGE'; }
    constructor(options) {
        if (options &&
            typeof options.logTrace === 'function' &&
            process.env[SQLiteStorageDatabaseLogger.VSCODE_TRACE_STORAGE]) {
            this.logTrace = options.logTrace;
        }
        if (options && typeof options.logError === 'function') {
            this.logError = options.logError;
        }
    }
    get isTracing() {
        return !!this.logTrace;
    }
    trace(msg) {
        this.logTrace?.(msg);
    }
    error(error) {
        this.logError?.(error);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvc3RvcmFnZS9ub2RlL3N0b3JhZ2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2xELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFxQi9DLE1BQU0sT0FBTyxxQkFBcUI7YUFDakIsbUJBQWMsR0FBRyxVQUFVLENBQUE7SUFFM0MsSUFBSSx3QkFBd0I7UUFDM0IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFBO0lBQ2xCLENBQUMsQ0FBQyxpRUFBaUU7YUFFM0Msc0JBQWlCLEdBQUcsSUFBSSxDQUFBLEdBQUMsZ0VBQWdFO2FBQ3pGLHdCQUFtQixHQUFHLEdBQUcsQ0FBQSxHQUFDLGtEQUFrRDtJQVFwRyxZQUNrQixJQUFZLEVBQzdCLFVBQXlDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDO1FBRDNDLFNBQUksR0FBSixJQUFJLENBQVE7UUFHN0IsSUFBSSxDQUFDLElBQUksR0FBRyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQy9CLElBQUksQ0FBQyxNQUFNLEdBQUcsSUFBSSwyQkFBMkIsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDOUQsSUFBSSxDQUFDLGFBQWEsR0FBRyxJQUFJLENBQUMsT0FB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