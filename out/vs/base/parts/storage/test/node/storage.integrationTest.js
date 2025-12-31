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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmFnZS5pbnRlZ3JhdGlvblRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL3N0b3JhZ2UvdGVzdC9ub2RlL3N0b3JhZ2UuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQ3hCLE9BQU8sRUFBRSxlQUFlLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sNkJBQTZCLENBQUE7QUFDNUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNsRCxPQUFPLEVBQ04seUJBQXlCLEVBR3pCLE9BQU8sR0FDUCxNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFBaUMscUJBQXFCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFbEYsVUFBVSxDQUFDLGlCQUFpQixFQUFFO0lBQzdCLElBQUks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QUNELENBQUE7UUFDRixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFFeEQsTUFBTSxLQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7UUFDdkMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDdkIsS0FBSyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDM0MsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFekUsSUFBSSxXQUFXLEdBQUcsTUFBTSxPQUFPLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDMUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFaEMsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFFNUMsV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3RDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMxQyxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtRQUM5RCxXQUFXLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1RixNQUFNLE9BQU8sQ0FBQyxXQUFXLENBQUMsRUFBRSxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckQsV0FBVyxHQUFHLE1BQU0sT0FBTyxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ3RDLFdBQVcsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDN0MsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzNCLFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLGVBQWUsQ0FBQyxFQUFFLGVBQWUsQ0FBQyxDQUFBO1FBQzlELFdBQVcsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVGLE1BQU0sT0FBTyxDQUFDLFdBQVcsQ0FBQyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLFdBQVcsR0FBRyxNQUFNLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUN0QyxXQUFXLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDekMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDMUMsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7UUFDOUQsV0FBVyxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFL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