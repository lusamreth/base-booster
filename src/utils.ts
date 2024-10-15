export const helloUser = () => {
    return "HELLO"
}

export const generateRandomString = (l: number) => {
    if (l < 12) throw new Error("Length should be greater than 12.")
    return $security.randomString(l)
}


export function generateInsertQueryFromSchema(tableName: string, schema: any, clients: any[]) {
    const fields = schema.map(field => field.name);
    let valueQuery = ""

    const queryBlocks = clients.map(client => {
        const values = Object.values(client)
        const keys = Object.keys(client)

        console.log("PN", JSON.stringify(client), Object.values(client), values)
        const str = fields.reduce((acc, field, i) => {
            if (i === 0) {
                acc += "("
            }

            let curr = client[field]
            if (curr === undefined) {
                curr = "''"
            } else {
                curr = `'${curr}'`
            }
            const comma = (i < fields.length - 1) ? ", " : ""
            acc += `${curr}${comma}`
            if (i === fields.length - 1) acc += ")"
            return acc
        }, "")

        return str
    })

    const placeholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    const fullstr = queryBlocks.join(", ")

    return `INSERT INTO ${tableName} (${fieldNames}) VALUES ${fullstr};`;
}
