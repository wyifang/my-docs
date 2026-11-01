import assert from "node:assert/strict";
import test from "node:test";
import { allowsAgentScope, canAccessPublishedRevision } from "@/lib/content";
import type { CurrentUser } from "@/lib/auth";

const publicRevision = {
  accessPolicy: "PUBLIC",
  product: "MaaS",
  apiVersion: "v1",
  language: "zh-CN",
  allowedOrganizationIds: "[]",
};

const customerRevision = {
  ...publicRevision,
  accessPolicy: "AUTHENTICATED",
  allowedOrganizationIds: JSON.stringify(["sample-customer"]),
};

const customer: CurrentUser = {
  id: "customer-1",
  email: "customer@example.test",
  name: "Customer",
  role: "VIEWER",
  organizationId: "sample-customer",
};

const author: CurrentUser = {
  id: "author-1",
  email: "author@example.test",
  name: "Author",
  role: "AUTHOR",
  organizationId: null,
};

test("public published content can be read anonymously", () => {
  assert.equal(canAccessPublishedRevision(publicRevision, null, {}), true);
});

test("organization content is denied without identity or full version context", () => {
  assert.equal(canAccessPublishedRevision(customerRevision, null, {
    product: "MaaS",
    apiVersion: "v1",
    language: "zh-CN",
  }), false);
  assert.equal(canAccessPublishedRevision(customerRevision, customer, {}), false);
});

test("organization content requires matching organization and applicability", () => {
  const filters = { product: "MaaS", apiVersion: "v1", language: "zh-CN" };
  assert.equal(canAccessPublishedRevision(customerRevision, customer, filters), true);
  assert.equal(canAccessPublishedRevision(customerRevision, customer, { ...filters, apiVersion: "v2" }), false);
  assert.equal(
    canAccessPublishedRevision(
      { ...customerRevision, allowedOrganizationIds: JSON.stringify(["another-customer"]) },
      customer,
      filters,
    ),
    false,
  );
});

test("internal content requires an internal role and exact version context", () => {
  const internalRevision = { ...publicRevision, accessPolicy: "INTERNAL" };
  assert.equal(
    canAccessPublishedRevision(internalRevision, customer, {
      product: "MaaS",
      apiVersion: "v1",
      language: "zh-CN",
    }),
    false,
  );
  assert.equal(canAccessPublishedRevision(internalRevision, author, {}), false);
  assert.equal(
    canAccessPublishedRevision(internalRevision, author, {
      product: "MaaS",
      apiVersion: "v1",
      language: "zh-CN",
    }),
    true,
  );
});

test("agent access requires the published chunk to allow the requested operation", () => {
  const revision = { allowedAgentScope: "search,read" };
  assert.equal(allowsAgentScope(revision, "search"), true);
  assert.equal(allowsAgentScope(revision, "read"), true);
  assert.equal(allowsAgentScope(revision, "cite"), false);
  assert.equal(allowsAgentScope({ allowedAgentScope: "read" }, "search"), false);
});
