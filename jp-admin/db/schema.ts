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
  date,
  primaryKey,
  index,
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

/* ------------------------------------------------------------------ */
/* ENUMS                                                              */
/* ------------------------------------------------------------------ */

export const roleEnum = pgEnum("role", [
  "cpn",
  "administrador",
  "moderador_nacional",
  "moderador_distrital",
  "moderador_concelhio",
  "militante",
  "simpatizante",
]);

export const membershipRequestStatusEnum = pgEnum("membership_request_status", [
  "pendente",
  "aprovado",
  "recusado",
]);

export const memberStatusEnum = pgEnum("member_status", [
  "ativo",
  "revogado",
  "suspenso",
]);

export const documentCategoryEnum = pgEnum("document_category", [
  "convocatoria",
  "estatuto",
  "minuta",
  "resolucao",
  "outro",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pendente",
  "enviado",
  "entregue",
  "cancelado",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "create",
  "update",
  "delete",
  "approve",
  "reject",
  "revoke",
  "login",
  "export",
]);

/* ------------------------------------------------------------------ */
/* GEOGRAFIA: DISTRITOS E CONCELHIAS                                  */
/* ------------------------------------------------------------------ */

export const districts = pgTable("districts", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 2 }).notNull().unique(), // usado no nº de militante
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const concelhias = pgTable(
  "concelhias",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    districtId: uuid("district_id")
      .notNull()
      .references(() => districts.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 120 }).notNull().unique(),
    active: boolean("active").notNull().default(false),
    moderatorProfileId: uuid("moderator_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("concelhias_district_idx").on(t.districtId)],
);

/* ------------------------------------------------------------------ */
/* PERFIS (liga a auth.users do Supabase)                             */
/* ------------------------------------------------------------------ */

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // == auth.users.id
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  cargo: text("cargo"), // função/cargo institucional — preenchido no onboarding do primeiro acesso
  role: roleEnum("role").notNull().default("simpatizante"),
  districtId: uuid("district_id").references(() => districts.id, { onDelete: "set null" }),
  totpEnabled: boolean("totp_enabled").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* PEDIDOS DE FILIAÇÃO                                                */
/* ------------------------------------------------------------------ */

export const membershipRequests = pgTable(
  "membership_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    fullName: text("full_name").notNull(),
    email: text("email").notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    birthDate: date("birth_date").notNull(),
    concelhiaId: uuid("concelhia_id")
      .notNull()
      .references(() => concelhias.id, { onDelete: "restrict" }),
    // path no storage privado; nunca URL pública — só se gera signed URL on-demand.
    // Pode ser null em militantes migrados via importação em bulk (histórico
    // sem ficheiro digitalizado à data da migração).
    citizenCardStoragePath: text("citizen_card_storage_path"),
    // preenchido pela CPN durante a revisão da ficha (nunca pedido no formulário
    // público) — necessário para transcrever para member_sensitive_data na aprovação
    citizenCardNumber: text("citizen_card_number"),
    status: membershipRequestStatusEnum("status").notNull().default("pendente"),
    reviewedByProfileId: uuid("reviewed_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("membership_requests_status_idx").on(t.status),
    index("membership_requests_concelhia_idx").on(t.concelhiaId),
    index("membership_requests_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* MILITANTES                                                         */
/* ------------------------------------------------------------------ */

// sequence por distrito para gerar nº de militante DD-NNNNNN
export const memberNumberSequences = pgTable("member_number_sequences", {
  districtId: uuid("district_id")
    .primaryKey()
    .references(() => districts.id, { onDelete: "restrict" }),
  lastValue: integer("last_value").notNull().default(0),
});

export const members = pgTable(
  "members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .unique()
      .references(() => profiles.id, { onDelete: "restrict" }),
    membershipRequestId: uuid("membership_request_id")
      .notNull()
      .unique()
      .references(() => membershipRequests.id, { onDelete: "restrict" }),
    memberNumber: varchar("member_number", { length: 16 }).notNull().unique(), // DD-NNNNNN
    concelhiaId: uuid("concelhia_id")
      .notNull()
      .references(() => concelhias.id, { onDelete: "restrict" }),
    status: memberStatusEnum("status").notNull().default("ativo"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    revokedReason: text("revoked_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("members_concelhia_idx").on(t.concelhiaId),
    index("members_status_idx").on(t.status),
  ],
);

// Dados sensíveis isolados numa tabela à parte com RLS muito mais restrita
// (só CPN/Administrador; Moderador Distrital/Concelhio NÃO tem acesso)
export const memberSensitiveData = pgTable("member_sensitive_data", {
  memberId: uuid("member_id")
    .primaryKey()
    .references(() => members.id, { onDelete: "cascade" }),
  citizenCardNumber: text("citizen_card_number").notNull(),
  citizenCardStoragePath: text("citizen_card_storage_path").notNull(),
  birthDate: date("birth_date").notNull(),
  address: text("address"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membershipTransfers = pgTable(
  "membership_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    fromConcelhiaId: uuid("from_concelhia_id")
      .notNull()
      .references(() => concelhias.id, { onDelete: "restrict" }),
    toConcelhiaId: uuid("to_concelhia_id")
      .notNull()
      .references(() => concelhias.id, { onDelete: "restrict" }),
    requestedByProfileId: uuid("requested_by_profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("membership_transfers_member_idx").on(t.memberId)],
);

/* ------------------------------------------------------------------ */
/* ÓRGÃOS NACIONAIS                                                   */
/* ------------------------------------------------------------------ */

export const nationalBodyPositions = pgTable("national_body_positions", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(), // "Presidente", "Secretário-Geral", ...
  displayOrder: integer("display_order").notNull().default(0),
});

export const nationalBodyMembers = pgTable(
  "national_body_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    positionId: uuid("position_id")
      .notNull()
      .references(() => nationalBodyPositions.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    photoUrl: text("photo_url"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"), // null = mandato atual
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("national_body_members_position_idx").on(t.positionId)],
);

export const previousLeaders = pgTable("previous_leaders", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  photoUrl: text("photo_url"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  displayOrder: integer("display_order").notNull().default(0),
});

/* ------------------------------------------------------------------ */
/* DOCUMENTAÇÃO PÚBLICA                                               */
/* ------------------------------------------------------------------ */

export const publicDocuments = pgTable(
  "public_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    category: documentCategoryEnum("category").notNull(),
    storagePath: text("storage_path").notNull(),
    version: integer("version").notNull().default(1),
    supersedesId: uuid("supersedes_id"),
    uploadedByProfileId: uuid("uploaded_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("public_documents_category_idx").on(t.category)],
);

/* ------------------------------------------------------------------ */
/* MARCA JP: PRODUTOS E ENCOMENDAS                                    */
/* ------------------------------------------------------------------ */

export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  stock: integer("stock").notNull().default(0),
  imageUrl: text("image_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "restrict" }),
    status: orderStatusEnum("status").notNull().default("pendente"),
    totalCents: integer("total_cents").notNull(),
    shippingAddress: jsonb("shipping_address").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("orders_profile_idx").on(t.profileId), index("orders_status_idx").on(t.status)],
);

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  unitPriceCents: integer("unit_price_cents").notNull(),
});

/* ------------------------------------------------------------------ */
/* COMUNICAÇÃO                                                        */
/* ------------------------------------------------------------------ */

export const emailTemplates = pgTable("email_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 80 }).notNull().unique(), // "membership_approved", ...
  subject: text("subject").notNull(),
  brevoTemplateId: integer("brevo_template_id").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communications = pgTable(
  "communications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    segmentDistrictId: uuid("segment_district_id").references(() => districts.id, {
      onDelete: "set null",
    }),
    segmentConcelhiaId: uuid("segment_concelhia_id").references(() => concelhias.id, {
      onDelete: "set null",
    }),
    sentByProfileId: uuid("sent_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    brevoCampaignId: integer("brevo_campaign_id"),
    openRate: numeric("open_rate", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("communications_sent_idx").on(t.sentAt)],
);

/* ------------------------------------------------------------------ */
/* EVENTOS                                                            */
/* ------------------------------------------------------------------ */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    concelhiaId: uuid("concelhia_id").references(() => concelhias.id, { onDelete: "set null" }),
    createdByProfileId: uuid("created_by_profile_id").references(() => profiles.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_starts_at_idx").on(t.startsAt)],
);

// NOTA ARQUITETURAL: não existe tabela event_rsvps no Projeto A.
// Simpatizantes não têm conta no Projeto A (só militantes/staff), logo o
// RSVP só pode viver onde ambos existem: o Portal (portal_event_rsvps).
// O Admin consulta as confirmações de presença através da Edge Function
// get-event-attendees do Portal (chamada assinada com HMAC).

/* ------------------------------------------------------------------ */
/* AUDITORIA                                                          */
/* ------------------------------------------------------------------ */

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: uuid("profile_id").references(() => profiles.id, { onDelete: "set null" }),
    action: auditActionEnum("action").notNull(),
    entityType: varchar("entity_type", { length: 60 }).notNull(),
    entityId: uuid("entity_id"),
    metadata: jsonb("metadata"),
    ipAddress: varchar("ip_address", { length: 45 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("audit_log_profile_idx").on(t.profileId),
    index("audit_log_entity_idx").on(t.entityType, t.entityId),
    index("audit_log_created_idx").on(t.createdAt),
  ],
);

/* ------------------------------------------------------------------ */
/* FEATURE FLAGS                                                      */
/* ------------------------------------------------------------------ */

export const featureFlags = pgTable("feature_flags", {
  key: varchar("key", { length: 80 }).primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ------------------------------------------------------------------ */
/* RELATIONS                                                          */
/* ------------------------------------------------------------------ */

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  district: one(districts, { fields: [profiles.districtId], references: [districts.id] }),
  member: one(members, { fields: [profiles.id], references: [members.profileId] }),
}));

export const concelhiasRelations = relations(concelhias, ({ one, many }) => ({
  district: one(districts, { fields: [concelhias.districtId], references: [districts.id] }),
  moderator: one(profiles, {
    fields: [concelhias.moderatorProfileId],
    references: [profiles.id],
  }),
  members: many(members),
}));

export const membersRelations = relations(members, ({ one }) => ({
  profile: one(profiles, { fields: [members.profileId], references: [profiles.id] }),
  concelhia: one(concelhias, { fields: [members.concelhiaId], references: [concelhias.id] }),
  membershipRequest: one(membershipRequests, {
    fields: [members.membershipRequestId],
    references: [membershipRequests.id],
  }),
  sensitiveData: one(memberSensitiveData, {
    fields: [members.id],
    references: [memberSensitiveData.memberId],
  }),
}));

export const membershipRequestsRelations = relations(membershipRequests, ({ one }) => ({
  concelhia: one(concelhias, {
    fields: [membershipRequests.concelhiaId],
    references: [concelhias.id],
  }),
  reviewedBy: one(profiles, {
    fields: [membershipRequests.reviewedByProfileId],
    references: [profiles.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  profile: one(profiles, { fields: [orders.profileId], references: [profiles.id] }),
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  concelhia: one(concelhias, { fields: [events.concelhiaId], references: [concelhias.id] }),
}));
