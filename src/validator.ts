import { err, ok, Result } from "neverthrow";
import { z } from 'zod';

// Define a schema for a user
const CreateClientSchema = z.object({
    firstname: z.string().min(1, "firstname should not be emptied.").max(100, "client firstname is too long!"),
    lastname: z.string().min(1, "lastname should not be emptied.").max(100, "client lastname is too long!"),
    email: z.string().email().optional(),
    phoneNumber: z.string(),
    owner: z.string()
});


const ClientSchema = CreateClientSchema.extend({
    id: z.string(),

})

const PRODUCT_SERVICE_TYPES = [
    "product",
    "service"

] as const

const CURRENCY_TYPES = [
    "USD",
    "KHR"
] as const

// Define a schema for a Product/Service
const CreateItemSchema = z.object({
    name: z.string().min(1, "firstname should not be emptied.").max(100, "client firstname is too long!"),
    // lastname: z.string().min(1, "lastname should not be emptied.").max(100, "client lastname is too long!"),
    type: z.enum(PRODUCT_SERVICE_TYPES),
    currency: z.enum(CURRENCY_TYPES),
    business: z.string(),
    unitPrice: z.number()
        .nonnegative("unit price cannot be negative.")
        .lte(1, "unit price must be larger than zero.")
});

// Define a schema for a Product/Service
const ItemSchema = CreateClientSchema.extend({
    id: z.string()
});

type CreateClient = z.infer<typeof CreateClientSchema>
type CreateItem = z.infer<typeof CreateItemSchema>

type Client = z.infer<typeof ClientSchema>
type Item = z.infer<typeof ItemSchema>

type ZodWrappedIssue = {
    message: string,
    path: (string | number)[]
}
type ValidationIssues = Record<string, ZodWrappedIssue[]>
// Updated function to format Zod errors
function formatZodErrors(error: z.ZodError) {
    return error.errors.reduce((acc, err) => {
        const path = err.path.join('.');
        if (!acc[path]) {
            acc[path] = [];
        }

        // Use the original message if it already includes the field name,
        // otherwise prepend the field name
        let message = err.message;
        if (!message.toLowerCase().includes(path.toLowerCase())) {
            message = `${path} ${message.charAt(0).toLowerCase() + message.slice(1)}`;
        }

        acc[path].push({ message, path: err.path });
        return acc;
    }, {} as ValidationIssues);
}

// Function to validate user data
export function validateClient(data: unknown): Result<CreateClient, ZodWrappedIssue | ValidationIssues> {
    try {
        // Parse and validate the data
        const validatedUser = CreateClientSchema.parse(data);
        console.log('Client data is valid:', validatedUser);
        return ok(validatedUser);
    } catch (errors) {
        if (errors instanceof z.ZodError) {
            return err(formatZodErrors(errors))
        } else {
            return err(
                {
                    message: "Unexpected Errors",
                    path: [] as (string | number)[]
                }
            )
        }
    }
}

// Function to validate user data
export function validateItem(data: unknown): Result<CreateItem, ZodWrappedIssue | ValidationIssues> {
    try {
        // Parse and validate the data
        const validatedUser = CreateItemSchema.parse(data);
        console.log('Item data is valid:', validatedUser);
        return ok(validatedUser);
    } catch (errors) {
        if (errors instanceof z.ZodError) {
            return err(formatZodErrors(errors))
        } else {
            return err(
                {
                    message: "Unexpected Errors",
                    path: [] as (string | number)[]
                }
            )
        }
    }
}
