CREATE TYPE "public"."forum_topic_status" AS ENUM('aberto', 'fechado');--> statement-breakpoint
CREATE TYPE "public"."moderation_action" AS ENUM('silenciar', 'suspender', 'ban_permanente');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('resposta_topico', 'mencao', 'novo_aviso', 'evento_proximo', 'mensagem_direta', 'denuncia_resolvida', 'filiacao_aprovada');--> statement-breakpoint
CREATE TYPE "public"."portal_role" AS ENUM('cpn', 'moderador_nacional', 'moderador_distrital', 'moderador_concelhio', 'militante', 'simpatizante');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('gosto', 'apoio', 'concordo', 'discordo', 'haha');--> statement-breakpoint
CREATE TYPE "public"."report_action" AS ENUM('nenhuma', 'silenciar', 'suspender', 'pedido_ban_cpn');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pendente', 'em_analise', 'resolvido', 'rejeitado');--> statement-breakpoint
CREATE TYPE "public"."scope" AS ENUM('nacional', 'distrital', 'concelhia');--> statement-breakpoint
CREATE TABLE "archive_congress_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"congress_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"title" text NOT NULL,
	"storage_path" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "archive_congresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"year" integer NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(60) NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon_url" text,
	CONSTRAINT "badges_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_profile_id" uuid NOT NULL,
	"recipient_profile_id" uuid NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope" "scope" NOT NULL,
	"scope_district_id" uuid,
	"scope_concelhia_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_replies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_id" uuid NOT NULL,
	"author_profile_id" uuid NOT NULL,
	"body" text NOT NULL,
	"edited_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forum_topics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"author_profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"status" "forum_topic_status" DEFAULT 'aberto' NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"last_reply_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mentions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reply_id" uuid NOT NULL,
	"mentioned_profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderation_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"target_profile_id" uuid NOT NULL,
	"action" "moderation_action" NOT NULL,
	"reason" text NOT NULL,
	"applied_by_profile_id" uuid NOT NULL,
	"approved_by_profile_id" uuid,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mural_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_profile_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"scope" "scope" NOT NULL,
	"scope_district_id" uuid,
	"scope_concelhia_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"payload" jsonb NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"poll_id" uuid NOT NULL,
	"label" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_votes" (
	"poll_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_poll_id_option_id_profile_id_pk" PRIMARY KEY("poll_id","option_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"question" text NOT NULL,
	"scope" "scope" NOT NULL,
	"scope_district_id" uuid,
	"scope_concelhia_id" uuid,
	"multiple_choice" boolean DEFAULT false NOT NULL,
	"created_by_profile_id" uuid,
	"closes_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"storage_path" text NOT NULL,
	"scope" "scope" NOT NULL,
	"scope_district_id" uuid,
	"scope_concelhia_id" uuid,
	"uploaded_by_profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_event_rsvps" (
	"event_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"confirmed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reminder_sent_at" timestamp with time zone,
	CONSTRAINT "portal_event_rsvps_event_id_profile_id_pk" PRIMARY KEY("event_id","profile_id")
);
--> statement-breakpoint
CREATE TABLE "portal_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"location" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"concelhia_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portal_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text NOT NULL,
	"bio" text,
	"avatar_url" text,
	"role" "portal_role" DEFAULT 'simpatizante' NOT NULL,
	"member_id" uuid,
	"member_number" varchar(16),
	"concelhia_id" uuid,
	"district_id" uuid,
	"joined_member_at" date,
	"terms_accepted_at" timestamp with time zone,
	"dark_mode" boolean DEFAULT false NOT NULL,
	"weekly_digest_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portal_profiles_email_unique" UNIQUE("email"),
	CONSTRAINT "portal_profiles_member_id_unique" UNIQUE("member_id")
);
--> statement-breakpoint
CREATE TABLE "profile_badges" (
	"profile_id" uuid NOT NULL,
	"badge_id" uuid NOT NULL,
	"earned_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_badges_profile_id_badge_id_pk" PRIMARY KEY("profile_id","badge_id")
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"keys" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reply_id" uuid,
	"topic_id" uuid,
	"profile_id" uuid NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_profile_id" uuid NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"entity_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" "report_status" DEFAULT 'pendente' NOT NULL,
	"action" "report_action" DEFAULT 'nenhuma' NOT NULL,
	"resolved_by_profile_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wiki_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(160) NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" varchar(60) NOT NULL,
	"last_edited_by_profile_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_pages_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "wiki_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"body" text NOT NULL,
	"edited_by_profile_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "archive_congress_items" ADD CONSTRAINT "archive_congress_items_congress_id_archive_congresses_id_fk" FOREIGN KEY ("congress_id") REFERENCES "public"."archive_congresses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_profile_id_portal_profiles_id_fk" FOREIGN KEY ("sender_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_recipient_profile_id_portal_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_replies" ADD CONSTRAINT "forum_replies_author_profile_id_portal_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_category_id_forum_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."forum_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forum_topics" ADD CONSTRAINT "forum_topics_author_profile_id_portal_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_reply_id_forum_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentions" ADD CONSTRAINT "mentions_mentioned_profile_id_portal_profiles_id_fk" FOREIGN KEY ("mentioned_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_target_profile_id_portal_profiles_id_fk" FOREIGN KEY ("target_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_applied_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("applied_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderation_actions" ADD CONSTRAINT "moderation_actions_approved_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("approved_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mural_posts" ADD CONSTRAINT "mural_posts_author_profile_id_portal_profiles_id_fk" FOREIGN KEY ("author_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_options" ADD CONSTRAINT "poll_options_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_option_id_poll_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."poll_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "polls" ADD CONSTRAINT "polls_created_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("created_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_documents" ADD CONSTRAINT "portal_documents_uploaded_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("uploaded_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_event_rsvps" ADD CONSTRAINT "portal_event_rsvps_event_id_portal_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."portal_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portal_event_rsvps" ADD CONSTRAINT "portal_event_rsvps_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profile_badges" ADD CONSTRAINT "profile_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_reply_id_forum_replies_id_fk" FOREIGN KEY ("reply_id") REFERENCES "public"."forum_replies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_topic_id_forum_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."forum_topics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_profile_id_portal_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_profile_id_portal_profiles_id_fk" FOREIGN KEY ("reporter_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("resolved_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_pages" ADD CONSTRAINT "wiki_pages_last_edited_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("last_edited_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_page_id_wiki_pages_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_pages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revisions" ADD CONSTRAINT "wiki_revisions_edited_by_profile_id_portal_profiles_id_fk" FOREIGN KEY ("edited_by_profile_id") REFERENCES "public"."portal_profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "direct_messages_sender_idx" ON "direct_messages" USING btree ("sender_profile_id");--> statement-breakpoint
CREATE INDEX "direct_messages_recipient_idx" ON "direct_messages" USING btree ("recipient_profile_id");--> statement-breakpoint
CREATE INDEX "forum_categories_scope_idx" ON "forum_categories" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "forum_replies_topic_idx" ON "forum_replies" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "forum_topics_category_idx" ON "forum_topics" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "forum_topics_pinned_idx" ON "forum_topics" USING btree ("pinned");--> statement-breakpoint
CREATE INDEX "mentions_mentioned_idx" ON "mentions" USING btree ("mentioned_profile_id");--> statement-breakpoint
CREATE INDEX "moderation_actions_target_idx" ON "moderation_actions" USING btree ("target_profile_id");--> statement-breakpoint
CREATE INDEX "mural_posts_scope_idx" ON "mural_posts" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "notifications_profile_idx" ON "notifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("profile_id","read_at");--> statement-breakpoint
CREATE INDEX "portal_documents_scope_idx" ON "portal_documents" USING btree ("scope");--> statement-breakpoint
CREATE INDEX "portal_events_starts_idx" ON "portal_events" USING btree ("starts_at");--> statement-breakpoint
CREATE INDEX "reactions_reply_idx" ON "reactions" USING btree ("reply_id");--> statement-breakpoint
CREATE INDEX "reactions_topic_idx" ON "reactions" USING btree ("topic_id");--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "reports_entity_idx" ON "reports" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "wiki_pages_category_idx" ON "wiki_pages" USING btree ("category");--> statement-breakpoint
CREATE INDEX "wiki_revisions_page_idx" ON "wiki_revisions" USING btree ("page_id");