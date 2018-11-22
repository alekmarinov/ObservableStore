const ObservableStore = require('.')
const Observable = require('rxjs')

const range = (n, f = 0, s = 1) => Array.from(Array(n), (_, i) => f + i * s)

// number of items to create for testing, must be even for proper halfing in some tests
const N = 10

// an ObservableStore instance being tested
let db

beforeEach(() => db = ObservableStore())

describe("New instance", () => {
    const exportedMethods = [
        "createItem",
        "updateItem",
        "deleteItem",
        "items",
        "item",
        "size"
    ]

    it("exports methods " + exportedMethods, () => {
        exportedMethods.forEach(method => expect(typeof db[method]).toMatch("function"))
    })
    it("have 0 items of type array", () => {
        expect(Array.isArray(db.items())).toBeTruthy()
        expect(db.items().length).toBe(0)
    })
    it("with pre-allocated size doesn't impact the size method", () => {
        db = ObservableStore(N)
        expect(db.size()).toBe(0)
    })
})

describe("The store can", () => {
    const genItems = n => range(n, 1).forEach(value => db.createItem({ value }))

    it("create items", () => {
        genItems(N)
        expect(db.size()).toBe(N)

        // must own property _index pointing that item in db
        db.items().forEach(item => expect(db.item(item._index).value).toBe(item.value))

        expect(() => db.createItem(null)).toThrow()
        expect(() => db.createItem(0)).toThrow()
        expect(() => db.createItem("")).toThrow()
        expect(() => db.createItem(true)).toThrow()
    })
    it("delete items", () => {
        genItems(N)

        // delete every second item
        range(db.size() / 2 | 0, 0, 2).forEach(_index => db.deleteItem(_index))

        // expect db to be the half of the initial size
        expect(db.items().length).toBe(N / 2 | 0)

        // expect odd item indices
        db.items().forEach((item, index) => expect(item._index).toBe(index * 2 + 1))

        expect(() => db.deleteItem(null)).toThrow()
        expect(() => db.deleteItem({})).toThrow()
        expect(() => db.deleteItem("")).toThrow()
        expect(() => db.deleteItem(true)).toThrow()
    })
    it("delete deleted items", () => {
        genItems(N)

        // multiple times
        range(100).forEach(() =>
            // delete every second item 
            range(db.size() / 2 | 0, 0, 2).forEach(_index => db.deleteItem(_index))
        )

        // expect db to be the half of the initial size
        expect(db.items().length).toBe(N / 2 | 0)

        // expect odd item indices
        db.items().forEach((item, index) => expect(item._index).toBe(index * 2 + 1))
    })
    it("update items", () => {
        genItems(N)
        range(db.size()).forEach(_index => db.updateItem(_index, { value: _index * 2 }))
        db.items().forEach(item => expect(item.value).toBe(item._index * 2))

        expect(() => db.updateItem(null)).toThrow()
        expect(() => db.updateItem({})).toThrow()
        expect(() => db.updateItem("")).toThrow()
        expect(() => db.updateItem(true)).toThrow()
        expect(() => db.updateItem(0, null)).not.toThrow() // acts as delete
        expect(() => db.updateItem(0, 0)).toThrow()
        expect(() => db.updateItem(0, "")).toThrow()
        expect(() => db.updateItem(0, true)).toThrow()
    })
    it("partially updates", () => {
        genItems(N)
        db.items().forEach(item => db.updateItem(item._index, { name: "item " + item._index }))
        db.items().forEach(item => {
            expect(item.value).toBe(item._index + 1)
            expect(item.name).toBe("item " + item._index)
        })
    })
    it("delete with update null", () => {
        genItems(N)

        // delete with update null every second item
        range(db.size() / 2 | 0, 0, 2).forEach(_index => db.updateItem(_index, null))

        // expect db to be the half of the initial size
        expect(db.items().length).toBe(N / 2 | 0)

        // expect odd item indices
        db.items().forEach((item, index) => expect(item._index).toBe(index * 2 + 1))
    })
    it("update deleted item", () => {
        genItems(N)

        // delete every second item
        range(N / 2 | 0, 0, 2).forEach(_index => db.deleteItem(_index))

        // update every second item
        range(N / 2 | 0, 0, 2).forEach(_index => db.updateItem(_index, { value: _index + 1 }))

        // expect db to be the same as the initial size
        expect(db.items().length).toBe(N)

        // expect all indices to have associated items
        range(N).forEach(index => {
            const item = db.item(index)
            expect(item._index).toBe(index)
            expect(item.value).toBe(index + 1)
        })
    })
})

describe("The store throws on", () => {
    it("updating index out of range", () => {
        expect(() => db.updateItem(0, {})).toThrow()
    })
    it("deleting index out of range", () => {
        expect(() => db.deleteItem(0)).toThrow()
    })
    it("refering index out of range", () => {
        expect(() => db.item(0)).toThrow()
    })
})
