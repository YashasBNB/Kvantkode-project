/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as fs from 'fs';
import { deepStrictEqual, ok, strictEqual } from 'assert';
import { tmpdir } from 'os';
import { timeout } from '../../../../common/async.js';
import { Emitter } from '../../../../common/event.js';
import { join } from '../../../../common/path.js';
import { isWindows } from '../../../../common/platform.js';
import { URI } from '../../../../common/uri.js';
import { generateUuid } from '../../../../common/uuid.js';
import { Promises } from '../../../../node/pfs.js';
import { isStorageItemsChangeEvent, Storage, } from '../../common/storage.js';
import { SQLiteStorageDatabase } from '../../node/storage.js';
import { runWithFakedTimers } from '../../../../test/common/timeTravelScheduler.js';
import { flakySuite, getRandomTestPath } from '../../../../test/node/testUtils.js';
flakySuite('Storage Library', function () {
    let testDir;
    setup(function () {
        testDir = getRandomTestPath(tmpdir(), 'vsctests', 'storagelibrary');
        return fs.promises.mkdir(testDir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testDir);
    });
    test('objects', () => {
        return runWithFakedTimers({}, async function () {
            const storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
            await storage.init();
            ok(!storage.getObject('foo'));
            const uri = URI.file('path/to/folder');
            storage.set('foo', { bar: uri });
            deepStrictEqual(storage.getObject('foo'), { bar: uri });
            await storage.close();
        });
    });
    test('basics', () => {
        return runWithFakedTimers({}, async function () {
            const storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
            await storage.init();
            // Empty fallbacks
            strictEqual(storage.get('foo', 'bar'), 'bar');
            strictEqual(storage.getNumber('foo', 55), 55);
            strictEqual(storage.getBoolean('foo', true), true);
            deepStrictEqual(storage.getObject('foo', { bar: 'baz' }), { bar: 'baz' });
            let changes = new Set();
            storage.onDidChangeStorage((e) => {
                changes.add(e.key);
            });
            await storage.whenFlushed(); // returns immediately when no pending updates
            // Simple updates
            const set1Promise = storage.set('bar', 'foo');
            const set2Promise = storage.set('barNumber', 55);
            const set3Promise = storage.set('barBoolean', true);
            const set4Promise = storage.set('barObject', { bar: 'baz' });
            let flushPromiseResolved = false;
            storage.whenFlushed().then(() => (flushPromiseResolved = true));
            strictEqual(storage.get('bar'), 'foo');
            strictEqual(storage.getNumber('barNumber'), 55);
            strictEqual(storage.getBoolean('barBoolean'), true);
            deepStrictEqual(storage.getObject('barObject'), { bar: 'baz' });
            strictEqual(changes.size, 4);
            ok(changes.has('bar'));
            ok(changes.has('barNumber'));
            ok(changes.has('barBoolean'));
            ok(changes.has('barObject'));
            let setPromiseResolved = false;
            await Promise.all([set1Promise, set2Promise, set3Promise, set4Promise]).then(() => (setPromiseResolved = true));
            strictEqual(setPromiseResolved, true);
            strictEqual(flushPromiseResolved, true);
            changes = new Set();
            // Does not trigger events for same update values
            storage.set('bar', 'foo');
            storage.set('barNumber', 55);
            storage.set('barBoolean', true);
            storage.set('barObject', { bar: 'baz' });
            strictEqual(changes.size, 0);
            // Simple deletes
            const delete1Promise = storage.delete('bar');
            const delete2Promise = storage.delete('barNumber');
            const delete3Promise = storage.delete('barBoolean');
            const delete4Promise = storage.delete('barObject');
            ok(!storage.get('bar'));
            ok(!storage.getNumber('barNumber'));
            ok(!storage.getBoolean('barBoolean'));
            ok(!storage.getObject('barObject'));
            strictEqual(changes.size, 4);
            ok(changes.has('bar'));
            ok(changes.has('barNumber'));
            ok(changes.has('barBoolean'));
            ok(changes.has('barObject'));
            changes = new Set();
            // Does not trigger events for same delete values
            storage.delete('bar');
            storage.delete('barNumber');
            storage.delete('barBoolean');
            storage.delete('barObject');
            strictEqual(changes.size, 0);
            let deletePromiseResolved = false;
            await Promise.all([delete1Promise, delete2Promise, delete3Promise, delete4Promise]).then(() => (deletePromiseResolved = true));
            strictEqual(deletePromiseResolved, true);
            await storage.close();
            await storage.close(); // it is ok to call this multiple times
        });
    });
    test('external changes', () => {
        return runWithFakedTimers({}, async function () {
            class TestSQLiteStorageDatabase extends SQLiteStorageDatabase {
                constructor() {
                    super(...arguments);
                    this._onDidChangeItemsExternal = new Emitter();
                }
                get onDidChangeItemsExternal() {
                    return this._onDidChangeItemsExternal.event;
                }
                fireDidChangeItemsExternal(event) {
                    this._onDidChangeItemsExternal.fire(event);
                }
            }
            const database = new TestSQLiteStorageDatabase(join(testDir, 'storage.db'));
            const storage = new Storage(database);
            const changes = new Set();
            storage.onDidChangeStorage((e) => {
                changes.add(e.key);
            });
            await storage.init();
            await storage.set('foo', 'bar');
            ok(changes.has('foo'));
            changes.clear();
            // Nothing happens if changing to same value
            const changed = new Map();
            changed.set('foo', 'bar');
            database.fireDidChangeItemsExternal({ changed });
            strictEqual(changes.size, 0);
            // Change is accepted if valid
            changed.set('foo', 'bar1');
            database.fireDidChangeItemsExternal({ changed });
            ok(changes.has('foo'));
            strictEqual(storage.get('foo'), 'bar1');
            changes.clear();
            // Delete is accepted
            const deleted = new Set(['foo']);
            database.fireDidChangeItemsExternal({ deleted });
            ok(changes.has('foo'));
            strictEqual(storage.get('foo', undefined), undefined);
            changes.clear();
            // Nothing happens if changing to same value
            database.fireDidChangeItemsExternal({ deleted });
            strictEqual(changes.size, 0);
            strictEqual(isStorageItemsChangeEvent({ changed }), true);
            strictEqual(isStorageItemsChangeEvent({ deleted }), true);
            strictEqual(isStorageItemsChangeEvent({ changed, deleted }), true);
            strictEqual(isStorageItemsChangeEvent(undefined), false);
            strictEqual(isStorageItemsChangeEvent({ changed: 'yes', deleted: false }), false);
            await storage.close();
        });
    });
    test('close flushes data', async () => {
        let storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
        await storage.init();
        const set1Promise = storage.set('foo', 'bar');
        const set2Promise = storage.set('bar', 'foo');
        let flushPromiseResolved = false;
        storage.whenFlushed().then(() => (flushPromiseResolved = true));
        strictEqual(storage.get('foo'), 'bar');
        strictEqual(storage.get('bar'), 'foo');
        let setPromiseResolved = false;
        Promise.all([set1Promise, set2Promise]).then(() => (setPromiseResolved = true));
        await storage.close();
        strictEqual(setPromiseResolved, true);
        strictEqual(flushPromiseResolved, true);
        storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
        await storage.init();
        strictEqual(storage.get('foo'), 'bar');
        strictEqual(storage.get('bar'), 'foo');
        await storage.close();
        storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
        await storage.init();
        const delete1Promise = storage.delete('foo');
        const delete2Promise = storage.delete('bar');
        ok(!storage.get('foo'));
        ok(!storage.get('bar'));
        let deletePromiseResolved = false;
        Promise.all([delete1Promise, delete2Promise]).then(() => (deletePromiseResolved = true));
        await storage.close();
        strictEqual(deletePromiseResolved, true);
        storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
        await storage.init();
        ok(!storage.get('foo'));
        ok(!storage.get('bar'));
        await storage.close();
    });
    test('explicit flush', async () => {
        const storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
        await storage.init();
        storage.set('foo', 'bar');
        storage.set('bar', 'foo');
        let flushPromiseResolved = false;
        storage.whenFlushed().then(() => (flushPromiseResolved = true));
        strictEqual(flushPromiseResolved, false);
        await storage.flush(0);
        strictEqual(flushPromiseResolved, true);
        await storage.close();
    });
    test('conflicting updates', () => {
        return runWithFakedTimers({}, async function () {
            const storage = new Storage(new SQLiteStorageDatabase(join(testDir, 'storage.db')));
            await storage.init();
            let changes = new Set();
            storage.onDidChangeStorage((e) => {
                changes.add(e.key);
            });
            const set1Promise = storage.set('foo', 'bar1');
            const set2Promise = storage.set('foo', 'bar2');
            const set3Promise = storage.set('foo', 'bar3');
            let flushPromiseResolved = false;
            storage.whenFlushed().then(() => (flushPromiseResolved = true));
            strictEqual(storage.get('foo'), 'bar3');
            strictEqual(changes.size, 1);
            ok(changes.has('foo'));
            let setPromiseResolved = false;
            await Promise.all([set1Promise, set2Promise, set3Promise]).then(() => (setPromiseResolved = true));
            ok(setPromiseResolved);
            ok(flushPromiseResolved);
            changes = new Set();
            const set4Promise = storage.set('bar', 'foo');
            const delete1Promise = storage.delete('bar');
            ok(!storage.get('bar'));
            strictEqual(changes.size, 1);
            ok(changes.has('bar'));
            let setAndDeletePromiseResolved = false;
            await Promise.all([set4Promise, delete1Promise]).then(() => (setAndDeletePromiseResolved = true));
            ok(setAndDeletePromiseResolved);
            await storage.close();
        });
    });
    test('corrupt DB recovers', async () => {
        return runWithFakedTimers({}, async function () {
            const storageFile = join(testDir, 'storage.db');
            let storage = new Storage(new SQLiteStorageDatabase(storageFile));
            await storage.init();
            await storage.set('bar', 'foo');
            await Promises.writeFile(storageFile, 'This is a broken DB');
            await storage.set('foo', 'bar');
            strictEqual(storage.get('bar'), 'foo');
            strictEqual(storage.get('foo'), 'bar');
            await storage.close();
            storage = new Storage(new SQLiteStorageDatabase(storageFile));
            await storage.init();
            strictEqual(storage.get('bar'), 'foo');
            strictEqual(storage.get('foo'), 'bar');
            await storage.close();
        });
    });
});
flakySuite('SQLite Storage Library', function () {
    function toSet(elements) {
        const set = new Set();
        elements.forEach((element) => set.add(element));
        return set;
    }
    let testdir;
    setup(function () {
        testdir = getRandomTestPath(tmpdir(), 'vsctests', 'storagelibrary');
        return fs.promises.mkdir(testdir, { recursive: true });
    });
    teardown(function () {
        return Promises.rm(testdir);
    });
    async function testDBBasics(path, logError) {
        let options;
        if (logError) {
            options = {
                logging: {
                    logError,
                },
            };
        }
        const storage = new SQLiteStorageDatabase(path, options);
        const items = new Map();
        items.set('foo', 'bar');
        items.set('some/foo/path', 'some/bar/path');
        items.set(JSON.stringify({ foo: 'bar' }), JSON.stringify({ bar: 'foo' }));
        let storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.updateItems({ insert: items });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        strictEqual(storedItems.get('foo'), 'bar');
        strictEqual(storedItems.get('some/foo/path'), 'some/bar/path');
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ delete: toSet(['foo']) });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size - 1);
        ok(!storedItems.has('foo'));
        strictEqual(storedItems.get('some/foo/path'), 'some/bar/path');
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ insert: items });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        strictEqual(storedItems.get('foo'), 'bar');
        strictEqual(storedItems.get('some/foo/path'), 'some/bar/path');
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        const itemsChange = new Map();
        itemsChange.set('foo', 'otherbar');
        await storage.updateItems({ insert: itemsChange });
        storedItems = await storage.getItems();
        strictEqual(storedItems.get('foo'), 'otherbar');
        await storage.updateItems({
            delete: toSet(['foo', 'bar', 'some/foo/path', JSON.stringify({ foo: 'bar' })]),
        });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.updateItems({ insert: items, delete: toSet(['foo', 'some/foo/path', 'other']) });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 1);
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ delete: toSet([JSON.stringify({ foo: 'bar' })]) });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        let recoveryCalled = false;
        await storage.close(() => {
            recoveryCalled = true;
            return new Map();
        });
        strictEqual(recoveryCalled, false);
    }
    test('basics', async () => {
        await testDBBasics(join(testdir, 'storage.db'));
    });
    test('basics (open multiple times)', async () => {
        await testDBBasics(join(testdir, 'storage.db'));
        await testDBBasics(join(testdir, 'storage.db'));
    });
    test('basics (corrupt DB falls back to empty DB)', async () => {
        const corruptDBPath = join(testdir, 'broken.db');
        await Promises.writeFile(corruptDBPath, 'This is a broken DB');
        let expectedError;
        await testDBBasics(corruptDBPath, (error) => {
            expectedError = error;
        });
        ok(expectedError);
    });
    test('basics (corrupt DB restores from previous backup)', async () => {
        const storagePath = join(testdir, 'storage.db');
        let storage = new SQLiteStorageDatabase(storagePath);
        const items = new Map();
        items.set('foo', 'bar');
        items.set('some/foo/path', 'some/bar/path');
        items.set(JSON.stringify({ foo: 'bar' }), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ insert: items });
        await storage.close();
        await Promises.writeFile(storagePath, 'This is now a broken DB');
        storage = new SQLiteStorageDatabase(storagePath);
        const storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        strictEqual(storedItems.get('foo'), 'bar');
        strictEqual(storedItems.get('some/foo/path'), 'some/bar/path');
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        let recoveryCalled = false;
        await storage.close(() => {
            recoveryCalled = true;
            return new Map();
        });
        strictEqual(recoveryCalled, false);
    });
    test('basics (corrupt DB falls back to empty DB if backup is corrupt)', async () => {
        const storagePath = join(testdir, 'storage.db');
        let storage = new SQLiteStorageDatabase(storagePath);
        const items = new Map();
        items.set('foo', 'bar');
        items.set('some/foo/path', 'some/bar/path');
        items.set(JSON.stringify({ foo: 'bar' }), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ insert: items });
        await storage.close();
        await Promises.writeFile(storagePath, 'This is now a broken DB');
        await Promises.writeFile(`${storagePath}.backup`, 'This is now also a broken DB');
        storage = new SQLiteStorageDatabase(storagePath);
        const storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await testDBBasics(storagePath);
    });
    (isWindows ? test.skip /* Windows will fail to write to open DB due to locking */ : test)('basics (DB that becomes corrupt during runtime stores all state from cache on close)', async () => {
        const storagePath = join(testdir, 'storage.db');
        let storage = new SQLiteStorageDatabase(storagePath);
        const items = new Map();
        items.set('foo', 'bar');
        items.set('some/foo/path', 'some/bar/path');
        items.set(JSON.stringify({ foo: 'bar' }), JSON.stringify({ bar: 'foo' }));
        await storage.updateItems({ insert: items });
        await storage.close();
        const backupPath = `${storagePath}.backup`;
        strictEqual(await Promises.exists(backupPath), true);
        storage = new SQLiteStorageDatabase(storagePath);
        await storage.getItems();
        await Promises.writeFile(storagePath, 'This is now a broken DB');
        // we still need to trigger a check to the DB so that we get to know that
        // the DB is corrupt. We have no extra code on shutdown that checks for the
        // health of the DB. This is an optimization to not perform too many tasks
        // on shutdown.
        await storage
            .checkIntegrity(true)
            .then(null, (error) => { } /* error is expected here but we do not want to fail */);
        await fs.promises.unlink(backupPath); // also test that the recovery DB is backed up properly
        let recoveryCalled = false;
        await storage.close(() => {
            recoveryCalled = true;
            return items;
        });
        strictEqual(recoveryCalled, true);
        strictEqual(await Promises.exists(backupPath), true);
        storage = new SQLiteStorageDatabase(storagePath);
        const storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        strictEqual(storedItems.get('foo'), 'bar');
        strictEqual(storedItems.get('some/foo/path'), 'some/bar/path');
        strictEqual(storedItems.get(JSON.stringify({ foo: 'bar' })), JSON.stringify({ bar: 'foo' }));
        recoveryCalled = false;
        await storage.close(() => {
            recoveryCalled = true;
            return new Map();
        });
        strictEqual(recoveryCalled, false);
    });
    test('real world example', async function () {
        let storage = new SQLiteStorageDatabase(join(testdir, 'storage.db'));
        const items1 = new Map();
        items1.set('colorthemedata', '{"id":"vs vscode-theme-defaults-themes-light_plus-json","label":"Light+ (default light)","settingsId":"Default Light+","selector":"vs.vscode-theme-defaults-themes-light_plus-json","themeTokenColors":[{"settings":{"foreground":"#000000ff","background":"#ffffffff"}},{"scope":["meta.embedded","source.groovy.embedded"],"settings":{"foreground":"#000000ff"}},{"scope":"emphasis","settings":{"fontStyle":"italic"}},{"scope":"strong","settings":{"fontStyle":"bold"}},{"scope":"meta.diff.header","settings":{"foreground":"#000080"}},{"scope":"comment","settings":{"foreground":"#008000"}},{"scope":"constant.language","settings":{"foreground":"#0000ff"}},{"scope":["constant.numeric"],"settings":{"foreground":"#098658"}},{"scope":"constant.regexp","settings":{"foreground":"#811f3f"}},{"name":"css tags in selectors, xml tags","scope":"entity.name.tag","settings":{"foreground":"#800000"}},{"scope":"entity.name.selector","settings":{"foreground":"#800000"}},{"scope":"entity.other.attribute-name","settings":{"foreground":"#ff0000"}},{"scope":["entity.other.attribute-name.class.css","entity.other.attribute-name.class.mixin.css","entity.other.attribute-name.id.css","entity.other.attribute-name.parent-selector.css","entity.other.attribute-name.pseudo-class.css","entity.other.attribute-name.pseudo-element.css","source.css.less entity.other.attribute-name.id","entity.other.attribute-name.attribute.scss","entity.other.attribute-name.scss"],"settings":{"foreground":"#800000"}},{"scope":"invalid","settings":{"foreground":"#cd3131"}},{"scope":"markup.underline","settings":{"fontStyle":"underline"}},{"scope":"markup.bold","settings":{"fontStyle":"bold","foreground":"#000080"}},{"scope":"markup.heading","settings":{"fontStyle":"bold","foreground":"#800000"}},{"scope":"markup.italic","settings":{"fontStyle":"italic"}},{"scope":"markup.inserted","settings":{"foreground":"#098658"}},{"scope":"markup.deleted","settings":{"foreground":"#a31515"}},{"scope":"markup.changed","settings":{"foreground":"#0451a5"}},{"scope":["punctuation.definition.quote.begin.markdown","punctuation.definition.list.begin.markdown"],"settings":{"foreground":"#0451a5"}},{"scope":"markup.inline.raw","settings":{"foreground":"#800000"}},{"name":"brackets of XML/HTML tags","scope":"punctuation.definition.tag","settings":{"foreground":"#800000"}},{"scope":"meta.preprocessor","settings":{"foreground":"#0000ff"}},{"scope":"meta.preprocessor.string","settings":{"foreground":"#a31515"}},{"scope":"meta.preprocessor.numeric","settings":{"foreground":"#098658"}},{"scope":"meta.structure.dictionary.key.python","settings":{"foreground":"#0451a5"}},{"scope":"storage","settings":{"foreground":"#0000ff"}},{"scope":"storage.type","settings":{"foreground":"#0000ff"}},{"scope":"storage.modifier","settings":{"foreground":"#0000ff"}},{"scope":"string","settings":{"foreground":"#a31515"}},{"scope":["string.comment.buffered.block.pug","string.quoted.pug","string.interpolated.pug","string.unquoted.plain.in.yaml","string.unquoted.plain.out.yaml","string.unquoted.block.yaml","string.quoted.single.yaml","string.quoted.double.xml","string.quoted.single.xml","string.unquoted.cdata.xml","string.quoted.double.html","string.quoted.single.html","string.unquoted.html","string.quoted.single.handlebars","string.quoted.double.handlebars"],"settings":{"foreground":"#0000ff"}},{"scope":"string.regexp","settings":{"foreground":"#811f3f"}},{"name":"String interpolation","scope":["punctuation.definition.template-expression.begin","punctuation.definition.template-expression.end","punctuation.section.embedded"],"settings":{"foreground":"#0000ff"}},{"name":"Reset JavaScript string interpolation expression","scope":["meta.template.expression"],"settings":{"foreground":"#000000"}},{"scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgb-value","constant.other.rgb-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"scope":["support.type.vendored.property-name","support.type.property-name","variable.css","variable.scss","variable.other.less","source.coffee.embedded"],"settings":{"foreground":"#ff0000"}},{"scope":["support.type.property-name.json"],"settings":{"foreground":"#0451a5"}},{"scope":"keyword","settings":{"foreground":"#0000ff"}},{"scope":"keyword.control","settings":{"foreground":"#0000ff"}},{"scope":"keyword.operator","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.new","keyword.operator.expression","keyword.operator.cast","keyword.operator.sizeof","keyword.operator.instanceof","keyword.operator.logical.python"],"settings":{"foreground":"#0000ff"}},{"scope":"keyword.other.unit","settings":{"foreground":"#098658"}},{"scope":["punctuation.section.embedded.begin.php","punctuation.section.embedded.end.php"],"settings":{"foreground":"#800000"}},{"scope":"support.function.git-rebase","settings":{"foreground":"#0451a5"}},{"scope":"constant.sha.git-rebase","settings":{"foreground":"#098658"}},{"name":"coloring of the Java import and package identifiers","scope":["storage.modifier.import.java","variable.language.wildcard.java","storage.modifier.package.java"],"settings":{"foreground":"#000000"}},{"name":"this.self","scope":"variable.language","settings":{"foreground":"#0000ff"}},{"name":"Function declarations","scope":["entity.name.function","support.function","support.constant.handlebars"],"settings":{"foreground":"#795E26"}},{"name":"Types declaration and references","scope":["meta.return-type","support.class","support.type","entity.name.type","entity.name.class","storage.type.numeric.go","storage.type.byte.go","storage.type.boolean.go","storage.type.string.go","storage.type.uintptr.go","storage.type.error.go","storage.type.rune.go","storage.type.cs","storage.type.generic.cs","storage.type.modifier.cs","storage.type.variable.cs","storage.type.annotation.java","storage.type.generic.java","storage.type.java","storage.type.object.array.java","storage.type.primitive.array.java","storage.type.primitive.java","storage.type.token.java","storage.type.groovy","storage.type.annotation.groovy","storage.type.parameters.groovy","storage.type.generic.groovy","storage.type.object.array.groovy","storage.type.primitive.array.groovy","storage.type.primitive.groovy"],"settings":{"foreground":"#267f99"}},{"name":"Types declaration and references, TS grammar specific","scope":["meta.type.cast.expr","meta.type.new.expr","support.constant.math","support.constant.dom","support.constant.json","entity.other.inherited-class"],"settings":{"foreground":"#267f99"}},{"name":"Control flow keywords","scope":"keyword.control","settings":{"foreground":"#AF00DB"}},{"name":"Variable and parameter name","scope":["variable","meta.definition.variable.name","support.variable","entity.name.variable"],"settings":{"foreground":"#001080"}},{"name":"Object keys, TS grammar specific","scope":["meta.object-literal.key"],"settings":{"foreground":"#001080"}},{"name":"CSS property value","scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgb-value","constant.other.rgb-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"name":"Regular expression groups","scope":["punctuation.definition.group.regexp","punctuation.definition.group.assertion.regexp","punctuation.definition.character-class.regexp","punctuation.character.set.begin.regexp","punctuation.character.set.end.regexp","keyword.operator.negation.regexp","support.other.parenthesis.regexp"],"settings":{"foreground":"#d16969"}},{"scope":["constant.character.character-class.regexp","constant.other.character-class.set.regexp","constant.other.character-class.regexp","constant.character.set.regexp"],"settings":{"foreground":"#811f3f"}},{"scope":"keyword.operator.quantifier.regexp","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.or.regexp","keyword.control.anchor.regexp"],"settings":{"foreground":"#ff0000"}},{"scope":"constant.character","settings":{"foreground":"#0000ff"}},{"scope":"constant.character.escape","settings":{"foreground":"#ff0000"}},{"scope":"token.info-token","settings":{"foreground":"#316bcd"}},{"scope":"token.warn-token","settings":{"foreground":"#cd9731"}},{"scope":"token.error-token","settings":{"foreground":"#cd3131"}},{"scope":"token.debug-token","settings":{"foreground":"#800080"}}],"extensionData":{"extensionId":"vscode.theme-defaults","extensionPublisher":"vscode","extensionName":"theme-defaults","extensionIsBuiltin":true},"colorMap":{"editor.background":"#ffffff","editor.foreground":"#000000","editor.inactiveSelectionBackground":"#e5ebf1","editorIndentGuide.background":"#d3d3d3","editorIndentGuide.activeBackground":"#939393","editor.selectionHighlightBackground":"#add6ff4d","editorSuggestWidget.background":"#f3f3f3","activityBarBadge.background":"#007acc","sideBarTitle.foreground":"#6f6f6f","list.hoverBackground":"#e8e8e8","input.placeholderForeground":"#767676","settings.textInputBorder":"#cecece","settings.numberInputBorder":"#cecece"}}');
        items1.set('commandpalette.mru.cache', '{"usesLRU":true,"entries":[{"key":"revealFileInOS","value":3},{"key":"extension.openInGitHub","value":4},{"key":"workbench.extensions.action.openExtensionsFolder","value":11},{"key":"workbench.action.showRuntimeExtensions","value":14},{"key":"workbench.action.toggleTabsVisibility","value":15},{"key":"extension.liveServerPreview.open","value":16},{"key":"workbench.action.openIssueReporter","value":18},{"key":"workbench.action.openProcessExplorer","value":19},{"key":"workbench.action.toggleSharedProcess","value":20},{"key":"workbench.action.configureLocale","value":21},{"key":"workbench.action.appPerf","value":22},{"key":"workbench.action.reportPerformanceIssueUsingReporter","value":23},{"key":"workbench.action.openGlobalKeybindings","value":25},{"key":"workbench.action.output.toggleOutput","value":27},{"key":"extension.sayHello","value":29}]}');
        items1.set('cpp.1.lastsessiondate', 'Fri Oct 05 2018');
        items1.set('debug.actionswidgetposition', '0.6880952380952381');
        const items2 = new Map();
        items2.set('workbench.editors.files.textfileeditor', '{"textEditorViewState":[["file:///Users/dummy/Documents/ticino-playground/play.htm",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumber":6,"column":16},"position":{"lineNumber":6,"column":16}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumber":1,"column":1},"firstPositionDeltaTop":0},"contributionsState":{"editor.contrib.folding":{},"editor.contrib.wordHighlighter":false}}}],["file:///Users/dummy/Documents/ticino-playground/nakefile.js",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumber":7,"column":81},"position":{"lineNumber":7,"column":81}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumber":1,"column":1},"firstPositionDeltaTop":20},"contributionsState":{"editor.contrib.folding":{},"editor.contrib.wordHighlighter":false}}}],["file:///Users/dummy/Desktop/vscode2/.gitattributes",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumber":9,"column":12},"position":{"lineNumber":9,"column":12}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumber":1,"column":1},"firstPositionDeltaTop":20},"contributionsState":{"editor.contrib.folding":{},"editor.contrib.wordHighlighter":false}}}],["file:///Users/dummy/Desktop/vscode2/src/vs/workbench/contrib/search/browser/openAnythingHandler.ts",{"0":{"cursorState":[{"inSelectionMode":false,"selectionStart":{"lineNumber":1,"column":1},"position":{"lineNumber":1,"column":1}}],"viewState":{"scrollLeft":0,"firstPosition":{"lineNumber":1,"column":1},"firstPositionDeltaTop":0},"contributionsState":{"editor.contrib.folding":{},"editor.contrib.wordHighlighter":false}}}]]}');
        const items3 = new Map();
        items3.set('nps/iscandidate', 'false');
        items3.set('telemetry.instanceid', 'd52bfcd4-4be6-476b-a38f-d44c717c41d6');
        items3.set('workbench.activity.pinnedviewlets', '[{"id":"workbench.view.explorer","pinned":true,"order":0,"visible":true},{"id":"workbench.view.search","pinned":true,"order":1,"visible":true},{"id":"workbench.view.scm","pinned":true,"order":2,"visible":true},{"id":"workbench.view.debug","pinned":true,"order":3,"visible":true},{"id":"workbench.view.extensions","pinned":true,"order":4,"visible":true},{"id":"workbench.view.extension.gitlens","pinned":true,"order":7,"visible":true},{"id":"workbench.view.extension.test","pinned":false,"visible":false}]');
        items3.set('workbench.panel.height', '419');
        items3.set('very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.very.long.key.', 'is long');
        let storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await Promise.all([
            await storage.updateItems({ insert: items1 }),
            await storage.updateItems({ insert: items2 }),
            await storage.updateItems({ insert: items3 }),
        ]);
        strictEqual(await storage.checkIntegrity(true), 'ok');
        strictEqual(await storage.checkIntegrity(false), 'ok');
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items1.size + items2.size + items3.size);
        const items1Keys = [];
        items1.forEach((value, key) => {
            items1Keys.push(key);
            strictEqual(storedItems.get(key), value);
        });
        const items2Keys = [];
        items2.forEach((value, key) => {
            items2Keys.push(key);
            strictEqual(storedItems.get(key), value);
        });
        const items3Keys = [];
        items3.forEach((value, key) => {
            items3Keys.push(key);
            strictEqual(storedItems.get(key), value);
        });
        await Promise.all([
            await storage.updateItems({ delete: toSet(items1Keys) }),
            await storage.updateItems({ delete: toSet(items2Keys) }),
            await storage.updateItems({ delete: toSet(items3Keys) }),
        ]);
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await Promise.all([
            await storage.updateItems({ insert: items1 }),
            await storage.getItems(),
            await storage.updateItems({ insert: items2 }),
            await storage.getItems(),
            await storage.updateItems({ insert: items3 }),
            await storage.getItems(),
        ]);
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items1.size + items2.size + items3.size);
        await storage.close();
        storage = new SQLiteStorageDatabase(join(testdir, 'storage.db'));
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items1.size + items2.size + items3.size);
        await storage.close();
    });
    test('very large item value', async function () {
        const storage = new SQLiteStorageDatabase(join(testdir, 'storage.db'));
        let randomData = createLargeRandomData(); // 3.6MB
        await storage.updateItems({ insert: randomData.items });
        let storedItems = await storage.getItems();
        strictEqual(randomData.items.get('colorthemedata'), storedItems.get('colorthemedata'));
        strictEqual(randomData.items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
        strictEqual(randomData.items.get('super.large.string'), storedItems.get('super.large.string'));
        randomData = createLargeRandomData();
        await storage.updateItems({ insert: randomData.items });
        storedItems = await storage.getItems();
        strictEqual(randomData.items.get('colorthemedata'), storedItems.get('colorthemedata'));
        strictEqual(randomData.items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
        strictEqual(randomData.items.get('super.large.string'), storedItems.get('super.large.string'));
        const toDelete = new Set();
        toDelete.add('super.large.string');
        await storage.updateItems({ delete: toDelete });
        storedItems = await storage.getItems();
        strictEqual(randomData.items.get('colorthemedata'), storedItems.get('colorthemedata'));
        strictEqual(randomData.items.get('commandpalette.mru.cache'), storedItems.get('commandpalette.mru.cache'));
        ok(!storedItems.get('super.large.string'));
        await storage.close();
    });
    test('multiple concurrent writes execute in sequence', async () => {
        return runWithFakedTimers({}, async () => {
            class TestStorage extends Storage {
                getStorage() {
                    return this.database;
                }
            }
            const storage = new TestStorage(new SQLiteStorageDatabase(join(testdir, 'storage.db')));
            await storage.init();
            storage.set('foo', 'bar');
            storage.set('some/foo/path', 'some/bar/path');
            await timeout(2);
            storage.set('foo1', 'bar');
            storage.set('some/foo1/path', 'some/bar/path');
            await timeout(2);
            storage.set('foo2', 'bar');
            storage.set('some/foo2/path', 'some/bar/path');
            await timeout(2);
            storage.delete('foo1');
            storage.delete('some/foo1/path');
            await timeout(2);
            storage.delete('foo4');
            storage.delete('some/foo4/path');
            await timeout(5);
            storage.set('foo3', 'bar');
            await storage.set('some/foo3/path', 'some/bar/path');
            const items = await storage.getStorage().getItems();
            strictEqual(items.get('foo'), 'bar');
            strictEqual(items.get('some/foo/path'), 'some/bar/path');
            strictEqual(items.has('foo1'), false);
            strictEqual(items.has('some/foo1/path'), false);
            strictEqual(items.get('foo2'), 'bar');
            strictEqual(items.get('some/foo2/path'), 'some/bar/path');
            strictEqual(items.get('foo3'), 'bar');
            strictEqual(items.get('some/foo3/path'), 'some/bar/path');
            await storage.close();
        });
    });
    test('lots of INSERT & DELETE (below inline max)', async () => {
        const storage = new SQLiteStorageDatabase(join(testdir, 'storage.db'));
        const { items, keys } = createManyRandomData(200);
        await storage.updateItems({ insert: items });
        let storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        await storage.updateItems({ delete: keys });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.close();
    });
    test('lots of INSERT & DELETE (above inline max)', async () => {
        const storage = new SQLiteStorageDatabase(join(testdir, 'storage.db'));
        const { items, keys } = createManyRandomData();
        await storage.updateItems({ insert: items });
        let storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        await storage.updateItems({ delete: keys });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.close();
    });
    test('invalid path does not hang', async () => {
        const storage = new SQLiteStorageDatabase(join(testdir, 'nonexist', 'storage.db'));
        let error;
        try {
            await storage.getItems();
            await storage.close();
        }
        catch (e) {
            error = e;
        }
        ok(error);
    });
    test('optimize', async () => {
        const dbPath = join(testdir, 'storage.db');
        let storage = new SQLiteStorageDatabase(dbPath);
        const { items, keys } = createManyRandomData(400, true);
        await storage.updateItems({ insert: items });
        let storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        await storage.optimize();
        await storage.close();
        const sizeBeforeDeleteAndOptimize = (await fs.promises.stat(dbPath)).size;
        storage = new SQLiteStorageDatabase(dbPath);
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, items.size);
        await storage.updateItems({ delete: keys });
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.optimize();
        await storage.close();
        storage = new SQLiteStorageDatabase(dbPath);
        storedItems = await storage.getItems();
        strictEqual(storedItems.size, 0);
        await storage.close();
        const sizeAfterDeleteAndOptimize = (await fs.promises.stat(dbPath)).size;
        strictEqual(sizeAfterDeleteAndOptimize < sizeBeforeDeleteAndOptimize, true);
    });
    function createManyRandomData(length = 400, includeVeryLarge = false) {
        const items = new Map();
        const keys = new Set();
        for (let i = 0; i < length; i++) {
            const uuid = generateUuid();
            const key = `key: ${uuid}`;
            items.set(key, `value: ${uuid}`);
            keys.add(key);
        }
        if (includeVeryLarge) {
            const largeData = createLargeRandomData();
            for (const [key, value] of largeData.items) {
                items.set(key, value);
                keys.add(key);
            }
        }
        return { items, keys };
    }
    function createLargeRandomData() {
        const items = new Map();
        items.set('colorthemedata', '{"id":"vs vscode-theme-defaults-themes-light_plus-json","label":"Light+ (default light)","settingsId":"Default Light+","selector":"vs.vscode-theme-defaults-themes-light_plus-json","themeTokenColors":[{"settings":{"foreground":"#000000ff","background":"#ffffffff"}},{"scope":["meta.embedded","source.groovy.embedded"],"settings":{"foreground":"#000000ff"}},{"scope":"emphasis","settings":{"fontStyle":"italic"}},{"scope":"strong","settings":{"fontStyle":"bold"}},{"scope":"meta.diff.header","settings":{"foreground":"#000080"}},{"scope":"comment","settings":{"foreground":"#008000"}},{"scope":"constant.language","settings":{"foreground":"#0000ff"}},{"scope":["constant.numeric"],"settings":{"foreground":"#098658"}},{"scope":"constant.regexp","settings":{"foreground":"#811f3f"}},{"name":"css tags in selectors, xml tags","scope":"entity.name.tag","settings":{"foreground":"#800000"}},{"scope":"entity.name.selector","settings":{"foreground":"#800000"}},{"scope":"entity.other.attribute-name","settings":{"foreground":"#ff0000"}},{"scope":["entity.other.attribute-name.class.css","entity.other.attribute-name.class.mixin.css","entity.other.attribute-name.id.css","entity.other.attribute-name.parent-selector.css","entity.other.attribute-name.pseudo-class.css","entity.other.attribute-name.pseudo-element.css","source.css.less entity.other.attribute-name.id","entity.other.attribute-name.attribute.scss","entity.other.attribute-name.scss"],"settings":{"foreground":"#800000"}},{"scope":"invalid","settings":{"foreground":"#cd3131"}},{"scope":"markup.underline","settings":{"fontStyle":"underline"}},{"scope":"markup.bold","settings":{"fontStyle":"bold","foreground":"#000080"}},{"scope":"markup.heading","settings":{"fontStyle":"bold","foreground":"#800000"}},{"scope":"markup.italic","settings":{"fontStyle":"italic"}},{"scope":"markup.inserted","settings":{"foreground":"#098658"}},{"scope":"markup.deleted","settings":{"foreground":"#a31515"}},{"scope":"markup.changed","settings":{"foreground":"#0451a5"}},{"scope":["punctuation.definition.quote.begin.markdown","punctuation.definition.list.begin.markdown"],"settings":{"foreground":"#0451a5"}},{"scope":"markup.inline.raw","settings":{"foreground":"#800000"}},{"name":"brackets of XML/HTML tags","scope":"punctuation.definition.tag","settings":{"foreground":"#800000"}},{"scope":"meta.preprocessor","settings":{"foreground":"#0000ff"}},{"scope":"meta.preprocessor.string","settings":{"foreground":"#a31515"}},{"scope":"meta.preprocessor.numeric","settings":{"foreground":"#098658"}},{"scope":"meta.structure.dictionary.key.python","settings":{"foreground":"#0451a5"}},{"scope":"storage","settings":{"foreground":"#0000ff"}},{"scope":"storage.type","settings":{"foreground":"#0000ff"}},{"scope":"storage.modifier","settings":{"foreground":"#0000ff"}},{"scope":"string","settings":{"foreground":"#a31515"}},{"scope":["string.comment.buffered.block.pug","string.quoted.pug","string.interpolated.pug","string.unquoted.plain.in.yaml","string.unquoted.plain.out.yaml","string.unquoted.block.yaml","string.quoted.single.yaml","string.quoted.double.xml","string.quoted.single.xml","string.unquoted.cdata.xml","string.quoted.double.html","string.quoted.single.html","string.unquoted.html","string.quoted.single.handlebars","string.quoted.double.handlebars"],"settings":{"foreground":"#0000ff"}},{"scope":"string.regexp","settings":{"foreground":"#811f3f"}},{"name":"String interpolation","scope":["punctuation.definition.template-expression.begin","punctuation.definition.template-expression.end","punctuation.section.embedded"],"settings":{"foreground":"#0000ff"}},{"name":"Reset JavaScript string interpolation expression","scope":["meta.template.expression"],"settings":{"foreground":"#000000"}},{"scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgb-value","constant.other.rgb-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"scope":["support.type.vendored.property-name","support.type.property-name","variable.css","variable.scss","variable.other.less","source.coffee.embedded"],"settings":{"foreground":"#ff0000"}},{"scope":["support.type.property-name.json"],"settings":{"foreground":"#0451a5"}},{"scope":"keyword","settings":{"foreground":"#0000ff"}},{"scope":"keyword.control","settings":{"foreground":"#0000ff"}},{"scope":"keyword.operator","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.new","keyword.operator.expression","keyword.operator.cast","keyword.operator.sizeof","keyword.operator.instanceof","keyword.operator.logical.python"],"settings":{"foreground":"#0000ff"}},{"scope":"keyword.other.unit","settings":{"foreground":"#098658"}},{"scope":["punctuation.section.embedded.begin.php","punctuation.section.embedded.end.php"],"settings":{"foreground":"#800000"}},{"scope":"support.function.git-rebase","settings":{"foreground":"#0451a5"}},{"scope":"constant.sha.git-rebase","settings":{"foreground":"#098658"}},{"name":"coloring of the Java import and package identifiers","scope":["storage.modifier.import.java","variable.language.wildcard.java","storage.modifier.package.java"],"settings":{"foreground":"#000000"}},{"name":"this.self","scope":"variable.language","settings":{"foreground":"#0000ff"}},{"name":"Function declarations","scope":["entity.name.function","support.function","support.constant.handlebars"],"settings":{"foreground":"#795E26"}},{"name":"Types declaration and references","scope":["meta.return-type","support.class","support.type","entity.name.type","entity.name.class","storage.type.numeric.go","storage.type.byte.go","storage.type.boolean.go","storage.type.string.go","storage.type.uintptr.go","storage.type.error.go","storage.type.rune.go","storage.type.cs","storage.type.generic.cs","storage.type.modifier.cs","storage.type.variable.cs","storage.type.annotation.java","storage.type.generic.java","storage.type.java","storage.type.object.array.java","storage.type.primitive.array.java","storage.type.primitive.java","storage.type.token.java","storage.type.groovy","storage.type.annotation.groovy","storage.type.parameters.groovy","storage.type.generic.groovy","storage.type.object.array.groovy","storage.type.primitive.array.groovy","storage.type.primitive.groovy"],"settings":{"foreground":"#267f99"}},{"name":"Types declaration and references, TS grammar specific","scope":["meta.type.cast.expr","meta.type.new.expr","support.constant.math","support.constant.dom","support.constant.json","entity.other.inherited-class"],"settings":{"foreground":"#267f99"}},{"name":"Control flow keywords","scope":"keyword.control","settings":{"foreground":"#AF00DB"}},{"name":"Variable and parameter name","scope":["variable","meta.definition.variable.name","support.variable","entity.name.variable"],"settings":{"foreground":"#001080"}},{"name":"Object keys, TS grammar specific","scope":["meta.object-literal.key"],"settings":{"foreground":"#001080"}},{"name":"CSS property value","scope":["support.constant.property-value","support.constant.font-name","support.constant.media-type","support.constant.media","constant.other.color.rgb-value","constant.other.rgb-value","support.constant.color"],"settings":{"foreground":"#0451a5"}},{"name":"Regular expression groups","scope":["punctuation.definition.group.regexp","punctuation.definition.group.assertion.regexp","punctuation.definition.character-class.regexp","punctuation.character.set.begin.regexp","punctuation.character.set.end.regexp","keyword.operator.negation.regexp","support.other.parenthesis.regexp"],"settings":{"foreground":"#d16969"}},{"scope":["constant.character.character-class.regexp","constant.other.character-class.set.regexp","constant.other.character-class.regexp","constant.character.set.regexp"],"settings":{"foreground":"#811f3f"}},{"scope":"keyword.operator.quantifier.regexp","settings":{"foreground":"#000000"}},{"scope":["keyword.operator.or.regexp","keyword.control.anchor.regexp"],"settings":{"foreground":"#ff0000"}},{"scope":"constant.character","settings":{"foreground":"#0000ff"}},{"scope":"constant.character.escape","settings":{"foreground":"#ff0000"}},{"scope":"token.info-token","settings":{"foreground":"#316bcd"}},{"scope":"token.warn-token","settings":{"foreground":"#cd9731"}},{"scope":"token.error-token","settings":{"foreground":"#cd3131"}},{"scope":"token.debug-token","settings":{"foreground":"#800080"}}],"extensionData":{"extensionId":"vscode.theme-defaults","extensionPublisher":"vscode","extensionName":"theme-defaults","extensionIsBuiltin":true},"colorMap":{"editor.background":"#ffffff","editor.foreground":"#000000","editor.inactiveSelectionBackground":"#e5ebf1","editorIndentGuide.background":"#d3d3d3","editorIndentGuide.activeBackground":"#939393","editor.selectionHighlightBackground":"#add6ff4d","editorSuggestWidget.background":"#f3f3f3","activityBarBadge.background":"#007acc","sideBarTitle.foreground":"#6f6f6f","list.hoverBackground":"#e8e8e8","input.placeholderForeground":"#767676","settings.textInputBorder":"#cecece","settings.numberInputBorder":"#cecece"}}');
        items.set('commandpalette.mru.cache', '{"usesLRU":true,"entries":[{"key":"revealFileInOS","value":3},{"key":"extension.openInGitHub","value":4},{"key":"workbench.extensions.action.openExtensionsFolder","value":11},{"key":"workbench.action.showRuntimeExtensions","value":14},{"key":"workbench.action.toggleTabsVisibility","value":15},{"key":"extension.liveServerPreview.open","value":16},{"key":"workbench.action.openIssueReporter","value":18},{"key":"workbench.action.openProcessExplorer","value":19},{"key":"workbench.action.toggleSharedProcess","value":20},{"key":"workbench.action.configureLocale","value":21},{"key":"workbench.action.appPerf","value":22},{"key":"workbench.action.reportPerformanceIssueUsingReporter","value":23},{"key":"workbench.action.openGlobalKeybindings","value":25},{"key":"workbench.action.output.toggleOutput","value":27},{"key":"extension.sayHello","value":29}]}');
        const uuid = generateUuid();
        const value = [];
        for (let i = 0; i < 100000; i++) {
            value.push(uuid);
        }
        items.set('super.large.string', value.join()); // 3.6MB
        return { items, uuid, value };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvc3RvcmFnZS90ZXN0L25vZGUvc3RvcmFnZS5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDeEIsT0FBTyxFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUUsV0FBVyxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3pELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3JELE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDakQsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDekQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ2xELE9BQU8sRUFDTix5QkFBeUIsRUFHekIsT0FBTyxHQUNQLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUFpQyxxQkFBcUIsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQzVGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVsRixVQUFVLENBQUMsaUJBQWlCLEVBQUU7SUFDN0Is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QUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVGLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRCxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDdEMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUM3QyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDM0IsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDOUQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFNUYsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDNUMsV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3RDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxQyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM5RCxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFF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