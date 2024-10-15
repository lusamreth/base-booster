import { generateRandomString, helloUser, generateInsertQueryFromSchema } from "./utils"

function createNukeStorage(user_col: Collection): boolean {
    console.log("MAKING NUKE... ")
    try {

        const collection = new Collection()
        const form = new CollectionUpsertForm($app, collection)
        form.name = "nuke_launch_code"
        form.type = "base"

        form.listRule = null
        form.viewRule = "@request.auth.id != ''"
        form.createRule = ""
        form.updateRule = "@request.auth.id != ''"
        form.deleteRule = null

        form.schema.addField(new SchemaField({
            name: "code",
            type: "text",
            required: true,
            options: {
                max: 100,
            },
        }))


        form.schema.addField(new SchemaField({
            name: "createdBy",
            type: "relation",
            required: true,
            options: {
                maxSelect: 1,
                collectionId: user_col.id,
                cascadeDelete: true,
            },
        }))

        form.schema.addField(new SchemaField({
            name: "expireAt",
            type: "number",
            required: true,
            options: {
            },
        }))

        form.schema.addField(new SchemaField({
            name: "lastAccess",
            type: "number",
            required: true,
            options: {
            },
        }))
        form.submit()

        return true
    } catch (e) {
        console.log("NUKE STORAGE FAILED : ", e)
        return false
    }
}

routerAdd("GET", "/nuke/launch_code", (c) => {
    const pb_env = $os.getenv("POCKETBASE_ENV")
    console.log("CURRENT LAUNCH PLATFORM: ", pb_env)

    // if (process.env.NODE_ENV !== "development") {
    //     return c.json(401, { message: "Unauthorized access. Only support development env.", code: "FATAL" })
    // }

    const data = $apis.requestInfo(c).data
    const info = $apis.requestInfo(c);
    const admin = info.admin;      // empty if not authenticated as admin
    console.log("BB", data.email)

    const record = $app.dao().findAuthRecordByEmail("users", "lusomreth@gmail.com")
    if (record.validatePassword(data.password)) {
        return c.json(401, { message: "invalid credentials", code: "UN_AUTHORIZED" })
    }


    const gen_nuke_launch_code = () => {
        return {
            code: generateRandomString(100),
            ts: new Date().getTime()
        }
    }
    const req = c.request()
    const origin = req.host;

    console.log("ORIGIN", origin, JSON.stringify(req.header), "RE", req.referer(), "H", req.host)

    if (!origin || !origin.includes("localhost")) {
        return c.json(403, { message: "Forbidden. Invalid origin.", code: "FATAL" });
    }

    let secrets_col;
    const userToken = req.header.get('Authorization')
    const user = $app.dao().findAuthRecordByToken(userToken, $app.settings().recordAuthToken.secret)
    const userId = user.get("id")

    try {
        secrets_col = $app.dao().findCollectionByNameOrId("nuke_launch_code")
        if (!secrets_col) {
            return c.json(403, { message: "No nukes found", code: "FATAL" });
        }
    } catch (e) {
        console.log("[[ NUKE STORAGE ]]", e)
        const user_col = $app.dao().findCollectionByNameOrId("users")
        const result = createNukeStorage(user_col)
        console.log("[[ NUKE STORAGE ]]", result)
        return c.json(200, { message: "Created nuke silos; Please request again.", code: "INTERNAL" })

    }

    const cooldownPeriod = 60 * 60 * 1000; // 1 hour cooldown
    let launchCodes = [];

    // Check if the file exists and read the content

    let launchFile, _exist;
    try {
        const records = arrayOf(new Record);
        $app.dao().recordQuery(secrets_col.name).andWhere($dbx.hashExp({ createdBy: userId })).orderBy("created DESC").all(records)
        launchFile = records
        _exist = true
    } catch (e) {
        const _spec = e.message.toLowerCase().includes("no such file")
        if (!_spec) {
            console.log("FATAL: ", e)
            return c.json(500, { message: "Unexpected error;", code: "INTERNAL" })
        }
        _exist = !_spec
    }

    console.log(JSON.stringify(launchFile))
    if (_exist && launchFile.toString().trim() === "") return c.json(404, { message: "You don't have any nuke yet.", code: "EMPTY", requestedBy: "" })

    if (_exist) {
        const lastLaunch = launchFile[0]
        // Check if the cooldown period has passed
        // const parsed = lastLaunch.created.split(' ').join('T') + 'Z';
        // console.log(new Date(parsed).getTime())
        console.log(JSON.stringify(lastLaunch), lastLaunch)
        const lastTime = lastLaunch.get("lastAccess")
        const expire = lastLaunch.get("expireAt")
        const deltaInterval = (expire - lastTime) / cooldownPeriod
        console.log(deltaInterval)
        if (deltaInterval <= 1) {
            return c.json(429, { message: "Too many requests. Please wait 1hr before trying again.", code: "TOO_MANY_REQUESTS" });
        }

        const record = $app.dao().findRecordById("nuke_launch_code", lastLaunch.get("id"))
        const form = new RecordUpsertForm($app, record)

        form.loadData({
            "lastAccess": lastTime + cooldownPeriod
        })

        // validate and submit (internally it calls $app.dao().saveRecord(record) in a transaction)
        form.submit();
        return c.json(200, { message: "Please copy launch code.You will only see it once.", code: lastLaunch.get("code") });
    } else {
        return c.json(404, { message: "Launch codes does not exists.", code: "UN_AUTHORIZED" });
    }

}, $apis.requireAdminOrRecordAuth())


routerAdd("POST", "/nuke/launch_code", (c) => {
    const pb_env = $os.getenv("POCKETBASE_ENV")
    console.log("CURRENT LAUNCH PLATFORM: ", pb_env)

    // if (process.env.NODE_ENV !== "development") {
    //     return c.json(401, { message: "Unauthorized access. Only support development env.", code: "FATAL" })
    // }

    const data = $apis.requestInfo(c).data
    const info = $apis.requestInfo(c);
    const admin = info.admin;      // empty if not authenticated as admin
    console.log("BB", data.email)

    const record = $app.dao().findAuthRecordByEmail("users", "lusomreth@gmail.com")
    if (record.validatePassword(data.password)) {
        return c.json(401, { message: "invalid credentials", code: "UN_AUTHORIZED" })
    }


    const gen_nuke_launch_code = () => {
        return {
            code: generateRandomString(100),
            ts: new Date().getTime()
        }
    }
    const req = c.request()
    const origin = req.host;

    console.log("ORIGIN", origin, JSON.stringify(req.header), "RE", req.referer(), "H", req.host)

    if (!origin || !origin.includes("localhost")) {
        return c.json(403, { message: "Forbidden. Invalid origin.", code: "FATAL" });
    }

    let secrets_col;
    const userToken = req.header.get('Authorization')
    const user = $app.dao().findAuthRecordByToken(userToken, $app.settings().recordAuthToken.secret)
    const userId = user.get("id")

    try {
        secrets_col = $app.dao().findCollectionByNameOrId("nuke_launch_code")
        if (!secrets_col) {
            return c.json(403, { message: "No nukes found", code: "FATAL" });
        }
    } catch (e) {
        console.log("[[ NUKE STORAGE ]]", e)
        const user_col = $app.dao().findCollectionByNameOrId("users")
        const result = createNukeStorage(user_col)
        console.log("[[ NUKE STORAGE ]]", result)
        return c.json(200, { message: "Created nuke silos; Please request again.", code: "INTERNAL" })

    }

    const expires = 60 * 60 * 4000
    const cooldownPeriod = 60 * 60 * 1000; // 1 hour cooldown
    let launchCodes = [];

    // Check if the file exists and read the content

    let launchFile, _exist;
    try {
        const records = arrayOf(new Record);
        $app.dao().recordQuery(secrets_col.name).andWhere($dbx.hashExp({ createdBy: userId })).orderBy("created DESC").all(records)
        launchFile = records
        _exist = true
    } catch (e) {
        const _spec = e.message.toLowerCase().includes("no such file")
        if (!_spec) {
            console.log("FATAL: ", e)
            return c.json(500, { message: "Unexpected error;", code: "INTERNAL" })
        }
        _exist = !_spec
    }

    console.log(launchFile)

    const newLaunchCode = gen_nuke_launch_code();
    const secret_record = new Record(secrets_col)
    const form = new RecordUpsertForm($app, secret_record)

    // or form.loadRequest(request, "")
    form.loadData({
        "code": newLaunchCode.code,
        "createdBy": userId,
        "lastAccess": newLaunchCode.ts,
        "expireAt": newLaunchCode.ts + expires
    })

    form.submit()
    return c.json(200, { message: "Please copy launch code.You will only see it once.", code: newLaunchCode.code });



}, $apis.requireAdminOrRecordAuth())



routerAdd("POST", "/clients/nuke", (c) => {
    const records = arrayOf(new Record);
    const data = $apis.requestInfo(c).data
    if (!data.launch_code || data.launch_code === "") return c.json(401, { message: "Not authorized to nuke clients.", code: "UN_AUTHORIZED" })
    $app.dao().recordQuery("clients").orderBy("created DESC").all(records)
    records.forEach(record => {
        $app.dao().deleteRecord(record)
    })

    return c.json(200, { message: "client collection has been nuked." })
})
