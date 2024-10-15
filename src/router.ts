/// <reference path="../types.d.ts" />

import z from "zod"
import { generateRandomString, helloUser, generateInsertQueryFromSchema } from "./utils"
import { validateClient } from "./validator"
import { ok, Result } from "neverthrow"
import { ClientsbulkImports, ItemsbulkImports } from "./services"


// __________               __                                    .___    .__          
// \______   \ ____  __ ___/  |_  ___________    _____   ____   __| _/_ __|  |   ____  
//  |       _//  _ \|  |  \   __\/ __ \_  __ \  /     \ /  _ \ / __ |  |  \  | _/ __ \ 
//  |    |   (  <_> )  |  /|  | \  ___/|  | \/ |  Y Y  (  <_> ) /_/ |  |  /  |_\  ___/ 
//  |____|_  /\____/|____/ |__|  \___  >__|    |__|_|  /\____/\____ |____/|____/\___  >
//         \/                        \/              \/            \/               \/ 


routerAdd("GET", "/hello", (c) => {
    return c.json(200, { message: "Welcome to import export version 1.0." })
})

routerAdd("GET", "/ping", (c) => {
    return c.json(200, { message: "pong" })
})

interface FieldSchema {
    system: boolean;
    id: string;
    name: string;
    type: string;
    required: boolean;
    presentable: boolean;
    unique: boolean;
    options: {
        min?: number | null;
        max?: number | null;
        pattern?: string;
        exceptDomains?: string[];
        onlyDomains?: string[];
        collectionId?: string;
        cascadeDelete?: boolean;
        minSelect?: number | null;
        displayFields?: string[];
        mimeTypes?: string[];
        thumbs?: string[];
        maxSize?: number;
        protected?: boolean;
    };
}


function isClientExisted(email: string) {
    try {
        const is_existed = $app.dao().findFirstRecordByData("clients", "email", email)
        if (is_existed) return is_existed
    } catch (e) {
        const msg = e.message
        const [msg_type, msg_err] = msg.split(":")

        if (msg_type.trim() === "sql"
            && msg_err.trim() === "no rows in result set") {
            return true
        }

    }
}



routerAdd("POST", "/clients/import", (c) => {
    try {

        let name = c.pathParam("name")
        const data = $apis.requestInfo(c).data
        const biz_id = data.businessId
        const client_payload = data.clients

        if (!client_payload || !biz_id)
            return c.json(400, { "message": "missing fields" })


        const client_col = $app.dao().findCollectionByNameOrId("clients")
        const biz_col = $app.dao().findCollectionByNameOrId("businesses")

        const client_record = new Record(client_col)
        const biz_record = new Record(biz_col)

        const phoneNumbers = client_payload.filter(cl => cl["phoneNumber"] !== undefined && cl["phoneNumber"]).map(cl => cl["phoneNumber"])
        const lenN = phoneNumbers.length

        const filterString = phoneNumbers.reduce((acc, curr, i) => {
            const suffix = (i < (lenN - 1)) ? "||" : ""
            acc += `phoneNumber = '${curr}' ${suffix} `
            return acc
        }, "")

        try {
            const existing_records: (models.Record | undefined)[] = $app.dao().findRecordsByFilter("clients", filterString.trim(), "-created", 10, 0)
            if (!existing_records) return
            if (existing_records.length > 0) {
                const issues = existing_records.map((existingRecord, i) => {
                    const phone_number = existingRecord.get("phoneNumber")
                    return {
                        path: "phoneNumber",
                        code: "duplicated"
                    }
                })

                return c.json(400, {
                    msg: "Existing clients found in the record.",
                    details: issues
                })
            } else {
                for (const ck in Object.keys(client_payload)) {
                    const client = client_payload[ck]
                    const valid_client = validateClient(client)
                    if (valid_client === null) {
                        return c.json(400, { message: "invalid client schema." })
                    }
                }

                const import_result = ClientsbulkImports(client_col, client_payload)
                if (import_result.isErr()) {
                    return c.json(400, { message: "Failure during transactions operation.", count: 0, details: import_result.error })
                }
                return c.json(200, { message: "Successfully pushed clients to the collections.", count: client_payload })
            }
        } catch (e) {
            console.log("EE", e)
            return c.json(400, { message: "Failed to pushed clients to the collections. {}", count: 0 })
        }

    } catch (e) {
        if (typeof e === "object") {
            console.log("Unexpected Error", JSON.stringify(e))
            return c.json(500, { message: "Unexpected errors during pushing clients to the collections.", details: [e], count: 0 })
        } else {
            console.log("Unexpected Error", e)
            return c.json(500, { message: "Unexpected errors during pushing clients to the collections.", details: [], count: 0 })
        }
    }
}, $apis.requireAdminOrRecordAuth())

routerAdd("POST", "/items/import", (c) => {
    try {

        const data = $apis.requestInfo(c).data
        const biz_id = data.businessId
        const item_payload = data.items

        if (!item_payload || !biz_id)
            return c.json(400, { "message": "missing fields" })


        const items_col = $app.dao().findCollectionByNameOrId("items")
        const biz_col = $app.dao().findCollectionByNameOrId("businesses")

        const item_record = new Record(items_col)
        const biz_record = new Record(biz_col)

        const item_names = item_payload.filter(cl => cl["name"] !== undefined && cl["name"]).map(cl => cl["name"])
        const lenN = item_names.length

        const filterString = item_names.reduce((acc, curr, i) => {
            const suffix = (i < (lenN - 1)) ? "||" : ""
            acc += `name = '${curr}' ${suffix} `
            return acc
        }, "")

        try {
            const existing_records: (models.Record | undefined)[] = $app.dao().findRecordsByFilter("items", filterString.trim(), "-created", 10, 0)
            if (!existing_records) return
            if (existing_records.length > 0) {
                const issues = existing_records.map((existingRecord, i) => {
                    const item_names = existingRecord.get("name")
                    return {
                        path: "name",
                        code: "duplicated"
                    }
                })

                return c.json(400, {
                    msg: "Existing items found in the record.",
                    details: issues
                })
            } else {
                for (const ck in Object.keys(item_payload)) {
                    const item = item_payload[ck]
                    const valid_item = item
                    if (valid_item.isErr()) {
                        return c.json(400, {
                            message: "invalid item schema.",
                            details: valid_item.safeUnwrap()
                        })
                    }
                }

                $app.dao().runInTransaction((txDao) => {
                    const sqlSchema = generateInsertQueryFromSchema("items", items_col.schema.fields(), item_payload)
                    txDao.db().newQuery(sqlSchema).execute()
                })

                return c.json(200, { message: "Successfully pushed items to the collections.", count: item_payload })
            }
        } catch (e) {
            return c.json(400, { message: "Failed to pushed items to the collections.", count: 0 })
        }

    } catch (e) {
        if (typeof e === "object") {
            console.log("Unexpected Error", JSON.stringify(e))
            return c.json(500, { message: "Unexpected errors during pushing items to the collections.", details: [e], count: 0 })
        } else {
            console.log("Unexpected Error", e)
            // await pb.collection('clients').
            return c.json(500, { message: "Unexpected errors during pushing items to the collections.", details: [], count: 0 })
        }
    }
}, $apis.requireAdminOrRecordAuth())


