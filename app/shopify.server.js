/*
  All rights reserved 2026 © Syntaxial - Pro Modernis
  Proprietary and confidential.
*/

import "@shopify/shopify-app-remix/adapters/node";
import { shopifyApp } from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import { restResources } from "@shopify/shopify-api/rest/admin/2026-01";
import prisma from "./db.server";

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET,
  scopes: process.env.SCOPES?.split(",") || ["write_products", "read_themes"],
  appUrl: process.env.SHOPIFY_APP_URL || process.env.HOST,
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  restResources,
  isEmbeddedApp: true,
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: "http",
      callbackUrl: "/webhooks",
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      await shopify.registerWebhooks({ session });
    },
  },
  future: {
    v3_webhookAdminContext: true,
    v3_authenticatePublic: true,
    v3_lineItemBilling: true,
  },
});

export default shopify;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;