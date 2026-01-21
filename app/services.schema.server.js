/*
  All rights reserved 2026 © Syntaxial - Pro Modernis
  Proprietary and confidential.
*/

import db from "./db.server";
import { authenticate } from "./shopify.server";

/**
 * SCHEMA_QUERY - GraphQL query for metafield definitions.
 */
const SCHEMA_QUERY = `
  query getMetafieldDefinitions {
    metafieldDefinitions(first: 250, ownerType: PRODUCT) {
      edges {
        node {
          id
          namespace
          key
          name
          description
          type {
            name
          }
          validationStatus
        }
      }
    }
  }
`;

/**
 * syncSchema - fetch metafieldDefinitions from Shopify and upsert into Prisma
 * - request: the Remix/Express request object (used by authenticate.admin)
 */
export async function syncSchema(request) {
  const { admin, session } = await authenticate.admin(request);
  const response = await admin.graphql(SCHEMA_QUERY);

  if (!response.ok) {
    const bodyText = await response.text().catch(() => "");
    throw new Error(`Shopify GraphQL error: ${response.status} ${bodyText}`);
  }

  const responseJson = await response.json();
  if (responseJson.errors && responseJson.errors.length > 0) {
    throw new Error(`GraphQL errors: ${JSON.stringify(responseJson.errors)}`);
  }

  const definitions = responseJson.data?.metafieldDefinitions?.edges || [];

  if (definitions.length === 0) {
    return { status: "no_definitions", count: 0 };
  }

  // Prepare upsert operations
  const operations = definitions.map((edge) => {
    const def = edge.node;
    const compositeKey = `${def.namespace}.${def.key}`;
    return db.schemaDefinition.upsert({
      where: {
        shop_ownerType_key: {
          shop: session.shop,
          ownerType: "PRODUCT",
          key: compositeKey,
        },
      },
      update: {
        name: def.name,
        type: def.type?.name,
        description: def.description,
        lastAudited: new Date(),
      },
      create: {
        shop: session.shop,
        ownerType: "PRODUCT",
        key: compositeKey,
        name: def.name,
        type: def.type?.name,
        description: def.description,
      },
    });
  });

  // Execute in chunks to avoid hitting transaction limits
  const chunkSize = 50;
  let applied = 0;

  for (let i = 0; i < operations.length; i += chunkSize) {
    const chunk = operations.slice(i, i + chunkSize);
    await db.$transaction(chunk);
    applied += chunk.length;
  }

  return { status: "success", count: applied };
}

/**
 * getSchema - return local schemaDefinition rows for a shop
 */
export async function getSchema(shop) {
  return db.schemaDefinition.findMany({
    where: { shop },
    orderBy: { key: "asc" },
  });
}