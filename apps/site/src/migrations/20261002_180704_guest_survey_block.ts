import { MigrateUpArgs, MigrateDownArgs, sql } from "@payloadcms/db-postgres"

import { setSiteSchema } from "../setSiteSchema"

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   CREATE TYPE "enum_pages_blocks_guest_survey_negative_form_fields" AS ENUM('name', 'email', 'phone', 'reservation', 'property', 'checkIn');
  CREATE TYPE "enum_pages_blocks_guest_survey_review_from" AS ENUM('4', '5');
  CREATE TYPE "enum_pages_blocks_guest_survey_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TYPE "enum__pages_v_blocks_guest_survey_negative_form_fields" AS ENUM('name', 'email', 'phone', 'reservation', 'property', 'checkIn');
  CREATE TYPE "enum__pages_v_blocks_guest_survey_review_from" AS ENUM('4', '5');
  CREATE TYPE "enum__pages_v_blocks_guest_survey_background" AS ENUM('default', 'muted', 'primary', 'dark');
  CREATE TABLE "pages_blocks_guest_survey_negative_form_fields" (
  	"order" integer NOT NULL,
  	"parent_id" varchar NOT NULL,
  	"value" "enum_pages_blocks_guest_survey_negative_form_fields",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "pages_blocks_guest_survey" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'How was your stay?',
  	"intro" varchar DEFAULT 'This takes about ten seconds and helps us take better care of every guest.',
  	"review_from" "enum_pages_blocks_guest_survey_review_from" DEFAULT '4',
  	"phone" varchar,
  	"positive_heading" varchar DEFAULT 'We’re so glad you enjoyed your stay.',
  	"positive_text" varchar DEFAULT 'Would you take a minute to share it on Google? It helps other travelers find us.',
  	"positive_review_url" varchar,
  	"positive_button_label" varchar DEFAULT 'Leave a Google review',
  	"positive_later_label" varchar DEFAULT 'Maybe later',
  	"thanks_heading" varchar DEFAULT 'Thanks for staying with us.',
  	"thanks_text" varchar DEFAULT 'We hope to welcome you back soon.',
  	"negative_heading" varchar DEFAULT 'We’re sorry your stay wasn’t what you expected.',
  	"negative_text" varchar DEFAULT 'Tell us what happened and our guest care team will follow up.',
  	"negative_message_label" varchar DEFAULT 'How could we have improved your stay?',
  	"negative_consent_label" varchar DEFAULT 'It’s okay to contact me about this.',
  	"negative_submit_label" varchar DEFAULT 'Send feedback',
  	"success_heading" varchar DEFAULT 'Thank you. Our team has your feedback and will be in touch.',
  	"success_text" varchar DEFAULT 'Prefer to talk now? Call us at {phone}.',
  	"failure_heading" varchar DEFAULT 'We couldn’t send your feedback.',
  	"failure_text" varchar DEFAULT 'Something went wrong on our end. Your answers are still here. Try again, or call us at {phone}.',
  	"background" "enum_pages_blocks_guest_survey_background" DEFAULT 'default',
  	"block_name" varchar
  );
  
  CREATE TABLE "_pages_v_blocks_guest_survey_negative_form_fields" (
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"value" "enum__pages_v_blocks_guest_survey_negative_form_fields",
  	"id" serial PRIMARY KEY NOT NULL
  );
  
  CREATE TABLE "_pages_v_blocks_guest_survey" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"_path" text NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'How was your stay?',
  	"intro" varchar DEFAULT 'This takes about ten seconds and helps us take better care of every guest.',
  	"review_from" "enum__pages_v_blocks_guest_survey_review_from" DEFAULT '4',
  	"phone" varchar,
  	"positive_heading" varchar DEFAULT 'We’re so glad you enjoyed your stay.',
  	"positive_text" varchar DEFAULT 'Would you take a minute to share it on Google? It helps other travelers find us.',
  	"positive_review_url" varchar,
  	"positive_button_label" varchar DEFAULT 'Leave a Google review',
  	"positive_later_label" varchar DEFAULT 'Maybe later',
  	"thanks_heading" varchar DEFAULT 'Thanks for staying with us.',
  	"thanks_text" varchar DEFAULT 'We hope to welcome you back soon.',
  	"negative_heading" varchar DEFAULT 'We’re sorry your stay wasn’t what you expected.',
  	"negative_text" varchar DEFAULT 'Tell us what happened and our guest care team will follow up.',
  	"negative_message_label" varchar DEFAULT 'How could we have improved your stay?',
  	"negative_consent_label" varchar DEFAULT 'It’s okay to contact me about this.',
  	"negative_submit_label" varchar DEFAULT 'Send feedback',
  	"success_heading" varchar DEFAULT 'Thank you. Our team has your feedback and will be in touch.',
  	"success_text" varchar DEFAULT 'Prefer to talk now? Call us at {phone}.',
  	"failure_heading" varchar DEFAULT 'We couldn’t send your feedback.',
  	"failure_text" varchar DEFAULT 'Something went wrong on our end. Your answers are still here. Try again, or call us at {phone}.',
  	"background" "enum__pages_v_blocks_guest_survey_background" DEFAULT 'default',
  	"_uuid" varchar,
  	"block_name" varchar
  );
  
  ALTER TABLE "pages_blocks_guest_survey_negative_form_fields" ADD CONSTRAINT "pages_blocks_guest_survey_negative_form_fields_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "pages_blocks_guest_survey"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pages_blocks_guest_survey" ADD CONSTRAINT "pages_blocks_guest_survey_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_guest_survey_negative_form_fields" ADD CONSTRAINT "_pages_v_blocks_guest_survey_negative_form_fields_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "_pages_v_blocks_guest_survey"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pages_v_blocks_guest_survey" ADD CONSTRAINT "_pages_v_blocks_guest_survey_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "pages_blocks_guest_survey_negative_form_fields_order_idx" ON "pages_blocks_guest_survey_negative_form_fields" USING btree ("order");
  CREATE INDEX "pages_blocks_guest_survey_negative_form_fields_parent_idx" ON "pages_blocks_guest_survey_negative_form_fields" USING btree ("parent_id");
  CREATE INDEX "pages_blocks_guest_survey_order_idx" ON "pages_blocks_guest_survey" USING btree ("_order");
  CREATE INDEX "pages_blocks_guest_survey_parent_id_idx" ON "pages_blocks_guest_survey" USING btree ("_parent_id");
  CREATE INDEX "pages_blocks_guest_survey_path_idx" ON "pages_blocks_guest_survey" USING btree ("_path");
  CREATE INDEX "_pages_v_blocks_guest_survey_negative_form_fields_order_idx" ON "_pages_v_blocks_guest_survey_negative_form_fields" USING btree ("order");
  CREATE INDEX "_pages_v_blocks_guest_survey_negative_form_fields_parent_idx" ON "_pages_v_blocks_guest_survey_negative_form_fields" USING btree ("parent_id");
  CREATE INDEX "_pages_v_blocks_guest_survey_order_idx" ON "_pages_v_blocks_guest_survey" USING btree ("_order");
  CREATE INDEX "_pages_v_blocks_guest_survey_parent_id_idx" ON "_pages_v_blocks_guest_survey" USING btree ("_parent_id");
  CREATE INDEX "_pages_v_blocks_guest_survey_path_idx" ON "_pages_v_blocks_guest_survey" USING btree ("_path");`)
}

export async function down({
  db,
  payload,
  req,
}: MigrateDownArgs): Promise<void> {
  await setSiteSchema(db, payload)
  await db.execute(sql`
   DROP TABLE "pages_blocks_guest_survey_negative_form_fields" CASCADE;
  DROP TABLE "pages_blocks_guest_survey" CASCADE;
  DROP TABLE "_pages_v_blocks_guest_survey_negative_form_fields" CASCADE;
  DROP TABLE "_pages_v_blocks_guest_survey" CASCADE;
  DROP TYPE "enum_pages_blocks_guest_survey_negative_form_fields";
  DROP TYPE "enum_pages_blocks_guest_survey_review_from";
  DROP TYPE "enum_pages_blocks_guest_survey_background";
  DROP TYPE "enum__pages_v_blocks_guest_survey_negative_form_fields";
  DROP TYPE "enum__pages_v_blocks_guest_survey_review_from";
  DROP TYPE "enum__pages_v_blocks_guest_survey_background";`)
}
