import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  jsonb,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* ENUMS                                                              */
/* ------------------------------------------------------------------ */

export const portalRoleEnum = pgEnum("portal_role", [
  "cpn",
  "moderador_nacional",
  "moderador_distrital",
  "moderador_concelhio",
  "militante",
  "simpatizante",
]);

export const scopeEnum = pgEnum("scope", ["nacional", "distrital", "concelhia"]);

/* ------------------------------------------------------------------ */
/* CATÁLOGO GEOGRÁFICO (espelho do Projeto A — distritos/concelhias)  */
/* ------------------------------------------------------------------ */
// Estas duas tabelas são um cache local, mantido sincronizado a partir do
// Projeto A (Militância), que é quem gere o catálogo oficial. Sem elas,
// qualquer junção `concelhias!...` ou `districts!...` falha porque a
// tabela simplesmente não existe neste projeto.

export const districts = pgTable("districts", {
  id: uuid("id").primaryKey(), // == id do distrito no Projeto A
  code: varchar("code", { length: 2 }).notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const concelhias = pgTable(
  "concelhias",
  {
    id: uuid("id").primaryKey(), // == id da concelhia no Projeto A
    districtId: uuid("district_id").references(() => districts.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("concelhias_district_idx").on(t.districtId)],
);

/* ------------------------------------------------------------------ */
/* APROVAÇÕES DE MILITÂNCIA PENDENTES (staging da sincronização)      */
/* ------------------------------------------------------------------ */
// Quando o Projeto A aprova um militante cujo email ainda nunca fez login
// no Portal, ainda não existe `auth.users`/`portal_profiles` para
// atualizar — fica aqui à espera até ao primeiro login (ver
// lib/profile.ts:getOrCreateProfile), altura em que é consumido e apagado.

export const pendingMemberApprovals = pgTable("pending_member_approvals", {
  email: text("email").primaryKey(),
  memberId: uuid("member_id").notNull(),
  fullName: text("full_name").notNull(),
  memberNumber: varchar("member_number", { length: 16 }).notNull(),
  concelhiaId: uuid("concelhia_id"),
  districtId: uuid("district_id"),
  joinedMemberAt: date("joined_member_at"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const forumTopicStatusEnum = pgEnum("forum_topic_status", ["aberto", "fechado"]);

export const reportStatusEnum = pgEnum("report_status", [
  "pendente",
  "em_analise",
  "resolvido",
  "rejeitado",
]);

export const reportActionEnum = pgEnum("report_action", [
  "nenhuma",
  "silenciar",
  "suspender",
  "pedido_ban_cpn",
]);

export const moderationActionEnum = pgEnum("moderation_action", [
  "silenciar",
  "suspender",
  "ban_permanente",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "resposta_topico",
  "mencao",
  "novo_aviso",
  "evento_proximo",
  "mensagem_direta",
  "denuncia_resolvida",
  "nova_denuncia",
  "filiacao_aprovada",
]);

export const reactionTypeEnum = pgEnum("reaction_type", [
  "gosto",
  "apoio",
  "concordo",
  "discordo",
  "haha",
]);

/* ------------------------------------------------------------------ */
/* PERFIS (liga a auth.users deste projeto; profileId != Projeto A)   */
/* ------------------------------------------------------------------ */

export const portalProfiles = pgTable("portal_profiles", {
  id: uuid("id").primaryKey(), // == auth.users.id (Projeto B)
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: portalRoleEnum("role").notNull().default("simpatizante"),
  // referência fraca ao Projeto A — sem FK entre bases de dados distintas
  memberId: uuid("member_id").unique(), // preenchido quando aprovado como militante
  memberNumber: varchar("member_number", { length: 16 }), // cache p/ cartão digital
  concelhiaId: uuid("concelhia_id"), // cache, sincronizado via webhook/edge function
  districtId: uuid("district_id"), // cache
  joinedMemberAt: date("joined_member_at"), // cache da data de filiação
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  darkMode: boolean("dark_mode").notNull().default(false),
  weeklyDigestOptIn: boolean("weekly_digest_opt_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* FÓRUNS                                                              */
/* ------------------------------------------------------------------ */

export const forumCategories = pgTable(
  "forum_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    scope: scopeEnum("scope").notNull(),
    // null se scope=nacional; preenchido se distrital/concelhia
    scopeDistrictId: uuid("scope_district_id"),
    scopeConcelhiaId: uuid("scope_concelhia_id"),
    displayOrder: integer("display_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_categories_scope_idx").on(t.scope)],
);

export const forumTopics = pgTable(
  "forum_topics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => forumCategories.id, { onDelete: "cascade" }),
    authorProfileId: uuid("author_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    pinned: boolean("pinned").notNull().default(false),
    status: forumTopicStatusEnum("status").notNull().default("aberto"),
    viewCount: integer("view_count").notNull().default(0),
    lastReplyAt: timestamp("last_reply_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("forum_topics_category_idx").on(t.categoryId),
    index("forum_topics_pinned_idx").on(t.pinned),
  ],
);

export const forumReplies = pgTable(
  "forum_replies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topicId: uuid("topic_id")
      .notNull()
      .references(() => forumTopics.id, { onDelete: "cascade" }),
    authorProfileId: uuid("author_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("forum_replies_topic_idx").on(t.topicId)],
);

export const reactions = pgTable(
  "reactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replyId: uuid("reply_id").references(() => forumReplies.id, { onDelete: "cascade" }),
    topicId: uuid("topic_id").references(() => forumTopics.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    type: reactionTypeEnum("type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("reactions_reply_idx").on(t.replyId), index("reactions_topic_idx").on(t.topicId)],
);

export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    replyId: uuid("reply_id")
      .notNull()
      .references(() => forumReplies.id, { onDelete: "cascade" }),
    mentionedProfileId: uuid("mentioned_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mentions_mentioned_idx").on(t.mentionedProfileId)],
);

/* ------------------------------------------------------------------ */
/* MURAL DE AVISOS                                                    */
/* ------------------------------------------------------------------ */

export const muralPosts = pgTable(
  "mural_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorProfileId: uuid("author_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    scope: scopeEnum("scope").notNull(),
    scopeDistrictId: uuid("scope_district_id"),
    scopeConcelhiaId: uuid("scope_concelhia_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("mural_posts_scope_idx").on(t.scope)],
);

/* ------------------------------------------------------------------ */
/* EVENTOS (espelho do Projeto A + RSVP local do portal)              */
/* ------------------------------------------------------------------ */

export const portalEvents = pgTable(
  "portal_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceEventId: uuid("source_event_id").unique(), // id do evento no Projeto A, se aplicável
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    concelhiaId: uuid("concelhia_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("portal_events_starts_idx").on(t.startsAt)],
);

export const portalEventRsvps = pgTable(
  "portal_event_rsvps",
  {
    eventId: uuid("event_id")
      .notNull()
      .references(() => portalEvents.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }).notNull().defaultNow(),
    reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  },
  (t) => [primaryKey({ columns: [t.eventId, t.profileId] })],
);

/* ------------------------------------------------------------------ */
/* DOCUMENTOS (biblioteca interna)                                    */
/* ------------------------------------------------------------------ */

export const portalDocuments = pgTable(
  "portal_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    storagePath: text("storage_path").notNull(),
    scope: scopeEnum("scope").notNull(),
    scopeDistrictId: uuid("scope_district_id"),
    scopeConcelhiaId: uuid("scope_concelhia_id"),
    uploadedByProfileId: uuid("uploaded_by_profile_id").references(() => portalProfiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    // Adicionadas por uma migration aplicada diretamente na BD (20260914213851
    // portal_documents_public_category), sem ficheiro correspondente no
    // repositório até agora. Nenhum código atual lê ou escreve nestas colunas
    // — ver relatório para o gap de funcionalidade em falta.
    category: text("category"),
    isPublic: boolean("is_public").notNull().default(false),
  },
  (t) => [index("portal_documents_scope_idx").on(t.scope)],
);

/* ------------------------------------------------------------------ */
/* NOTIFICAÇÕES                                                       */
/* ------------------------------------------------------------------ */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    payload: jsonb("payload").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_profile_idx").on(t.profileId),
    index("notifications_unread_idx").on(t.profileId, t.readAt),
  ],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id")
    .notNull()
    .references(() => portalProfiles.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  keys: jsonb("keys").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* GAMIFICAÇÃO                                                        */
/* ------------------------------------------------------------------ */

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 60 }).notNull().unique(), // "primeiro_post", ...
  name: text("name").notNull(),
  description: text("description").notNull(),
  iconUrl: text("icon_url"),
});

export const profileBadges = pgTable(
  "profile_badges",
  {
    profileId: uuid("profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    earnedAt: timestamp("earned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.badgeId] })],
);

/* ------------------------------------------------------------------ */
/* WIKI                                                                */
/* ------------------------------------------------------------------ */

export const wikiPages = pgTable(
  "wiki_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: varchar("slug", { length: 160 }).notNull().unique(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: varchar("category", { length: 60 }).notNull(), // "estatutos" | "guias" | "glossario"
    lastEditedByProfileId: uuid("last_edited_by_profile_id").references(
      () => portalProfiles.id,
      { onDelete: "set null" },
    ),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wiki_pages_category_idx").on(t.category)],
);

export const wikiRevisions = pgTable(
  "wiki_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => wikiPages.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    editedByProfileId: uuid("edited_by_profile_id").references(() => portalProfiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("wiki_revisions_page_idx").on(t.pageId)],
);

/* ------------------------------------------------------------------ */
/* ARQUIVO DE CONGRESSOS                                              */
/* ------------------------------------------------------------------ */

export const archiveCongresses = pgTable("archive_congresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  year: integer("year").notNull(),
  description: text("description"),
});

export const archiveCongressItems = pgTable("archive_congress_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  congressId: uuid("congress_id")
    .notNull()
    .references(() => archiveCongresses.id, { onDelete: "cascade" }),
  kind: varchar("kind", { length: 20 }).notNull(), // "documento" | "foto" | "resolucao"
  title: text("title").notNull(),
  storagePath: text("storage_path").notNull(),
});

/* ------------------------------------------------------------------ */
/* SONDAGENS / VOTAÇÕES                                                */
/* ------------------------------------------------------------------ */

export const polls = pgTable("polls", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  scope: scopeEnum("scope").notNull(),
  scopeDistrictId: uuid("scope_district_id"),
  scopeConcelhiaId: uuid("scope_concelhia_id"),
  multipleChoice: boolean("multiple_choice").notNull().default(false),
  createdByProfileId: uuid("created_by_profile_id").references(() => portalProfiles.id, {
    onDelete: "set null",
  }),
  closesAt: timestamp("closes_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollOptions = pgTable("poll_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  pollId: uuid("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    pollId: uuid("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: uuid("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.pollId, t.optionId, t.profileId] })],
);

/* ------------------------------------------------------------------ */
/* MENSAGENS DIRETAS                                                  */
/* ------------------------------------------------------------------ */

export const directMessages = pgTable(
  "direct_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    senderProfileId: uuid("sender_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    recipientProfileId: uuid("recipient_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("direct_messages_sender_idx").on(t.senderProfileId),
    index("direct_messages_recipient_idx").on(t.recipientProfileId),
  ],
);

/* ------------------------------------------------------------------ */
/* DENÚNCIAS E MODERAÇÃO                                              */
/* ------------------------------------------------------------------ */

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reporterProfileId: uuid("reporter_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    // referência polimórfica ao conteúdo denunciado
    entityType: varchar("entity_type", { length: 30 }).notNull(), // "forum_reply" | "forum_topic" | "mural_post"
    entityId: uuid("entity_id").notNull(),
    reason: text("reason").notNull(),
    status: reportStatusEnum("status").notNull().default("pendente"),
    action: reportActionEnum("action").notNull().default("nenhuma"),
    resolvedByProfileId: uuid("resolved_by_profile_id").references(() => portalProfiles.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reports_status_idx").on(t.status),
    index("reports_entity_idx").on(t.entityType, t.entityId),
  ],
);

export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetProfileId: uuid("target_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "cascade" }),
    action: moderationActionEnum("action").notNull(),
    reason: text("reason").notNull(),
    // ban_permanente exige aprovação da CPN — ver approvedByProfileId
    appliedByProfileId: uuid("applied_by_profile_id")
      .notNull()
      .references(() => portalProfiles.id, { onDelete: "set null" }),
    approvedByProfileId: uuid("approved_by_profile_id").references(() => portalProfiles.id, {
      onDelete: "set null",
    }),
    expiresAt: timestamp("expires_at", { withTimezone: true }), // null = permanente
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("moderation_actions_target_idx").on(t.targetProfileId)],
);

/* ------------------------------------------------------------------ */
/* RELATIONS                                                          */
/* ------------------------------------------------------------------ */

export const forumTopicsRelations = relations(forumTopics, ({ one, many }) => ({
  category: one(forumCategories, {
    fields: [forumTopics.categoryId],
    references: [forumCategories.id],
  }),
  author: one(portalProfiles, {
    fields: [forumTopics.authorProfileId],
    references: [portalProfiles.id],
  }),
  replies: many(forumReplies),
}));

export const forumRepliesRelations = relations(forumReplies, ({ one, many }) => ({
  topic: one(forumTopics, { fields: [forumReplies.topicId], references: [forumTopics.id] }),
  author: one(portalProfiles, {
    fields: [forumReplies.authorProfileId],
    references: [portalProfiles.id],
  }),
  reactions: many(reactions),
  mentions: many(mentions),
}));

export const pollsRelations = relations(polls, ({ many }) => ({
  options: many(pollOptions),
}));

export const pollOptionsRelations = relations(pollOptions, ({ one, many }) => ({
  poll: one(polls, { fields: [pollOptions.pollId], references: [polls.id] }),
  votes: many(pollVotes),
}));
