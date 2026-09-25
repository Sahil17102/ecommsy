CREATE TYPE "public"."bank_account_type" AS ENUM('bank_account', 'upi');--> statement-breakpoint
CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'issued', 'paid', 'void');--> statement-breakpoint
CREATE TYPE "public"."kyc_status" AS ENUM('not_submitted', 'pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."plan_frequency" AS ENUM('weekly', 'monthly', 'custom');--> statement-breakpoint
CREATE TYPE "public"."remittance_status" AS ENUM('pending', 'in_transit', 'remitted', 'on_hold', 'failed');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin', 'superadmin');--> statement-breakpoint
CREATE TABLE "b2b_additional_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" varchar(64) NOT NULL,
	"courier_id" uuid NOT NULL,
	"service_provider" varchar(64),
	"awb_charges" numeric(12, 2),
	"minimum_chargeable_weight" numeric(12, 2),
	"minimum_chargeable_amount" numeric(12, 2),
	"cod_charges_flat" numeric(12, 2),
	"cod_percent" numeric(6, 2),
	"fuel_surcharge_percent" numeric(6, 2),
	"green_tax" numeric(12, 2),
	"oda_charges" numeric(12, 2),
	"handling_charges" jsonb,
	"rov_percent" numeric(6, 2),
	"extras" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_pincodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pincode" varchar(16) NOT NULL,
	"city" text,
	"state" text,
	"zone_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"service_provider" varchar(64),
	"flags" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_zone_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan" varchar(64) NOT NULL,
	"origin_zone_id" uuid NOT NULL,
	"destination_zone_id" uuid NOT NULL,
	"courier_id" uuid NOT NULL,
	"service_provider" varchar(64),
	"rate_per_kg" numeric(12, 2),
	"rto_rate_per_kg" numeric(12, 2),
	"volumetric_divisor" integer,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2c_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"courier_id" uuid NOT NULL,
	"plan" varchar(64) NOT NULL,
	"mode" varchar(32),
	"other_charges" numeric(12, 2),
	"weight_slabs" jsonb,
	"zone_rates" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2c_zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(16) NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "bank_account_type" NOT NULL,
	"account_holder_name" text,
	"account_number" text,
	"ifsc_code" text,
	"bank_name" text,
	"branch_name" text,
	"account_type" text,
	"cancelled_cheque" jsonb,
	"upi_id" text,
	"upi_verified" boolean DEFAULT false NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"rejection_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"invoice_number" varchar(64) NOT NULL,
	"period_start" timestamp with time zone,
	"period_end" timestamp with time zone,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"type" varchar(32),
	"taxable_value" numeric(14, 2),
	"cgst" numeric(14, 2),
	"sgst" numeric(14, 2),
	"igst" numeric(14, 2),
	"gst_rate" numeric(6, 2),
	"total_amount" numeric(14, 2),
	"order_count" integer,
	"order_numbers" jsonb DEFAULT '[]'::jsonb,
	"remarks" text,
	"pdf_url" text,
	"csv_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"frequency" "plan_frequency" DEFAULT 'monthly' NOT NULL,
	"auto_generate" boolean DEFAULT true NOT NULL,
	"custom_frequency_days" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blogs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(256) NOT NULL,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"content" text NOT NULL,
	"category" varchar(64) NOT NULL,
	"author" text NOT NULL,
	"read_time" text DEFAULT '5 min read' NOT NULL,
	"cover_image_key" text,
	"accent_color" varchar(7),
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" text,
	"seo_description" text,
	"published_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cod_remittances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" uuid,
	"order_type" varchar(16),
	"order_number" varchar(128),
	"awb_number" varchar(64),
	"courier_partner" text,
	"cod_amount" numeric(12, 2),
	"remittable_amount" numeric(12, 2),
	"status" "remittance_status" DEFAULT 'pending' NOT NULL,
	"collected_at" timestamp with time zone,
	"credited_at" timestamp with time zone,
	"wallet_transaction_id" uuid,
	"utr_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"service_provider" varchar(64) NOT NULL,
	"courier_type" text,
	"business_type" jsonb DEFAULT '[]'::jsonb,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"logo" text,
	"meta_data" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoice_cod_offsets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kyc_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_structure" text,
	"company_type" text,
	"status" "kyc_status" DEFAULT 'not_submitted' NOT NULL,
	"selfie" jsonb,
	"pan_card" jsonb,
	"aadhaar" jsonb,
	"cancelled_cheque" jsonb,
	"board_resolution" jsonb,
	"partnership_deed" jsonb,
	"llp_agreement" jsonb,
	"company_address_proof" jsonb,
	"business_pan" jsonb,
	"gst_certificate" jsonb,
	"gstin" text,
	"cin" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "label_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"show_logo" boolean DEFAULT true NOT NULL,
	"logo_url" text,
	"hide_customer_mobile" boolean DEFAULT false NOT NULL,
	"hide_customer_order_bar" boolean DEFAULT false NOT NULL,
	"hide_gst_number" boolean DEFAULT false NOT NULL,
	"hide_pickup_address" boolean DEFAULT false NOT NULL,
	"hide_rto_address" boolean DEFAULT false NOT NULL,
	"hide_rto_name" boolean DEFAULT false NOT NULL,
	"hide_pickup_mobile" boolean DEFAULT false NOT NULL,
	"hide_rto_mobile" boolean DEFAULT false NOT NULL,
	"hide_pickup_name" boolean DEFAULT false NOT NULL,
	"hide_hsn" boolean DEFAULT false NOT NULL,
	"hide_sku" boolean DEFAULT false NOT NULL,
	"hide_qty" boolean DEFAULT false NOT NULL,
	"hide_total_amount" boolean DEFAULT false NOT NULL,
	"hide_order_amount" boolean DEFAULT false NOT NULL,
	"hide_product" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pincode" varchar(16) NOT NULL,
	"city" text,
	"state" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ndr_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"awb" varchar(64),
	"status" varchar(32),
	"reason" text,
	"remarks" text,
	"next_action" text,
	"location" text,
	"attempt_date" timestamp with time zone,
	"attempt_count" integer,
	"action_taken" text,
	"action_taken_at" timestamp with time zone,
	"action_result" text,
	"source" varchar(64),
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"prefs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"event" varchar(64) NOT NULL,
	"title" text,
	"body" text,
	"data" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"order_id" varchar(128) NOT NULL,
	"order_type" varchar(16) DEFAULT 'b2c' NOT NULL,
	"awb" varchar(64),
	"courier_id" uuid,
	"service_provider" varchar(64),
	"pickup_address_id" uuid,
	"customer" jsonb,
	"delivery_address" jsonb,
	"items" jsonb,
	"weight" double precision,
	"dimensions" jsonb,
	"payment_mode" varchar(16),
	"cod_amount" numeric(12, 2),
	"declared_value" numeric(12, 2),
	"rate_snapshot" jsonb,
	"label_url" text,
	"manifest_url" text,
	"status" varchar(32) DEFAULT 'draft' NOT NULL,
	"courier_status" varchar(64),
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pickup_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"nickname" text,
	"contact_name" text,
	"phone" varchar(32),
	"email" text,
	"role" text,
	"landmark" text,
	"address_line_1" text,
	"address_line_2" text,
	"city" text,
	"state" text,
	"country" text DEFAULT 'India',
	"pincode" varchar(16),
	"gst_number" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"address_type" text,
	"is_same_as_rto" boolean DEFAULT true NOT NULL,
	"rto_address" jsonb,
	"latitude" double precision,
	"longitude" double precision,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"features" jsonb,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"user_id" uuid NOT NULL,
	"actor_id" uuid,
	"role" "user_role" NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rto_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"awb" varchar(64),
	"status" varchar(32),
	"phase" varchar(32),
	"reason" text,
	"remarks" text,
	"rto_charges" numeric(12, 2),
	"source" varchar(64),
	"raw_payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_providers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"base_url" text,
	"logo_url" text,
	"credentials" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"subject" text NOT NULL,
	"category" varchar(64),
	"priority" varchar(16) DEFAULT 'normal' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"messages" jsonb,
	"metadata" jsonb,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"awb" varchar(64),
	"status_code" varchar(32),
	"status_text" text,
	"location" text,
	"remarks" text,
	"source" varchar(64),
	"raw_payload" jsonb,
	"courier_event_code" varchar(64),
	"event_timestamp" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"name" text,
	"first_name" text,
	"last_name" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"parent_user_id" uuid,
	"team_role" text,
	"pincode" varchar(16),
	"city" text,
	"state" text,
	"business_name" text,
	"website" text,
	"support_email" text,
	"contact_number" varchar(32),
	"address" text,
	"sells_on" jsonb DEFAULT '[]'::jsonb,
	"monthly_shipment_volume" text,
	"integrations_of_interest" jsonb DEFAULT '[]'::jsonb,
	"last_login" timestamp with time zone,
	"is_active" boolean DEFAULT true NOT NULL,
	"onboarding_complete" boolean DEFAULT false NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"plan" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'INR' NOT NULL,
	"type" varchar(16) NOT NULL,
	"reason" text,
	"ref" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"currency" varchar(8) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"event" text NOT NULL,
	"url" text NOT NULL,
	"payload" jsonb,
	"response_status" integer,
	"response_body" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"next_retry_at" timestamp with time zone,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "b2b_additional_charges" ADD CONSTRAINT "b2b_additional_charges_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_pincodes" ADD CONSTRAINT "b2b_pincodes_zone_id_b2b_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."b2b_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_pincodes" ADD CONSTRAINT "b2b_pincodes_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_zone_rates" ADD CONSTRAINT "b2b_zone_rates_origin_zone_id_b2b_zones_id_fk" FOREIGN KEY ("origin_zone_id") REFERENCES "public"."b2b_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_zone_rates" ADD CONSTRAINT "b2b_zone_rates_destination_zone_id_b2b_zones_id_fk" FOREIGN KEY ("destination_zone_id") REFERENCES "public"."b2b_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_zone_rates" ADD CONSTRAINT "b2b_zone_rates_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2c_pricing" ADD CONSTRAINT "b2c_pricing_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_invoices" ADD CONSTRAINT "billing_invoices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_preferences" ADD CONSTRAINT "billing_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blogs" ADD CONSTRAINT "blogs_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cod_remittances" ADD CONSTRAINT "cod_remittances_wallet_transaction_id_wallet_transactions_id_fk" FOREIGN KEY ("wallet_transaction_id") REFERENCES "public"."wallet_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_cod_offsets" ADD CONSTRAINT "invoice_cod_offsets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "label_settings" ADD CONSTRAINT "label_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ndr_events" ADD CONSTRAINT "ndr_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ndr_events" ADD CONSTRAINT "ndr_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_courier_id_couriers_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_pickup_address_id_pickup_addresses_id_fk" FOREIGN KEY ("pickup_address_id") REFERENCES "public"."pickup_addresses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_addresses" ADD CONSTRAINT "pickup_addresses_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rto_events" ADD CONSTRAINT "rto_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rto_events" ADD CONSTRAINT "rto_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tracking_events" ADD CONSTRAINT "tracking_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_webhook_id_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhooks" ADD CONSTRAINT "webhooks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "b2b_charges_plan_courier_uq" ON "b2b_additional_charges" USING btree ("plan","courier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "b2b_pincodes_pincode_courier_uq" ON "b2b_pincodes" USING btree ("pincode","courier_id");--> statement-breakpoint
CREATE INDEX "b2b_pincodes_provider_idx" ON "b2b_pincodes" USING btree ("service_provider");--> statement-breakpoint
CREATE INDEX "b2b_pincodes_zone_idx" ON "b2b_pincodes" USING btree ("zone_id");--> statement-breakpoint
CREATE UNIQUE INDEX "b2b_rate_uq" ON "b2b_zone_rates" USING btree ("plan","courier_id","origin_zone_id","destination_zone_id");--> statement-breakpoint
CREATE INDEX "b2b_rate_active_effective_idx" ON "b2b_zone_rates" USING btree ("is_active","effective_from");--> statement-breakpoint
CREATE UNIQUE INDEX "b2b_zones_code_uq" ON "b2b_zones" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "b2c_pricing_courier_plan_uq" ON "b2c_pricing" USING btree ("courier_id","plan");--> statement-breakpoint
CREATE UNIQUE INDEX "b2c_zones_code_uq" ON "b2c_zones" USING btree ("code");--> statement-breakpoint
CREATE INDEX "bank_accounts_user_idx" ON "bank_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_user_created_idx" ON "billing_invoices" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "billing_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "invoices_user_period_idx" ON "billing_invoices" USING btree ("user_id","period_end");--> statement-breakpoint
CREATE UNIQUE INDEX "billing_prefs_user_uq" ON "billing_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blogs_slug_uq" ON "blogs" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "blogs_status_published_idx" ON "blogs" USING btree ("status","published_at");--> statement-breakpoint
CREATE INDEX "blogs_category_published_idx" ON "blogs" USING btree ("category","published_at");--> statement-breakpoint
CREATE INDEX "blogs_featured_published_idx" ON "blogs" USING btree ("is_featured","published_at");--> statement-breakpoint
CREATE INDEX "cod_user_status_created_idx" ON "cod_remittances" USING btree ("user_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cod_awb_uq" ON "cod_remittances" USING btree ("awb_number");--> statement-breakpoint
CREATE UNIQUE INDEX "cod_order_uq" ON "cod_remittances" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "cod_status_collected_idx" ON "cod_remittances" USING btree ("status","collected_at");--> statement-breakpoint
CREATE INDEX "couriers_provider_idx" ON "couriers" USING btree ("service_provider");--> statement-breakpoint
CREATE UNIQUE INDEX "kyc_user_uq" ON "kyc_documents" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "kyc_status_idx" ON "kyc_documents" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "label_settings_user_uq" ON "label_settings" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "locations_pincode_uq" ON "locations" USING btree ("pincode");--> statement-breakpoint
CREATE INDEX "locations_state_city_idx" ON "locations" USING btree ("state","city");--> statement-breakpoint
CREATE INDEX "locations_active_idx" ON "locations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "ndr_order_created_idx" ON "ndr_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "ndr_user_created_idx" ON "ndr_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "ndr_awb_idx" ON "ndr_events" USING btree ("awb");--> statement-breakpoint
CREATE UNIQUE INDEX "notification_prefs_user_uq" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_user_created_idx" ON "notifications" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "orders_user_created_idx" ON "orders" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_awb_uq" ON "orders" USING btree ("awb");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_order_user_uq" ON "orders" USING btree ("order_id","user_id");--> statement-breakpoint
CREATE INDEX "orders_status_idx" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "orders_provider_idx" ON "orders" USING btree ("service_provider");--> statement-breakpoint
CREATE INDEX "otps_identifier_idx" ON "otps" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "otps_expires_idx" ON "otps" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "pickup_user_idx" ON "pickup_addresses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "pickup_user_primary_idx" ON "pickup_addresses" USING btree ("user_id","is_primary");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_slug_uq" ON "plans" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "plans_sort_idx" ON "plans" USING btree ("sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "refresh_tokens_token_uq" ON "refresh_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "refresh_tokens_user_idx" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "refresh_tokens_expires_idx" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "rto_order_created_idx" ON "rto_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "rto_user_created_idx" ON "rto_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "rto_awb_idx" ON "rto_events" USING btree ("awb");--> statement-breakpoint
CREATE INDEX "te_order_created_idx" ON "tracking_events" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE INDEX "te_awb_created_idx" ON "tracking_events" USING btree ("awb","created_at");--> statement-breakpoint
CREATE INDEX "te_user_created_idx" ON "tracking_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_uq" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_parent_idx" ON "users" USING btree ("parent_user_id");--> statement-breakpoint
CREATE INDEX "wallet_tx_wallet_created_idx" ON "wallet_transactions" USING btree ("wallet_id","created_at");--> statement-breakpoint
CREATE INDEX "wallet_tx_ref_idx" ON "wallet_transactions" USING btree ("ref");--> statement-breakpoint
CREATE UNIQUE INDEX "wallets_user_uq" ON "wallets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wd_webhook_created_idx" ON "webhook_deliveries" USING btree ("webhook_id","created_at");--> statement-breakpoint
CREATE INDEX "wd_user_created_idx" ON "webhook_deliveries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "wd_retry_idx" ON "webhook_deliveries" USING btree ("status","next_retry_at");--> statement-breakpoint
CREATE INDEX "webhooks_user_active_idx" ON "webhooks" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "webhooks_user_url_uq" ON "webhooks" USING btree ("user_id","url");