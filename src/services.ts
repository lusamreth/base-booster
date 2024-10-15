import { Result } from "neverthrow";
import { generateInsertQueryFromSchema } from "./utils";

export function ClientsbulkImports(client_col: models.Collection, client_payload): Result<number, Error> {

    return Result.fromThrowable(
        () => {
            let is_inserted = 0
            const expected_transactions = client_payload.length

            $app.dao().runInTransaction((txDao) => {
                const sqlSchema = generateInsertQueryFromSchema("clients", client_col.schema.fields(), client_payload);
                const result = txDao.db().newQuery(sqlSchema).execute();
                is_inserted = result.rowsAffected();
            })
            if (is_inserted !== expected_transactions) {
                throw new Error(`Missing expected transactions ${is_inserted}/${expected_transactions}.`)
            }
            return 1
        }
        ,
        (error: Error) => new Error(`Bulk import failed: ${error.message}`)
    )();

}

export function ItemsbulkImports(item_col: models.Collection, item_payload): Result<number, Error> {
    return Result.fromThrowable(
        () => {
            let is_inserted = 0
            const expected_transactions = item_payload.length

            $app.dao().runInTransaction((txDao) => {
                const sqlSchema = generateInsertQueryFromSchema("items", item_col.schema.fields(), item_payload);
                const result = txDao.db().newQuery(sqlSchema).execute();
                is_inserted = result.rowsAffected();
            })
            if (is_inserted !== expected_transactions) {
                throw new Error(`Missing expected transactions ${is_inserted}/${expected_transactions}.`)
            }
            return 1
        }
        ,
        (error: Error) => new Error(`Bulk import failed: ${error.message}`)
    )();

}
