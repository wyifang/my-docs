import assert from "node:assert/strict";
import test from "node:test";
import { filterSearchCandidates } from "@/lib/search-filter";
import { allowsAgentScope, canAccessPublishedRevision } from "@/lib/content";
import type { CurrentUser } from "@/lib/auth";

const customer: CurrentUser = {
  id: "customer-1",
  email: "customer@example.test",
  name: "Customer",
  role: "VIEWER",
  organizationId: "sample-customer",
};

const makeCandidate = (
  id: string,
  accessPolicy: string,
  allowedOrganizationIds: string,
  allowedAgentScope = "search,read",
) => ({
  revision: {
    id,
    title: "Connection setup",
    bodyJson: JSON.stringify({ summary: "Configure a secure connection" }),
    tags: '["connection"]',
    product: "MaaS",
    apiVersion: "v1",
    language: "zh-CN",
    contentType: "guide",
    accessPolicy,
    allowedOrganizationIds,
    allowedAgentScope,
  },
});

const publicCandidate = makeCandidate("public-1", "PUBLIC", "[]");
const customerCandidate = makeCandidate(
  "customer-1",
  "AUTHENTICATED",
  JSON.stringify(["sample-customer"]),
);
const otherCustomerCandidate = makeCandidate(
  "other-customer-1",
  "AUTHENTICATED",
  JSON.stringify(["another-customer"]),
);
const noSearchScopeCandidate = makeCandidate("read-only-1", "PUBLIC", "[]", "read");

const filters = { product: "MaaS", apiVersion: "v1", language: "zh-CN" };
const search = (candidate: typeof publicCandidate, user: CurrentUser | null, agent = false) =>
  canAccessPublishedRevision(candidate.revision, user, filters) &&
  (!agent || allowsAgentScope(candidate.revision, "search"));

test("search totals and pages contain only content the caller may access", () => {
  const candidates = [
    publicCandidate,
    customerCandidate,
    otherCustomerCandidate,
    noSearchScopeCandidate,
  ];

  const anonymous = filterSearchCandidates({
    candidates,
    query: "connection",
    page: 1,
    canAccess: (candidate) => search(candidate, null),
  });
  assert.deepEqual(anonymous.candidates.map(({ revision }) => revision.id), ["public-1", "read-only-1"]);
  assert.equal(anonymous.total, 2);

  const customerResults = filterSearchCandidates({
    candidates,
    query: "connection",
    page: 1,
    canAccess: (candidate) => search(candidate, customer),
  });
  assert.deepEqual(
    customerResults.candidates.map(({ revision }) => revision.id),
    ["public-1", "customer-1", "read-only-1"],
  );
  assert.equal(customerResults.total, 3);
});

test("Agent search scope filters before calculating totals and pagination", () => {
  const result = filterSearchCandidates({
    candidates: [publicCandidate, customerCandidate, otherCustomerCandidate, noSearchScopeCandidate],
    query: "",
    page: 1,
    canAccess: (candidate) => search(candidate, customer, true),
  });
  assert.deepEqual(result.candidates.map(({ revision }) => revision.id), ["public-1", "customer-1"]);
  assert.equal(result.total, 2);
});
