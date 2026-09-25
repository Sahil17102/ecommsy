import { z } from "zod";
import { regex } from "@/lib/constants";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
  quantity: z.number().int().min(1, "Minimum quantity is 1"),
  description: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  hsn: z.string().optional(),
});

/** Lenient at field level — strict B2B validation is handled in superRefine */
export const b2bPackageSchema = z.object({
  boxId: z.string().optional(),
  quantity: z.number().int().min(1).optional(),
  weight: z.number().optional(),
  length: z.number().optional(),
  breadth: z.number().optional(),
  height: z.number().optional(),
});

/** Lenient at field level — strict B2B validation is handled in superRefine */
export const invoiceSchema = z.object({
  invoiceNumber: z.string(),
  invoiceDate: z.string(),
  invoiceValue: z.number(),
  ebnNumber: z.string().optional(),
  ebnExpiry: z.string().optional(),
  invoiceFile: z.any().optional(),
});

export const orderFormSchema = z
  .object({
    // Order Details
    orderType: z.enum(["B2B", "B2C"]),
    orderId: z.string().min(1, "Order ID is required"),
    orderDate: z.string().min(1, "Order date is required"),
    paymentType: z.enum(["prepaid", "cod"]),

    // Delivery Details
    buyerName: z.string().min(1, "Buyer name is required"),
    buyerPhone: z.string().regex(regex.phone, "Valid 10-digit phone required"),
    buyerEmail: z.string().email("Valid email required").or(z.literal("")),
    pincode: z.string().regex(regex.pincode, "Valid 6-digit pincode required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    address: z.string().min(5, "Address must be at least 5 characters"),

    // B2B Delivery Details
    companyName: z.string().optional(),
    gstin: z
      .string()
      .optional()
      .refine(
        (val) => !val || regex.gstin.test(val),
        "Invalid GSTIN format (e.g. 22AAAAA0000A1Z5)",
      ),

    // B2B Invoice Details
    invoices: z.array(invoiceSchema).optional(),

    // B2B Packages (multi-box)
    packages: z.array(b2bPackageSchema).optional(),

    // Products
    products: z.array(productSchema).min(1, "At least one product is required"),

    // Package Details (B2C only — B2B uses `packages[]` instead, validated in superRefine)
    weight: z.number().optional(),
    length: z.number().optional(),
    breadth: z.number().optional(),
    height: z.number().optional(),

    // Optional Charges
    transactionFee: z.number().min(0),
    discount: z.number().min(0),
    prepaidAmount: z.number().min(0),

    // Pickup (Step 2)
    pickupAddressId: z.string().optional(),
    preferredPickupDate: z
      .string()
      .min(1, "Pickup date is required")
      .refine((val) => {
        // Parse the YYYY-MM-DD as LOCAL midnight. `new Date(val)` parses it as
        // UTC midnight, which is behind local midnight for IST users and would
        // reject today's date. Compare local-to-local instead.
        const [y, m, d] = val.split("-").map(Number);
        if (!y || !m || !d) return false;
        const selected = new Date(y, m - 1, d);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return selected >= today;
      }, "Pickup date cannot be in the past"),
    preferredPickupTime: z.string().optional(),

    // Courier Selection (Step 3)
    selectedCourierId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.orderType === "B2C") {
      if (!data.weight || data.weight <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Weight is required",
          path: ["weight"],
        });
      }
      if (!data.length || data.length <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Length is required",
          path: ["length"],
        });
      }
      if (!data.breadth || data.breadth <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Breadth is required",
          path: ["breadth"],
        });
      }
      if (!data.height || data.height <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Height is required",
          path: ["height"],
        });
      }
    }
    if (data.orderType === "B2B") {
      if (!data.companyName || data.companyName.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company name is required for B2B orders",
          path: ["companyName"],
        });
      }
      if (
        data.gstin &&
        !regex.gstin.test(data.gstin)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Invalid GSTIN format",
          path: ["gstin"],
        });
      }
      if (!data.packages || data.packages.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one package/box is required for B2B orders",
          path: ["packages"],
        });
      } else {
        data.packages.forEach((pkg, i) => {
          if (!pkg.boxId || pkg.boxId.length < 1) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Box ID is required",
              path: ["packages", i, "boxId"],
            });
          }
          if (!pkg.weight || pkg.weight <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Weight (kg) is required",
              path: ["packages", i, "weight"],
            });
          }
          if (!pkg.length || pkg.length <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Length is required",
              path: ["packages", i, "length"],
            });
          }
          if (!pkg.breadth || pkg.breadth <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Breadth is required",
              path: ["packages", i, "breadth"],
            });
          }
          if (!pkg.height || pkg.height <= 0) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: "Height is required",
              path: ["packages", i, "height"],
            });
          }
        });
      }
      if (!data.invoices || data.invoices.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one invoice is required for B2B orders",
          path: ["invoices"],
        });
      }
      data.invoices?.forEach((inv, i) => {
        if (!inv.invoiceNumber) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice number is required",
            path: ["invoices", i, "invoiceNumber"],
          });
        }
        if (!inv.invoiceDate) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice date is required",
            path: ["invoices", i, "invoiceDate"],
          });
        }
        if (!inv.invoiceValue || inv.invoiceValue <= 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Invoice value is required",
            path: ["invoices", i, "invoiceValue"],
          });
        }
        if (inv.ebnNumber && !inv.ebnExpiry) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "EBN expiry is required when EBN number is provided",
            path: ["invoices", i, "ebnExpiry"],
          });
        }
      });
    }
  });

export type OrderFormValues = z.infer<typeof orderFormSchema>;
export type ProductItem = z.infer<typeof productSchema>;
export type InvoiceItem = z.infer<typeof invoiceSchema>;
